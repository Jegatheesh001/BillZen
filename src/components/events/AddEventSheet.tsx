
"use client";

import React, { useEffect, useState } from 'react';
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
import type { Event, EventFormData } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required."),
  memberIds: z.array(z.string()).min(1, "At least one member is required."),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface AddEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventToEdit?: Event | null;
}

export function AddEventSheet({ open, onOpenChange, eventToEdit }: AddEventSheetProps) {
  const { 
    users, 
    addEvent: addAppDataEvent, 
    updateEvent: updateAppDataEvent, 
    // isLoading, // Global loading state removed
    // persistenceMode // Removed
  } = useAppData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false); // Local submitting state


  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: '',
      memberIds: users.map(u => u.id),
    },
  });

  useEffect(() => {
    if (open && eventToEdit) {
      form.reset({
        name: eventToEdit.name,
        memberIds: eventToEdit.memberIds,
      });
    } else if (open && !eventToEdit) {
      form.reset({
        name: '',
        memberIds: users.map(u => u.id), 
      });
    }
  }, [open, eventToEdit, form, users]);

  async function onSubmit(data: EventFormValues) {
    setIsSubmitting(true);
    try {
      const eventData: EventFormData = data;
      if (eventToEdit) {
        await updateAppDataEvent(eventToEdit.id, eventData);
        toast({ title: "Event Updated", description: `${data.name} has been updated.` });
      } else {
        await addAppDataEvent(eventData);
        toast({ title: "Event Created", description: `${data.name} has been created.` });
      }
      form.reset({ name: '', memberIds: users.map(u => u.id) });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: eventToEdit ? "Failed to Update Event" : "Failed to Create Event",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const sheetTitle = eventToEdit ? "Edit Event" : "Create New Event";
  const sheetDescription = eventToEdit 
    ? "Modify the details of the event."
    : "Group expenses by creating an event. Select members for this event.";
  const submitButtonText = eventToEdit ? "Save Changes" : "Create Event";
  const formDisabled = isSubmitting; // Only local submitting state

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-[90vw] p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>{sheetTitle}</SheetTitle>
              <SheetDescription>
                {sheetDescription} {/* persistenceMode removed */}
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
                        <Input placeholder="e.g., Road Trip, Birthday Party" {...field} disabled={formDisabled}/>
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
                                      disabled={formDisabled}
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
                    <Button type="button" variant="outline" disabled={formDisabled}>Cancel</Button>
                  </SheetClose>
                  <Button type="submit" disabled={formDisabled}>
                    {formDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitButtonText}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
