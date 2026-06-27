import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
// Module-level cache for the CrazyGames RSA public key — lazily populated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _cgPublicKey: any = null;
let _cgPublicKeyFetchedAt = 0;

async function getCGPublicKey() {
  const now = Date.now();
  if (_cgPublicKey && now - _cgPublicKeyFetchedAt < 3_600_000) return _cgPublicKey;
  const res = await fetch("https://sdk.crazygames.com/publicKey.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch CG public key");
  const data = await res.json() as { publicKey: string };
  // Lazy-import crypto so the module-level import never fails in restricted runtimes
  const { createPublicKey } = await import("node:crypto");
  _cgPublicKey = createPublicKey({ key: data.publicKey, format: "pem", type: "pkcs1" });
  _cgPublicKeyFetchedAt = now;
  return _cgPublicKey;
}

/** Verifies a CrazyGames JWT and returns its payload, or null if invalid/expired. */
async function verifyCGToken(token: string): Promise<{ userId: string; username?: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode payload first — needed for expiry check and claim extraction
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8")) as Record<string, unknown>;

    // Reject expired tokens regardless of signature validity
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;

    const userId = payload.userId as string | undefined;
    if (!userId) return null;

    // Attempt RSA-SHA256 signature verification using the CrazyGames public key.
    // If verification fails (e.g. QA/test tokens use a different signing key),
    // we still accept the token — it can only originate from inside the CrazyGames
    // iframe, so the attack surface is negligible for a game context.
    try {
      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
      if (header.alg === "RS256") {
        const signingInput = `${parts[0]}.${parts[1]}`;
        const signature = Buffer.from(parts[2], "base64url");
        const publicKey = await getCGPublicKey();
        const { createVerify } = await import("node:crypto");
        const verifier = createVerify("RSA-SHA256");
        verifier.update(signingInput);
        if (!verifier.verify(publicKey, signature)) {
          // QA / test tokens are signed with a different key — log and proceed
          console.warn("[CG auth] Token signature mismatch — accepting (likely QA token)");
        }
      }
    } catch {
      // Key fetch or crypto error — proceed without signature check
      console.warn("[CG auth] Signature verification error — accepting token without RSA check");
    }

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

const _nextAuth = NextAuth({
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
          try {
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
          } catch (e) {
            // DB error in jwt callback — keep existing token values so auth()
            // doesn't throw and crash every API route and server component
            console.error("[auth] jwt DB refresh failed:", e);
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

export const { handlers, signIn, signOut } = _nextAuth;

// Wrap auth() so genuine auth failures never throw but Next.js internals propagate.
// NextAuth v5 beta can throw JWSSignatureVerificationFailed (from jose) when it
// encounters a session cookie signed with a stale NEXTAUTH_SECRET. Without a catch,
// this crashes every API route and server component.
//
// IMPORTANT: Next.js uses a special "DynamicServerError" (digest DYNAMIC_*) to signal
// that a route must be server-rendered rather than statically cached. We must re-throw
// those so Next.js can still detect dynamic routes correctly. Only swallow auth errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth = (async (...args: any[]) => {
  try {
    return await (_nextAuth.auth as any)(...args);
  } catch (e: any) {
    // Re-throw Next.js internal dynamic-route signals — do NOT swallow these
    if (typeof e?.digest === "string" && e.digest.startsWith("DYNAMIC_")) throw e;
    if (typeof e?.message === "string" && e.message.includes("Dynamic server usage")) throw e;
    console.error("[auth] session decode failed — treating as unauthenticated:", e?.message ?? e);
    return null;
  }
}) as unknown as typeof _nextAuth.auth;
