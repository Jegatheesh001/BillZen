import type { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-center h-16 bg-primary text-primary-foreground shadow-md">
        <h1 className="text-2xl font-semibold">BillZen</h1>
      </header>
      <main className="flex-grow overflow-auto pb-20 pt-4 px-4"> 
        {/* pb-20 to avoid overlap with bottom nav, pt-4 px-4 for content padding */}
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
}
