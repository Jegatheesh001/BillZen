
# BillZen - Expense Sharing App

BillZen is a modern web application designed to simplify expense sharing and tracking among a group of users. It allows users to manage shared expenses, create events, track who owes whom, and settle debts with ease. The application data is persisted using Firebase Firestore.

## Key Features

*   **User Management (Firebase):**
    *   Add multiple users to the system via the Settings page (name, avatar URL, optional email).
    *   Assign names and avatar URLs (defaults to placeholder avatars).
    *   Switch between user profiles from the Profile page to view the app from different perspectives. After switching, the app navigates to the Dashboard.
    *   The currently active user preference is stored locally.
*   **Expense Tracking (Firebase):**
    *   Add new expenses with descriptions, amounts, dates, payer, and participants.
    *   Assign expenses to an optional event (selecting an event automatically suggests its members as participants).
    *   Assign an optional category to expenses.
    *   Edit existing expenses.
    *   Delete expenses (only the user who paid for the expense can delete it, with a confirmation prompt).
*   **Event Management (Firebase):**
    *   Create events (e.g., "Road Trip", "Dinner Party") to group related expenses via the Events page.
    *   Assign specific members to events.
    *   Edit event details (name and member list).
    *   View expenses related to a specific event by clicking on the expense count on an event card.
*   **Dynamic Balance Summary (Dashboard Page):**
    *   View a clear summary of who owes whom, dynamically updated based on the currently selected user profile.
    *   Shows amounts owed to the current user or by the current user from other group members.
    *   The selected user's "Overall Balance" with the group is displayed prominently and highlighted.
*   **Payment Settlement (Dashboard Page):**
    *   Record payments made between users to settle outstanding debts.
    *   The "Settle" option appears when the current user owes another user.
    *   Allows entering partial or full settlement amounts.
    *   Settlements are recorded as a special "Settlement" category expense.
*   **Category Management (Settings Page, Firebase):**
    *   Manage a list of expense categories.
    *   Initially seeded with common categories if none exist in Firebase.
    *   Add new custom categories.
    *   Edit existing category names (changes reflect in associated expenses).
    *   Remove categories (clears the category from associated expenses).
*   **Profile Switching & Editing (Profile Page, Firebase for user data):**
    *   Easily switch the active user profile.
    *   Update the name, avatar URL, and optional email for the selected user profile.
*   **Theme Customization:**
    *   Switch between light and dark mode themes using a toggle in the header.
    *   Theme preference is saved in local storage.
*   **Navigation & Layout:**
    *   **Dashboard:** Displays recent expenses (limited to 5 for the current user, with search) and the dynamic Balance Summary.
    *   **My Expenses:** Lists all expenses specifically related to the currently selected user (where they are the payer or a participant), with a search option. Can be filtered by event.
    *   **Events:** Page to view and manage all events.
    *   **Profile:** Page to edit the current user's profile and switch between available user profiles.
    *   **Settings:** Page to add new users, manage expense categories, and clear all expenses (with confirmation).
    *   Responsive design with a bottom navigation bar for easy access on mobile devices.
*   **Data Management (Settings Page, Firebase):**
    *   Option to "Clear All Expenses" with a confirmation dialog.
*   **Responsive Design:**
    *   User-friendly interface optimized for both desktop and mobile devices.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://reactjs.org/)
*   **Component Library:** [ShadCN UI](https://ui.shadcn.com/) - Beautifully designed components.
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework.
*   **State Management:** React Context API for global state (`AppDataContext.tsx` for application data, `ThemeContext.tsx` for theme).
*   **Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore) - For persistent storage of users, expenses, events, and categories.
*   **Authentication (Base Setup):** [Firebase Authentication](https://firebase.google.com/docs/auth) - Initialized, with user data structured for future full auth integration (e.g., Google Sign-In). Currently manages users within the app's context using Firebase UIDs for new users.
*   **AI (Optional Backend):** [Genkit (by Firebase)](https://firebase.google.com/docs/genkit) - Integrated for potential AI features. (Note: AI-driven expense categorization was initially present but later replaced with user-managed categories stored in Firebase). The Genkit setup remains.
*   **Linting & Formatting:** ESLint, Prettier (implied by Next.js standards)

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 18.x or later recommended)
*   [npm](https://www.npmjs.com/) (comes with Node.js) or [yarn](https://yarnpkg.com/)
*   A Firebase project.

### Firebase Setup

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or use an existing one).
2.  In your Firebase project, go to **Build > Firestore Database** and create a database.
    *   Choose **Native mode**.
    *   Select a location.
3.  Go to **Project settings** (the gear icon next to "Project Overview").
4.  Under the "General" tab, in the "Your apps" section, click the web icon (`</>`) to register a new web app (if you haven't already).
5.  Give it a nickname (e.g., "BillZen Web") and click "Register app".
6.  Firebase will provide you with a `firebaseConfig` object. You'll need these values.
7.  **Environment Variables:**
    *   Create a file named `.env.local` in the root of your project.
    *   Add your Firebase configuration to this file, replacing `YOUR_...` with the actual values from your Firebase project's web app config:
        ```env
        NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
        NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID" # Optional, include if provided
        ```
8.  **Firestore Security Rules:**
    *   In the Firebase console, go to **Build > Firestore Database > Rules** tab.
    *   For initial development, you can use permissive rules. **Replace the existing rules with the following:**
        ```firestore-rules
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if true; // WARNING: Open access for development ONLY
            }
          }
        }
        ```
    *   **IMPORTANT:** These rules grant open access. For a production app, you **must** implement more secure rules (e.g., based on Firebase Authentication, allowing users to only access their own data).

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

1.  **Ensure your `.env.local` file is correctly set up with your Firebase credentials.**
2.  To start the Next.js development server:
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
The application will typically be available at `http://localhost:9002`.

*(Optional) Running the Genkit Development Server (if using Genkit AI features):*
If you plan to use or develop features that interact with Genkit flows, you might need to run the Genkit development server in a separate terminal:
```bash
npm run genkit:dev
```
This usually requires additional API keys (e.g., for Google AI Studio) to be set up in your `.env` file if Genkit flows calling external AI models are active.

## Data Persistence

*   **Firebase Firestore:** The primary data (users, expenses, events, categories) is persisted in your Firebase Firestore database. The application will attempt to seed initial users and categories if the database/config is empty on first load.
*   **Local Storage:** User preferences such as the currently selected user ID and the theme (light/dark mode) are stored in the browser's local storage to persist across sessions.

## Project Structure (Key Directories)

*   `src/app/`: Contains the pages and layouts for the Next.js App Router.
    *   `src/app/(app)/`: Group for authenticated/main app routes (dashboard, my-expenses, events, profile, settings).
*   `src/components/`: Reusable UI components.
    *   `src/components/ui/`: ShadCN UI components.
    *   `src/components/layout/`: Layout components like AppShell, BottomNavigation.
    *   `src/components/expenses/`, `src/components/events/`, etc.: Feature-specific components.
*   `src/context/`: React Context providers (`AppDataContext.tsx`, `ThemeContext.tsx`).
*   `src/lib/`: Utility functions, type definitions (`types.ts`), data calculation logic (`debt-utils.ts`), Firebase setup (`firebase.ts`).
*   `src/ai/`: Genkit related files (AI flow definitions).
*   `public/`: Static assets.
*   `src/app/globals.css`: Global styles and Tailwind CSS theme variables.

This README provides a comprehensive overview of the BillZen application.
