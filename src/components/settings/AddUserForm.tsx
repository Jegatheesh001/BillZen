
"use client";

import React, { useState } from 'react'; // Added useState for local loading
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Loader2 } from 'lucide-react';

const addUserFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  avatarUrl: z.string().url("Must be a valid URL or empty.").optional().or(z.literal('')),
});

type AddUserFormValues = z.infer<typeof addUserFormSchema>;

export function AddUserForm() {
  const { addUser } = useAppData(); // Removed isLoading and persistenceMode from context destructuring
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false); // Local loading state

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserFormSchema),
    defaultValues: {
      name: '',
      avatarUrl: '',
    },
  });

  async function onSubmit(data: AddUserFormValues) {
    setIsSubmitting(true);
    try {
      const newUser = await addUser(data.name, data.avatarUrl || undefined);
      toast({
        title: "User Added",
        // Description simplified as persistenceMode is removed for now
        description: `${newUser.name} has been added.`, 
      });
      form.reset();
    } catch (error: any) {
      toast({
        title: "Failed to Add User",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter user's name" {...field} disabled={isSubmitting} />
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
                <Input placeholder="https://example.com/avatar.png" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add User
        </Button>
      </form>
    </Form>
  );
}
