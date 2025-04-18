// app/(auth)/signup/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner"; // Using sonner for notifications
import { Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); // For success/confirmation message

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      toast.error("Error", { description: "Passwords do not match." });
      return;
    }
    if (password.length < 6) {
        setError("Password should be at least 6 characters.");
        toast.error("Error", { description: "Password should be at least 6 characters." });
        return;
    }


    setIsLoading(true);

    // Construct the redirect URL for the confirmation email
    // This tells Supabase where to send the user *after* they click the confirmation link
    const redirectUrl = `${window.location.origin}/auth/callback`; // Or your intended post-confirmation destination

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Optional: Add user metadata here if needed
        // data: { full_name: '...', avatar_url: '...' }

        // Important for email confirmation link redirection
        emailRedirectTo: redirectUrl,
      },
    });

    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      toast.error("Sign Up Failed", { description: signUpError.message });
    } else if (data.user && data.user.identities?.length === 0) {
        // This condition might indicate the user exists but needs confirmation or is linked via another method
        setError("This email address may already be in use or linked via another method.");
        toast.warning("Sign Up Issue", { description: "This email address may already be in use or linked via another method. Try logging in or resetting your password." });
    } else if (data.session) {
      // If email confirmation is OFF, Supabase might return a session immediately.
      toast.success("Sign Up Successful!", { description: "You are now logged in." });
      router.push('/dashboard'); // Or wherever you want logged-in users to go
       router.refresh(); // Refresh layout/auth state
    }
     else if (data.user) {
      // Standard case: Email confirmation required
      setMessage("Please check your email inbox and click the confirmation link to activate your account.");
      toast.info("Confirmation Required", { description: "Please check your email to confirm your account." });
      // Clear form or stay on page? Clear is usually better.
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } else {
        // Unexpected case
         setError("An unexpected error occurred during sign up.");
         toast.error("Sign Up Failed", { description: "An unexpected error occurred." });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>Enter your details to create an account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="grid gap-4">
            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" placeholder="you@example.com" required
                value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
              />
            </div>
            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password" type="password" required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
              />
            </div>
            {/* Confirm Password */}
             <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword" type="password" required minLength={6}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading}
              />
            </div>

            {/* Error Display */}
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            {/* Success/Message Display */}
            {message && <p className="text-sm font-medium text-foreground">{message}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing Up...</> : 'Create Account'}
            </Button>

            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline hover:text-primary">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}