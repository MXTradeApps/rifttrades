-- Shareable binder links for RiftTrades.
--
-- Binders remain owner-only via `rift_binder_entries` RLS. Public viewers never
-- read that table directly — they call `get_rift_public_binder(token)`, which
-- resolves an opaque share token and returns only live binder rows (not want lists).

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS public.rift_binder_shares (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rift_binder_shares_token_len CHECK (char_length(token) >= 16)
);

ALTER TABLE public.rift_binder_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rift binder share"
  ON public.rift_binder_shares FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rift binder share"
  ON public.rift_binder_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rift binder share"
  ON public.rift_binder_shares FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rift binder share"
  ON public.rift_binder_shares FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS rift_binder_shares_token_idx
  ON public.rift_binder_shares(token)
  WHERE is_enabled = TRUE;

-- Privileged reader: bypasses rift_binder_entries RLS after validating the token.
CREATE OR REPLACE FUNCTION private.get_rift_public_binder_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  share_user UUID;
  result jsonb;
BEGIN
  IF p_token IS NULL OR char_length(trim(p_token)) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT user_id INTO share_user
  FROM public.rift_binder_shares
  WHERE token = trim(p_token)
    AND is_enabled = TRUE;

  IF share_user IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'entries', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'card_id', be.card_id,
            'quantity', be.quantity,
            'condition', be.condition,
            'card', be.card,
            'added_at', be.added_at,
            'updated_at', be.updated_at
          )
          ORDER BY be.added_at DESC
        )
        FROM public.rift_binder_entries be
        WHERE be.user_id = share_user
          AND be.is_wanted = FALSE
          AND be.deleted_at IS NULL
      ),
      '[]'::jsonb
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION private.get_rift_public_binder_by_token(text) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_rift_public_binder_by_token(text)
  TO anon, authenticated, service_role;

-- Thin public wrapper so PostgREST / supabase.rpc can call it.
-- Invoker-only: privileged reads stay in the unexposed `private` schema.
CREATE OR REPLACE FUNCTION public.get_rift_public_binder(p_token text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.get_rift_public_binder_by_token(p_token);
$$;

REVOKE ALL ON FUNCTION public.get_rift_public_binder(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rift_public_binder(text) TO anon, authenticated;
