"use client";

import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/hooks/use-toast';
import { Camera } from 'lucide-react';

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  avatarUrl: z.string().url("Must be a valid URL for avatar.").optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm() {
  const { currentUser, updateUser, setCurrentUserById, users } = useAppData();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUser?.id || null);


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      avatarUrl: '',
    },
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl,
      });
      setSelectedUserId(currentUser.id);
    } else if (users.length > 0 && !currentUser) {
      // If no current user but users exist, set the first one as current
      setCurrentUserById(users[0].id);
      setSelectedUserId(users[0].id);
    }
  }, [currentUser, form, users, setCurrentUserById]);
  
  const handleUserChange = (userId: string) => {
    setCurrentUserById(userId);
    setSelectedUserId(userId);
  };


  function onSubmit(data: ProfileFormValues) {
    if (!currentUser) {
      toast({ title: "Error", description: "No user selected.", variant: "destructive" });
      return;
    }
    const newAvatarUrl = data.avatarUrl || `https://placehold.co/100x100.png?text=${data.name.charAt(0).toUpperCase()}`;
    updateUser(currentUser.id, data.name, newAvatarUrl);
    toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
  }

  if (!currentUser && users.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No users available. Please add users first (feature to be implemented).</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!currentUser && users.length > 0 && !selectedUserId) {
     // This case should ideally be handled by useEffect setting a default user.
     // If still no current user, prompt to select one.
     return (
        <Card className="w-full max-w-md mx-auto shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle>Select Profile</CardTitle>
            <CardDescription>Choose a profile to view or edit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
             {users.map(user => (
                <Button key={user.id} variant="outline" className="w-full justify-start" onClick={() => handleUserChange(user.id)}>
                   <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={user.avatarUrl} data-ai-hint="person portrait"/>
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                   </Avatar>
                   {user.name}
                </Button>
             ))}
          </CardContent>
        </Card>
     )
  }


  return (
    <Card className="w-full max-w-md mx-auto shadow-xl rounded-xl">
      <CardHeader className="items-center text-center">
         <div className="relative group mb-4">
          <Avatar className="w-24 h-24 text-4xl border-4 border-primary/50 shadow-md">
            <AvatarImage src={form.watch('avatarUrl') || currentUser?.avatarUrl} alt={currentUser?.name} data-ai-hint="person portrait"/>
            <AvatarFallback>{currentUser?.name.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
           <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
             onClick={() => { /* Open avatar change modal or input */ alert("Avatar change feature: To prompt for URL or upload.")}}>
            <Camera className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl">{currentUser?.name || 'User Profile'}</CardTitle>
        <CardDescription>Manage your personal information.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/avatar.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Save Changes
            </Button>
          </form>
        </Form>
        { users.length > 1 && (
          <div className="mt-8">
            <Label>Switch Profile:</Label>
            <div className="space-y-2 mt-2">
            {users.filter(u => u.id !== currentUser?.id).map(user => (
              <Button key={user.id} variant="outline" className="w-full justify-start" onClick={() => handleUserChange(user.id)}>
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={user.avatarUrl} data-ai-hint="person portrait"/>
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {user.name}
              </Button>
            ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
