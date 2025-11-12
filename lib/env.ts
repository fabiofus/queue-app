import { z } from "zod";

const Schema = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(20),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
    ADMIN_TOKEN: z.string().min(10),

    KV_REST_API_URL: z.string().url().optional(),
    KV_REST_API_TOKEN: z.string().optional(),

    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  })
  .refine(
    (e) => {
      const kvOk = !!(e.KV_REST_API_URL && e.KV_REST_API_TOKEN);
      const upstashOk = !!(e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN);
      return kvOk || upstashOk;
    },
    {
      message:
        "Config KV mancante: fornisci KV_REST_API_URL + KV_REST_API_TOKEN oppure UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN",
      path: ["KV_REST_API_URL"],
    }
  );

const raw = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN,

  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,

  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

  NODE_ENV: process.env.NODE_ENV as any,
};

const parsed = Schema.safeParse(raw);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Env non valida. Correggi .env(.local)/Vercel → ${issues}`);
}

export const env = parsed.data;
export const IS_PROD = env.NODE_ENV === "production";
export const IS_DEV = env.NODE_ENV === "development";
