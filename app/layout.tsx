// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthProvider';
import { Toaster } from "@/components/ui/sonner"; // Using sonner

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NYPTY',
  description: 'Desktop CRM Application',
};

// Corrected function signature:
export default function RootLayout({
  children,
}: Readonly<{ // Use the standard Next.js type for layout children
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}