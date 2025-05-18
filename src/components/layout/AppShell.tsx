
"use client"; // Required because useTheme and useAppData are client hooks

import type { ReactNode } from 'react';
import Link from 'next/link';
import { BottomNavigation } from './BottomNavigation';
import { Button } from '@/components/ui/button';
import { Moon, Sun, User } from 'lucide-react'; // Added User icon
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext'; // Added
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Added

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useAppData();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-primary text-primary-foreground shadow-md">
        {/* Theme Toggle Button - Moved to the left */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>

        {/* App Title */}
        <h1 className="text-2xl font-semibold">BillZen</h1>

        {/* User Avatar - Moved to the right, links to profile */}
        <div className="w-8"> {/* Ensures consistent width for layout balance */}
          {currentUser ? (
            <Link href="/profile" passHref legacyBehavior>
              <a aria-label="View profile">
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="person portrait"/>
                  <AvatarFallback>{currentUser.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </a>
            </Link>
          ) : (
            // Placeholder if no current user
            <div className="h-8 w-8 rounded-full bg-primary-foreground/10 flex items-center justify-center" aria-label="No user selected">
              <User className="h-5 w-5 text-primary-foreground/60" />
            </div>
          )}
        </div>
      </header>
      <main className="flex-grow overflow-auto pb-20 pt-4 px-4">
        {/* pb-20 to avoid overlap with bottom nav, pt-4 px-4 for content padding */}
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
}
