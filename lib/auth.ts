import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import { createVerify, createPublicKey } from "crypto";

// Module-level cache — public key is static; refetch after 1 hour
let _cgPublicKey: ReturnType<typeof createPublicKey> | null = null;
let _cgPublicKeyFetchedAt = 0;

async function getCGPublicKey() {
  const now = Date.now();
  if (_cgPublicKey && now - _cgPublicKeyFetchedAt < 3_600_000) return _cgPublicKey;
  const res = await fetch("https://sdk.crazygames.com/publicKey.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch CG public key");
  const data = await res.json() as { publicKey: string };
  _cgPublicKey = createPublicKey({ key: data.publicKey, format: "pem", type: "pkcs1" });
  _cgPublicKeyFetchedAt = now;
  return _cgPublicKey;
}

/** Verifies a CrazyGames JWT and returns its payload, or null if invalid. */
async function verifyCGToken(token: string): Promise<{ userId: string; username?: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
    if (header.alg !== "RS256") return null;

    const signingInput = `${parts[0]}.${parts[1]}`;
    const signature = Buffer.from(parts[2], "base64url");

    const publicKey = await getCGPublicKey();
    const verifier = createVerify("RSA-SHA256");
    verifier.update(signingInput);
    if (!verifier.verify(publicKey, signature)) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8")) as Record<string, unknown>;
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;

    const userId = payload.userId as string | undefined;
    if (!userId) return null;

    return { userId, username: payload.username as string | undefined };
  } catch {
    return null;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      isPro: boolean;
      isMax: boolean;
      isBlacksmith: boolean;
      isLocked: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    isAdmin?: boolean;
    isPro?: boolean;
    isMax?: boolean;
    isBlacksmith?: boolean;
    isLocked?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "crazygames",
      credentials: {
        token: { label: "CrazyGames Token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token as string | undefined;
        if (!token) return null;

        // Verify with CrazyGames RSA public key (https://sdk.crazygames.com/publicKey.json)
        const claims = await verifyCGToken(token);
        if (!claims) return null;

        const cgUserId = claims.userId;
        const username = claims.username ?? `cg_${cgUserId}`;
        // Synthetic email keeps the existing @unique email constraint happy
        const syntheticEmail = `cg_${cgUserId}@crazygames.internal`;

        const user = await prisma.user.upsert({
          where: { cgUserId },
          update: { name: username },
          create: {
            cgUserId,
            email: syntheticEmail,
            name: username,
            emailVerified: new Date(),
            isAdmin: false,
          },
          select: { id: true, email: true, name: true, isPro: true, isMax: true, isBlacksmith: true, isLocked: true, proExpiresAt: true, maxExpiresAt: true, blacksmithExpiresAt: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? username,
          isAdmin: false,
          isPro: user.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date()),
          isMax: user.isMax && (!user.maxExpiresAt || user.maxExpiresAt > new Date()),
          isBlacksmith: user.isBlacksmith && (!user.blacksmithExpiresAt || user.blacksmithExpiresAt > new Date()),
          isLocked: user.isLocked,
        };
      },
    }),
    CredentialsProvider({
      id: "admin-credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === process.env.ADMIN_USERNAME &&
          credentials?.password === process.env.ADMIN_PASSWORD
        ) {
          const adminEmail = process.env.ADMIN_EMAIL ?? "admin@bittsquiz.internal";
          let user = await prisma.user.findUnique({ where: { email: adminEmail } });
          if (!user) {
            user = await prisma.user.create({
              data: { email: adminEmail, name: "Admin", emailVerified: new Date(), isAdmin: true },
            });
          } else if (!user.isAdmin) {
            await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
          }
          return { id: user.id, email: user.email, name: user.name ?? "Admin", isAdmin: true, isPro: false, isMax: false, isBlacksmith: false, isLocked: false };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token["id"] = user.id;
        token["isAdmin"] = user.isAdmin ?? false;
        token["isPro"] = user.isPro ?? false;
        token["isMax"] = user.isMax ?? false;
        token["isBlacksmith"] = user.isBlacksmith ?? false;
        token["isLocked"] = user.isLocked ?? false;
      }
      if (trigger === "update" || token["isPro"] === undefined) {
        if (token["id"]) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token["id"] as string },
            select: { isAdmin: true, isPro: true, isMax: true, isBlacksmith: true, isLocked: true, proExpiresAt: true, maxExpiresAt: true, blacksmithExpiresAt: true },
          });
          if (dbUser) {
            token["isAdmin"] = dbUser.isAdmin;
            token["isPro"] = dbUser.isPro && (!dbUser.proExpiresAt || dbUser.proExpiresAt > new Date());
            token["isMax"] = dbUser.isMax && (!dbUser.maxExpiresAt || dbUser.maxExpiresAt > new Date());
            token["isBlacksmith"] = dbUser.isBlacksmith && (!dbUser.blacksmithExpiresAt || dbUser.blacksmithExpiresAt > new Date());
            token["isLocked"] = dbUser.isLocked;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      const u = session.user as { id: string; isAdmin: boolean; isPro: boolean; isMax: boolean; isBlacksmith: boolean; isLocked: boolean };
      u.id = token.id as string;
      u.isAdmin = Boolean(token["isAdmin"]);
      u.isPro = Boolean(token["isPro"]);
      u.isMax = Boolean(token["isMax"]);
      u.isBlacksmith = Boolean(token["isBlacksmith"]);
      u.isLocked = Boolean(token["isLocked"]);
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
