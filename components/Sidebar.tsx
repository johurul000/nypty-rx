// components/Sidebar.tsx
import Link from 'next/link';
import { Button } from './ui/button'; // Make sure you've added button: npx shadcn@latest add button
import {
  LayoutDashboard, // Changed from Home for better dashboard icon
  Package,
  Store,
  BarChart2, // Changed from FileText for reports
  Settings,
  LogOut,
  Receipt, // Changed from DollarSign for billing
} from 'lucide-react'; // Make sure you've installed: npm install lucide-react

interface SidebarProps {
  userEmail?: string;
  onSignOut: () => void;
}

export default function Sidebar({ userEmail, onSignOut }: SidebarProps) {
  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/store-setup', label: 'Store Setup', icon: Store },
    { href: '/medicine-management', label: 'Medicines', icon: Package },
    { href: '/billing', label: 'Billing', icon: Receipt },
    { href: '/reports', label: 'Reports', icon: BarChart2 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 flex-shrink-0 bg-card text-card-foreground border-r flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b h-16 flex flex-col justify-center">
        <h2 className="text-lg font-semibold tracking-tight">NYPTY</h2>
        {userEmail && (
          <p className="text-xs text-muted-foreground truncate" title={userEmail}>
            {userEmail}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost" // Use ghost variant for sidebar items
            className="w-full justify-start"
            asChild // Use asChild to make the Button render as a Link
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        ))}
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