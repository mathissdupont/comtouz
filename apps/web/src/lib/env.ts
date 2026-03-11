import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("Comtouz"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:3000"),
  WORLDPASS_ISSUER_URL: z.string().url(),
  WORLDPASS_JWKS_URL: z.string().url(),
  WORLDPASS_AUDIENCE: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NEO4J_URI: z.string().min(1),
  NEO4J_USERNAME: z.string().min(1),
  NEO4J_PASSWORD: z.string().min(1),
  REDIS_URL: z.string().url(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_TURNSTILE_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    WORLDPASS_ISSUER_URL: process.env.WORLDPASS_ISSUER_URL,
    WORLDPASS_JWKS_URL: process.env.WORLDPASS_JWKS_URL,
    WORLDPASS_AUDIENCE: process.env.WORLDPASS_AUDIENCE,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NEO4J_URI: process.env.NEO4J_URI,
    NEO4J_USERNAME: process.env.NEO4J_USERNAME,
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
    REDIS_URL: process.env.REDIS_URL,
    CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_TURNSTILE_SECRET: process.env.CLOUDFLARE_TURNSTILE_SECRET,
    NODE_ENV: process.env.NODE_ENV
  });

  return cachedEnv;
}

export function isProduction() {
  return getEnv().NODE_ENV === "production";
}