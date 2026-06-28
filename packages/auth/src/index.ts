import { betterAuth, type BetterAuthOptions } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

let _auth: ReturnType<typeof betterAuth> | null = null;

// ponytail: lazy so importing this package never connects/throws until used
// (keeps build + non-auth tests from needing MONGODB_URI)
export function getAuth() {
  if (_auth) return _auth;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const db = new MongoClient(uri).db();

  const options: BetterAuthOptions = {
    database: mongodbAdapter(db),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    // ponytail: env-guarded so missing creds don't break startup. Apple also needs
    // a Service ID + JWT client secret to actually work; Google works with std creds.
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
      }),
      ...(process.env.APPLE_CLIENT_ID && {
        apple: {
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET as string,
        },
      }),
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        const { sendVerificationEmail } = await import("@repo/email");
        await sendVerificationEmail({
          to: user.email,
          name: user.name ?? "there",
          url,
        });
      },
    },
  };

  _auth = betterAuth(options);
  return _auth;
}

export async function getSession(req: Request) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  return session ? { userId: session.user.id } : null;
}
