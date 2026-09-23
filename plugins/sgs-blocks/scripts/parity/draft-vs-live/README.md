# Draft-vs-live comparison method (Bean-directed, 2026-09-23)

How a clone is compared with its draft before anyone says it "matches". Written after the Eye Care reviews card was
reported as matching from style values alone, and Bean found six visible failures by eye (D1144). This is the method
that then brought the card to parity at every width. It is the method for the whole-site audit.

Spec 20's computed-parity tool (Stage 11.6, `../computed-parity.js`) is the pipeline's automatic numeric diagnostic.
This method is the human-grade check that sits on top of it. A number alone never closes a comparison (R-31-13).

## The rules

1. **Three device widths minimum: 1440, 768 and 375.** Every check is done at all three, never two. For layout that
   changes with width (a header that wraps, a grid that stacks), run the full sweep: 360, 390, 412, 430, 480, 600,
   700, 820, 1024, 1280, 1440 and 1920. 1920 is what shows whether the draft caps its content width.
2. **Compare structure, not only styles.** At each width check four things:
   - **Position:** left edges, x relative to the section or card, widths.
   - **Presence and counts:** is the element there at all, and how many (logo marks, dots, cards).
   - **Arrangement:** stacked or side by side, and whether any control's box intersects content, measured as px² of
     intersection, which must be 0.
   - **Fonts:** which families actually loaded (`document.fonts`, status `loaded`) and where the files came from.

   Style values (`getComputedStyle`) are a supplement, never the verdict.
3. **Find elements inside their section, by text.** Take the section's own text (a heading, "15 reviews"), then walk up
   to the element that owns the box (for example the nearest ancestor with a border and a radius of 8px or more that
   also contains the caption). Never take the first match on the page: the same text can appear elsewhere, including
   in a hidden element. A "leaf" is an element whose child nodes are all text **or comment** nodes, because WordPress
   markup carries comments.
4. **Screenshots at every width, both pages, then LOOK.** Clip each capture to the section (from 40–120px above its
   heading to the bottom of its box). Put draft and live next to each other with `side_by_side.py`, then open the
   image (Read tool) and look before reporting. Stack desktop widths vertically; put phone and tablet widths side by
   side. Crop to a header or a button row when checking detail.
5. **Colours drawn in layers are pixel-sampled.** When an element paints its fill on `::before` or `::after` (the
   button helper does), its own `background-color` is misleading. Screenshot the element and read the pixels with PIL.
   Check `getComputedStyle(el, '::after')` too.
6. **Report per width.** List what matches and what differs, with numbers. Never say "matches" without steps 2 to 5
   done at all three widths. Add a short cause for every difference, proven in the code or the draft, not guessed.

## Setup

- **Serve the draft locally** from its own folder, so relative assets resolve:
  `cd "sites/<client>/<draft folder>" && python -m http.server 8731`, then open
  `http://localhost:8731/<Draft file>.html`. The server can die between runs: check it answers 200 before measuring.
- **The live page must be fresh.** Deploy through `build-deploy.py`, which clears OPcache, LiteSpeed and patterns;
  clear the Hostinger CDN cache when the MCP is connected. Add a cache-buster query string, **never `?s=`**:
  WordPress treats `s` as a search and returns a search results page. Use `?cb=<timestamp>`.
- **One headed Chromium**, `chromium.launch({ headless: false, args: ['--force-device-scale-factor=1'] })`. Without the
  scale flag, Windows display scaling makes a 1px border measure 0.8px and threshold checks fail silently.
- **Scroll the whole page before measuring**, so lazy content renders. Then scroll the section into view, and wait for
  `document.fonts.ready`.
- Load Playwright from the plugin: `createRequire('<repo>/plugins/sgs-blocks/package.json')('playwright')`. Set
  `SSL_CERT_FILE` / `NODE_EXTRA_CA_CERTS` to certifi's bundle on this machine.

## Known traps (each one cost a wrong conclusion this session)

| Trap | What happened | Guard |
|---|---|---|
| Text-only style comparison | Six visible failures reported as "matching" | Rules 2 and 4 |
| First text match on the page | A "4.7" elsewhere on the page was compared with the card's | Rule 3, search inside the section |
| `?s=` cache buster | Measured a search results page | Use `?cb=` |
| Comment nodes | The leaf finder rejected the WordPress element | Accept node types 3 and 8 |
| Display scaling | A 1px border read as 0.8px, so the card was not found | `--force-device-scale-factor=1`, thresholds `> 0.3` |
| The draft's own breakpoints | At a 768 window the draft showed its phone layout: its script measures its CONTENT width (viewport minus the 15px desktop scrollbar); the site uses the viewport | Also measure 790. On real devices (overlay scrollbars) both switch at 768 |
| A pixel-looking colour | `background-color` teal while the eye saw blue (a `::after` layer) | Rule 5 |
| Only one phone width checked | A 375 fix broke 480–600 | The full sweep for anything that wraps |
| A draft screenshot of the wrong area | A full-page clip at a width where the draft re-flowed | Clip from the measured section box, check the image |

## The tools in this folder

All read `DRAFT_URL` (the local draft), `LIVE_URL` (live page, no query string) and `OUT_DIR` (captures and JSON;
default the OS temp folder). They were written for the Eye Care reviews card, and their probes locate that card. For
another section, copy a probe and change the text anchors (step 3); keep the measurements and the checks.

| File | What it measures |
|---|---|
| `three-width-probe.cjs` | At 1440/768/375, both pages: heading and card position, logo size and side, per-card marks, card size, arrow positions and arrow-over-card px², dots, scrollbar, loaded fonts. Writes `r3w_result.json` and section captures `r3w_<page>_<width>.png`. |
| `width-sweep.cjs` | The 12-width sweep: card width, whether the buttons sit below the rating or side by side, and the button's offset from the card edge. Writes `sw_result.json` and captures at 412/600/1920. |
| `heading-positions.cjs` | Every h1/h2 on both pages at 1920 and 1440: x and width, flagged when the draft differs. The quickest whole-page check for width and alignment. |
| `font-sources.cjs` | Every font file the live page requests, with its host, to prove fonts are self-hosted. |
| `side_by_side.py` | Composes captures side by side or stacked, with labels, for the look (rule 4). |

## For the whole-site audit (next)

1. List every top-level section of the draft, in order, with its heading or first text, at 1440.
2. Find each one on the live page by the same text; mark it **missing** when there is no counterpart.
3. For each present section, run the rules above at 1440, 768 and 375: position, presence, arrangement, fonts,
   screenshots side by side.
4. Rank the findings by what the visitor loses: a missing section first, then broken layout, then detail.
5. Record the cause of each finding before proposing a fix, and fix in ranked order.
