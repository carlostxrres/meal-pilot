import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@comida-diaria/core";

/**
 * Cliente de Supabase para Server Components/Actions: usa el anon key +
 * la sesión real del usuario logueado (cookies), nunca la service_role key
 * (esa solo la usa el CLI local, ver ADR-0005 y ADR-0016).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Se llama desde un Server Component sin permiso de escritura;
            // el middleware ya se encarga de refrescar la sesión en ese caso.
          }
        },
      },
    },
  );
}
