// app/(auth)/reset-password/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // Use next/navigation
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { useAuth } from '@/context/AuthProvider'; // Import useAuth to access session state

export default function ResetPasswordPage() {
    const supabase = createClient();
    const router = useRouter();
    // Use context to check for the session established by the recovery link
    const { session, isLoading: isAuthLoading } = useAuth();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false); // Renamed isLoading for clarity
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null); // For success message
    const [isReady, setIsReady] = useState(false); // Tracks if recovery session is detected

    // --- Effect to Verify Recovery Session ---
    useEffect(() => {
        // Wait until the AuthProvider has finished its initial loading
        if (!isAuthLoading) {
            if (session) {
                // If a session exists when AuthProvider is done loading,
                // assume it's the recovery session from the URL token.
                console.log("Reset Password Page: Recovery session detected.");
                setIsReady(true);
                setError(null); // Clear any potential lingering error
            } else {
                // If no session exists after AuthProvider finishes loading,
                // the token in the URL was likely invalid or expired.
                console.warn("Reset Password Page: No session detected. Link invalid/expired?");
                setError("Invalid or expired password reset link. Please request a new one.");
                setIsReady(false); // Explicitly set not ready
            }
        }
    }, [session, isAuthLoading]); // Depend on session and AuthProvider's loading state

    // --- Handle New Password Submission ---
    const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null); // Clear previous errors
        setMessage(null);

        // Client-side validation
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            toast.error("Validation Error", { description: "Passwords do not match." });
            return;
        }
        if (newPassword.length < 6) {
            setError("Password should be at least 6 characters.");
            toast.error("Validation Error", { description: "Password should be at least 6 characters." });
            return;
        }
        // Ensure we are actually ready (session detected) before trying to update
        if (!isReady) {
             setError("Cannot update password. Verification link issue.");
             toast.error("Update Error", { description: "Verification link issue." });
             return;
        }

        setIsUpdating(true); // Start loading spinner

        try {
            // Call Supabase function to update the password for the current user
            // The Supabase client automatically uses the active session (from the recovery token)
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                // Throw error to be caught by catch block
                throw updateError;
            }

            // --- Success Case ---
            setMessage("Your password has been successfully updated! Redirecting to login...");
            toast.success("Password Updated!", { description: "You can now log in with your new password." });

            // Clear password fields
            setNewPassword('');
            setConfirmPassword('');

            // Redirect to login page after a short delay
            setTimeout(() => {
                router.push('/login');
            }, 3000); // 3-second delay before redirect

        } catch (err: any) {
            // --- Error Case ---
            console.error("Password Update Error:", err);
            const errorMessage = err.message || "Failed to update password. The reset link may have expired or an error occurred.";
            setError(errorMessage);
            toast.error("Update Failed", { description: errorMessage });
        } finally {
            setIsUpdating(false); // Stop loading spinner
        }
    };

    // --- Render Logic ---

    // State 1: Still checking for recovery session via AuthProvider
    if (isAuthLoading && !isReady && !error) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen">
                 <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                 <p className="text-muted-foreground">Verifying reset link...</p>
             </div>
         );
    }

    // State 2: Invalid/Expired Link Error
    if (!isReady && error) {
         return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 px-4 py-12">
                 <div className="mb-8"><Image src="/logo1.svg" alt="Nypty Logo" width={140} height={45} priority /></div>
                 <Card className="w-full max-w-sm shadow-xl border-destructive/50">
                     <CardHeader className="text-center space-y-2 pt-8 pb-4">
                        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
                        <CardTitle className="text-xl font-semibold">Link Invalid or Expired</CardTitle>
                     </CardHeader>
                     <CardContent className="text-center space-y-4">
                         <p className="text-sm font-medium text-destructive">{error}</p>
                         <Link href="/forgot-password">
                              <Button variant="outline" size="sm">Request New Link</Button>
                          </Link>
                     </CardContent>
                 </Card>
            </div>
        );
    }


    // State 3: Password Update Successful (Message Shown)
    // State 4: Ready to Update (Form Shown)
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 px-4 py-12">
            <div className="mb-8">
                <Image src="/logo1.svg" alt="Nypty Logo" width={140} height={45} priority />
            </div>
            <Card className="w-full max-w-sm shadow-xl border-border/60">
                <CardHeader className="flex flex-col items-center text-center space-y-3 pt-8 pb-6">
                    {/* Conditional Title */}
                    {!message && <CardTitle className="text-2xl font-semibold tracking-tight">Set New Password</CardTitle>}
                    {!message && <CardDescription className="text-sm text-muted-foreground">Enter and confirm your new password below.</CardDescription>}
                </CardHeader>
                <CardContent>
                    {/* Show success message and hide form */}
                    {message && !error && (
                        <div className="text-center space-y-4 py-6">
                             <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                             <p className="font-medium text-green-700 dark:text-green-300">{message}</p>
                             <Button onClick={() => router.push('/login')} variant="outline">Go to Login</Button>
                        </div>
                    )}

                    {/* Show form only if ready and no success message */}
                    {isReady && !message && (
                        <form onSubmit={handlePasswordUpdate} className="grid gap-5">
                            <div className="grid gap-1.5">
                                <Label htmlFor="newPassword">New Password <span className="text-xs text-muted-foreground">(min. 6 characters)</span></Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={isUpdating} // Use isUpdating state
                                />
                            </div>
                             <div className="grid gap-1.5">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isUpdating} // Use isUpdating state
                                />
                            </div>
                            {/* Display Form Error Message */}
                            {error && (<p className="text-sm font-medium text-destructive">{error}</p>)}
                            {/* Update Button */}
                            <Button type="submit" className="w-full mt-2" size="lg" disabled={isUpdating}>
                                {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update Password'}
                            </Button>
                        </form>
                    )}

                     {/* This case should be covered by the loading/error states above, but as fallback */}
                     {!isReady && !error && !isAuthLoading && (
                         <div className="text-center text-muted-foreground py-4">Initializing...</div>
                     )}

                </CardContent>
            </Card>
        </div>
    );
}