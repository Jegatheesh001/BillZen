
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, UserCircle, Settings, Receipt } from 'lucide-react'; // Added Receipt
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/expenses', label: 'Dashboard', icon: LayoutDashboard }, 
  { href: '/my-expenses', label: 'Expenses', icon: Receipt }, // New Expenses tab
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/profile', label: 'Profile', icon: UserCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border shadow-md">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
                           (item.href === '/expenses' && pathname.startsWith('/expenses') && !pathname.startsWith('/my-expenses')) || // Dashboard active for /expenses but not /my-expenses
                           (item.href === '/my-expenses' && pathname.startsWith('/my-expenses')) || // Expenses active for /my-expenses
                           (item.href === '/settings' && pathname.startsWith('/settings'));
          return (
            <Link href={item.href} key={item.label} legacyBehavior>
              <a
                className={cn(
                  "flex flex-col items-center justify-center w-1/5 h-full text-sm transition-colors", // Adjusted width to 1/5 for 5 items
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className={cn("h-6 w-6 mb-0.5", isActive ? "fill-primary stroke-primary-foreground" : "")} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
