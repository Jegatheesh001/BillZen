"use client";

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
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

const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required."),
  memberIds: z.array(z.string()).min(1, "At least one member is required."),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface AddEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEventSheet({ open, onOpenChange }: AddEventSheetProps) {
  const { users, addEvent: addAppDataEvent } = useAppData();
  const { toast } = useToast();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: '',
      memberIds: users.map(u => u.id), // Default to all users
    },
  });

  function onSubmit(data: EventFormValues) {
    addAppDataEvent(data);
    toast({ title: "Event Created", description: `${data.name} has been created.` });
    form.reset();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-[90vw] p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>Create New Event</SheetTitle>
              <SheetDescription>
                Group expenses by creating an event. Select members for this event.
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Road Trip, Birthday Party" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="memberIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Members</FormLabel>
                      <div className="space-y-2 max-h-60 overflow-y-auto rounded-md border p-2">
                        {users.map((user) => (
                          <FormField
                            key={user.id}
                            control={form.control}
                            name="memberIds"
                            render={({ field }) => {
                              return (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 py-1">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(user.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), user.id])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== user.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {user.name}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <SheetFooter className="pt-4">
                  <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </SheetClose>
                  <Button type="submit">Create Event</Button>
                </SheetFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
