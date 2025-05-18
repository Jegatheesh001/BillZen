
"use client";

import React, { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import type { Expense } from '@/lib/types';

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
  expenseToEdit?: Expense | null;
}

const DUMMY_EMPTY_CUSTOM_CATEGORY_VALUE = "_dummy_empty_custom_category_";
const NO_CATEGORY_VALUE = "_no_category_";
const NO_EVENT_VALUE = "_no_event_";

export function AddExpenseSheet({ open, onOpenChange, expenseToEdit }: AddExpenseSheetProps) {
  const { users, events, categories, addCategory, addExpense: addAppDataExpense, updateExpense: updateAppDataExpense, currentUser } = useAppData();
  const { toast } = useToast();
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: '',
      amount: 0,
      paidById: currentUser?.id || users[0]?.id || '',
      participantIds: users.map(u => u.id),
      eventId: '',
      category: '',
    },
  });

  useEffect(() => {
    if (open && expenseToEdit) {
      form.reset({
        description: expenseToEdit.description,
        amount: expenseToEdit.amount,
        paidById: expenseToEdit.paidById,
        participantIds: expenseToEdit.participantIds,
        eventId: expenseToEdit.eventId || NO_EVENT_VALUE,
        category: expenseToEdit.category || NO_CATEGORY_VALUE,
      });
      // If the category being edited is not in the predefined list, it's a custom one.
      // We don't need to set customCategoryInput here as it's primarily for *new* custom categories.
      // The Select component will handle displaying it if it matches a value.
      setCustomCategoryInput(''); 
    } else if (open && !expenseToEdit) { 
      form.reset({
        description: '',
        amount: 0,
        paidById: currentUser?.id || users[0]?.id || '',
        participantIds: users.map(u => u.id),
        eventId: NO_EVENT_VALUE,
        category: NO_CATEGORY_VALUE,
      });
      setCustomCategoryInput('');
    }
  }, [open, expenseToEdit, form, users, currentUser]);


  function onSubmit(data: ExpenseFormValues) {
    let categoryToSave = data.category;

    if (customCategoryInput.trim()) { // Prioritize typed custom category
      categoryToSave = customCategoryInput.trim();
      if (!categories.find(c => c.toLowerCase() === categoryToSave!.toLowerCase())) {
        addCategory(categoryToSave!); // Add to global list if new
      }
    } else if (categoryToSave === NO_CATEGORY_VALUE || categoryToSave === DUMMY_EMPTY_CUSTOM_CATEGORY_VALUE) {
      categoryToSave = undefined;
    }
    
    let eventIdToSave = data.eventId;
    if (eventIdToSave === NO_EVENT_VALUE || eventIdToSave === '') {
      eventIdToSave = undefined;
    }
    
    const finalExpenseData = { ...data, category: categoryToSave, eventId: eventIdToSave };

    if (expenseToEdit) {
      updateAppDataExpense(expenseToEdit.id, finalExpenseData);
      toast({ title: "Expense Updated", description: `${data.description} has been updated.` });
    } else {
      addAppDataExpense(finalExpenseData);
      toast({ title: "Expense Added", description: `${data.description} for $${data.amount} added.` });
    }
    
    form.reset({
        description: '',
        amount: 0,
        paidById: currentUser?.id || users[0]?.id || '',
        participantIds: users.map(u => u.id),
        eventId: NO_EVENT_VALUE,
        category: NO_CATEGORY_VALUE,
      });
    setCustomCategoryInput('');
    onOpenChange(false); 
  }
  
  const sheetTitle = expenseToEdit ? "Edit Expense" : "Add New Expense";
  const sheetDescription = expenseToEdit 
    ? "Modify the details of the expense."
    : "Fill in the details of the expense. Click save when you're done.";
  const submitButtonText = expenseToEdit ? "Save Changes" : "Save Expense";

  const currentCategoryValue = form.watch('category');
  const displayCategories = [...categories];
  if (expenseToEdit?.category && !categories.includes(expenseToEdit.category)) {
    // If editing and the expense has a category not in the global list, add it for selection
    displayCategories.push(expenseToEdit.category);
    displayCategories.sort();
  }


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-[90vw] p-0">
        <ScrollArea className="h-full">
        <div className="p-6">
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                   <ScrollArea className="h-32 rounded-md border p-2">
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
                  </ScrollArea>
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
                  <Select onValueChange={field.onChange} value={field.value || NO_EVENT_VALUE} >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to an event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_EVENT_VALUE}>No Event</SelectItem>
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
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== DUMMY_EMPTY_CUSTOM_CATEGORY_VALUE) {
                        setCustomCategoryInput(''); // Clear custom input if a select option is chosen
                      }
                    }} 
                    value={customCategoryInput.trim() ? DUMMY_EMPTY_CUSTOM_CATEGORY_VALUE : field.value || NO_CATEGORY_VALUE}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY_VALUE}>No Category</SelectItem>
                      {displayCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      {/* This item represents the custom input. It's selected if custom input has text. */}
                      <SelectItem 
                        value={DUMMY_EMPTY_CUSTOM_CATEGORY_VALUE}
                        className={customCategoryInput.trim() ? '' : 'hidden'} // Show if custom input has text
                      >
                        {customCategoryInput.trim() || "Custom..."} 
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Or type a new/custom category" 
                    value={customCategoryInput}
                    onChange={(e) => {
                      const typedValue = e.target.value;
                      setCustomCategoryInput(typedValue);
                      // If user types, select the dummy "custom" item to indicate custom input is active
                      if (typedValue.trim()) {
                        field.onChange(DUMMY_EMPTY_CUSTOM_CATEGORY_VALUE); 
                      } else if (currentCategoryValue === DUMMY_EMPTY_CUSTOM_CATEGORY_VALUE) {
                        // If input is cleared and dummy was selected, revert to "No Category"
                        field.onChange(NO_CATEGORY_VALUE);
                      }
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
              <Button type="submit">{submitButtonText}</Button>
            </SheetFooter>
          </form>
        </Form>
        </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
