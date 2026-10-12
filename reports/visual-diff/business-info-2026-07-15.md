# business-info — live verification (2026-07-15)

verdict: PASS first_paint_capture_passed: true

**Changes (D338):** `displayType="attribution"` (the Website Credit element — FRAMEWORK constants `SGS_ATTRIBUTION_URL`/`TEXT` in `sgs-blocks.php`, deliberately NOT Site Info so a client cannot blank the agency backlink); draggable "Website Credit" variation; `linkHoverColour` attr; the left→right `#e7d768` `background-clip:text` hover sweep with `@supports` fallback (without it, unsupported browsers would render `color:transparent` = invisible text), `:focus-visible` parity, `prefers-reduced-motion` guard. Typography-only attr surface per Spec 02 §Website-Credit.

**Live (sandybrown, this session, painted-element census):** all 12 `business-info` instances on the homepage render their own displayType correctly — phone ×3, email ×3, socials ×2, description, address, copyright, and **attribution** ("Website by Small Giants Studio" → `https://smallgiantsstudio.co.uk/` with `rel="noopener"`). This is the D338 regression class fixed live: before the 19× `"type"`→`displayType` pattern fixes, five of these variants all rendered a PHONE NUMBER. Resting credit colour = `currentColor` (inherits footer fg — Bean's stated fallback), verified non-transparent.

**First-paint:** the hover sweep is a `:hover`/`:focus-visible` state — nothing animates at load; resting state painted opaque frame one. `prefers-reduced-motion` disables the sweep. No `animation-fill-mode:both`+delay pattern in the block CSS (M1 clean).
