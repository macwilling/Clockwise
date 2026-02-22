# Consulting Timesheet and Invoicing App

This is a code bundle for Consulting Timesheet and Invoicing App. The original project is available at https://www.figma.com/design/5FS1GS3xL4xR7tZ7fvuIUz/Consulting-Timesheet-and-Invoicing-App.

## Running the code

1. **Install dependencies:** `npm install`
2. **Environment:** Copy `.env.example` to `.env` and add your Supabase keys (Supabase Dashboard → Settings → API: project ref, anon key; for server/deploy also service role key). The app needs `VITE_SUPABASE_PROJECT_ID` and `VITE_SUPABASE_ANON_KEY` to run.
3. **Start dev server:** `npm run dev`

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run typecheck` – TypeScript check
- `npm run lint` – ESLint
- `npm run test` – run tests
