#!/usr/bin/env node

/**
 * CardMarket Price Merger Script
 * 
 * Downloads CardMarket pricing data and merges it with the existing
 * TCGPlayer consolidated data, matching cards by name.
 * 
 * Usage:
 *   npm run merge-cardmarket
 *   or
 *   node scripts/mergeCardMarketPrices.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CardMarket API URLs for Riftbound (game ID 22)
const CARDMARKET_PRODUCTS_URL = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_22.json';
const CARDMARKET_PRICES_URL = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_22.json';

// Paths
const CONSOLIDATED_DATA_PATH = path.join(__dirname, '..', 'public', 'price-guide', 'consolidated-data.json');
const CARDMARKET_CACHE_DIR = path.join(__dirname, '..', 'public', 'price-guide', 'cardmarketprices');

/**
 * Normalize a card name for matching.
 *
 * TCGPlayer names carry variant suffixes in parentheses (e.g. "Fury Rune (R01a)",
 * "Pouty Poro (Overnumbered)") while CardMarket lists every variant under the plain
 * card name. We strip the parenthetical so all printings of a card collapse to a
 * single group; the specific variant is then resolved by price rank (see below).
 */
function normalizeCardName(name) {
    return name
        .replace(/\([^)]*\)/g, ' ')  // Drop variant tags like "(R01a)" / "(Alternate Art)"
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')        // Normalize whitespace
        .trim();
}

/**
 * First strictly-positive number from the arguments, else 0.
 */
function firstPositive(...values) {
    for (const value of values) {
        const num = Number(value);
        if (Number.isFinite(num) && num > 0) return num;
    }
    return 0;
}

/**
 * Derive a TCGPlayer-set -> CardMarket-expansion mapping by name overlap.
 *
 * CardMarket's product feed exposes an expansion id but no readable set name, and
 * the same card appears in many expansions. We match each TCGPlayer set to the
 * CardMarket expansion whose card names overlap the most, so price lookups stay
 * scoped to the correct set instead of leaking prices across sets.
 */
function buildSetToExpansionMap(cards, products) {
    const cmNamesByExpansion = new Map(); // idExpansion -> Set(normalized name)
    for (const product of products) {
        if (!cmNamesByExpansion.has(product.idExpansion)) {
            cmNamesByExpansion.set(product.idExpansion, new Set());
        }
        cmNamesByExpansion.get(product.idExpansion).add(normalizeCardName(product.name));
    }

    const tcgNamesBySet = new Map(); // setName -> Set(normalized name)
    for (const card of cards) {
        if (!card.name) continue;
        const setName = card._setName || '';
        if (!tcgNamesBySet.has(setName)) tcgNamesBySet.set(setName, new Set());
        tcgNamesBySet.get(setName).add(normalizeCardName(card.name));
    }

    const MIN_OVERLAP = 5;      // absolute shared-name count required to trust a mapping
    const MIN_OVERLAP_PCT = 0.25; // and at least this fraction of the set's names

    const setToExpansion = new Map();
    const report = [];
    for (const [setName, names] of tcgNamesBySet) {
        let best = null;
        for (const [expansion, cmNames] of cmNamesByExpansion) {
            let overlap = 0;
            for (const name of names) if (cmNames.has(name)) overlap++;
            const pct = overlap / names.size;
            const size = cmNames.size;
            const better = !best
                || overlap > best.overlap
                || (overlap === best.overlap && pct > best.pct)
                || (overlap === best.overlap && pct === best.pct && size < best.size);
            if (better) best = { expansion, overlap, pct, size };
        }
        if (best && best.overlap >= MIN_OVERLAP && best.pct >= MIN_OVERLAP_PCT) {
            setToExpansion.set(setName, best.expansion);
            report.push(`   ${setName} -> expansion ${best.expansion} (${best.overlap}/${names.size} names, ${Math.round(best.pct * 100)}%)`);
        } else {
            report.push(`   ${setName} -> (no confident CardMarket expansion, prices left empty)`);
        }
    }
    return { setToExpansion, report };
}

/**
 * Fetch JSON from a URL
 */
async function fetchJSON(url) {
    console.log(`📥 Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return response.json();
}

/**
 * Load existing consolidated data
 */
function loadConsolidatedData() {
    if (!fs.existsSync(CONSOLIDATED_DATA_PATH)) {
        throw new Error('Consolidated data not found. Run npm run consolidate-csvs first.');
    }
    return JSON.parse(fs.readFileSync(CONSOLIDATED_DATA_PATH, 'utf8'));
}

/**
 * Main merge function
 */
async function mergeCardMarketPrices() {
    console.log('🌍 Starting CardMarket price merge...\n');

    try {
        // 1. Load existing TCGPlayer data
        console.log('📂 Loading TCGPlayer consolidated data...');
        const consolidatedData = loadConsolidatedData();
        console.log(`   Found ${consolidatedData.data.length} TCGPlayer cards\n`);

        // 2. Fetch CardMarket products
        const productsData = await fetchJSON(CARDMARKET_PRODUCTS_URL);
        const products = productsData.products;
        console.log(`   Found ${products.length} CardMarket products\n`);

        // 3. Fetch CardMarket prices
        const pricesData = await fetchJSON(CARDMARKET_PRICES_URL);
        const priceGuides = pricesData.priceGuides;
        console.log(`   Found ${priceGuides.length} CardMarket price entries\n`);

        // 4. Create a map of CardMarket product ID -> price data
        const priceMap = new Map();
        for (const price of priceGuides) {
            priceMap.set(price.idProduct, price);
        }

        // 5. Map each TCGPlayer set to its CardMarket expansion (by name overlap)
        console.log('🧭 Resolving TCGPlayer set -> CardMarket expansion mapping...');
        const { setToExpansion, report } = buildSetToExpansionMap(consolidatedData.data, products);
        report.forEach(line => console.log(line));
        console.log('');

        // 6. Build CardMarket cohorts keyed by "expansion|name".
        //    Every product within a cohort is a distinct printing/rarity of the same
        //    card; we sort them by price so rank == rarity tier (cheapest first).
        const cmCohorts = new Map();
        for (const product of products) {
            const prices = priceMap.get(product.idProduct);
            if (!prices) continue;
            const key = `${product.idExpansion}|${normalizeCardName(product.name)}`;
            const rep = firstPositive(
                prices.trend, prices.avg, prices.low,
                prices['trend-foil'], prices['avg-foil'], prices['low-foil']
            );
            if (!cmCohorts.has(key)) cmCohorts.set(key, []);
            cmCohorts.get(key).push({ product, prices, rep });
        }
        for (const cohort of cmCohorts.values()) {
            cohort.sort((a, b) => a.rep - b.rep);
        }

        // 7. Group TCGPlayer rows into the same cohorts, then into printing "units".
        //    A printing (identified by card number) can appear as both a Normal and a
        //    Foil row; those share one CardMarket product, so they form one unit.
        const tcgCohorts = new Map(); // cohortKey -> Map(printingKey -> { rows, price })
        for (const card of consolidatedData.data) {
            if (!card.name) continue;
            const expansion = setToExpansion.get(card._setName || '');
            if (expansion === undefined) continue;
            const key = `${expansion}|${normalizeCardName(card.name)}`;
            if (!cmCohorts.has(key)) continue;

            const printingKey = (card.extNumber || '').toString().trim() || `pid:${card.productId}`;
            if (!tcgCohorts.has(key)) tcgCohorts.set(key, new Map());
            const units = tcgCohorts.get(key);
            if (!units.has(printingKey)) units.set(printingKey, { rows: [], price: 0 });
            const unit = units.get(printingKey);
            unit.rows.push(card);
            const price = firstPositive(card.marketPrice, card.midPrice, card.lowPrice);
            if (price > unit.price) unit.price = price;
        }

        // 8. Reset all CardMarket fields, then assign by price rank within each cohort.
        for (const card of consolidatedData.data) {
            card.cardmarketId = null;
            card.cardmarketName = null;
            card.cardmarketAvg = 0;
            card.cardmarketLow = 0;
            card.cardmarketTrend = 0;
            card.cardmarketAvgFoil = 0;
            card.cardmarketLowFoil = 0;
            card.cardmarketTrendFoil = 0;
        }

        let matchCount = 0;
        for (const [key, units] of tcgCohorts) {
            const cohort = cmCohorts.get(key);
            const unitList = [...units.values()].sort((a, b) => a.price - b.price);
            const n = unitList.length;
            const m = cohort.length;

            unitList.forEach((unit, i) => {
                // Align rarity tiers by rank: cheapest TCGPlayer printing -> cheapest
                // CardMarket product, most expensive -> most expensive. When the counts
                // differ we spread proportionally and clamp to the available range.
                let idx = 0;
                if (m > 1 && n > 1) idx = Math.round((i * (m - 1)) / (n - 1));
                const chosen = cohort[idx];

                for (const card of unit.rows) {
                    card.cardmarketId = chosen.product.idProduct;
                    card.cardmarketName = chosen.product.name;
                    card.cardmarketAvg = chosen.prices.avg || 0;
                    card.cardmarketLow = chosen.prices.low || 0;
                    card.cardmarketTrend = chosen.prices.trend || 0;
                    card.cardmarketAvgFoil = chosen.prices['avg-foil'] || 0;
                    card.cardmarketLowFoil = chosen.prices['low-foil'] || 0;
                    card.cardmarketTrendFoil = chosen.prices['trend-foil'] || 0;
                    matchCount++;
                }
            });
        }

        const noMatchCount = consolidatedData.data.filter(c => c.name && !c.cardmarketId).length;
        console.log(`✅ Matched: ${matchCount} cards`);
        console.log(`⚠️  No match: ${noMatchCount} cards\n`);

        // 9. Update metadata
        consolidatedData.metadata.cardmarketMergedAt = new Date().toISOString();
        consolidatedData.metadata.cardmarketProductsUrl = CARDMARKET_PRODUCTS_URL;
        consolidatedData.metadata.cardmarketPricesUrl = CARDMARKET_PRICES_URL;
        consolidatedData.metadata.cardmarketMatchCount = matchCount;
        consolidatedData.metadata.cardmarketNoMatchCount = noMatchCount;

        // 10. Save updated data
        console.log('💾 Saving merged data...');
        fs.writeFileSync(CONSOLIDATED_DATA_PATH, JSON.stringify(consolidatedData, null, 2));
        console.log(`   Saved to ${CONSOLIDATED_DATA_PATH}\n`);

        // 11. Show some examples
        console.log('📋 Sample merged cards:');
        const samples = consolidatedData.data.filter(c => c.cardmarketId).slice(0, 3);
        for (const sample of samples) {
            console.log(`   ${sample.name}:`);
            console.log(`     TCGPlayer: $${sample.marketPrice} market, $${sample.lowPrice} low`);
            console.log(`     CardMarket: €${sample.cardmarketTrend} trend, €${sample.cardmarketLow} low`);
        }

        console.log('\n✅ CardMarket price merge completed successfully!');

    } catch (error) {
        console.error('❌ Error during merge:', error.message);
        process.exit(1);
    }
}

// Run the script
mergeCardMarketPrices();








