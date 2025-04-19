// components/Sidebar.tsx
'use client'; // Needed for onClick handler

import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Use Shadcn Button
import { usePathname } from 'next/navigation'; // Hook to detect active route
import { cn } from '@/lib/utils'; // Utility for conditional classes
import {
  LayoutDashboard,
  Package,
  Store,
  BarChart3,
  Settings,
  LogOut,
  Receipt, // Billing icon
} from 'lucide-react';

interface SidebarProps {
  userEmail?: string;
  onSignOut: () => void; // Function passed from AppLayout
}

export default function Sidebar({ userEmail, onSignOut }: SidebarProps) {
  const pathname = usePathname(); // Get current path

  // Define menu items
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
      {/* Header */}
      <div className="p-4 border-b h-16 flex flex-col justify-center">
        <h2 className="text-lg font-semibold tracking-tight">CRM App</h2>
        {userEmail && (
          <p className="text-xs text-muted-foreground truncate" title={userEmail}>
            {userEmail}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto"> {/* Reduced padding */}
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard'); // Basic active check
          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"} // Highlight active link
              className="w-full justify-start"
              asChild // Render as Link child
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