// components/Sidebar.tsx
'use client'; // Needed for onClick handler and hooks

import Link from 'next/link';
import Image from 'next/image'; // Import the Image component
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Store,
  BarChart3,
  Settings,
  LogOut,
  Receipt,
} from 'lucide-react';

interface SidebarProps {
  userEmail?: string; // Keep prop definition even if not displayed currently
  onSignOut: () => void;
}

export default function Sidebar({ userEmail, onSignOut }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/store-setup', label: 'Store Setup', icon: Store },
    { href: '/medicine-management', label: 'Medicines', icon: Package },
    { href: '/billing', label: 'Billing', icon: Receipt },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 flex-shrink-0 bg-card text-card-foreground border-r flex flex-col h-screen print:hidden">
      {/* Header - Updated with ONLY Logo */}
      <div className="p-4 border-b h-16 flex items-center justify-start"> {/* Adjusted alignment */}
        {/* Link wrapping only the logo */}
        <Link href="/dashboard" className='flex items-center'>
            <Image
                src="/logo1.svg"      // Path relative to /public directory
                alt="Nypty Logo"      // Alt text for accessibility
                width={120}          // ** Adjust width as needed ** (Example, make it wider)
                height={40}         // ** Adjust height as needed ** (Maintain aspect ratio)
                className="h-10 w-auto" // Control rendered height, auto width
                priority             // Prioritize loading
            />
            {/* "Nypty" text span removed */}
        </Link>
        {/* User email also removed for cleaner look, can be added back if desired */}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard' && item.href !== '/');
          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <Link href={item.href}>
                <item.icon className={cn("mr-2 h-4 w-4", isActive ? "" : "text-muted-foreground")} />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>

      {/* Footer - Sign Out */}
      <div className="p-4 mt-auto border-t">
        <Button variant="outline" className="w-full justify-start" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}