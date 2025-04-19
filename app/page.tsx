// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Loading icon

export default function HomePage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) { // Only redirect once loading is complete
      if (session) {
        console.log("Root Guard: Session found, redirecting to /dashboard");
        router.replace('/dashboard'); // User logged in, go to dashboard
      } else {
        console.log("Root Guard: No session, redirecting to /login");
        router.replace('/login');   // User not logged in, go to login
      }
    }
  }, [session, isLoading, router]); // Dependencies for the effect

  // Show loading indicator while checking auth state
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
       <span className="ml-3 text-muted-foreground">Initializing...</span>
    </div>
  );
}