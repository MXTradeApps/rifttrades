# Rift Trades 🌀

A trade balancer app for the Riftbound TCG. Compare card values and create balanced trades using TCGPlayer pricing data.

## Features

- **Price Comparison**: Compare cards using TCGPlayer Market or TCGPlayer Low prices
- **Trade Balancing**: Add cards to "Have" and "Want" lists to see the trade difference
- **URL Sharing**: Share your trade proposals via URL
- **Daily Price Updates**: Prices are fetched from TCGPlayer via TCGCSV

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Fetching Price Data

Before running the app, you need to download the pricing data:

```bash
# Download all CSV files from TCGPlayer
npm run download-csvs

# Consolidate CSVs into a single JSON file for the app
npm run consolidate-csvs
```

### Development

```bash
# Start the development server
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

## Daily Price Updates (GitHub Actions)

To set up automatic daily price updates, create a GitHub Action workflow:

```yaml
name: Update Prices

on:
  schedule:
    - cron: '0 6 * * *'  # Run daily at 6 AM UTC
  workflow_dispatch:  # Allow manual triggers

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Download CSVs
        run: npm run download-csvs:force
        
      - name: Consolidate CSVs
        run: npm run consolidate-csvs
        
      - name: Commit and push if changed
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add -A
          git diff --staged --quiet || git commit -m "Update price data [skip ci]"
          git push
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run download-csvs` | Download CSV files (only if changed) |
| `npm run download-csvs:force` | Force download all CSV files |
| `npm run consolidate-csvs` | Consolidate CSVs into JSON |
| `npm run csv-status` | Check current data status |

## Tech Stack

- **React 19** with Vite
- **Material-UI (MUI)** for components
- **PapaParse** for CSV parsing
- **csv-parser** for Node.js CSV processing

## Data Source

Price data is sourced from [TCGCSV](https://tcgcsv.com/) which aggregates TCGPlayer pricing data.

- Game ID: 89 (Riftbound)
- Data includes: Market Price, Low Price, High Price, and more

## License

Apache 2.0 - See LICENSE file for details
