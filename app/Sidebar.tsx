// components/Sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image'; // Import next/image
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
  userEmail?: string;
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
    <aside className="w-60 flex-shrink-0 bg-card text-card-foreground border-r flex flex-col h-screen print:hidden"> {/* Hide on print */}
      {/* Header Section - Updated with Logo */}
      <div className="p-4 border-b h-16 flex items-center"> {/* Use items-center */}
        <Link href="/dashboard" className='flex items-center gap-2'> {/* Logo links to dashboard */}
            <Image
                src="/logo1.svg"     // Path relative to the 'public' directory
                alt="Nypty Logo"     // Accessibility text
                width={100}          // ** ADJUST WIDTH AS NEEDED **
                height={32}         // ** ADJUST HEIGHT AS NEEDED **
                priority             // Load logo faster
            />
            {/* Optional: Add text next to logo if desired */}
            {/* <span className="text-lg font-semibold tracking-tight">Nypty</span> */}
        </Link>

        {/* You might remove or reposition the userEmail if the logo takes up space */}
        {/* {userEmail && (
          <p className="text-xs text-muted-foreground truncate mt-1" title={userEmail}>
            {userEmail}
          </p>
        )} */}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"} // Highlight active route
              className="w-full justify-start"
              asChild // Render as a Link component
            >
              <Link href={item.href}>
                <item.icon className={cn("mr-2 h-4 w-4", isActive ? "" : "text-muted-foreground")} />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>

      {/* Footer - Sign Out Button */}
      <div className="p-4 mt-auto border-t">
        <Button variant="outline" className="w-full justify-start" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}