import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { logger } from "@/lib/logger";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: String(user.id),
          name: user.username,
          email: user.email,
          image: user.avatar,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: (() => {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.warn(
        "\n" +
        "╔══════════════════════════════════════════════════════════════════╗\n" +
        "║  WARNING: AUTH_SECRET is NOT set!                              ║\n" +
        "║  Using insecure fallback secret. Anyone with source code      ║\n" +
        "║  access can forge authentication tokens.                      ║\n" +
        "║                                                               ║\n" +
        "║  Generate one:  openssl rand -base64 32                       ║\n" +
        "║  Set it in .env or docker-compose.yml as AUTH_SECRET=...      ║\n" +
        "╚══════════════════════════════════════════════════════════════════╝\n"
      );
      return "dominion-dev-secret-change-in-production";
    }
    if (secret.length < 32) {
      console.warn("[auth] WARNING: AUTH_SECRET is shorter than 32 characters. Use a stronger secret.");
    }
    return secret;
  })(),
});
