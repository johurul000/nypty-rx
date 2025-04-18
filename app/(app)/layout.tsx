// app/(app)/layout.tsx
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Loader2 } from 'lucide-react'; // Ensure lucide-react is installed

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not loading and no session exists
    if (!isLoading && !session) {
      console.log('AppLayout: No session found, redirecting to login.');
      router.replace('/login');
    }
  }, [session, isLoading, router]);

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading session...</span>
      </div>
    );
  }

  // Prevent rendering children if there's no session (avoids flash of content before redirect)
  if (!session) {
     // We should have been redirected by the useEffect, but return null as a fallback
     // during the brief moment before redirect potentially happens.
     console.log('AppLayout: Rendering null because no session.');
     return null;
  }

  // Render the main app layout with sidebar
  return (
    <div className="flex h-screen bg-background">
      <Sidebar userEmail={user?.email} onSignOut={signOut} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {/* Render the specific page content */}
        {children}
      </main>
    </div>
  );
}