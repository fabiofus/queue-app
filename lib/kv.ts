import { Redis } from '@upstash/redis';
export const kv = new Redis({
  url: process.env.KV_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});
