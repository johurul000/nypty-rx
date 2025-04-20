// app/(auth)/signup/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); // Phone number state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); setMessage(null);

    // --- Updated Validations ---
    if (!fullName.trim()) {
        setError("Full Name is required.");
        toast.error("Validation Error", { description: "Full Name is required." });
        return;
    }
    // ** Make Phone Number Required **
    if (!phoneNumber.trim()) {
        setError("Phone Number is required.");
        toast.error("Validation Error", { description: "Phone Number is required." });
        return;
    }
    // Add basic phone format check (optional, adjust regex as needed for your region)
    // Example: Simple check for 10 digits, possibly starting with +91
    // const phoneRegex = /^(?:\+91)?[6-9]\d{9}$/; // Example Indian mobile regex
    // if (!phoneRegex.test(phoneNumber.trim())) {
    //     setError("Please enter a valid phone number.");
    //     toast.error("Validation Error", { description: "Please enter a valid phone number." });
    //     return;
    // }

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
    // --- End Validations ---

    setIsLoading(true);
    const redirectUrl = `${window.location.origin}/auth/callback`;

    // Include phone number in metadata
    const signUpOptions = {
      data: {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(), // Now required, always include
      },
      emailRedirectTo: redirectUrl,
    };

    try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: signUpOptions,
        });

        if (signUpError) { throw signUpError; }
        if (data.user && data.user.identities?.length === 0) { throw new Error("This email may already be in use."); }
        if (data.session) { toast.success("Sign Up Successful!", { description: "You are now logged in." }); router.push('/dashboard'); router.refresh(); }
        else if (data.user) { setMessage("Please check your email inbox and click the confirmation link."); toast.info("Confirmation Required", { description: "Check your email to confirm." }); setFullName(''); setPhoneNumber(''); setEmail(''); setPassword(''); setConfirmPassword(''); }
        else { throw new Error("An unexpected response occurred during sign up."); }

    } catch (err: any) {
        console.error("Sign Up Error:", err);
        setError(err.message || "An unexpected error occurred.");
        toast.error("Sign Up Failed", { description: err.message || "An unexpected error occurred." });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 px-4 py-8">
      <Card className="w-full max-w-sm shadow-xl border-border/60">
        <CardHeader className="flex flex-col items-center text-center space-y-4 pt-8 pb-6">
          <Link href="/" aria-label="Nypty Home">
            <Image src="/logo1.svg" alt="Nypty Logo" width={140} height={45} priority />
          </Link>
          <div>
            <CardTitle className="text-2xl font-semibold tracking-tight">Create your Account</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">Get started with Nypty today!</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {message && !error && ( <div className="mb-4 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 p-3 rounded-md">{message}</div> )}
          <form onSubmit={handleSignUp} className="grid gap-4">
            {/* Full Name */}
            <div className="grid gap-1.5">
              <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
              <Input id="fullName" type="text" placeholder="Your Full Name" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isLoading}/>
            </div>
            {/* Phone Number - Now Required */}
            <div className="grid gap-1.5">
              {/* Updated Label */}
              <Label htmlFor="phoneNumber">Phone Number <span className="text-destructive">*</span></Label>
              <Input
                id="phoneNumber"
                type="tel" // Use tel type for semantic meaning and mobile keyboards
                placeholder="+91 XXXXXXXXXX"
                required // Add required attribute
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {/* Email */}
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" placeholder="you@example.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}/>
            </div>
            {/* Password */}
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password <span className="text-xs text-muted-foreground">(min. 6 characters)</span> <span className="text-destructive">*</span></Label>
              <Input id="password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}/>
            </div>
            {/* Confirm Password */}
             <div className="grid gap-1.5">
              <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
              <Input id="confirmPassword" type="password" required minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading}/>
            </div>
            {/* Error Display */}
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            {/* Sign Up Button */}
            <Button type="submit" className="w-full mt-2" size="lg" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</> : 'Create Account'}
            </Button>
            {/* Link to Login */}
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Log in</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}