import { z } from "zod";

const envSchema = z.object({
  ENV: z
    .union([
      z.literal("development"),
      z.literal("testing"),
      z.literal("production"),
    ])
    .default("development"),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URL: z.string(),
  GOOGLE_USER_PROFILE_URL: z.string(),
  GOOGLE_ACCESS_TOKEN_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
