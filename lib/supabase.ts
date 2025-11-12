// lib/supabase.ts — shim di compatibilità
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Client ADMIN lato server (service role) — usalo nelle API routes server.
 */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Client ANON lato server — se alcune API non richiedono privilegi elevati.
 */
export const supabaseServer = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Client per il browser — da usare SOLO in componenti `use client`.
 * (Se non serve nel tuo progetto, rimane comunque per compatibilità.)
 */
export const supabaseBrowser = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

