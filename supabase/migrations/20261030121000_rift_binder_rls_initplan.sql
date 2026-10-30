-- Binder page RLS: evaluate auth.uid() once per query instead of once per row.
--
-- Written as `auth.uid() = user_id`, Postgres re-runs auth.uid() for every row it
-- scans; wrapped in a scalar subquery it becomes an initPlan evaluated once. The
-- Binder page reads every live rift_binder_entries row for the user (thousands
-- for large collections), so this is the policy on its hottest path. Same rules,
-- same tables; only the evaluation plan changes. Supabase's performance advisor
-- flags these as auth_rls_initplan. Ported from FAB Trades
-- (20261027220000_binder_rls_initplan).

ALTER POLICY "Users can view own rift_binder_entries" ON public.rift_binder_entries
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own rift_binder_entries" ON public.rift_binder_entries
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own rift_binder_entries" ON public.rift_binder_entries
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own rift_binder_entries" ON public.rift_binder_entries
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own rift_binders" ON public.rift_binders
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own rift_binders" ON public.rift_binders
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own rift_binders" ON public.rift_binders
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own rift_binders" ON public.rift_binders
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own rift binder share" ON public.rift_binder_shares
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own rift binder share" ON public.rift_binder_shares
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own rift binder share" ON public.rift_binder_shares
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own rift binder share" ON public.rift_binder_shares
  USING ((select auth.uid()) = user_id);
