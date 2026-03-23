# Copilot Instructions for AI Content Studio

## Project Overview

AI Content Studio is a React/TypeScript single-page application that helps creators generate, manage, and publish content using Google's Gemini AI. The app authenticates users via Firebase, stores data in Firestore, and is deployed to Hostinger via GitHub Actions.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Routing:** React Router v7
- **Backend:** Express.js (`server.ts` / `server.js`) — serves the Vite-built frontend and proxies API requests
- **AI:** Google Gemini API (`@google/genai`)
- **Auth & DB:** Firebase Authentication + Firestore
- **Deployment:** GitHub Actions → Hostinger (triggered on push to `main`)

## Repository Structure

```
src/
  App.tsx                 # Root component with all routes
  main.tsx                # Entry point
  firebase.ts             # Firebase SDK initialisation (auth + db exports)
  index.css               # Global styles (Tailwind entry)
  components/             # Shared UI components (Layout, Sidebar, ProtectedRoute, etc.)
  contexts/               # React contexts (FirebaseContext for auth state)
  lib/                    # Utility helpers (firestore.ts, utils.ts)
  pages/                  # Route-level page components
    Landing.tsx
    Dashboard.tsx
    CreatePost.tsx
    Inspiration.tsx
    Prompts.tsx
    Coach.tsx
    Videos.tsx
    VideoGeneration.tsx
    Settings.tsx
    settings/             # Sub-pages for Settings
.github/
  workflows/deploy.yml    # CI/CD pipeline (deploy to Hostinger on push to main)
  scripts/deploy.mjs      # Hostinger Hosting API deploy script
  copilot-instructions.md # This file
```

## Development Workflow

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start dev server | `npm run dev` |
| Production build | `npm run build` |
| Type-check (lint) | `npm run lint` |

The dev server runs `node server.js` which starts Express and proxies Vite in development.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values before running locally:

- `GEMINI_API_KEY` — Google Gemini API key (required for AI features)
- `APP_URL` — Public URL of the hosted app (used for OAuth callbacks)
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`
- `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`

Never commit `.env` or `.env.local` files.

## Coding Conventions

- **Language:** TypeScript everywhere; `strict` mode is not explicitly set but `noEmit` is enabled for type-checking
- **Styling:** Tailwind CSS utility classes; use `clsx` + `tailwind-merge` for conditional class composition
- **Path aliases:** `@/` resolves to the repository root (configured in `tsconfig.json` and `vite.config.ts`)
- **Component exports:** Named exports for most components; default exports acceptable for page components
- **Animation:** Use `motion` (Framer Motion) for transitions and animations
- **Icons:** Use `lucide-react` for icons
- **Firebase:** Import `db` and `auth` from `@/src/firebase`; Firestore helpers live in `@/src/lib/firestore.ts`
- **Context:** Wrap Firebase auth/user state in `FirebaseContext`; consume via `useContext(FirebaseContext)`

## Protected Routes

All routes under `/dashboard` require authentication. The `<ProtectedRoute>` component redirects unauthenticated users to `/`.

## Deployment Notes

- Deployments are triggered automatically on every push to `main`
- The required GitHub secret is `HOSTINGER_API_TOKEN`
- The deploy script archives the source (excluding `node_modules`, `dist`, `.env` files) and calls the Hostinger Hosting API to build and start the app server-side

## Testing

There is currently no test framework configured. When adding tests, use a framework consistent with the existing Vite/TypeScript setup (e.g., Vitest with `jsdom`).
