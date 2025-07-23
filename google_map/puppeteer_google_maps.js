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

    const results = [];
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
        const getAttr = (selector, attr) => {
          const el = document.querySelector(selector);
          return el ? el.getAttribute(attr) : '';
        };
        // Name
        const name = getText('h1.DUwDvf');
        // Rating
        const rating = getText('span[aria-hidden="true"]');
        // Reviews
        const reviews = getText('span[aria-label*="reviews"]');
        // Category
        const category = getText('button.DkEaL');
        // Address
        const address = getText('button[data-item-id="address"] .Io6YTe');
        // Phone
        const phone = getText('button[data-item-id^="phone"] .Io6YTe');
        // Website
        const website = getText('a[data-item-id="authority"] .Io6YTe');
        // Plus code
        const plusCode = getText('button[data-item-id="oloc"] .Io6YTe');
        return { name, rating, reviews, category, address, phone, website, plusCode };
      });
      results.push(data);
    }

    // Write to CSV
    console.log('Writing results to CSV...');
    const csvHeader = 'Name,Rating,Reviews,Category,Address,Phone,Website,PlusCode\n';
    const csvRows = results.map(r => [r.name, r.rating, r.reviews, r.category, r.address, r.phone, r.website, r.plusCode].map(v => '"' + (v || '') + '"').join(','));
    fs.writeFileSync('results.csv', csvHeader + csvRows.join('\n'), 'utf8');
    console.log('CSV file written as results.csv');
    // Browser will remain open for user inspection
  } catch (err) {
    console.error('Error:', err);
    // Browser will remain open even on error
  } finally {
    console.log('Script finished. Browser will remain open.');
  }
})(); 