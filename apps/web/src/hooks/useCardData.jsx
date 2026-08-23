// CardDataContext for Riftbound
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { usePriceType } from '../contexts/PriceContext.jsx';
import { loadCardDataFromSupabase } from '../services/supabaseCardData.js';

// Create context
const CardDataContext = createContext();

// Custom hook to use the context
export const useCardData = () => {
    const context = useContext(CardDataContext);
    if (context === undefined) {
        throw new Error('useCardData must be used within a CardDataProvider');
    }
    return context;
};

// Function to check if an item is an actual card (not a product like booster box, pack, etc.)
const isActualCard = (row) => {
    const name = (row.name || '').toLowerCase();
    const subTypeName = (row.subTypeName || '').toLowerCase();
    
    // Exclude sealed products, boxes, packs, etc.
    const excludePatterns = [
        'booster box', 'booster pack', 'starter deck', 'starter kit',
        'bundle', 'collector box', 'case', 'display', 'prerelease',
        'deck box', 'playmat', 'sleeves', 'token'
    ];
    
    for (const pattern of excludePatterns) {
        if (name.includes(pattern) || subTypeName.includes(pattern)) {
            return false;
        }
    }
    
    // Include items that have a name and aren't excluded
    return row.name && row.name.trim() !== '';
};

// Function to safely get a numeric value
const getNumericValue = (row, possibleKeys, defaultValue = 0) => {
    for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== '') {
            const parsed = parseFloat(row[key]);
            if (!isNaN(parsed)) return parsed;
        }
    }
    return defaultValue;
};

// Function to safely get an integer value
const getIntegerValue = (row, possibleKeys, defaultValue = 0) => {
    for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== '') {
            const parsed = parseInt(row[key]);
            if (!isNaN(parsed)) return parsed;
        }
    }
    return defaultValue;
};

// Function to create a standardized card object from a JSON record
const createCardObject = (row) => {
    const isFoil = (row.subTypeName || '').toLowerCase().includes('foil');
    
    const card = {
        // Unique identifiers from consolidation
        _id: row._id || 0,
        _uniqueId: row._uniqueId || '',
        _sourceFile: row._sourceFile || '',
        _setNumber: row._setNumber || 0,
        _setName: row._setName || '',

        // Core properties
        productId: row.productId || '',
        name: row.name || '',
        cleanName: row.cleanName || '',
        imageUrl: row.imageUrl || '',
        categoryId: row.categoryId || '',
        groupId: row.groupId || '',
        url: row.url || '',
        modifiedOn: row.modifiedOn || '',
        imageCount: getIntegerValue(row, ['imageCount']),

        // TCGPlayer Price properties (USD)
        lowPrice: getNumericValue(row, ['lowPrice']),
        midPrice: getNumericValue(row, ['midPrice']),
        highPrice: getNumericValue(row, ['highPrice']),
        marketPrice: getNumericValue(row, ['marketPrice']),
        directLowPrice: getNumericValue(row, ['directLowPrice']),

        // CardMarket Price properties (EUR)
        cardmarketId: row.cardmarketId || null,
        cardmarketAvg: getNumericValue(row, ['cardmarketAvg']),
        cardmarketLow: getNumericValue(row, ['cardmarketLow']),
        cardmarketTrend: getNumericValue(row, ['cardmarketTrend']),
        cardmarketAvgFoil: getNumericValue(row, ['cardmarketAvgFoil']),
        cardmarketLowFoil: getNumericValue(row, ['cardmarketLowFoil']),
        cardmarketTrendFoil: getNumericValue(row, ['cardmarketTrendFoil']),
        
        // Flag for foil
        isFoil: isFoil,

        // Card properties
        subTypeName: row.subTypeName || '',
        extRarity: row.extRarity || row.rarity || '',
        extNumber: row.extNumber || row.number || '',

        // Display properties
        displayName: '',
        sourceUrl: `set_${row._setNumber}`
    };

    // Create display name - just the card name (set name will be shown separately)
    card.displayName = card.name || '';

    return card;
};

// Function to check if consolidated JSON is available
const checkConsolidatedData = async () => {
    try {
        const response = await fetch('/price-guide/consolidated-data.json');
        if (!response.ok) {
            return { available: false, reason: 'No consolidated data file found' };
        }

        const text = await response.text();
        const data = JSON.parse(text);
        
        return {
            available: true,
            totalRecords: data.metadata?.totalRecords || 0,
            totalFiles: data.metadata?.totalFiles || 0,
            generatedAt: data.metadata?.generatedAt || null,
            hasCardmarket: !!data.metadata?.cardmarketMergedAt,
            dataSize: text.length
        };
    } catch (error) {
        return { available: false, reason: error.message };
    }
};

// Function to load consolidated JSON data
const loadConsolidatedData = async () => {
    try {
        console.log('Loading consolidated JSON data...');
        const response = await fetch('/price-guide/consolidated-data.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch consolidated data: ${response.status}`);
        }

        const consolidatedData = await response.json();
        
        if (!consolidatedData.data || !Array.isArray(consolidatedData.data)) {
            throw new Error('Invalid consolidated data format');
        }

        console.log(`Loaded ${consolidatedData.data.length} records from consolidated JSON`);
        return consolidatedData;
    } catch (error) {
        console.error('Error loading consolidated data:', error);
        throw error;
    }
};

// Function to process JSON records and filter for actual cards
const processJsonData = (jsonData) => {
    const allCards = [];
    let totalRows = jsonData.length;
    let filteredRows = 0;

    console.log(`Processing ${totalRows} records from JSON data...`);

    jsonData.forEach(row => {
        if (isActualCard(row)) {
            const card = createCardObject(row);
            if (card.name && card.name.trim()) {
                allCards.push(card);
            }
        } else {
            filteredRows++;
        }
    });

    console.log(`Processed ${allCards.length} actual cards, filtered out ${filteredRows} non-card products`);
    return allCards;
};

// Function to identify duplicates and enhance display names
const enhanceDisplayNames = (cards) => {
    // Group cards by name to identify duplicates
    const nameGroups = {};
    cards.forEach(card => {
        if (!nameGroups[card.name]) {
            nameGroups[card.name] = [];
        }
        nameGroups[card.name].push(card);
    });

    // Enhance display names for cards with multiple editions
    return cards.map(card => {
        const subTypeName = card.subTypeName || '';
        const setName = card._setName || '';
        
        // Create base display name - just the card name
        let enhancedName = card.name;
        
        // Create unique ID using name, subType, and setName
        const uniqueId = `${enhancedName}|${subTypeName}|${setName}`;

        return {
            ...card,
            displayName: enhancedName,
            _uniqueDisplayId: uniqueId
        };
    });
};

/**
 * Get the appropriate price for a card based on source and type
 * @param {Object} card - Card object
 * @param {string} priceSource - 'tcgplayer' or 'cardmarket'
 * @param {string} priceType - 'market' or 'low'
 * @returns {number} The price value
 */
const getCardPrice = (card, priceSource, priceType) => {
    if (priceSource === 'cardmarket') {
        // CardMarket prices (EUR)
        if (card.isFoil) {
            return priceType === 'market' ? card.cardmarketTrendFoil : card.cardmarketLowFoil;
        }
        return priceType === 'market' ? card.cardmarketTrend : card.cardmarketLow;
    } else {
        // TCGPlayer prices (USD)
        return priceType === 'market' ? card.marketPrice : card.lowPrice;
    }
};

// Function to group cards by display name and their editions
const groupCardsByEdition = (cards, priceType = 'market', priceSource = 'tcgplayer') => {
    const grouped = {};

    cards.forEach(card => {
        const displayName = card.displayName || card.name;

        if (!grouped[displayName]) {
            grouped[displayName] = {
                name: displayName,
                editions: []
            };
        }

        // Check if this edition already exists
        const existingEdition = grouped[displayName].editions.find(
            e => e.subTypeName === card.subTypeName && e.productId === card.productId
        );

        if (!existingEdition) {
            grouped[displayName].editions.push({
                subTypeName: card.subTypeName,
                productId: card.productId,
                cardPrice: getCardPrice(card, priceSource, priceType),
                uniqueId: card._uniqueId,
                isFoil: card.isFoil,
                hasCardmarket: card.cardmarketId !== null,
                imageUrl: card.imageUrl || '',
            });
        }
    });

    return Object.values(grouped);
};

// Main provider component
export const CardDataProvider = ({ children }) => {
    const { priceType, priceSource } = usePriceType();
    const [cards, setCards] = useState([]);
    const [cardIdLookup, setCardIdLookup] = useState({});
    const [loading, setLoading] = useState(false);
    const [dataReady, setDataReady] = useState(false);
    const [error, setError] = useState(null);
    const [dataSource, setDataSource] = useState('');
    const [metadata, setMetadata] = useState(null);

    useEffect(() => {
        const buildFromRecords = (sourceData, source) => {
            setMetadata(sourceData.metadata);

            const allCards = processJsonData(sourceData.data);
            const enhancedCards = enhanceDisplayNames(allCards);

            // Create unique ID lookup map
            const idLookup = {};
            enhancedCards.forEach(card => {
                if (card._uniqueId) {
                    idLookup[card._uniqueId] = card;
                }
            });

            setCards(enhancedCards);
            setCardIdLookup(idLookup);
            setDataSource(source);

            console.log(`Successfully loaded ${enhancedCards.length} cards from ${source}`);
        };

        const loadCardData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Primary source: RiftTrades Supabase database.
                try {
                    console.log('Loading card data from Supabase...');
                    const supabaseData = await loadCardDataFromSupabase();

                    if (!supabaseData.data || supabaseData.data.length === 0) {
                        throw new Error('Supabase returned no card records');
                    }

                    buildFromRecords(supabaseData, 'supabase');
                    return;
                } catch (supabaseError) {
                    console.error('Supabase load failed, falling back to consolidated JSON:', supabaseError);
                }

                // Fallback: bundled consolidated JSON.
                const consolidatedStatus = await checkConsolidatedData();

                if (consolidatedStatus.available) {
                    console.log('Using consolidated JSON data...');

                    const consolidatedData = await loadConsolidatedData();
                    buildFromRecords(consolidatedData, 'consolidated-json');

                    if (consolidatedStatus.hasCardmarket) {
                        console.log('CardMarket prices available');
                    }
                } else {
                    throw new Error(`Consolidated data not available: ${consolidatedStatus.reason}`);
                }

            } catch (err) {
                console.error('Error loading card data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
                setDataReady(true);
            }
        };

        loadCardData();
    }, []);

    // Recalculate cardGroups whenever priceType or priceSource changes
    const cardGroups = useMemo(() => {
        if (cards.length === 0) return [];
        return groupCardsByEdition(cards, priceType, priceSource);
    }, [cards, priceType, priceSource]);

    const value = useMemo(() => ({
        cards,
        cardGroups,
        cardIdLookup,
        loading,
        dataReady,
        error,
        dataSource,
        metadata,
        pricesUpdatedAt: metadata?.generatedAt ?? metadata?.lastUpdated ?? metadata?.updatedAt ?? null,
        // Helper function for components to get prices
        getCardPrice: (card) => getCardPrice(card, priceSource, priceType)
    }), [cards, cardGroups, cardIdLookup, loading, dataReady, error, dataSource, metadata, priceSource, priceType]);

    return (
        <CardDataContext.Provider value={value}>
            {children}
        </CardDataContext.Provider>
    );
};
