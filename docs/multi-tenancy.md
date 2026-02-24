# Multi-Tenancy Implementation Guide

Clockwise's multi-tenancy infrastructure is partially in place — `user_id` columns exist on every table and RLS policies are written — but several layers are intentionally bypassed while the app is being built. This document describes exactly what needs to be completed and in what order.

## Current State

| Layer | Status | Notes |
|---|---|---|
| Database `user_id` columns | ✅ Exist on all tables | `nullable` on most; `NOT NULL` + `DEFAULT auth.uid()` only on `payments` |
| RLS policies (user-scoped) | ✅ Written | `user_id = auth.uid()` policies exist on all tables |
| RLS policies (permissive bypass) | ⚠️ Active | `"Allow all operations"` (`true`) policies on every table except `payments` — these win and override the user-scoped policies |
| Frontend auth UI | ❌ Missing | No login/signup page, no logout button, no auth guard |
| Auth guard on routes | ❌ Missing | All routes are publicly accessible |
| `user_id` in frontend inserts | ⚠️ Partial | Only `addPayment` passes `user_id`; all other inserts omit it |
| Edge function JWT validation | ❌ Disabled | `getAuthenticatedUser()` returns a hardcoded test user; real validation is commented out |

---

## Implementation Steps

### Step 1 — Database: Tighten the Schema

**For each table that has a nullable `user_id` (`clients`, `time_entries`, `invoices`, `user_settings`):**

```sql
-- 1a. Backfill any NULL user_ids before adding NOT NULL constraint
--     (skip if the table is empty or you're doing a fresh setup)
-- UPDATE clients SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;

-- 1b. Add DEFAULT so inserts auto-populate from the JWT
ALTER TABLE clients       ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE time_entries  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE invoices      ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE user_settings ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 1c. Add NOT NULL constraints
ALTER TABLE clients       ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE time_entries  ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE invoices      ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE user_settings ALTER COLUMN user_id SET NOT NULL;
```

**Drop the permissive bypass policies on all tables:**

```sql
DROP POLICY IF EXISTS "Allow all operations on clients"            ON clients;
DROP POLICY IF EXISTS "Allow all operations on invoices"           ON invoices;
DROP POLICY IF EXISTS "Allow all operations on time_entries"       ON time_entries;
DROP POLICY IF EXISTS "Allow all operations on invoice_line_items" ON invoice_line_items;
DROP POLICY IF EXISTS "Allow all operations on payments"           ON payments;
```

After this, only the user-scoped policies remain, so every query must come with a valid JWT.

---

### Step 2 — Edge Function: Re-enable JWT Validation

**File:** `supabase/functions/server/index.tsx`

`getAuthenticatedUser()` currently short-circuits to a hardcoded test user. The real validation code is already written directly below the hardcoded block — just uncomment it:

```typescript
// BEFORE (remove this):
// user: { id: '00000000-0000-0000-0000-000000000000', email: 'test@example.com' }

// AFTER — uncomment the real validation already below it:
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
if (error || !user) {
  return { error: 'Invalid or expired token' };
}
return { user };
```

---

### Step 3 — Frontend: Add Auth UI

The Supabase client is already initialized (`src/app/utils/supabaseClient.ts`). Auth methods (`signInWithPassword`, `signUp`, `signOut`, `getSession`) are ready to use.

**3a. Create a Login page component**

New file: `src/app/components/auth/LoginPage.tsx` — a simple email/password form:

```typescript
const { error } = await supabase.auth.signInWithPassword({ email, password });
```

**3b. Add an auth guard to `App.tsx`**

Wrap the main routes in a session check. If no session exists, redirect to `/login`:

```tsx
// src/app/App.tsx
const [session, setSession] = useState(null);

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });
  return () => subscription.unsubscribe();
}, []);

// In the route tree:
<Route path="/login" element={<LoginPage />} />
<Route path="/" element={session ? <MainLayout /> : <Navigate to="/login" />}>
  ...
</Route>
```

**3c. Add a Logout button to `MainLayout.tsx`**

Place alongside the Settings link in the sidebar:

```typescript
await supabase.auth.signOut();
```

---

### Step 4 — Frontend: Pass `user_id` in All Inserts

**File:** `src/app/contexts/DataContext.tsx`

Once auth is enforced, every INSERT needs an explicit `user_id` so the `WITH CHECK` RLS policy passes. Use the same pattern already in `addPayment` as the reference:

```typescript
const { data: { user } } = await supabase.auth.getUser();
// include in the insert payload:
user_id: user?.id,
```

Functions that need this change:

| Function | Table |
|---|---|
| `addClient` (~line 255) | `clients` |
| `addTimeEntry` (~line 170) | `time_entries` |
| `addInvoice` (~line 354) | `invoices` |
| `updateSettings` insert branch (~line 535) | `user_settings` |

`addPayment` already does this correctly — use it as the reference pattern.

---

### Step 5 — TypeScript: Add `user_id` to Row Interfaces

**File:** `src/app/utils/supabaseMappers.ts`

Add `user_id` to each row interface for type safety:

```typescript
export interface SupabaseClientRow {
  // ... existing fields ...
  user_id?: string | null;
}

export interface SupabaseTimeEntryRow {
  // ... existing fields ...
  user_id?: string | null;
}

export interface SupabaseInvoiceRow {
  // ... existing fields ...
  user_id?: string | null;
}

export interface SupabaseSettingsRow {
  // ... existing fields ...
  user_id?: string | null;
}
```

---

## Recommended Order of Execution

Do **not** lock down the database first — it will break the app immediately. Work from the top down:

1. **Step 3** (Auth UI) — get login/logout working so you have a real session JWT to test with.
2. **Step 4** (Frontend inserts) — add `user_id` to all inserts while the permissive policies are still active; verify data is being tagged correctly in Supabase without breaking anything.
3. **Step 2** (Edge function) — re-enable JWT validation, test all edge function endpoints with a real token.
4. **Step 5** (TypeScript interfaces) — clean up types.
5. **Step 1** (Database lockdown) — drop the permissive policies and add `NOT NULL` constraints **last**, once everything above is verified. This is the only irreversible step — run it on a dev branch first.

---

## Files to Modify

| File | Change |
|---|---|
| `src/app/App.tsx` | Session state, auth guard, `/login` route |
| `src/app/components/MainLayout.tsx` | Logout button |
| `src/app/contexts/DataContext.tsx` | `user_id` in `addClient`, `addTimeEntry`, `addInvoice`, `updateSettings` inserts |
| `src/app/utils/supabaseMappers.ts` | `user_id` field on 4 row interfaces |
| `supabase/functions/server/index.tsx` | Uncomment real JWT validation in `getAuthenticatedUser()` |
| `supabase/migrations/` | New migration: `DEFAULT auth.uid()` + `NOT NULL`; drop permissive policies |

## Files to Create

| File | Purpose |
|---|---|
| `src/app/components/auth/LoginPage.tsx` | Email/password login form |
| `src/app/components/auth/SignupPage.tsx` | Registration form (optional — backend endpoint already exists at `/auth/signup`) |
