// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers'; // Use next/headers for server components/routes

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL, otherwise default to dashboard
  const next = searchParams.get('next') ?? '/dashboard'; // Default redirect to dashboard

  console.log(`Auth Callback: Received code ${code ? 'present' : 'missing'}, origin: ${origin}, next: ${next}`);

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Anon key is okay here for code exchange
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.delete({ name, ...options }); },
        },
      }
    );
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
       console.log("Auth Callback: Code exchange successful, redirecting to:", `${origin}${next}`);
      // Redirect user after successful login or confirmation
      return NextResponse.redirect(`${origin}${next}`);
    } else {
        console.error("Auth Callback: Code exchange error:", error.message);
        // Redirect to an error page or login page with an error message
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&message=${encodeURIComponent(error.message)}`);
    }
  }

  // Redirect to an error page or login page if no code found
  console.warn("Auth Callback: No code parameter found in request.");
  return NextResponse.redirect(`${origin}/login?error=invalid_callback_request`);
}