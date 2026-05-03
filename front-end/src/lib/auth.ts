import NextAuth, { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { db } from "./db";

//Authentication code and configuration for NextAuth.js, including a credentials provider that checks user credentials against a database and returns a session if valid.
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        // Checks if user account locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("LOCKED");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          const attempts = user.loginAttempts + 1;
  
    // locks user account after 5 tries
    if (attempts >= 5) {
      await db.user.update({
        where: { email: user.email },
        data: {
          loginAttempts: 0,
          lockedUntil: new Date(Date.now() + 1 * 60 * 1000), // 15 min lock
        },
      });
    } else {
      await db.user.update({
        where: { email: user.email },
        data: {
          loginAttempts: attempts,
        },
      });
    }

    throw new Error("INVALID");
  }
  
  // resets after successful login
  await db.user.update({
    where: { email: user.email },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
    },
  });

  return user;
}
    }),
  ],

  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export const auth = () => getServerSession(authOptions);

export default NextAuth(authOptions);

