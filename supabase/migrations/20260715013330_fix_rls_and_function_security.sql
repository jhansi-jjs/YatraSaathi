/*
# Fix RLS policy bypass and SECURITY DEFINER function exposure

## Summary
1. `click_logs` INSERT policy `anyone_insert_click_logs` uses `WITH CHECK (true)`,
   allowing any caller to insert rows with arbitrary user_id values — bypassing
   row-level security. Replaced with a check that the user_id is either NULL
   (anonymous session) or matches the authenticated caller.
2. `search_logs` INSERT policy `anyone_insert_search_logs` has the same flaw.
   Replaced with the same ownership-aware check.
3. `handle_new_user()` is a SECURITY DEFINER function (needed by the signup
   trigger to insert into `profiles`), but it was executable by `anon` and
   `authenticated` roles via the REST RPC endpoint, allowing unauthenticated
   callers to invoke it directly. Revoked EXECUTE from `anon`, `authenticated`,
   and `public` so it can only be invoked by the database trigger.

## Tables modified
- `public.click_logs` — INSERT policy tightened.
- `public.search_logs` — INSERT policy tightened.

## Functions modified
- `public.handle_new_user()` — EXECUTE revoked from anon, authenticated, public.
  The function remains SECURITY DEFINER so the auth trigger can still insert
  profile rows; only direct RPC access is closed.

## Security changes
- INSERT policies on click_logs and search_logs now enforce:
  `user_id IS NULL OR auth.uid() = user_id`
  This allows anonymous sessions (user_id null) and authenticated users
  (user_id matches session) to log, but blocks spoofing another user's id.
- `handle_new_user()` no longer callable via /rest/v1/rpc/handle_new_user.
*/

-- ── click_logs: tighten INSERT policy ──────────────────────────────────────
DROP POLICY IF EXISTS "anyone_insert_click_logs" ON click_logs;
CREATE POLICY "anyone_insert_click_logs" ON click_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ── search_logs: tighten INSERT policy ─────────────────────────────────────
DROP POLICY IF EXISTS "anyone_insert_search_logs" ON search_logs;
CREATE POLICY "anyone_insert_search_logs" ON search_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ── handle_new_user: revoke direct execution from non-privileged roles ─────
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
