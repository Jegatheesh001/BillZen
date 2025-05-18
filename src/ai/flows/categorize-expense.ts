'use server';
/**
 * @fileOverview An expense categorization AI agent.
 *
 * - categorizeExpense - A function that handles the expense categorization process.
 * - CategorizeExpenseInput - The input type for the categorizeExpense function.
 * - CategorizeExpenseOutput - The return type for the categorizeExpense function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeExpenseInputSchema = z.object({
  description: z.string().describe('The description of the expense.'),
});
export type CategorizeExpenseInput = z.infer<typeof CategorizeExpenseInputSchema>;

const CategorizeExpenseOutputSchema = z.object({
  categorySuggestions: z
    .array(z.string())
    .describe('An array of suggested categories for the expense.'),
});
export type CategorizeExpenseOutput = z.infer<typeof CategorizeExpenseOutputSchema>;

export async function categorizeExpense(input: CategorizeExpenseInput): Promise<CategorizeExpenseOutput> {
  return categorizeExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeExpensePrompt',
  input: {schema: CategorizeExpenseInputSchema},
  output: {schema: CategorizeExpenseOutputSchema},
  prompt: `Given the following expense description, suggest up to 3 relevant categories.

Description: {{{description}}}

Categories:`,
});

const categorizeExpenseFlow = ai.defineFlow(
  {
    name: 'categorizeExpenseFlow',
    inputSchema: CategorizeExpenseInputSchema,
    outputSchema: CategorizeExpenseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
