const puppeteer = require('puppeteer');
const readline = require('readline');
const fs = require('fs');

(async () => {
  let browser;
  try {
    console.log('Prompting for search keyword...');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    const searchKeyword = await question('Enter search keyword for Google Maps: ');
    rl.close();

    console.log('Launching browser...');
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2' });

    console.log('Waiting for search input...');
    await page.waitForSelector('input#searchboxinput');
    console.log('Typing search keyword and pressing Enter...');
    await page.type('input#searchboxinput', searchKeyword);
    await page.keyboard.press('Enter');

    // Wait for results to load
    await new Promise(r => setTimeout(r, 5000));
    console.log('Initial wait complete, proceeding to feed scroll...');

    // Scroll the feed
    console.log('Waiting for feed element...');
    await page.waitForSelector('div[role="feed"]');
    const feedElem = await page.$('div[role="feed"]');
    if (!feedElem) {
      throw new Error('Feed element not found');
    }
    console.log('Scrolling feed...');
    let lastHeight = 0;
    let sameCount = 0;
    while (true) {
      const height = await page.evaluate(el => el.scrollHeight, feedElem);
      await page.evaluate(el => el.scrollTo(0, el.scrollHeight), feedElem);
      await new Promise(r => setTimeout(r, 1000));
      const newHeight = await page.evaluate(el => el.scrollHeight, feedElem);
      if (newHeight === lastHeight) {
        sameCount++;
        if (sameCount > 2) break; // No more scrolling
      } else {
        sameCount = 0;
        lastHeight = newHeight;
      }
    }
    console.log('Scrolling complete.');

    // Extract business links
    console.log('Extracting business links...');
    const businessLinks = await page.$$eval('div[role="feed"] a.hfpxzc', links => links.map(a => a.href));
    console.log(`Found ${businessLinks.length} business links.`);

    // Prepare CSV file
    const csvFile = 'results.csv';
    const csvHeader = 'Business Name,Address,City,State,ZIP,Phone Number,Email,Website URL,Google Maps URL\n';
    if (!fs.existsSync(csvFile)) {
      fs.writeFileSync(csvFile, csvHeader, 'utf8');
    }

    for (let i = 0; i < businessLinks.length; i++) {
      const link = businessLinks[i];
      console.log(`Processing business ${i + 1}/${businessLinks.length}: ${link}`);
      await page.goto(link, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));
      // Extract data from the business page
      const data = await page.evaluate(() => {
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : '';
        };
        // Name
        const name = getText('h1.DUwDvf');
        // Address
        const address = getText('button[data-item-id="address"] .Io6YTe');
        // Phone
        const phone = getText('button[data-item-id^="phone"] .Io6YTe');
        // Website
        const website = getText('a[data-item-id="authority"] .Io6YTe');
        // Email (only from Google listing)
        let email = '';
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const pageText = document.body.innerText;
        const found = pageText.match(emailRegex);
        if (found && found.length > 0) email = found[0];
        return { name, address, phone, website, email };
      });
      // Parse address into City, State, ZIP
      let city = '', state = '', zip = '';
      if (data.address) {
        // Try to match: City, State ZIP
        const match = data.address.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})/);
        if (match) {
          city = match[1].trim();
          state = match[2].trim();
          zip = match[3].trim();
        }
      }
      // Append to CSV immediately, including the link
      const csvRow = [data.name, data.address, city, state, zip, data.phone, data.email, data.website, link].map(v => '"' + (v || '') + '"').join(',') + '\n';
      fs.appendFileSync(csvFile, csvRow, 'utf8');
      console.log(`Appended business ${i + 1} to CSV.`);
    }
    console.log('All businesses processed. CSV file is up to date.');
    // Browser will remain open for user inspection
  } catch (err) {
    console.error('Error:', err);
    // Browser will remain open even on error
  } finally {
    console.log('Script finished. Browser will remain open.');
  }
})(); 