
"use client";

import React, { useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit3, Trash2, XCircle, CheckCircle } from 'lucide-react';
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
  const { categories, addCategory, updateCategory, removeCategory } = useAppData();
  const [newCategory, setNewCategory] = useState('');
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast({ title: "Error", description: "Category name cannot be empty.", variant: "destructive" });
      return;
    }
    const success = addCategory(newCategory);
    if (success) {
      toast({ title: "Category Added", description: `"${newCategory}" has been added.` });
      setNewCategory('');
    } else {
      toast({ title: "Already Exists", description: `Category "${newCategory}" already exists.`, variant: "destructive" });
    }
  };

  const handleEditClick = (category: string) => {
    setCategoryToEdit(category);
    setEditedCategoryName(category);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!categoryToEdit || !editedCategoryName.trim()) {
      toast({ title: "Error", description: "Category name cannot be empty.", variant: "destructive" });
      return;
    }
    if (editedCategoryName.trim().toLowerCase() === categoryToEdit.toLowerCase()) {
       setIsEditDialogOpen(false); // Name hasn't changed
       return;
    }
    const success = updateCategory(categoryToEdit, editedCategoryName);
    if (success) {
      toast({ title: "Category Updated", description: `"${categoryToEdit}" updated to "${editedCategoryName}".` });
    } else {
       toast({ title: "Already Exists", description: `Category "${editedCategoryName}" already exists.`, variant: "destructive" });
    }
    setIsEditDialogOpen(false);
    setCategoryToEdit(null);
  };

  const handleRemoveCategory = (categoryName: string) => {
    removeCategory(categoryName);
    toast({ title: "Category Removed", description: `"${categoryName}" has been removed.` });
  };

  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle>Manage Expense Categories</CardTitle>
        <CardDescription>Add, edit, or remove expense categories.</CardDescription>
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
            />
          </div>
          <Button onClick={handleAddCategory} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>

        <div>
          <h3 className="text-md font-medium mb-2">Current Categories:</h3>
          {categories.length > 0 ? (
            <ScrollArea className="h-60 border rounded-md">
              <ul className="p-2">
                {categories.map((category) => (
                  <li
                    key={category}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md group"
                  >
                    <span>{category}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(category)}>
                        <Edit3 className="h-4 w-4" />
                         <span className="sr-only">Edit {category}</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove {category}</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will remove the category "{category}". Expenses using this category will have it cleared.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveCategory(category)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No categories defined yet. Add some!</p>
          )}
        </div>
      </CardContent>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Change the name of the category "{categoryToEdit}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="editCategoryName">New Category Name</Label>
            <Input
              id="editCategoryName"
              value={editedCategoryName}
              onChange={(e) => setEditedCategoryName(e.target.value)}
              placeholder="Enter new category name"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setCategoryToEdit(null)}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSaveEdit}>
              <CheckCircle className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
