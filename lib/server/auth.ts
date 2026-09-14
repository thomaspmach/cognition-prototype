import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./database";
import * as schema from "./schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      role: { type: ["viewer", "reviewer"], required: true, defaultValue: "viewer", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 8,
    cookieCache: { enabled: false },
  },
});
