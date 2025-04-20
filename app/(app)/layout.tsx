// app/(app)/layout.tsx
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider'; // Ensure correct import path
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar'; // Ensure correct import path
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading, signOut } = useAuth(); // Get state from context
  const router = useRouter();

  console.log(`AppLayout RENDER: isLoading=${isLoading}, sessionExists=${!!session}, userId=${user?.id}`); // Log on every render

  useEffect(() => {
    console.log(`AppLayout EFFECT Triggered: isLoading=${isLoading}, sessionExists=${!!session}`);
    // --- Guard Logic ---
    if (!isLoading) {
      if (!session) {
        console.error('>>> AppLayout EFFECT: No session! Redirecting to /login.'); // Make errors stand out
        router.replace('/login');
      } else {
        console.log('>>> AppLayout EFFECT: Session OK. Allowing render.');
      }
    } else {
         console.log('>>> AppLayout EFFECT: Still loading auth state...');
    }
    // --- End Guard Logic ---
  }, [session, isLoading, router]);

  // --- Render Logic ---
  if (isLoading) {
    console.log('AppLayout RENDER branch: Showing loading indicator.');
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-3 text-muted-foreground">Loading session...</span>
      </div>
    );
  }

  if (!session) {
     console.error('AppLayout RENDER branch: No session, rendering null (should be redirecting via effect).'); // Make errors stand out
     return null;
  }

  console.log('AppLayout RENDER branch: Rendering Sidebar and children.');
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar userEmail={user?.email} onSignOut={signOut} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}