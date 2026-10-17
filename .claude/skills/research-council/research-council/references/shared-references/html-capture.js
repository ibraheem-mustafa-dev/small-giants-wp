import { chromium } from 'playwright';
import { writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { mkdirSync } from 'fs';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node html-capture.js <url> [output-path]');
  console.error('');
  console.error('Arguments:');
  console.error('  <url>         Target URL to capture');
  console.error('  [output-path] Output HTML file path (default: ./capture-<timestamp>.html)');
  console.error('');
  console.error('Output:');
  console.error('  - HTML file at output-path');
  console.error('  - Metadata JSON at output-path.meta.json');
  process.exit(0);
}

const url = args[0];
const outputPath = args[1] || `./capture-${Date.now()}.html`;
const metaPath = `${outputPath}.meta.json`;
const timeout = 30000;
let retryCount = 0;
const maxRetries = 1;

async function captureHTML() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    page.setDefaultTimeout(timeout);

    // Set a reasonable viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate with retry logic for Cloudflare challenges
    let response;
    while (retryCount <= maxRetries) {
      try {
        response = await page.goto(url, { waitUntil: 'networkidle' });

        // Check for Cloudflare challenge (403 with "Checking your browser")
        if (response.status() === 403) {
          const content = await page.content();
          if (content.includes('Checking your browser')) {
            if (retryCount < maxRetries) {
              console.error(`Cloudflare challenge detected, retrying in 5 seconds (attempt ${retryCount + 1})...`);
              retryCount++;
              await page.close();
              await browser.close();

              // Wait 5 seconds and restart browser
              await new Promise(resolve => setTimeout(resolve, 5000));
              return captureHTML();
            } else {
              console.error('Cloudflare challenge detected, max retries exceeded');
              process.exit(1);
            }
          }
        }

        break;
      } catch (err) {
        if (retryCount < maxRetries) {
          console.error(`Navigation error: ${err.message}, retrying in 5 seconds...`);
          retryCount++;
          await page.close();
          await browser.close();

          await new Promise(resolve => setTimeout(resolve, 5000));
          return captureHTML();
        } else {
          throw err;
        }
      }
    }

    // Wait additional 2 seconds after networkidle
    await page.waitForTimeout(2000);

    // Get final URL (after redirects)
    const finalUrl = page.url();

    // Get page title
    const title = await page.title();

    // Get viewport size
    const viewport = page.viewportSize();

    // Capture HTML content
    const htmlContent = await page.content();
    const htmlSizeBytes = Buffer.byteLength(htmlContent, 'utf8');

    // Ensure output directory exists
    const dir = dirname(outputPath);
    if (dir && dir !== '.' && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write HTML file
    writeFileSync(outputPath, htmlContent, 'utf8');

    // Write metadata JSON file
    const metadata = {
      url,
      final_url: finalUrl,
      title,
      viewport: `${viewport.width}x${viewport.height}`,
      timestamp: new Date().toISOString(),
      html_size_bytes: htmlSizeBytes
    };
    writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

    console.log(`✓ Captured: ${outputPath}`);
    console.log(`✓ Metadata: ${metaPath}`);

    await page.close();
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    await page.close();
    await browser.close();
    process.exit(1);
  }
}

captureHTML();
