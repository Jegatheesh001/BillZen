
"use client";

import React, { useState, useEffect } from 'react';
import { AddUserForm } from '@/components/settings/AddUserForm';
import { ManageCategories } from '@/components/settings/ManageCategories';
import { useAppData, type PersistenceMode } from '@/context/AppDataContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, WifiOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { 
    users, 
    persistenceMode, 
    togglePersistenceMode, 
    apiBaseUrl,
    setApiBaseUrl: setContextApiBaseUrl,
    isLoading: isAppLoading, 
    error: appError,
    clearError
  } = useAppData();
  const { toast } = useToast();
  const [localApiBaseUrl, setLocalApiBaseUrl] = useState(apiBaseUrl);

  useEffect(() => {
    setLocalApiBaseUrl(apiBaseUrl);
  }, [apiBaseUrl]);

  const handlePersistenceChange = (checked: boolean) => {
    const newMode: PersistenceMode = checked ? 'api' : 'inMemory';
    togglePersistenceMode(newMode);
  };

  const handleSaveApiUrl = () => {
    if (!localApiBaseUrl.trim()) {
      toast({
        title: "Invalid URL",
        description: "API Base URL cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    setContextApiBaseUrl(localApiBaseUrl.trim());
    // Toast for success is handled within AppDataContext after potential data reload
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
          <CardTitle>Persistence Configuration</CardTitle>
          <CardDescription>Control how and where your application data is stored.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="persistence-mode-switch" className="text-base font-medium">Data Storage Mode</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Switch
                id="persistence-mode-switch"
                checked={persistenceMode === 'api'}
                onCheckedChange={handlePersistenceChange}
                disabled={isAppLoading}
              />
              <Label htmlFor="persistence-mode-switch" className="flex-grow text-sm">
                {persistenceMode === 'api' ? 'API Mode (Backend)' : 'In-Memory Mode (Local)'}
              </Label>
              {isAppLoading && persistenceMode === 'api' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </div>
            {isAppLoading && persistenceMode === 'api' && (
              <p className="text-xs text-muted-foreground mt-1">Switching mode, please wait...</p>
            )}
          </div>
          
          {persistenceMode === 'api' && (
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="api-base-url" className="text-base font-medium">API Base URL</Label>
              <p className="text-xs text-muted-foreground">
                Set the root URL for the backend API. Changes will attempt to reload data from the new URL.
              </p>
              <div className="flex items-center space-x-2">
                <Input
                  id="api-base-url"
                  value={localApiBaseUrl}
                  onChange={(e) => setLocalApiBaseUrl(e.target.value)}
                  placeholder="e.g., https://your-api.com/api"
                  disabled={isAppLoading}
                  className="flex-grow"
                />
                <Button onClick={handleSaveApiUrl} disabled={isAppLoading || localApiBaseUrl === apiBaseUrl} size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Save URL
                </Button>
              </div>
            </div>
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
