// context/AuthProvider.tsx
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client'; // Import your Supabase client creator

// Define the shape of the context data
type AuthContextType = {
  supabase: SupabaseClient; // Expose client for direct use if needed
  user: User | null;
  session: Session | null;
  isLoading: boolean; // Indicate if session is being loaded initially
  signOut: () => Promise<void>;
};

// Create the context with an undefined initial value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient(); // Create client instance
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading initially

  useEffect(() => {
    setIsLoading(true); // Set loading true when starting fetch
    console.log("AuthProvider: Fetching initial session...");

    // Fetch initial session state
    const fetchSession = async () => {
      try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error("AuthProvider: Error getting session:", error);
            throw error; // Rethrow to be caught below
          }
          console.log("AuthProvider: Initial session fetched:", data.session ? 'Exists' : 'Null');
          setSession(data.session);
          setUser(data.session?.user ?? null);
      } catch (error) {
          // Handle fetch error if necessary, maybe clear state
          setSession(null);
          setUser(null);
      } finally {
          setIsLoading(false); // Finish loading after fetch attempt
      }
    };

    fetchSession();

    // Set up listener for auth state changes (login, logout, token refresh)
    console.log("AuthProvider: Setting up onAuthStateChange listener.");
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("AuthProvider: onAuthStateChange event:", _event, "Session:", session ? 'Exists' : 'Null');
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false); // Ensure loading is false after state changes
      }
    );

    // Cleanup function to unsubscribe the listener when the component unmounts
    return () => {
      console.log("AuthProvider: Unsubscribing from onAuthStateChange.");
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]); // Rerun effect if supabase client instance changes (shouldn't normally)

  // Sign out function
  const signOut = async () => {
    console.log("AuthProvider: Signing out...");
    await supabase.auth.signOut();
    // State will update via onAuthStateChange listener, no need to set explicitly here
    // setUser(null);
    // setSession(null);
    // Router push happens in layout based on state change
  };

  // Provide the context value to children
  const value = {
    supabase, // Provide Supabase client instance via context
    user,
    session,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to easily consume the Auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};