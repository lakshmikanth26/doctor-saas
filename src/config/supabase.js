import { createAdminClient, createContextClient, resolveEnv } from '@supabase/server/core';

const { data: supabaseEnv, error: supabaseEnvError } = resolveEnv();

if (supabaseEnvError) {
  console.warn(`[Supabase] Config warning: ${supabaseEnvError.message}`);
}

/** Admin client — bypasses RLS. Use for server-side operations only. */
export const supabaseAdmin = supabaseEnv ? createAdminClient() : null;

/** Create a user-scoped client from a Supabase JWT (RLS applies). */
export function createUserClient(accessToken) {
  if (!supabaseEnv) return null;
  return createContextClient({ auth: { token: accessToken } });
}

export { supabaseEnv, resolveEnv };
