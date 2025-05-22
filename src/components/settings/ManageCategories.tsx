
"use client";

import React, { useState } from 'react';
import type { Category } from '@/lib/types'; // Ensure Category type is imported
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit3, Trash2, XCircle, CheckCircle, Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';


export function ManageCategories() {
  const { categories, addCategory, updateCategory, removeCategory, isLoading: isAppLoading } = useAppData();
  const [newCategory, setNewCategory] = useState('');
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null); // Changed to Category | null
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for confirmation dialog for category removal
  const [categoryToRemove, setCategoryToRemove] = useState<Category | null>(null);
  const [isRemoveAlertOpen, setIsRemoveAlertOpen] = useState(false);


  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast({ title: "Error", description: "Category name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const createdCategory = await addCategory(newCategory); // addCategory now returns Category | null
      if (createdCategory) {
        toast({ title: "Category Added", description: `"${createdCategory.name}" has been added.` });
        setNewCategory('');
      } else {
        // Error toast for existing category is handled by addCategory itself now.
      }
    } catch (error: any) {
       toast({ title: "Error Adding Category", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (category: Category) => { // Accepts Category object
    setEditingCategory(category);
    setEditedCategoryName(category.name);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editedCategoryName.trim()) {
      toast({ title: "Error", description: "Category name cannot be empty.", variant: "destructive" });
      return;
    }
    if (editedCategoryName.trim().toLowerCase() === editingCategory.name.toLowerCase()) {
       setIsEditDialogOpen(false); 
       return;
    }
    setIsSubmitting(true);
    try {
      // updateCategory expects (categoryId: string, newCategoryName: string)
      const success = await updateCategory(editingCategory.id, editedCategoryName);
      if (success) {
        toast({ title: "Category Updated", description: `"${editingCategory.name}" updated to "${editedCategoryName}".` });
      } else {
         // Error toast for existing category handled by updateCategory
      }
    } catch (error: any) {
       toast({ title: "Error Updating Category", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsEditDialogOpen(false);
      setEditingCategory(null);
    }
  };

  const confirmRemoveCategory = (category: Category) => {
    setCategoryToRemove(category);
    setIsRemoveAlertOpen(true);
  };

  const executeRemoveCategory = async () => {
    if (!categoryToRemove) return;
    setIsSubmitting(true);
    try {
      // removeCategory expects (categoryId: string)
      await removeCategory(categoryToRemove.id);
      toast({ title: "Category Removed", description: `"${categoryToRemove.name}" has been removed.` });
    } catch (error: any) {
       toast({ title: "Error Removing Category", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsRemoveAlertOpen(false);
      setCategoryToRemove(null);
    }
  };
  
  const formDisabled = isSubmitting || isAppLoading;

  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle>Manage Expense Categories</CardTitle>
        <CardDescription>Add, edit, or remove expense categories. Data is stored in Firebase.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2 items-end">
          <div className="flex-grow">
            <Label htmlFor="newCategoryInput" className="mb-1 text-sm font-medium">New Category Name</Label>
            <Input
              id="newCategoryInput"
              type="text"
              placeholder="e.g., Subscriptions"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full"
              disabled={formDisabled}
            />
          </div>
          <Button 
            onClick={handleAddCategory} 
            size="icon" 
            variant="outline" 
            aria-label="Add new category"
            title="Add new category"
            disabled={formDisabled}
          >
            {isSubmitting && !isAppLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />}
          </Button>
        </div>

        <div>
          <h3 className="text-md font-medium mb-2">Current Categories:</h3>
          {isAppLoading && categories.length === 0 ? (
             <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading categories...</p>
              </div>
          ) : categories.length > 0 ? (
            <ScrollArea className="h-60 border rounded-md">
              <ul className="p-2">
                {categories.map((category) => ( // category is now {id: string, name: string}
                  <li
                    key={category.id} // Use category.id as the key
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md group"
                  >
                    <span>{category.name}</span> {/* Display category.name */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(category)} disabled={formDisabled}>
                        <Edit3 className="h-4 w-4" />
                         <span className="sr-only">Edit {category.name}</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive hover:text-destructive" 
                        onClick={() => confirmRemoveCategory(category)} // Pass category object
                        disabled={formDisabled}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove {category.name}</span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isAppLoading ? 'Loading...' : 'No categories defined yet. Add some!'}
            </p>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!formDisabled) setIsEditDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Change the name of the category "{editingCategory?.name}". {/* Use editingCategory.name */}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="editCategoryName">New Category Name</Label>
            <Input
              id="editCategoryName"
              value={editedCategoryName}
              onChange={(e) => setEditedCategoryName(e.target.value)}
              placeholder="Enter new category name"
              disabled={isSubmitting || isAppLoading}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => { if (!formDisabled) setEditingCategory(null);}} disabled={isSubmitting || isAppLoading}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={isSubmitting || isAppLoading}>
              {(isSubmitting && !isAppLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Alert Dialog */}
      <AlertDialog open={isRemoveAlertOpen} onOpenChange={setIsRemoveAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove the category "{categoryToRemove?.name}". 
              Expenses using this category will have it cleared. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting || isAppLoading} onClick={() => setCategoryToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeRemoveCategory} 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isSubmitting || isAppLoading}
            >
              {(isSubmitting && !isAppLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
