import { getSupabaseClient } from './config.js';
import { fetchGroups, fetchGroupProducts } from './tcgcsv.js';
import { fetchCardMarketByName } from './cardmarket.js';
import { buildRows } from './transform.js';
import { upsertInChunks } from './supabase.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const startedAt = new Date();
  console.log(`🌀 RiftTrades ingest${DRY_RUN ? ' (dry run)' : ''} @ ${startedAt.toISOString()}`);

  console.log('📡 Fetching TCGplayer groups (sets)...');
  const groups = await fetchGroups();
  console.log(`   ✓ ${groups.length} sets`);

  console.log('🌍 Fetching CardMarket prices...');
  let cmByName = new Map();
  try {
    cmByName = await fetchCardMarketByName();
    console.log(`   ✓ ${cmByName.size} CardMarket entries`);
  } catch (err) {
    console.warn(`   ⚠ CardMarket fetch failed; continuing without EU prices: ${err.message}`);
  }

  const setRows = groups.map((g, i) => ({
    group_id: parseInt(g.groupId, 10),
    name: g.name,
    set_number: i + 1,
    updated_at: new Date().toISOString()
  }));

  const allCards = [];
  const allPrices = [];
  const allHistory = [];

  for (const g of groups) {
    process.stdout.write(`📄 ${g.name} (group ${g.groupId})... `);
    const products = await fetchGroupProducts(g.groupId);
    const { cards, prices, history } = buildRows(products, g.groupId, cmByName);
    allCards.push(...cards);
    allPrices.push(...prices);
    allHistory.push(...history);
    console.log(`${cards.length} products`);
  }

  const cmMatched = allCards.filter((c) => c.cardmarket_id !== null).length;
  console.log(
    `\n📊 Totals: ${setRows.length} sets, ${allCards.length} products, ${cmMatched} with CardMarket prices`
  );

  if (DRY_RUN) {
    console.log('🧪 Dry run — no database writes. Sample non-sealed card:');
    const sample = allCards.find((c) => !c.is_sealed) || allCards[0];
    console.log(JSON.stringify(sample, null, 2));
    return;
  }

  const supabase = getSupabaseClient();

  const { data: runRow, error: runErr } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'running', total_sets: setRows.length })
    .select('id')
    .single();
  if (runErr) throw new Error(`Failed to create pipeline_run: ${runErr.message}`);
  const runId = runRow.id;

  try {
    // Order matters: sets -> cards (FK to sets) -> prices/history (FK to cards).
    console.log('⬆️  Upserting sets...');
    await upsertInChunks(supabase, 'sets', setRows, 'group_id');
    console.log('⬆️  Upserting cards...');
    await upsertInChunks(supabase, 'cards', allCards, 'product_id');
    console.log('⬆️  Upserting card_prices...');
    await upsertInChunks(supabase, 'card_prices', allPrices, 'card_id');
    console.log('⬆️  Upserting price_history (daily snapshot)...');
    await upsertInChunks(supabase, 'price_history', allHistory, 'card_id,captured_on');

    await supabase
      .from('pipeline_runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        total_cards: allCards.length,
        cardmarket_matched: cmMatched
      })
      .eq('id', runId);

    console.log('✅ Ingest complete.');
  } catch (err) {
    await supabase
      .from('pipeline_runs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        total_cards: allCards.length,
        cardmarket_matched: cmMatched,
        notes: String(err.message).slice(0, 1000)
      })
      .eq('id', runId);
    throw err;
  }
}

main().catch((err) => {
  console.error('❌ Pipeline failed:', err);
  process.exit(1);
});
