# Google Maps Business Scraper

This Node.js project uses Puppeteer to automate Google Maps searches, scroll through business listings, and extract business details into a CSV file.

## Features
- Prompts for a search keyword
- Scrolls all business results in Google Maps
- Visits each business and extracts:
  - Business Name
  - Address
  - City
  - State
  - ZIP
  - Phone Number
  - Email (only if visible on the Google listing)
  - Website URL (if available)
  - Google Maps URL (source reference)
- Outputs all data to `results.csv` (Excel compatible)
- **Does NOT visit business websites to extract emails** (emails are only scraped if visible on the Google Maps listing itself)

## Setup
1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Run the script:**
   ```sh
   node puppeteer_google_maps.js
   ```
   or
   ```sh
   npm start
   ```
3. **Follow the prompt** to enter your search keyword (e.g., `Towing Company in Michigan`).

## Output
- The script will create a `results.csv` file in the project directory with all extracted business data.
- The browser will remain open after extraction for manual inspection.
- The CSV fields are:
  - Business Name
  - Address
  - City
  - State
  - ZIP
  - Phone Number
  - Email (from Google listing only)
  - Website URL
  - Google Maps URL

## Requirements
- Node.js 18+
- Google Chrome (Puppeteer will download Chromium if not present)

## Notes
- The script runs in headed mode (browser visible). You can change to headless by editing the script.
- If Google Maps layout changes, selectors may need to be updated.

## License
MIT 