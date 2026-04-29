# Spec 02: html-capture.js
**Target:** Cerebras | **Time:** 10 min

Node.js Playwright script. Navigates to URL, waits networkidle + 2s, saves page.content().

**Output:** C:/Users/Bean/.agents/skills/shared-references/html-capture.js

**Interface:** node html-capture.js <url> [output-path]

**Must:** ES modules, Playwright chromium, networkidle+2s, page.content() as HTML, metadata JSON (url, final_url, title, viewport, timestamp, html_size_bytes), timeout 30s exit 1, Cloudflare retry once 5s, no-args usage.

**Must NOT:** npm beyond playwright, screenshots, CSS extraction, require().

**Verify:** Run on example.com. Output starts with <!doctype.