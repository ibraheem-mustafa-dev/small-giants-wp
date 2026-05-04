# R1/R2 — Recogniser inline-style + 1280+ tier extraction

**From:** `reports/hero-poc-qc-2026-05-04.md` recogniser blind spots section (R1, R2, R3)
**Status:** Not started — known limitation in `tools/recogniser-v2/extract.py`
**Estimated effort:** ~45 min for both fixes

## R1 — Inline style attribute extraction

The mockup has elements like:
```html
<h1 style="font-family:'Fraunces',serif;font-size:52px;font-weight:700;color:var(--text);line-height:1.15;margin-bottom:16px;letter-spacing:-1px">
```

Currently the recogniser only parses CSS rules from `<style>` blocks and external stylesheets. Inline `style="..."` attrs are ignored. They override CSS rules per CSS specificity, so this is a hard miss.

### Fix

In `tools/recogniser-v2/extract.py`, when extracting computed properties for an element:
1. Parse the `style="..."` attribute via BeautifulSoup if present
2. Merge inline style declarations LAST (highest priority) into the element's resolved property dict
3. OR: switch to Playwright's `getComputedStyle()` which already resolves the cascade including inline styles

Recommended path: use Playwright. Reasons:
- Inline styles are correctly resolved by browser
- `var()` references resolve to actual computed pixel values
- Cascade order is respected (R3 — computed-vs-declared bug)

Implementation sketch:
```python
async with async_playwright() as p:
    browser = await p.chromium.launch()
    page = await browser.new_page()
    await page.goto(f'file://{mockup_path}')
    for element_selector in fingerprint_selectors:
        computed = await page.evaluate(f"""
            (sel) => {{
                const el = document.querySelector(sel);
                if (!el) return null;
                const cs = window.getComputedStyle(el);
                return {{
                    fontSize: cs.fontSize,
                    fontWeight: cs.fontWeight,
                    lineHeight: cs.lineHeight,
                    marginBottom: cs.marginBottom,
                    color: cs.color,
                    // ...all watched properties
                }};
            }}
        """, element_selector)
        # Map to block attributes
```

## R2 — 1280+ tier extraction

Mockup CSS has:
```css
@media (min-width: 1280px) {
    .hero-copy h1 { font-size: 58px }
    .hero-copy { padding: 72px 64px }
}
```

Currently the recogniser only handles base + tablet (`max-width: 1023px`) + mobile (`max-width: 767px`). The `min-width: 1280px` tier is silently dropped. Since the audit measurement is taken at 1440px (which IS in this tier), the extracted desktop value is wrong.

### Fix options

**Option A — Add largeDesktop attribute tier across block.json + render.php + recogniser**
- Pro: clean separation, supports 4-tier responsive design (mobile/tablet/desktop/large)
- Con: requires schema migration on every block — not just hero

**Option B — Extract at 1440 viewport (which is the actual measurement viewport)**
- Pro: zero schema changes; "desktop" attrs just store the 1440 value
- Pro: matches user's screen reality (most users are 1280-1920px)
- Con: 1024px-1279px viewport gets the same value (acceptable trade-off)

**Recommended: Option B.** Use Playwright at 1440px viewport for all desktop measurements. The 1280+ tier values become the desktop attribute values automatically.

Implementation: in the recogniser, when extracting "desktop" properties, use Playwright at `viewport={width: 1440, height: 900}` and read computed styles. This automatically respects all `@media (min-width:...)` rules up to 1440px.

## Verification

After implementing:
1. Re-extract Mama's hero with new recogniser
2. Diff against `sites/mamas-munches/research/sandybrown-media-map.json` outputs
3. Confirm `headlineFontSize: 52` (was 46), `contentPaddingTop: 72` (was 56), `contentPaddingRight: 64` (was 48)
4. Run multi-frame-qa, expect Major defect count to drop by 4-5
