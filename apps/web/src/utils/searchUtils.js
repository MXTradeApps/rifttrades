/**
 * Search Utilities for Riftbound
 * Helper functions for card searching and filtering
 */

/**
 * Normalize a string for fuzzy matching
 * - Lowercase
 * - Remove special characters (apostrophes, hyphens, etc.)
 * - Collapse multiple spaces
 */
const normalizeForSearch = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[''`]/g, '')      // Remove apostrophes
        .replace(/[-–—]/g, ' ')     // Replace hyphens with spaces
        .replace(/[^\w\s]/g, ' ')   // Remove other special chars
        .replace(/\s+/g, ' ')       // Collapse multiple spaces
        .trim();
};

/**
 * Check if all search words are found in the text (order-independent)
 * @param {string} text - The text to search in
 * @param {string[]} searchWords - Array of search words
 * @returns {boolean} True if all words are found
 */
const matchesAllWords = (text, searchWords) => {
    const normalizedText = normalizeForSearch(text);
    return searchWords.every(word => normalizedText.includes(word));
};

/**
 * Calculate a match score for sorting results
 * Higher score = better match
 */
const calculateMatchScore = (label, searchWords, originalTerm) => {
    const normalizedLabel = normalizeForSearch(label);
    const lowerLabel = label.toLowerCase();
    let score = 0;
    
    // Exact match (normalized) gets highest score
    if (normalizedLabel === normalizeForSearch(originalTerm)) {
        score += 1000;
    }
    
    // Original term appears as-is (substring match)
    if (lowerLabel.includes(originalTerm.toLowerCase())) {
        score += 500;
    }
    
    // Label starts with first search word
    if (normalizedLabel.startsWith(searchWords[0])) {
        score += 200;
    }
    
    // Words appear in order
    let lastIndex = -1;
    let inOrder = true;
    for (const word of searchWords) {
        const index = normalizedLabel.indexOf(word);
        if (index <= lastIndex) {
            inOrder = false;
            break;
        }
        lastIndex = index;
    }
    if (inOrder) {
        score += 100;
    }
    
    // Bonus for shorter labels (more specific matches)
    score += Math.max(0, 50 - label.length);
    
    return score;
};

/**
 * Filter card options based on search input
 * Supports fuzzy matching: word order independent, ignores special characters
 * @param {Array} options - Array of card option objects
 * @param {string} searchTerm - Search string
 * @param {number} limit - Maximum number of results to return
 * @returns {Array} Filtered options
 */
export const filterCardOptions = (options, searchTerm, limit = 10) => {
    if (!searchTerm || searchTerm.trim() === '') {
        return options.slice(0, Math.min(limit, 20));
    }

    const normalizedTerm = normalizeForSearch(searchTerm);
    const searchWords = normalizedTerm.split(' ').filter(w => w.length > 0);
    
    if (searchWords.length === 0) {
        return options.slice(0, Math.min(limit, 20));
    }
    
    // Filter options where all search words are found
    const filtered = options.filter(option => {
        const label = option.label || '';
        return matchesAllWords(label, searchWords);
    });

    // Sort by match score (best matches first)
    const sorted = filtered.sort((a, b) => {
        const scoreA = calculateMatchScore(a.label || '', searchWords, searchTerm);
        const scoreB = calculateMatchScore(b.label || '', searchWords, searchTerm);
        
        if (scoreB !== scoreA) {
            return scoreB - scoreA; // Higher score first
        }
        
        // Alphabetical as tiebreaker
        return (a.label || '').localeCompare(b.label || '');
    });

    return sorted.slice(0, limit);
};

/**
 * Highlight matching text in a string
 * Highlights all occurrences of search words
 * @param {string} text - Original text
 * @param {string} searchTerm - Term to highlight
 * @returns {Array} Array of text segments with highlight flags
 */
export const highlightMatch = (text, searchTerm) => {
    if (!searchTerm || !text) {
        return [{ text, highlight: false }];
    }

    const normalizedTerm = normalizeForSearch(searchTerm);
    const searchWords = normalizedTerm.split(' ').filter(w => w.length > 0);
    
    if (searchWords.length === 0) {
        return [{ text, highlight: false }];
    }

    // Create a map of character positions to highlight
    const highlightMap = new Array(text.length).fill(false);
    const lowerText = text.toLowerCase();
    const normalizedText = normalizeForSearch(text);
    
    // For each search word, find and mark matching positions
    for (const word of searchWords) {
        // Try to find in normalized text and map back to original positions
        let searchIndex = 0;
        let normalizedIndex = 0;
        
        // Build a mapping from normalized positions to original positions
        const positionMap = [];
        for (let i = 0; i < text.length; i++) {
            const char = text[i].toLowerCase();
            const normalizedChar = normalizeForSearch(char);
            if (normalizedChar.length > 0) {
                positionMap.push(i);
            }
        }
        
        // Find word in normalized text
        let wordIndex = normalizedText.indexOf(word);
        while (wordIndex !== -1) {
            // Map normalized positions back to original text
            for (let i = 0; i < word.length && wordIndex + i < positionMap.length; i++) {
                const originalPos = positionMap[wordIndex + i];
                if (originalPos !== undefined) {
                    highlightMap[originalPos] = true;
                }
            }
            wordIndex = normalizedText.indexOf(word, wordIndex + 1);
        }
    }
    
    // Convert highlight map to segments
    const segments = [];
    let currentHighlight = highlightMap[0];
    let currentText = text[0] || '';
    
    for (let i = 1; i < text.length; i++) {
        if (highlightMap[i] === currentHighlight) {
            currentText += text[i];
        } else {
            segments.push({ text: currentText, highlight: currentHighlight });
            currentHighlight = highlightMap[i];
            currentText = text[i];
        }
    }
    
    if (currentText) {
        segments.push({ text: currentText, highlight: currentHighlight });
    }
    
    return segments.length > 0 ? segments : [{ text, highlight: false }];
};

/**
 * Get gradient style based on card rarity/type
 * Adapted for Riftbound card types with teal/gold theme
 * @param {string} subTypeName - Card's subTypeName field (foil type)
 * @param {string} rarity - Card's rarity field
 * @param {boolean} isDark - Whether dark mode is active
 * @returns {Object} Object with background and backgroundHover properties
 */
export const getCardGradient = (subTypeName, rarity = '', isDark = false) => {
    const subType = (subTypeName || '').toLowerCase();
    
    // Pack Foil - subtle gold shimmer
    if (subType.includes('pack foil')) {
        if (isDark) {
            return {
                background: 'linear-gradient(135deg, #1a3040 0%, #2a3a30 50%, #3a3020 100%)',
                backgroundHover: 'linear-gradient(135deg, #2a4050 0%, #3a4a40 50%, #4a4030 100%)'
            };
        }
        return {
            background: 'linear-gradient(135deg, #f0f8f8 0%, #f4f8f0 50%, #f8f4e8 100%)',
            backgroundHover: 'linear-gradient(135deg, #e0f0f0 0%, #e8f0e0 50%, #f0e8d8 100%)'
        };
    }
    
    // Nexus Night / Promo - purple/special tint
    if (subType.includes('nexus night') || subType.includes('promo')) {
        if (isDark) {
            return {
                background: 'linear-gradient(135deg, #1a2040 0%, #2a2050 50%, #3a2060 100%)',
                backgroundHover: 'linear-gradient(135deg, #2a3050 0%, #3a3060 50%, #4a3070 100%)'
            };
        }
        return {
            background: 'linear-gradient(135deg, #f4f0f8 0%, #f0e8f8 50%, #ece0f8 100%)',
            backgroundHover: 'linear-gradient(135deg, #e8e0f0 0%, #e0d8f0 50%, #dcd0f0 100%)'
        };
    }
    
    // Generic Foil variants - gold shimmer theme for Riftbound
    if (subType.includes('foil') || subType.includes('holo')) {
        if (isDark) {
            return {
                background: 'linear-gradient(135deg, #1a3a4a 0%, #2a4a3a 20%, #3a4a2a 40%, #4a3a2a 60%, #3a2a4a 80%, #1a3a4a 100%)',
                backgroundHover: 'linear-gradient(135deg, #2a4a5a 0%, #3a5a4a 20%, #4a5a3a 40%, #5a4a3a 60%, #4a3a5a 80%, #2a4a5a 100%)'
            };
        }
        return {
            background: 'linear-gradient(135deg, #e8f4f8 0%, #f0f8e8 20%, #f8f4e0 40%, #f8e8d8 60%, #f0e0f0 80%, #e8f4f8 100%)',
            backgroundHover: 'linear-gradient(135deg, #d0e8f0 0%, #e0f0d8 20%, #f0e8d0 40%, #f0d8c8 60%, #e8d0e8 80%, #d0e8f0 100%)'
        };
    }
    
    // Premium/special variants - gold accent
    if (subType.includes('premium') || subType.includes('special')) {
        return {
            background: 'linear-gradient(135deg, #0a2540 0%, #1a4a6e 50%, #d4a853 100%)',
            backgroundHover: 'linear-gradient(135deg, #0d3050 0%, #2a5a7e 50%, #e5c078 100%)'
        };
    }
    
    // Normal cards - clean teal theme
    if (isDark) {
        return {
            background: 'linear-gradient(135deg, #0d3050 0%, #0a2540 100%)',
            backgroundHover: 'linear-gradient(135deg, #1a4a6e 0%, #0d3050 100%)'
        };
    }
    return {
        background: 'linear-gradient(135deg, #ffffff 0%, #e8f4f8 100%)',
        backgroundHover: 'linear-gradient(135deg, #e8f4f8 0%, #d0e8f0 100%)'
    };
};

/**
 * Format a card type into a cleaner display name
 */
export const formatCardType = (subTypeName) => {
    if (!subTypeName) return null;

    const type = subTypeName.toLowerCase();

    if (type.includes('pack foil')) return 'Pack Foil';
    if (type.includes('nexus night')) return 'Nexus Night';
    if (type.includes('foil')) return 'Foil';
    if (type.includes('promo')) return 'Promo';
    if (type.includes('normal')) return null;

    return subTypeName;
};

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
