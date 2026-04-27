import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { Provider } from "next-auth/providers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { safeNotify } from "@/lib/notifications/slack";
import {
  trackServerEvent,
  flushServerEvents,
} from "@/lib/analytics/posthog-server";

/**
 * Provider registry — each entry is conditionally appended based on env
 * vars so missing credentials silently drop the provider from the sign-in
 * options instead of crashing the whole auth layer.
 *
 * The UI queries `isProviderEnabled(name)` via the `available-providers`
 * API route so it can show only the buttons that will actually work.
 */
function buildProviders(): Provider[] {
  const list: Provider[] = [];

  // Google OAuth — ubiquitous. Most boutique firms have a Google Workspace
  // account regardless of vertical.
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }

  // LinkedIn OAuth — B2B professional services lean on LinkedIn identity.
  // Partners and senior staff are more likely to have an up-to-date
  // LinkedIn account than a Microsoft tenant.
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    list.push(
      LinkedIn({
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    );
  }

  // Microsoft Entra ID — enterprise customers (especially law firms with
  // Office 365 Business) expect SSO. Issuer defaults to "common" tenant
  // so any Microsoft account works; set MICROSOFT_TENANT_ID to lock it
  // to a single tenant for white-glove rollouts.
  if (
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET
  ) {
    list.push(
      MicrosoftEntraID({
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        issuer: `https://login.microsoftonline.com/${
          process.env.MICROSOFT_TENANT_ID ?? "common"
        }/v2.0`,
      }),
    );
  }

  // Credentials is always available — the email/password fallback is the
  // universal floor for anyone without (or preferring not to use) SSO.
  list.push(
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );

        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );

  return list;
}

/**
 * Which OAuth providers are wired (i.e. have non-empty env credentials).
 * The UI calls this to decide which buttons to render — missing env =
 * no button. Always includes "credentials" as the password fallback.
 */
export function getAvailableAuthProviders(): Array<{
  id: "google" | "linkedin" | "microsoft-entra-id" | "credentials";
  label: string;
}> {
  const out: ReturnType<typeof getAvailableAuthProviders> = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    out.push({ id: "google", label: "Google" });
  }
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    out.push({ id: "linkedin", label: "LinkedIn" });
  }
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    out.push({ id: "microsoft-entra-id", label: "Microsoft" });
  }
  out.push({ id: "credentials", label: "Email & password" });
  return out;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/signup",
  },
  providers: buildProviders(),
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // OAuth sign-in — upsert User, link Account, normalize user.id to
      // the DB row id so JWT + session downstream carry the same id.
      if (account?.provider && account.provider !== "credentials") {
        const email = user.email;
        if (!email) return false;

        let dbUser = await prisma.user.findUnique({ where: { email } });
        const isNewUser = !dbUser;
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name,
              image: user.image,
            },
          });
        }

        // Slack ping on first OAuth sign-in only. Repeat sign-ins from
        // existing users wouldn't be useful noise. Fire-and-forget; the
        // signIn callback should never block on ops side-effects.
        if (isNewUser) {
          safeNotify("practiq_signup", {
            email: dbUser.email,
            name: dbUser.name ?? null,
            firmName: null,
            firmVertical: null,
            userId: dbUser.id,
            provider: account.provider,
          });
          // PostHog conversion event for OAuth signup. Mirrors the
          // credentials path in /api/auth/signup. Wrapped in flush
          // so the event lands before the function returns.
          trackServerEvent(dbUser.id, "signup_completed", {
            provider: account.provider,
            firmVertical: null,
            hasInviteToken: false,
          });
          await flushServerEvents();
        }

        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (!existingAccount) {
          await prisma.account.create({
            data: {
              userId: dbUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiresAt: account.expires_at,
              tokenType: account.token_type,
              scope: account.scope,
            },
          });
        }

        user.id = dbUser.id;
      }
      return true;
    },
  },
});
