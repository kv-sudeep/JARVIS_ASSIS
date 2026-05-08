
-- Fix search_path on all SECURITY DEFINER / plpgsql functions
ALTER FUNCTION public.audit_log_immutable() SET search_path = public;
ALTER FUNCTION public.auth_attempts_immutable() SET search_path = public;
ALTER FUNCTION public.intruder_events_no_delete_fn() SET search_path = public;
ALTER FUNCTION public.enforce_single_owner() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Tighten permissive policies: drop "anyone inserts" and replace with owner-only
-- (Service role bypasses RLS automatically, so the Python backend still works)
DROP POLICY IF EXISTS "Anyone inserts auth_attempts" ON public.auth_attempts;
CREATE POLICY "Owner inserts auth_attempts" ON public.auth_attempts FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "Anyone inserts intruder_events" ON public.intruder_events;
CREATE POLICY "Owner inserts intruder_events" ON public.intruder_events FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "Anyone inserts audit_log" ON public.audit_log;
CREATE POLICY "Owner inserts audit_log" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));
