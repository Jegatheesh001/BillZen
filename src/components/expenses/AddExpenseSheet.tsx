
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAppData } from '@/context/AppDataContext';
import { categorizeExpense } from '@/ai/flows/categorize-expense';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const expenseFormSchema = z.object({
  description: z.string().min(1, "Description is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  paidById: z.string().min(1, "Payer is required."),
  participantIds: z.array(z.string()).min(1, "At least one participant is required."),
  eventId: z.string().optional(),
  category: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface AddExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DUMMY_EMPTY_CUSTOM_CATEGORY_VALUE = "_empty_custom_category_";
const NO_CATEGORY_VALUE = "_none_";

export function AddExpenseSheet({ open, onOpenChange }: AddExpenseSheetProps) {
  const { users, events, addExpense: addAppDataExpense } = useAppData();
  const { toast } = useToast();
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: '',
      amount: 0,
      paidById: users[0]?.id || '',
      participantIds: users.map(u => u.id), // Default to all users
      eventId: '',
      category: '', // Initially, category is an empty string (shows placeholder)
    },
  });

  const watchedDescription = form.watch('description');

  const handleCategorize = useCallback(async (description: string) => {
    if (!description || description.length < 3) {
      setSuggestedCategories([]);
      return;
    }
    setIsCategorizing(true);
    try {
      const result = await categorizeExpense({ description });
      setSuggestedCategories(result.categorySuggestions || []);
    } catch (error) {
      console.error("AI categorization failed:", error);
      setSuggestedCategories([]);
      toast({
        title: "Categorization Error",
        description: "Could not fetch category suggestions.",
        variant: "destructive",
      });
    } finally {
      setIsCategorizing(false);
    }
  }, [toast]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (watchedDescription) {
        handleCategorize(watchedDescription);
      }
    }, 1000); // Debounce AI call
    return () => clearTimeout(debounceTimer);
  }, [watchedDescription, handleCategorize]);

  function onSubmit(data: ExpenseFormValues) {
    let categoryToSave = data.category;

    if (categoryToSave === NO_CATEGORY_VALUE || categoryToSave === '') {
      // If "No Category" was selected, or if the custom input was cleared (making form value an empty string, showing placeholder)
      categoryToSave = undefined;
    }
    // The DUMMY_EMPTY_CUSTOM_CATEGORY_VALUE should not be selected as its item is disabled.
    // Any other string value (suggested category or typed custom category) is kept as is.

    addAppDataExpense({ ...data, category: categoryToSave });
    toast({ title: "Expense Added", description: `${data.description} for $${data.amount} added.` });
    
    // Reset form to default values, including category to ''
    form.reset({
        description: '',
        amount: 0,
        paidById: users[0]?.id || '',
        participantIds: users.map(u => u.id),
        eventId: '',
        category: '', 
      });
    setSuggestedCategories([]);
    setCustomCategory(''); // Also reset the local customCategory state
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-[90vw] p-0">
        <ScrollArea className="h-full">
        <div className="p-6">
        <SheetHeader>
          <SheetTitle>Add New Expense</SheetTitle>
          <SheetDescription>
            Fill in the details of the expense. Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dinner tacos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paidById"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid by</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select who paid" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="participantIds"
              render={() => (
                <FormItem>
                  <FormLabel>Participants</FormLabel>
                  <div className="space-y-2">
                    {users.map((user) => (
                      <FormField
                        key={user.id}
                        control={form.control}
                        name="participantIds"
                        render={({ field }) => {
                          return (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {user.name}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to an event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No Event</SelectItem> {/* This is fine, it's for a different Select */}
                      {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  {isCategorizing && <Loader2 className="h-4 w-4 animate-spin inline-block ml-2" />}
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suggestedCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      {suggestedCategories.length > 0 && <hr className="my-1"/>}
                      {/* Ensure customCategory item has non-empty value. It's disabled if customCategory is empty. */}
                      <SelectItem 
                        value={customCategory || DUMMY_EMPTY_CUSTOM_CATEGORY_VALUE} 
                        disabled={!customCategory}
                      >
                        {customCategory || "Enter custom below"}
                      </SelectItem>
                      <SelectItem value={NO_CATEGORY_VALUE}>No Category</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Or type a custom category" 
                    value={customCategory}
                    onChange={(e) => {
                      const typedValue = e.target.value;
                      setCustomCategory(typedValue);
                      field.onChange(typedValue); // Set form value to custom if typed
                    }}
                    className="mt-2"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </SheetClose>
              <Button type="submit">Save Expense</Button>
            </SheetFooter>
          </form>
        </Form>
        </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

