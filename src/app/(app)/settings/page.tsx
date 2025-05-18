
"use client";

import React from 'react';
import { AddUserForm } from '@/components/settings/AddUserForm';
import { ManageCategories } from '@/components/settings/ManageCategories';
import { useAppData, type PersistenceMode } from '@/context/AppDataContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { 
    users, 
    persistenceMode, 
    togglePersistenceMode, 
    isLoading: isAppLoading, 
    error: appError,
    clearError
  } = useAppData();

  const handlePersistenceChange = (checked: boolean) => {
    const newMode: PersistenceMode = checked ? 'api' : 'inMemory';
    togglePersistenceMode(newMode);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Settings</h2>
      </div>

      {appError && (
        <Alert variant="destructive" className="mb-4">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Application Error</AlertTitle>
          <AlertDescription>
            {appError}
            <Button variant="link" size="sm" onClick={clearError} className="p-0 h-auto ml-2 text-destructive-foreground underline">Dismiss</Button>
          </AlertDescription>
        </Alert>
      )}


      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Persistence Mode</CardTitle>
          <CardDescription>Switch between in-memory (local) and API (backend) data storage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="persistence-mode"
              checked={persistenceMode === 'api'}
              onCheckedChange={handlePersistenceChange}
              disabled={isAppLoading}
            />
            <Label htmlFor="persistence-mode" className="flex-grow">
              {persistenceMode === 'api' ? 'API Mode (Backend)' : 'In-Memory Mode (Local)'}
            </Label>
            {isAppLoading && persistenceMode === 'api' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
           {isAppLoading && (
            <p className="text-sm text-muted-foreground mt-2">Switching mode, please wait...</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>Add new users to BillZen. Current mode: {persistenceMode}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddUserForm />
          <div key={`user-list-${users.length}-${persistenceMode}`}> {/* Added dynamic key here */}
            <h3 className="text-md font-medium mt-6 mb-2">Current Users:</h3>
            {users.length > 0 ? (
              <ScrollArea className="h-40">
                <ul className="space-y-2">
                  {users.map(user => (
                    <li key={user.id} className="flex items-center space-x-3 p-2 bg-secondary/30 rounded-md">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">{isAppLoading && persistenceMode === 'api' ? 'Loading users...' : 'No users yet.'}</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <ManageCategories />

    </div>
  );
}
