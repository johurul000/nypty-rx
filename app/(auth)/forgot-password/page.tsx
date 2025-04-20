// app/(auth)/forgot-password/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
    const supabase = createClient();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePasswordResetRequest = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setMessage(null);
        setError(null);

        // Get the base URL for the reset link (where the user will set a new password)
        // This MUST match the "Redirect URL" in your Supabase Auth settings
        const resetPasswordRedirectUrl = `${window.location.origin}/reset-password`;

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: resetPasswordRedirectUrl,
            });

            if (resetError) {
                // Don't expose specific errors like "User not found" for security
                console.error("Password Reset Request Error:", resetError);
                setError("Could not send reset instructions. Please check the email address and try again.");
                toast.error("Error", { description: "Failed to send password reset instructions." });
            } else {
                setMessage("Password reset instructions have been sent to your email address. Please check your inbox (and spam folder).");
                toast.success("Instructions Sent", { description: "Check your email to continue resetting your password." });
                setEmail(''); // Clear the input field
            }
        } catch (err: any) {
            console.error("Unexpected Password Reset Error:", err);
            setError("An unexpected error occurred. Please try again later.");
            toast.error("Error", { description: "An unexpected error occurred." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 px-4 py-12">
            <div className="mb-8">
                <Image src="/logo1.svg" alt="Nypty Logo" width={140} height={45} priority />
            </div>
            <Card className="w-full max-w-sm shadow-xl border-border/60">
                <CardHeader className="flex flex-col items-center text-center space-y-3 pt-8 pb-6">
                    <CardTitle className="text-2xl font-semibold tracking-tight">Forgot Password</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        Enter your email address below to receive password reset instructions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     {/* Display Success/Instruction Message */}
                    {message && !error && (
                        <div className="mb-4 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 p-3 rounded-md">
                            {message}
                        </div>
                    )}
                    <form onSubmit={handlePasswordResetRequest} className="grid gap-5">
                        <div className="grid gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        {/* Display Error Message */}
                        {error && (<p className="text-sm font-medium text-destructive">{error}</p>)}
                        <Button type="submit" className="w-full mt-2" size="lg" disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send Reset Instructions'}
                        </Button>
                        <div className="text-center text-sm mt-2">
                            <Link href="/login" className="inline-flex items-center text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-primary">
                                <ArrowLeft className="mr-1 h-3 w-3" /> Back to Login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}