// app/(auth)/login/page.tsx
'use client'; // Required for hooks and event handlers

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // For linking to signup page
import { createClient } from '@/lib/supabase/client'; // Supabase browser client
import { Button } from "@/components/ui/button"; // Shadcn UI
import { Input } from "@/components/ui/input";   // Shadcn UI
import { Label } from "@/components/ui/label";   // Shadcn UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Shadcn UI
import { toast } from "sonner"; // For notifications
import { Loader2 } from 'lucide-react'; // Loading icon

export default function LoginPage() {
  // Initialize Supabase client and Next.js router
  const supabase = createClient();
  const router = useRouter();

  // State variables for the form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Tracks loading state for button/inputs
  const [error, setError] = useState<string | null>(null); // Stores error message to display on page

  // --- Handle Login Form Submission ---
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default browser form submission
    setIsLoading(true); // Set loading state
    setError(null); // Clear previous errors

    try {
      // Attempt to sign in with Supabase Auth
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Check if Supabase returned an error
      if (signInError) {
        setError(signInError.message); // Display error on the page

        // Provide specific user feedback via toasts based on common errors
        if (signInError.message === 'Invalid login credentials') {
          toast.error("Login Failed", { description: "Incorrect email or password." });
        } else if (signInError.message === 'Email not confirmed') {
          toast.warning("Confirmation Required", { description: "Please check your email and click the confirmation link first." });
          // Keep the error message specific on the page
          setError("Please confirm your email address first.");
        } else {
          // Generic error toast for other Supabase auth errors
          toast.error("Login Failed", { description: signInError.message });
        }
      } else {
        // Login successful!
        toast.success("Login Successful", { description: "Redirecting..." });

        // --- CRITICAL FOR REDIRECTION ---
        // This refresh is essential. It tells Next.js to re-fetch server components
        // and re-evaluate layouts based on the updated authentication state (cookie).
        // The ACTUAL redirection logic should then be triggered by either:
        // 1. The AuthProvider updating context, causing app/page.tsx to redirect.
        // 2. The AuthProvider updating context, causing app/(app)/layout.tsx to grant access.
        router.refresh();
        // --- END CRITICAL SECTION ---

        // NOTE: We DON'T typically put router.push('/dashboard') here.
        // Relying on router.refresh() and the AuthProvider/Layout checks
        // is the standard way in the App Router to handle auth state changes.
        // If redirection fails, the problem is likely in AuthProvider or the Layouts.
      }
    } catch (err: any) {
      // Catch unexpected errors (e.g., network issues)
      console.error("Unexpected Login Error:", err);
      setError("An unexpected error occurred during login.");
      toast.error("Login Error", { description: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false); // Ensure loading state is always reset
    }
  };

  // --- Render the Login Form ---
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40"> {/* Use muted background */}
      <Card className="w-full max-w-sm mx-4 shadow-lg"> {/* Add shadow */}
        <CardHeader className="space-y-1 text-center"> {/* Center header text */}
          <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
          <CardDescription>Enter your email and password to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            {/* Email Input Field */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading} // Disable input when loading
              />
            </div>

            {/* Password Input Field */}
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading} // Disable input when loading
              />
            </div>

            {/* Display Error Message (if any) */}
            {error && (
              <p className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded-md"> {/* Style error */}
                {error}
              </p>
            )}

            {/* Login Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>

            {/* Link to Sign Up Page */}
            <div className="mt-4 text-center text-sm">
              Don't have an account?{' '}
              <Link href="/signup" className="underline text-primary hover:text-primary/90">
                Sign up
              </Link>
            </div>

            {/* Optional: Link to Forgot Password (Implement later if needed) */}
            {/*
            <div className="mt-2 text-center text-sm">
              <Link href="/forgot-password" className="underline text-xs text-muted-foreground hover:text-primary">
                Forgot password?
              </Link>
            </div>
            */}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}