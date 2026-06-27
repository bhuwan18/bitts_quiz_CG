import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

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
