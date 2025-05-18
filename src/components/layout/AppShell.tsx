
"use client"; // Required because useTheme is a client hook

import type { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-primary text-primary-foreground shadow-md">
        <div className="w-10"></div> {/* Placeholder for left alignment if needed */}
        <h1 className="text-2xl font-semibold">BillZen</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          aria-label="Toggle theme"
          className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </header>
      <main className="flex-grow overflow-auto pb-20 pt-4 px-4"> 
        {/* pb-20 to avoid overlap with bottom nav, pt-4 px-4 for content padding */}
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
}
