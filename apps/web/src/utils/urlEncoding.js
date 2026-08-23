/**
 * URL encoding utilities for sharing trades
 * Handles compression, validation, and backwards compatibility
 */

// Advanced compression strategies for URL optimization
function compress(str) {
    try {
        // Strategy 1: Remove unnecessary whitespace from JSON
        const minified = str.replace(/\s+/g, '');
        
        // Strategy 2: Compress common patterns
        let compressed = compressRepeatedPatterns(minified);
        
        // Strategy 3: Base64 encode the result
        const result = btoa(unescape(encodeURIComponent(compressed)));
        return result;
    } catch (error) {
        console.warn('Advanced compression failed, using simple base64:', error);
        try {
            return btoa(unescape(encodeURIComponent(str)));
        } catch (fallbackError) {
            console.error('Even simple base64 failed:', fallbackError);
            return str;
        }
    }
}

function decompress(str) {
    try {
        // Step 1: Base64 decode
        let decoded;
        try {
            decoded = atob(str);
        } catch (base64Error) {
            console.error('Base64 decode failed:', base64Error);
            throw base64Error;
        }
        
        // Step 2: Handle UTF-8 decoding
        let utf8Decoded;
        try {
            utf8Decoded = decodeURIComponent(escape(decoded));
        } catch (utf8Error) {
            console.warn('UTF-8 decode failed, using raw decoded:', utf8Error);
            utf8Decoded = decoded;
        }
        
        // Step 3: Decompress repeated patterns
        let result;
        try {
            result = decompressRepeatedPatterns(utf8Decoded);
        } catch (patternError) {
            console.warn('Pattern decompression failed, skipping:', patternError);
            result = utf8Decoded;
        }
        
        return result;
    } catch (error) {
        console.error('Complete decompression failed:', error);
        
        // Fallback: try simple base64 decode
        try {
            const fallback = atob(str);
            return decodeURIComponent(escape(fallback));
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            return str;
        }
    }
}

// Compress repeated JSON patterns
function compressRepeatedPatterns(str) {
    const patterns = [
        ['"n":"', 'α'],
        ['"p":', 'β'],
        ['"q":', 'γ'],
        ['{"', 'δ'],
        ['"}', 'ε'],
        [',"', 'ζ'],
        ['":', 'η'],
    ];
    
    let compressed = str;
    patterns.forEach(([pattern, replacement]) => {
        compressed = compressed.replace(new RegExp(escapeRegExp(pattern), 'g'), replacement);
    });
    
    return compressed;
}

// Decompress repeated JSON patterns
function decompressRepeatedPatterns(str) {
    const patterns = [
        ['α', '"n":"'],
        ['β', '"p":'],
        ['γ', '"q":'],
        ['δ', '{"'],
        ['ε', '"}'],
        ['ζ', ',"'],
        ['η', '":'],
    ];
    
    let decompressed = str;
    patterns.forEach(([replacement, pattern]) => {
        decompressed = decompressed.replace(new RegExp(escapeRegExp(replacement), 'g'), pattern);
    });
    
    return decompressed;
}

// Escape special characters for regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Encodes trade data into a shareable URL
 * @param {Array} haveList - Cards the user has
 * @param {Array} wantList - Cards the user wants
 * @param {Object} options - Additional options
 * @returns {string} Shareable URL
 */
export function encodeTradeToURL(haveList, wantList, options = {}) {
    try {
        // Create ultra-minimal trade data structure using arrays instead of objects
        const tradeData = {
            v: 1, // Version for backwards compatibility
            t: Math.floor(Date.now() / 60000), // Timestamp in minutes
            h: haveList.map(card => [
                card.uniqueId || card.name,
                Number(card.price.toFixed(2)),
                card.quantity > 1 ? card.quantity : undefined
            ].filter(x => x !== undefined)),
            w: wantList.map(card => [
                card.uniqueId || card.name,
                Number(card.price.toFixed(2)),
                card.quantity > 1 ? card.quantity : undefined
            ].filter(x => x !== undefined))
        };

        const jsonString = JSON.stringify(tradeData);
        
        if (jsonString.length > 1500) {
            console.warn('Trade data is large, URL may be long');
        }

        const compressed = compress(jsonString);
        const encoded = encodeURIComponent(compressed);
        
        const baseUrl = options.baseUrl || window.location.origin + window.location.pathname;
        const url = `${baseUrl}?trade=${encoded}`;
        
        if (url.length > 2000) {
            console.warn('Generated URL is very long (>2000 chars), may not work in all browsers');
        }
        
        return url;
    } catch (error) {
        console.error('Failed to encode trade to URL:', error);
        return null;
    }
}

/**
 * Decodes trade data from URL
 * @returns {Object|null} Trade data or null if invalid
 */
export function decodeTradeFromURL() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const tradeParam = urlParams.get('trade');
        
        if (!tradeParam) {
            return null;
        }

        // Handle potential double encoding issues
        let decoded;
        try {
            decoded = decodeURIComponent(tradeParam);
        } catch (error) {
            console.warn('First decode failed, trying direct use:', error);
            decoded = tradeParam;
        }
        
        // Try decompression
        let decompressed;
        try {
            decompressed = decompress(decoded);
        } catch (error) {
            console.error('Decompression failed:', error);
            try {
                decompressed = atob(decoded);
            } catch (base64Error) {
                console.error('Base64 decode also failed:', base64Error);
                return null;
            }
        }
        
        // Parse JSON
        let tradeData;
        try {
            tradeData = JSON.parse(decompressed);
        } catch (parseError) {
            console.error('JSON parse failed:', parseError);
            return null;
        }
        
        // Validate version
        if (!tradeData.v || tradeData.v > 1) {
            console.warn('Unsupported trade data version:', tradeData.v);
            return null;
        }
        
        // Convert timestamp back from minutes to milliseconds
        const timestamp = tradeData.t ? tradeData.t * 60000 : null;
        
        return {
            version: tradeData.v,
            timestamp: timestamp,
            have: tradeData.h || [],
            want: tradeData.w || [],
            ageInDays: timestamp ? (Date.now() - timestamp) / (1000 * 60 * 60 * 24) : null
        };
    } catch (error) {
        console.error('Failed to decode trade from URL:', error);
        return null;
    }
}

/**
 * Normalizes card names for better matching
 * @param {string} cardName - Card name to normalize
 * @returns {string} Normalized card name
 */
function normalizeCardName(cardName) {
    return cardName
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s()]/g, '')
        .trim();
}

/**
 * Finds the best matching card group using multiple strategies
 * @param {string} cardName - Card name to find
 * @param {Array} cardGroups - Available card groups
 * @returns {Object|null} Best matching card group
 */
function findBestCardMatch(cardName, cardGroups) {
    const normalizedSearchName = normalizeCardName(cardName);
    
    // Strategy 1: Exact match
    let match = cardGroups.find(group => 
        normalizeCardName(group.name) === normalizedSearchName
    );
    if (match) return { group: match, strategy: 'exact' };
    
    // Strategy 2: Base name match (remove edition info)
    const baseName = cardName.replace(/\s*\([^)]*\).*$/, '').trim();
    const normalizedBaseName = normalizeCardName(baseName);
    
    match = cardGroups.find(group => {
        const groupBaseName = group.name.replace(/\s*\([^)]*\).*$/, '').trim();
        return normalizeCardName(groupBaseName) === normalizedBaseName;
    });
    if (match) return { group: match, strategy: 'base-name' };
    
    // Strategy 3: Substring matching
    match = cardGroups.find(group => {
        const normalizedGroupName = normalizeCardName(group.name);
        return normalizedGroupName.includes(normalizedBaseName) || 
               normalizedBaseName.includes(normalizedGroupName);
    });
    if (match) return { group: match, strategy: 'substring' };
    
    return null;
}

/**
 * Reconstructs full card objects from minimal URL data
 * @param {Array} cardData - Minimal card data from URL
 * @param {Array} cardGroups - Available card groups from the app
 * @param {Object} cardIdLookup - Lookup map for unique IDs
 * @returns {Array} Reconstructed card objects
 */
export function reconstructCardsFromURLData(cardData, cardGroups, cardIdLookup = {}) {
    if (!cardData || !Array.isArray(cardData)) {
        return [];
    }

    return cardData.reduce((validCards, urlCard) => {
        try {
            // Handle both array format [id/name, price, quantity] and object format {n, p, q}
            let cardIdentifier, cardPrice, cardQuantity;
            
            if (Array.isArray(urlCard)) {
                [cardIdentifier, cardPrice, cardQuantity] = urlCard;
                cardQuantity = cardQuantity || 1;
            } else {
                cardIdentifier = urlCard.n;
                cardPrice = urlCard.p;
                cardQuantity = urlCard.q || 1;
            }
            
            let cardData = null;
            let cardGroup = null;
            
            // Strategy 1: Try unique ID lookup first
            if (cardIdLookup[cardIdentifier]) {
                cardData = cardIdLookup[cardIdentifier];
                cardGroup = cardGroups.find(group => 
                    group.name === cardData.displayName
                );
            }
            
            // Strategy 2: Fallback to name-based matching
            if (!cardGroup) {
                const matchResult = findBestCardMatch(cardIdentifier, cardGroups);
                if (matchResult) {
                    cardGroup = matchResult.group;
                }
            }
            
            if (!cardGroup) {
                console.warn(`Card not found: ${cardIdentifier}`);
                return validCards;
            }
            
            if (!cardGroup.editions || cardGroup.editions.length === 0) {
                console.warn(`Card group found but has no editions: ${cardGroup.name}`);
                return validCards;
            }

            // Find the specific edition that matches the price, or use default
            let selectedEdition = cardGroup.editions[0];
            const matchingEdition = cardGroup.editions.find(edition => 
                Math.abs(edition.cardPrice - cardPrice) < 0.01
            );
            if (matchingEdition) {
                selectedEdition = matchingEdition;
            }

            const reconstructedCard = {
                name: cardGroup.name,
                price: cardPrice,
                quantity: Math.max(1, parseInt(cardQuantity) || 1),
                cardGroup,
                availableEditions: cardGroup.editions,
                uniqueId: selectedEdition.uniqueId,
                subTypeName: selectedEdition.subTypeName || 'Normal',
                imageUrl: selectedEdition.imageUrl || cardData?.imageUrl || '',
            };

            validCards.push(reconstructedCard);
        } catch (error) {
            console.warn(`Failed to reconstruct card:`, error);
        }
        
        return validCards;
    }, []);
}

/**
 * Validates if the current URL contains trade data
 * @returns {boolean} True if URL contains valid trade data
 */
export function hasTradeDataInURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('trade');
}

/**
 * Clears trade data from URL without page reload
 */
export function clearTradeFromURL() {
    if (window.history && window.history.replaceState) {
        const url = new URL(window.location);
        url.searchParams.delete('trade');
        window.history.replaceState({}, '', url);
    }
}

/**
 * Test URL encoding and decoding round-trip
 * @param {Array} haveList 
 * @param {Array} wantList 
 * @returns {Object} Test results
 */
export function testURLEncoding(haveList, wantList) {
    try {
        const url = encodeTradeToURL(haveList, wantList);
        if (!url) {
            return { success: false, error: 'Failed to encode URL' };
        }
        
        const urlObj = new URL(url);
        const tradeParam = urlObj.searchParams.get('trade');
        
        const decoded = decodeURIComponent(tradeParam);
        const decompressed = decompress(decoded);
        const parsed = JSON.parse(decompressed);
        
        return {
            success: true,
            originalHave: haveList.length,
            originalWant: wantList.length,
            decodedHave: parsed.h ? parsed.h.length : 0,
            decodedWant: parsed.w ? parsed.w.length : 0,
            urlLength: url.length,
            tradeParam: tradeParam.substring(0, 50) + '...'
        };
    } catch (error) {
        console.error('Round-trip test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Estimates the size of a trade for URL encoding
 * @param {Array} haveList 
 * @param {Array} wantList 
 * @returns {Object} Size estimation
 */
export function estimateTradeURLSize(haveList, wantList) {
    try {
        const url = encodeTradeToURL(haveList, wantList);
        return {
            urlLength: url ? url.length : 0,
            isLarge: url ? url.length > 1500 : false,
            isTooLarge: url ? url.length > 2000 : false
        };
    } catch (error) {
        return {
            urlLength: 0,
            isLarge: false,
            isTooLarge: true,
            error: error.message
        };
    }
}








