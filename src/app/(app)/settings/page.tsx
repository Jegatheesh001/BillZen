
"use client";

import React, { useState } from 'react'; // Added useState for AlertDialog
import { AddUserForm } from '@/components/settings/AddUserForm';
import { ManageCategories } from '@/components/settings/ManageCategories';
import { useAppData } from '@/context/AppDataContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { WifiOff, Loader2, Mail, AlertTriangle, Trash2 } from 'lucide-react'; 

export default function SettingsPage() {
  const { 
    users, 
    isLoading: isAppLoading, 
    error: appError, 
    clearError,
    clearAllExpenses, 
  } = useAppData();
  const [isClearingExpenses, setIsClearingExpenses] = useState(false);

  const handleClearAllExpenses = async () => {
    setIsClearingExpenses(true);
    try {
      await clearAllExpenses();
      // Success toast is handled by AppDataContext
    } catch (e) {
      // Error toast is handled by AppDataContext
      console.error("Error clearing expenses from settings page:", e);
    } finally {
      setIsClearingExpenses(false);
    }
  };

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
              <ScrollArea className="h-60"> 
                <ul className="space-y-3"> 
                  {users.map(user => (
                    <li key={user.id} className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-md"> 
                      <Avatar className="h-10 w-10 mt-0.5"> 
                        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person portrait"/>
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        {user.email && (
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isAppLoading && users.length === 0 ? 'Still loading users...' : 'No users yet. Add some to get started!'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <ManageCategories />

      <Card className="shadow-lg rounded-xl border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isAppLoading || isClearingExpenses}>
                {isClearingExpenses ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Clear All Expenses
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all recorded expenses from the database. 
                  User, event, and category data will remain.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isClearingExpenses}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleClearAllExpenses} 
                  disabled={isClearingExpenses || isAppLoading}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  {isClearingExpenses && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Yes, delete all expenses
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-xs text-muted-foreground mt-2">
            This will remove all expense entries from Firebase.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
