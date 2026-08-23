import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PRICE_GUIDE_DIR = path.join(__dirname, '../../../public/price-guide');
export const CSV_URLS_FILE = path.join(__dirname, '../../../public/csv-urls.csv');
export const LAST_UPDATE_FILE = path.join(PRICE_GUIDE_DIR, 'last-update.json');
export const MANIFEST_FILE = path.join(PRICE_GUIDE_DIR, 'manifest.json');
export const DIFF_CACHE_FILE = path.join(PRICE_GUIDE_DIR, 'diff-cache.json');

// tcgcsv.com began rejecting requests without a User-Agent (HTTP 401), and
// Node's built-in `https.get` does not send one by default. Use a descriptive
// identifier so requests are honored and we're a good citizen.
export const HTTP_USER_AGENT = 'riftrades/1.0 (+https://github.com/riftrades; CSV price-guide updater)';
export const HTTP_HEADERS = {
    'User-Agent': HTTP_USER_AGENT,
    'Accept': '*/*'
};

// Ensure price guide dir exists
if (!fs.existsSync(PRICE_GUIDE_DIR)) {
    fs.mkdirSync(PRICE_GUIDE_DIR, { recursive: true });
}








