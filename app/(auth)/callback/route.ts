// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'; // Default redirect to homepage/dashboard

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
       // Redirect to the intended destination after successful confirmation
       console.log("Auth callback successful, redirecting to:", `${origin}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    } else {
        console.error("Auth callback error:", error.message);
        // Redirect to an error page or login page with an error message
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }
  }

  // Redirect to an error page or login page if no code found
  console.warn("Auth callback: No code parameter found.");
  return NextResponse.redirect(`${origin}/login?error=invalid_callback_request`);
}