/**
 * Fires price alerts after the daily price ingest and pushes them to their owners.
 *
 * Wiring only — the delivery rules live in `alerts.ts`, the FCM client in
 * `_shared/fcm.ts`.
 *
 * Called by .github/workflows/update-prices.yml right after the ingest, with only
 * this function's shared secret. Without `FCM_SERVICE_ACCOUNT` alerts still fire
 * and show as hit in the app; there is just no push.
 *
 * Deploy:
 *   supabase secrets set PRICE_ALERTS_SECRET=...
 *   supabase secrets set FCM_SERVICE_ACCOUNT="$(cat service-account.json)"
 *   supabase functions deploy price-alerts
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { accessToken, fcmSender, parseServiceAccount } from '../_shared/fcm.ts';
import { isAuthorized, json } from '../_shared/http.ts';
import { run } from './alerts.ts';
import type { PendingAlert, PushToken } from './alerts.ts';

Deno.serve(async (request) => {
  const secret = Deno.env.get('PRICE_ALERTS_SECRET');
  if (!secret) {
    console.error('Missing PRICE_ALERTS_SECRET');
    return json({ error: 'not configured' }, 503);
  }
  if (!isAuthorized(request.headers.get('Authorization'), secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  try {
    const account = parseServiceAccount(Deno.env.get('FCM_SERVICE_ACCOUNT'));
    const send = account
      ? fcmSender(account.project_id, await accessToken(account))
      : undefined;

    const result = await run({
      async fireAlerts() {
        const { data, error } = await supabase.rpc('rift_fire_price_alerts');
        if (error) throw error;
        return (data ?? []).length;
      },

      async listPending(since) {
        const { data, error } = await supabase
          .from('rift_price_alerts')
          .select(
            'id, user_id, card_id, direction, source, target_price, ' +
              'triggered_price, cards(name)',
          )
          .not('triggered_at', 'is', null)
          .is('notified_at', null)
          .gte('triggered_at', since);
        if (error) throw error;
        // deno-lint-ignore no-explicit-any
        return (data ?? []).map((row: any): PendingAlert => ({
          ...row,
          card_name: row.cards?.name ?? 'A card',
        }));
      },

      async listTokens(userIds) {
        const { data, error } = await supabase
          .from('rift_push_tokens')
          .select('token, user_id')
          .in('user_id', userIds);
        if (error) throw error;
        return (data ?? []) as PushToken[];
      },

      send,

      async markNotified(alertIds) {
        const { error } = await supabase
          .from('rift_price_alerts')
          .update({ notified_at: new Date().toISOString() })
          .in('id', alertIds);
        if (error) throw error;
      },

      async deleteTokens(tokens) {
        const { error } = await supabase
          .from('rift_push_tokens')
          .delete()
          .in('token', tokens);
        if (error) throw error;
      },
    });

    console.log(
      `Fired ${result.fired} alert(s); ${result.sent} push(es) sent, ` +
        `${result.notified} alert(s) notified, ${result.tokensRemoved} token(s) ` +
        `removed, ${result.failedUsers.length} user(s) failed` +
        (result.pushConfigured ? '' : ' (push not configured)'),
    );
    return json(result, result.failedUsers.length ? 500 : 200);
  } catch (error) {
    console.error('Could not run price alerts', error);
    return json({ error: 'could not run price alerts' }, 500);
  }
});
