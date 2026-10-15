# Rift Trades — App Store Listing (v2, new UI)

Paste-ready copy for the redesigned app, mirroring the FAB Trades v2 listing. The same text
lives in `.aso/listing.json`, which `.aso/asc_listing.py apply` pushes to App Store Connect
(it never submits for review). Character counts are checked.

## App name (26/30)
```
Rift Trades: Riftbound TCG
```
Puts the game's name in the heaviest search field. Apple can reject a name using another
company's mark (Guideline 5.2.1); if Review pushes back, fall back to `Rift Trades: TCG Trade & Prices`
and move `riftbound` into keywords.

## Subtitle (26/30)
```
Card Scanner & Price Guide
```

## Keywords (99/100)
```
trade,balancer,binder,collection,tracker,value,calculator,wishlist,foil,league,legends,champion,lgs
```
No word repeats the name or subtitle. `league,legends,champion` target players searching for the
League of Legends card game; drop them if Review flags them under Guideline 2.3.7.

## Promotional text (154/170)
```
New look, plus daily market movers, Collection Stats, multiple binders and bulk select. Balance any Riftbound trade in seconds. No account needed, no ads.
```

## What's New
```
• A fresh new design across every screen
• Browse opens on your dashboard with the day's biggest price movers, plus a full Trending list
• Collection Stats for every binder
• Select several binder cards at once to move or remove them
• Small fixes and polish
```

## Description (2376/4000)
```
The trade app for Riftbound players. Look up any card, see what it's worth, and know a trade is fair before you shake on it. No account needed.

Whether you're trading at your local game store, a Nexus Night, or a big regional, Rift Trades makes every trade fair, fast, and informed.

BALANCE ANY TRADE IN SECONDS
Add cards to each side and watch the totals update live. See who's up, who's down, and by how much. Trade close but not quite even? Tap Find Trade Filler and Rift Trades suggests cards that close the gap, with the ones already in your Binder at the top.

REAL MARKET PRICES, UPDATED DAILY
TCGplayer (USD) and CardMarket (EUR) prices, refreshed every day. Compare Market and Low on every printing, Normal and Foil, and check price history before you deal.

SPOT THE CARDS ON THE RISE
Browse opens on your own dashboard: your collection's value, the cards moving in your binders, and the biggest gainers and losers across the whole catalog. Tap Trending for the full list.

YOUR BINDERS, DIGITIZED
Trade Binder, Collection, and as many binders as you like, each with its total value and condition per card. Collection Stats shows each binder's total in USD and EUR and which of its cards are gaining or losing value. Select several cards at once to move or remove them. Confirm a trade and your binders update automatically.

A WANT LIST YOU CAN HAND ACROSS THE TABLE
Add the cards you're hunting, then hand your phone over so the other player can check it against their binder.

NEVER LOSE TRACK OF A LOAN
Lent a friend a deck? Borrowed a Foil for a tournament? The Lend tab tracks every card going out or coming in, by person, with running values.

SCAN CARDS WITH YOUR CAMERA
Point your camera at a card and add it to a trade or binder without typing.

BROWSE THE FULL CATALOG
Every Riftbound set and printing. Search everything, filter foils, and sort by name, price or collector number.

ALSO INCLUDES
• Trade history
• Switch between USD and EUR
• Condition grades (NM, LP, MP, HP, DMG)
• Dark mode
• Optional sign-in to sync across devices

Questions or ideas? We read every message: mxbloombusiness@gmail.com

Rift Trades is a fan-made app. Not affiliated with Riot Games, TCGplayer or CardMarket. Card names and images are property of their respective owners.

Terms of Use (EULA): https://riftrades.com/terms
Privacy Policy: https://riftrades.com/privacy
```
Not claimed, on purpose: "free" (the listing shows In-App Purchases) and anything about the scanner
identifying cards automatically beyond what the app does today.

## Screenshots (6.9" 1320×2868 and 6.5" 1242×2688)

Built by `screenshots/v2/build.py` from raw simulator captures (see `screenshots/v2/README.md`).
Gold background, navy headline with the second line in deep teal, Archivo 800.

| # | Headline | Screen |
| --- | --- | --- |
| 1 | Fair trades, / in seconds. | Near-even trade, totals bar broken out |
| 2 | Close the gap / from your binder. | Find Trade Filler sheet |
| 3 | Live prices for / every printing. | Card detail price table |
| 4 | Spot the cards / on the rise. | Trending, top gainer broken out |
| 5 | Know what your / binder is worth. | Binder list with the Collection Stats total |
| 6 | Never lose / a lent card. | Lend tab |
| 7 | Hand over your / Want List. | Want List |

No life tracker, Fabrary import or Share Binder slides: Rift doesn't have them.

## Category
Primary **Reference**, secondary **Utilities**, same as FAB.
