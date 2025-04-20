// app/(auth)/login/page.tsx
'use client'; // Required for hooks and event handlers

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // For linking to signup and forgot password pages
import Image from 'next/image'; // Import Image component for the logo
import { createClient } from '@/lib/supabase/client'; // Your Supabase browser client
import { Button } from "@/components/ui/button"; // Shadcn UI Button
import { Input } from "@/components/ui/input";   // Shadcn UI Input
import { Label } from "@/components/ui/label";   // Shadcn UI Label
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Shadcn UI Card
import { toast } from "sonner"; // For notifications
import { Loader2 } from 'lucide-react'; // Loading icon

export default function LoginPage() {
  // --- Hooks Initialization ---
  const supabase = createClient();
  const router = useRouter(); // Next.js router hook

  // --- State Variables ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Tracks loading state
  const [error, setError] = useState<string | null>(null); // Stores on-page error message

  // --- Handle Login Form Submission ---
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default browser form submission behaviour
    setIsLoading(true); // Indicate loading start
    setError(null); // Clear any previous errors

    try {
      // Attempt Supabase sign-in with email and password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(), // Trim whitespace from email
        password: password,   // Password is sent as is
      });

      // Handle potential errors returned from Supabase
      if (signInError) {
        const errorMessage = signInError.message;
        setError(errorMessage); // Display the error message on the page

        // Provide more user-friendly feedback via toasts for common errors
        if (errorMessage === 'Invalid login credentials') {
          toast.error("Login Failed", { description: "Incorrect email or password." });
        } else if (errorMessage === 'Email not confirmed') {
          toast.warning("Confirmation Required", { description: "Please check your email and click the confirmation link first." });
          // Keep specific error message on page as well
          setError("Please confirm your email address first.");
        } else {
          // Show generic error toast for other Supabase auth issues
          toast.error("Login Failed", { description: errorMessage });
        }
      } else {
        // --- Login Successful ---
        toast.success("Login Successful", { description: "Redirecting..." });

        // --- Redirection Logic ---
        // router.refresh() updates server state/cookies.
        // router.push() explicitly navigates. While refresh + AuthProvider/Layouts
        // is standard, including push ensures navigation if the other method fails.
        router.refresh();
        router.push("/dashboard"); // Force navigation to dashboard
        // --- End Redirection Logic ---
      }
    } catch (err: any) {
      // Catch unexpected errors during the fetch/login process
      console.error("Unexpected Login Error:", err);
      setError("An unexpected error occurred. Please try again.");
      toast.error("Login Error", { description: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false); // Ensure loading state is always turned off
    }
  };

  // --- Render Component ---
  return (
    // Outer container: centers content vertically and horizontally, provides nice background
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 px-4 py-12">
      <Card className="w-full max-w-sm shadow-xl border-border/60 rounded-lg"> {/* Rounded corners */}

        {/* Card Header: Contains Logo, Title, Description - Centered */}
        <CardHeader className="flex flex-col items-center text-center space-y-4 pt-8 pb-6">
          {/* Logo Integration */}
          <Link href="/" aria-label="Nypty Home"> {/* Link logo */}
            <Image
                src="/logo1.svg"     // Path relative to /public
                alt="Nypty Logo"
                width={140}          // ** Adjust width as needed **
                height={45}         // ** Adjust height as needed **
                priority             // Load logo early
            />
          </Link>
          {/* Title and Description below logo */}
          <div>
             <CardTitle className="text-2xl font-semibold tracking-tight">Welcome Back</CardTitle>
             <CardDescription className="text-sm text-muted-foreground mt-1">
                 Sign in to continue to Nypty
             </CardDescription>
          </div>
        </CardHeader>

        {/* Card Content: Contains the form */}
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-5"> {/* Spacing between form elements */}

            {/* Email Input Field */}
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required // HTML5 validation
                autoComplete="email" // Browser autofill hint
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading} // Disable input while loading
              />
            </div>

            {/* Password Input Field */}
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••" // Use placeholder dots
                required // HTML5 validation
                autoComplete="current-password" // Browser autofill hint
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading} // Disable input while loading
              />
            </div>

            {/* Display Error Message (if any) */}
            {error && (
              <p className="text-sm font-medium text-destructive px-1 text-center"> {/* Centered error */}
                {error}
              </p>
            )}

            {/* Login Button */}
            <Button type="submit" className="w-full mt-2" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Links Section */}
            <div className="mt-4 space-y-2 text-center text-sm">
               {/* Link to Sign Up */}
              <div>
                Don't have an account?{' '}
                <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign up
                </Link>
              </div>
               {/* Link to Forgot Password */}
              <div>
                <Link href="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-primary">
                  Forgot your password?
                </Link>
              </div>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}