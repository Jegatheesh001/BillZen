
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { AppDataProvider } from '@/context/AppDataContext';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/context/ThemeContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BillZen',
  description: 'Split expenses with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AppDataProvider>
            {children}
            <Toaster />
          </AppDataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
