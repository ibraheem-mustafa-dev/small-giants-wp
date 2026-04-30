# Mama's Munches — Photography Inventory

Pulled 2026-04-30 from the live site (mamasmunches.com) and the public Instagram grid (@mamasmunches). Logo files are excluded (already captured at `sites/mamas-munches/research/brand/`).

## Live site — `live-site/`

Source: `https://mamasmunches.com/wp-content/uploads/`. Pages walked: `/`, `/shop/`, `/about/`, `/contact/`, `/product/lactation-cookies-8-pack/`. After deduplication only **3 unique content images** exist on the live site (the rest of the gallery is logo variants).

| Filename | Source | Resolution | Format | Apparent type | Notes |
|----------|--------|------------|--------|---------------|-------|
| `Lactation-Cookies.webp` | `/wp-content/uploads/2025/12/Lactation-Cookies.webp` | 1024×1536 | WebP | **Real product photo** | Sole product photo on the entire site. Used on shop grid, product page, sticky add-to-cart. Vertical packshot. Looks like real cookies in a paper bag with ribbon. Usable for hero / product grid. |
| `Hero-Cookies-AI-Dec30.png` | `/wp-content/uploads/2025/12/ChatGPT-Image-Dec-30-2025-10_51_04-PM.png` | ~780 wide (rendered 608×521) | PNG | **AI-generated** — filename literally `ChatGPT-Image-Dec-30-2025…`. Cookies have classic AI tells (over-glossy chocolate chips, suspiciously perfect crumb). | Used as the homepage hero illustration. **Not usable** for SGS rebuild as a real product shot — but the layout slot it fills is useful for mockup planning. |
| `About-Mum-AI-Jan3.png` | `/wp-content/uploads/2026/01/ChatGPT-Image-Jan-3-2026-07_56_36-PM-1.png` | 1024×1536 | PNG | **AI-generated** — filename `ChatGPT-Image-Jan-3-2026…`. Stylised mum-and-baby illustration. | Used on About page. Functions as decorative illustration rather than a photograph. **Not usable** as a "real" hero unless the brand explicitly wants illustration over photography. |

## Instagram — `instagram/`

Source: public profile grid at `https://www.instagram.com/mamasmunches/`. No login used. Pulled the first 12 posts visible on the public grid plus the profile picture, plus a full-page screenshot of the profile. Instagram serves grid thumbnails at low resolution (mostly 311×311, a few at 640×640) — these are **not high-res originals**. To get full resolution you'd need to open each post and pull the post-detail image, which requires more aggressive scraping that risks the login wall.

| Filename | Source | Resolution | Format | Apparent type | Notes |
|----------|--------|------------|--------|---------------|-------|
| `profile-page-screenshot.png` | Page screenshot via Playwright | 1280×~1900 | PNG | Mixed | Whole grid + bio for design reference. Useful for understanding visual rhythm / colour story. |
| `profile-pic.jpg` | IG CDN | 150×150 | JPEG | Logo | Avatar — same circular emblem as `research/brand/`. |
| `post-01.jpg` | IG CDN | 311×311 | JPEG | **Real customer photo** — strawberry cookies in customer hand, natural lighting, slightly imperfect crumb. | "Thank you for this beautiful photo of our strawberry cookies" — repost. **Usable** as social proof if Bean has rights. |
| `post-02.jpg` | IG CDN | 311×311 | JPEG | **Real product photo** — date cookies, top-down on neutral surface. | Order shot — appears authentic, normal cookie variation. **Usable** for product grid / variant photography. |
| `post-03.jpg` | IG CDN | 640×640 | JPEG | **Real product photo** — blueberry + banana combo. | "First ever cookie combo" — close-up, natural cookies. **Usable**. Higher res than most. |
| `post-04.jpg` | IG CDN | 311×311 | JPEG | **Real product photo** — banana cookies | Authentic batch photo. **Usable** for variant gallery. |
| `post-05.jpg` | IG CDN | 640×640 | JPEG | **Real product photo** — banana + dark chocolate | "Just finished a massive order" — overhead batch shot. **Usable**, higher res. |
| `post-06.jpg` | IG CDN | 640×640 | JPEG | Likely **review screenshot** from a customer | "Another happy mama" — testimonial repost. Useful for trust signals, not for product photography. |
| `post-07.jpg` | IG CDN | 311×311 | JPEG | Marketing graphic — QR code asset | "Share our QR code" — branded marketing tile, not a photo. Reference for in-house graphic style. |
| `post-08.jpg` | IG CDN | 311×311 | JPEG | **Real product photo** — date + milk chocolate | **Usable**. |
| `post-09.jpg` | IG CDN | 311×311 | JPEG | Marketing graphic — Facebook promo | Branded tile, not a photo. |
| `post-10.jpg` | IG CDN | 311×311 | JPEG | Marketing graphic — Ramadan greeting | Branded tile, not a photo. |
| `post-11.jpg` | IG CDN | 311×311 | JPEG | **Real product photo** — sultana + cranberry | Packed cookies on stand. **Usable**. |
| `post-12.jpg` | IG CDN | 311×311 | JPEG | **Real product photo** — cranberry + sultana debut | **Usable**. |

`_inventory.json` in the same folder has the full alt-text + metadata for each Instagram image (captions, hashtags) — useful for content cross-referencing.

## Summary count

- **Live site:** 3 unique content images (1 real packshot + 2 AI illustrations)
- **Instagram:** 12 posts + 1 profile pic + 1 page screenshot. Of the 12 posts: ~7 real product photos, ~3 marketing tiles, ~2 customer reposts.
- **Real product photography total available:** 1 vertical packshot (high-res, WebP) + ~7 low-res Instagram squares (311–640px).

## Verdict — sufficient for mockups?

**Marginal.** Enough to design the homepage hero and product grid using the existing packshot, but the Instagram thumbnails are too low-resolution for any hero / above-the-fold use. **New photography is needed before launch:**

1. At least 4 hero-grade packshots (vertical + square + lifestyle, 2000px+) covering the four flavour-topping combos that will headline the shop
2. One lifestyle shot — a real mum / hand-holding-cookie / cookie-and-tea moment to replace the AI About-page illustration
3. Optional: ingredient flat-lay (oats, dates, dark chocolate) for the "ingredient education" content gap noted in the client CLAUDE.md

A single 2-hour photo session with a Birmingham food photographer at Zainab's kitchen would close every gap. Until then, the packshot + the better Instagram images can carry mockup approval.
