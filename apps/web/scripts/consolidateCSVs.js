#!/usr/bin/env node

/**
 * CSV Consolidation Script for Riftbound
 * 
 * This script parses all CSV files in the public/price-guide directory and 
 * consolidates them into a single JSON file (consolidated-data.json).
 * 
 * Features:
 * - Processes all set_*.csv files numerically in order
 * - Preserves original CSV schema with all columns
 * - Adds metadata (_sourceFile, _setNumber, setName) to each record
 * - Assigns unique IDs to each card
 * - Includes comprehensive metadata about the consolidation process
 * 
 * Usage:
 *   npm run consolidate-csvs
 *   or
 *   node scripts/consolidateCSVs.js
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';
import { HTTP_HEADERS } from '../src/services/csv/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PRICE_GUIDE_DIR = path.join(__dirname, '..', 'public', 'price-guide');
const MANIFEST_PATH = path.join(PRICE_GUIDE_DIR, 'manifest.json');
const OUTPUT_PATH = path.join(PRICE_GUIDE_DIR, 'consolidated-data.json');

// Riftbound Game ID
const RIFTBOUND_GAME_ID = 89;

/**
 * Fetch product groups (set names) from the API
 * @returns {Promise<Object>} Map of groupId to group name
 */
async function fetchProductGroups() {
    const PRODUCT_GROUPS_URL = `https://tcgcsv.com/tcgplayer/${RIFTBOUND_GAME_ID}/groups`;
    
    return new Promise((resolve, reject) => {
        console.log('📡 Fetching set names from API...');

        // tcgcsv.com requires a User-Agent header — Node's https.get omits one by default.
        https.get(PRODUCT_GROUPS_URL, { headers: HTTP_HEADERS }, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                console.warn(`Failed to fetch product groups: ${res.statusCode} ${res.statusMessage || ''}`.trim());
                resolve({});
                return;
            }

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    
                    if (!json.success || !json.results || !Array.isArray(json.results)) {
                        console.warn('Invalid product groups response');
                        resolve({});
                        return;
                    }

                    // Create a map of groupId to group name
                    const groupMap = {};
                    json.results.forEach(group => {
                        groupMap[group.groupId] = group.name;
                    });

                    console.log(`   ✓ Fetched ${Object.keys(groupMap).length} set names`);
                    resolve(groupMap);
                } catch (err) {
                    console.warn(`Failed to parse product groups JSON: ${err.message}`);
                    resolve({});
                }
            });
        }).on('error', (err) => {
            console.warn(`Error fetching product groups: ${err.message}`);
            resolve({});
        });
    });
}

/**
 * Parse a single CSV file and return the data
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} Parsed CSV data
 */
async function parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
        const csvText = fs.readFileSync(filePath, 'utf8');
        
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => {
                // Ensure consistent header naming
                return header.trim();
            },
            transform: (value, header) => {
                // Clean up data values
                return value.trim();
            },
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn(`CSV parsing warnings for ${path.basename(filePath)}:`, results.errors);
                }
                resolve(results.data);
            },
            error: (error) => {
                console.error(`Error parsing ${path.basename(filePath)}:`, error);
                reject(error);
            }
        });
    });
}

/**
 * Get all CSV files in the price-guide directory
 * @returns {Array<string>} Array of CSV file paths
 */
function getCSVFiles() {
    if (!fs.existsSync(PRICE_GUIDE_DIR)) {
        throw new Error(`Price guide directory not found: ${PRICE_GUIDE_DIR}`);
    }

    const files = fs.readdirSync(PRICE_GUIDE_DIR)
        .filter(file => file.startsWith('set_') && file.endsWith('.csv'))
        .sort((a, b) => {
            // Sort numerically by set number
            const numA = parseInt(a.match(/set_(\d+)\.csv/)?.[1] || '0');
            const numB = parseInt(b.match(/set_(\d+)\.csv/)?.[1] || '0');
            return numA - numB;
        })
        .map(file => path.join(PRICE_GUIDE_DIR, file));

    return files;
}

/**
 * Load manifest information
 * @returns {Object|null} Manifest data or null if not found
 */
function loadManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        console.warn('Manifest file not found, proceeding without metadata');
        return null;
    }

    try {
        const manifestText = fs.readFileSync(MANIFEST_PATH, 'utf8');
        return JSON.parse(manifestText);
    } catch (error) {
        console.warn('Error reading manifest file:', error.message);
        return null;
    }
}

/**
 * Main function to consolidate all CSV files into a single JSON
 */
async function consolidateCSVs() {
    console.log('🌀 Starting Riftbound CSV consolidation...');
    
    try {
        // Fetch product groups (set names) first
        const groupMap = await fetchProductGroups();
        
        // Load manifest
        const manifest = loadManifest();
        
        // Get all CSV files
        const csvFiles = getCSVFiles();
        console.log(`📁 Found ${csvFiles.length} CSV files to process`);

        if (csvFiles.length === 0) {
            throw new Error('No CSV files found to consolidate');
        }

        // Process all CSV files
        const allData = [];
        let totalRecords = 0;
        let processedFiles = 0;
        let globalCardIndex = 0;

        for (const csvFile of csvFiles) {
            const fileName = path.basename(csvFile);
            console.log(`📄 Processing ${fileName}...`);

            try {
                const csvData = await parseCSVFile(csvFile);
                
                // Add metadata to each record including unique ID and set name
                const setNumber = parseInt(fileName.match(/set_(\d+)\.csv/)?.[1] || '0');
                const enrichedData = csvData.map((record, index) => {
                    globalCardIndex++;
                    
                    // Look up set name from groupId
                    const groupId = record.groupId;
                    const setName = groupMap[groupId] || '';
                    
                    return {
                        // Assign unique ID first
                        _id: globalCardIndex,
                        _uniqueId: `RB${globalCardIndex.toString().padStart(6, '0')}`,
                        _sourceFile: fileName,
                        _setNumber: setNumber,
                        _setName: setName,
                        // Spread all original card data
                        ...record
                    };
                });

                allData.push(...enrichedData);
                totalRecords += csvData.length;
                processedFiles++;
                
                console.log(`   ✓ ${csvData.length} records processed from ${fileName}`);
            } catch (error) {
                console.error(`   ✗ Error processing ${fileName}:`, error.message);
                // Continue with other files even if one fails
            }
        }

        // Create consolidated data structure
        const consolidatedData = {
            metadata: {
                game: 'Riftbound',
                generatedAt: new Date().toISOString(),
                totalFiles: processedFiles,
                totalRecords: totalRecords,
                sourceManifest: manifest ? {
                    lastUpdated: manifest.lastUpdated,
                    originalTotalFiles: manifest.totalFiles
                } : null,
                schema: {
                    description: "Consolidated Riftbound card data from all CSV files",
                    metadataFields: [
                        "_id", "_uniqueId", "_sourceFile", "_setNumber", "_setName"
                    ],
                    priceFields: [
                        "lowPrice", "midPrice", "highPrice", "marketPrice", "directLowPrice"
                    ]
                },
                setNames: groupMap
            },
            data: allData
        };

        // Write consolidated data to JSON file
        console.log(`💾 Writing consolidated data to ${path.basename(OUTPUT_PATH)}...`);
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(consolidatedData, null, 2));

        // Generate summary
        console.log('\n✅ Consolidation completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`   • Files processed: ${processedFiles}`);
        console.log(`   • Total records: ${totalRecords}`);
        console.log(`   • Set names included: ${Object.keys(groupMap).length}`);
        console.log(`   • Output file: ${OUTPUT_PATH}`);
        console.log(`   • File size: ${(fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2)} MB`);

        // Validate the output
        console.log('\n🔍 Validating output...');
        const outputData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
        console.log(`   • Metadata check: ${outputData.metadata ? '✓' : '✗'}`);
        console.log(`   • Data array check: ${Array.isArray(outputData.data) ? '✓' : '✗'}`);
        console.log(`   • Record count match: ${outputData.data.length === totalRecords ? '✓' : '✗'}`);

    } catch (error) {
        console.error('❌ Error during consolidation:', error.message);
        process.exit(1);
    }
}

// Run the script if called directly
const isMainModule = process.argv[1] && process.argv[1].includes('consolidateCSVs.js');
if (isMainModule) {
    consolidateCSVs();
}

export { consolidateCSVs };
