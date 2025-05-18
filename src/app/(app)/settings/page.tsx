
"use client";

import React from 'react';
import { AddUserForm } from '@/components/settings/AddUserForm';
import { ManageCategories } from '@/components/settings/ManageCategories';
import { useAppData } from '@/context/AppDataContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SettingsPage() {
  const { users } = useAppData();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Settings</h2>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>Add new users to BillZen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddUserForm />
          <div key={`user-list-${users.length}`}> {/* Added dynamic key here */}
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
              <p className="text-sm text-muted-foreground">No users yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <ManageCategories />

    </div>
  );
}
