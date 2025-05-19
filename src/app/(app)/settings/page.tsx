
"use client";

import React from 'react'; // Removed useState, useEffect as they are no longer needed for apiBaseUrl here
import { AddUserForm } from '@/components/settings/AddUserForm';
import { ManageCategories } from '@/components/settings/ManageCategories';
import { useAppData } from '@/context/AppDataContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Switch } from "@/components/ui/switch"; // Removed
// import { Input } from "@/components/ui/input"; // Removed
// import { Label } from "@/components/ui/label"; // Removed
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Removed
// import { WifiOff, Save } from 'lucide-react'; // Removed Save, WifiOff might be reused for Firebase errors
// import { Button } from '@/components/ui/button'; // Removed Button if only used for Save URL
// import { useToast } from '@/hooks/use-toast'; // Toast might still be used by child components

export default function SettingsPage() {
  const { 
    users, 
    // persistenceMode, // Removed
    // apiBaseUrl, // Removed
    // setApiBaseUrl: setContextApiBaseUrl, // Removed
    // isLoading: isAppLoading, // Removed (local form loading will handle its own)
    // error: appError, // Removed (local form errors or specific Firebase errors will be handled differently)
    // clearError // Removed
  } = useAppData();
  // const { toast } = useToast(); // Keep if child components might use it, or remove
  // const [localApiBaseUrl, setLocalApiBaseUrl] = useState(apiBaseUrl); // Removed

  // useEffect(() => { // Removed
  //   setLocalApiBaseUrl(apiBaseUrl);
  // }, [apiBaseUrl]);

  // const handlePersistenceChange = (checked: boolean) => { // Removed
  //   const newMode: PersistenceMode = checked ? 'api' : 'inMemory';
  //   togglePersistenceMode(newMode);
  // };

  // const handleSaveApiUrl = () => { // Removed
  //   if (!localApiBaseUrl.trim()) {
  //     toast({
  //       title: "Invalid URL",
  //       description: "API Base URL cannot be empty.",
  //       variant: "destructive",
  //     });
  //     return;
  //   }
  //   setContextApiBaseUrl(localApiBaseUrl.trim());
  // };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Settings</h2>
      </div>

      {/* 
        The API error Alert and Persistence Configuration Card have been removed.
        Error handling for Firebase operations will be more specific, likely within AppDataContext 
        or directly in components performing Firebase actions.
      */}

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>Add new users to BillZen. All data is currently stored in-memory.</CardDescription> 
        </CardHeader>
        <CardContent className="space-y-4">
          <AddUserForm />
          {/* Key ensures re-render if users array reference changes, which it will with Firebase updates */}
          <div key={`user-list-${users.length}`}>
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
              // TODO: Update this message once Firebase loading state is available
              <p className="text-sm text-muted-foreground">{'No users yet.'}</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <ManageCategories />

    </div>
  );
}
