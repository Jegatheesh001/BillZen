
# BillZen - Expense Sharing App

BillZen is a modern web application designed to simplify expense sharing and tracking among a group of users. It allows users to manage shared expenses, create events, track who owes whom, and settle debts with ease.

## Key Features

*   **User Management:**
    *   Add multiple users to the system.
    *   Assign names and avatar URLs (defaults to placeholder avatars).
    *   Switch between user profiles to view the app from different perspectives.
*   **Expense Tracking:**
    *   Add new expenses with descriptions, amounts, and dates.
    *   Assign who paid for the expense.
    *   Select multiple participants who shared the expense.
    *   Edit existing expenses.
*   **Event Management:**
    *   Create events (e.g., "Road Trip", "Dinner Party") to group related expenses.
    *   Assign specific members to events.
    *   Edit event details and member lists.
*   **Dynamic Balance Summary:**
    *   View a clear summary of who owes whom.
    *   The summary is dynamically updated based on the currently selected user profile, showing amounts owed to them or by them.
*   **Payment Settlement:**
    *   Record payments made between users to settle outstanding debts.
    *   Option to enter partial or full settlement amounts.
*   **Category Management:**
    *   A predefined list of expense categories.
    *   Add new custom categories.
    *   Edit existing category names.
    *   Remove categories (this will clear the category from associated expenses).
*   **Profile Switching & Editing:**
    *   Easily switch the active user profile to see personalized views and balances.
    *   Update the name and avatar URL for the selected user profile.
*   **Theme Customization:**
    *   Switch between light and dark mode themes.
    *   Theme preference is saved in local storage.
*   **Responsive Design:**
    *   User-friendly interface optimized for both desktop and mobile devices.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://reactjs.org/)
*   **Component Library:** [ShadCN UI](https://ui.shadcn.com/) - Beautifully designed components that you can copy and paste into your apps.
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework.
*   **State Management:** React Context API for global state (users, expenses, events, categories, current user, theme).
*   **AI (Optional Backend):** [Genkit (by Firebase)](https://firebase.google.com/docs/genkit) - Integrated for potential AI features. (Note: AI-driven expense categorization was initially present but later replaced with hardcoded/user-managed categories to remove API key dependency for core functionality). The Genkit setup remains.
*   **Linting & Formatting:** ESLint, Prettier (implied by Next.js standards)

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 18.x or later recommended)
*   [npm](https://www.npmjs.com/) (comes with Node.js) or [yarn](https://yarnpkg.com/)

### Installation

1.  Clone the repository (if applicable) or ensure you have the project files.
2.  Navigate to the project directory:
    ```bash
    cd your-project-directory
    ```
3.  Install the dependencies:
    ```bash
    npm install
    # or
    # yarn install
    ```

### Running the Development Server

To start the Next.js development server:

```bash
npm run dev
# or
# yarn dev
```

The application will typically be available at `http://localhost:9002`.

*(Optional) Running the Genkit Development Server (if re-enabling or using Genkit AI features):*
If you plan to use or develop features that interact with Genkit flows (e.g., AI models), you might need to run the Genkit development server in a separate terminal:
```bash
npm run genkit:dev
```
This usually requires API keys (e.g., for Google AI Studio) to be set up in a `.env` file.

## Data Persistence

Currently, the application uses React Context and `useState` for in-memory data storage. This means:
*   Data (users, expenses, events, categories) is initialized with default values.
*   Any changes made during a session are **not persisted** if you close the browser tab or refresh the page. The app will reset to its initial state.
*   This setup is ideal for rapid prototyping and demonstration. For persistent storage, integration with a backend database (like Firebase Firestore, Supabase, or a custom API with a database like PostgreSQL/MongoDB) would be required. The application's data logic is centralized in `src/context/AppDataContext.tsx`, which is designed to simplify future integration with a persistent storage layer.

## Project Structure (Key Directories)

*   `src/app/`: Contains the pages and layouts for the Next.js App Router.
    *   `src/app/(app)/`: Group for authenticated/main app routes (expenses, events, profile, settings).
*   `src/components/`: Reusable UI components.
    *   `src/components/ui/`: ShadCN UI components.
    *   `src/components/layout/`: Layout components like AppShell, BottomNavigation.
    *   `src/components/expenses/`, `src/components/events/`, etc.: Feature-specific components.
*   `src/context/`: React Context providers (e.g., `AppDataContext.tsx`, `ThemeContext.tsx`).
*   `src/lib/`: Utility functions, type definitions (`types.ts`), data calculation logic (`debt-utils.ts`).
*   `src/ai/`: Genkit related files (AI flow definitions).
*   `public/`: Static assets.
*   `src/styles/`: Global styles (`globals.css`).

This README provides a good overview of the BillZen application.
