import Link from 'next/link';
import { Button } from './ui/button';
import { Home, Package, Store, FileText, Settings, LogOut, DollarSign } from 'lucide-react'; // Example icons

interface SidebarProps {
  userEmail?: string;
  onSignOut: () => void;
}

export default function Sidebar({ userEmail, onSignOut }: SidebarProps) {
  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/store-setup', label: 'Store Setup', icon: Store },
    { href: '/medicine-management', label: 'Medicines', icon: Package },
    { href: '/billing', label: 'Billing', icon: DollarSign },
    { href: '/reports', label: 'Reports', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white shadow-md flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">NYPTY</h2>
        {userEmail && <p className="text-sm text-gray-500 truncate">{userEmail}</p>}
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Button key={item.href} variant="ghost" className="w-full justify-start" asChild>
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full justify-start" onClick={onSignOut}>
           <LogOut className="mr-2 h-4 w-4" />
           Sign Out
        </Button>
      </div>
    </aside>
  );
}