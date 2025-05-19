
"use client";

import React from 'react';
import { AddUserForm } from '@/components/settings/AddUserForm';
import { ManageCategories } from '@/components/settings/ManageCategories';
import { useAppData } from '@/context/AppDataContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WifiOff, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { 
    users, 
    isLoading: isAppLoading, 
    error: appError, 
    clearError 
  } = useAppData();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Settings</h2>
      </div>

      {appError && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Application Error</AlertTitle>
          <AlertDescription>
            {appError} <button onClick={clearError} className="underline ml-2">Dismiss</button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>Add new users to BillZen. Data is stored in Firebase.</CardDescription> 
        </CardHeader>
        <CardContent className="space-y-4">
          <AddUserForm />
          <div key={`user-list-${users.length}-${isAppLoading}`}>
            <h3 className="text-md font-medium mt-6 mb-2">Current Users:</h3>
            {isAppLoading && users.length === 0 ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading users...</p>
              </div>
            ) : users.length > 0 ? (
              <ScrollArea className="h-40">
                <ul className="space-y-2">
                  {users.map(user => (
                    <li key={user.id} className="flex items-center space-x-3 p-2 bg-secondary/30 rounded-md">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person portrait"/>
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isAppLoading ? 'Loading...' : 'No users yet. Add some to get started!'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <ManageCategories />

    </div>
  );
}
