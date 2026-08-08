# Simulated human check — 2026-07-31

Site: sandybrown-nightingale-600381.hostingersite.com
Pages checked: `/motion-canary-wave-c/` (2083), `/motion-roster-canary/` (2086), block editor for 2083.
Method: Chrome DevTools MCP, own isolated browser tab, cache-busted navigations, screenshots saved under `.claude/reports/screenshots/2026-07-31-*.png`.

---

## Findings

### 1. [ROUGH-EDGE] A debug marker baked into the shared test images peeks into view at tablet/mobile widths on the Before/After block

**Where:** `/motion-canary-wave-c/`, section "4. sgs/before-after", both instances (`#ba-1` and the second one), at 768px and ~500px wide. Not visible at 1024px or 1440px.

**What I saw:** A small row of black/white squares appears in the top-left corner, overlapping the "After" pill label, on both Before/After instances.

**Root cause (proven, not guessed):** I loaded the raw source images directly with no page styling at all (`frame_0001.webp`, `frame_0048.webp` — the exact files this block uses). The checkerboard is baked into the image itself — it's a frame-index marker the motion-canary test-image generator stamps into every frame, the same idea as the "SGS-CPT-HEADER-PROOF" text banner already known about. It is not a code bug, not a stray form control, not a CSS leak.

**Why it still shows up at some widths and not others:** the block uses `object-fit: cover` centred on the image. At 1024px+ the container is proportionally wider than the source photo, so the crop trims the top/bottom and the marker (which sits right at the top edge) gets cut off. Below ~1024px the crop is gentler and the top-left corner — marker included — stays in frame.

**Verdict:** not a functional bug. Flagging because it's a real, reproducible thing a viewer would see on a narrow phone, and if these test frames are ever reused for a real client demo it would look unprofessional. If the canary frames get replaced with clean footage before this leaves "test page" status, this resolves itself — no code change needed.

**Screenshots:** `2026-07-31-ba1-500-settled.png`, `2026-07-31-fresh-768-ba.png` (defect visible), `2026-07-31-ba1-1024.png` and `2026-07-31-ba1-1440-recheck.png` (clean), `2026-07-31-raw-frame48.png` (proof it's baked into the source image).

**Aside from the marker:** the Before/After block itself is working well — "After" is correctly pinned over the orange/left image, "Before" over the blue/right image, on both instances, at every width I checked (500/768/1024/1440), divider sits dead centre, no width collapse. The earlier float-clearing fix looks solid.

---

### 2. [ROUGH-EDGE] Two console warnings still fire in the block editor

**Where:** `/wp-admin/post.php?post=2083&action=edit`, browser console, on load (not user-visible — developer-facing only).

**What I saw:**
```
[warn] sgs-extensions-editor-css was added to the iframe incorrectly. Please use block.json or enqueue_block_assets to add styles to the iframe.
[warn] sgs-extensions-editor-inline-css was added to the iframe incorrectly. Please use block.json or enqueue_block_assets to add styles to the iframe.
```

**Verdict:** no JavaScript *errors* — the module-loading fix mentioned as done today appears to have landed (I could not reproduce any error-level console messages, before or after clicking around the editor, adding a block, or using the "Verify frames" button). But the brief said "the editor console should be clean" and these two warnings remain on every load. They don't break anything, but they're not nothing either — a stricter WP core version could someday turn a "please fix this" warning into a hard failure. Worth a quick look, low urgency.

---

### 3. [BROKEN — contradicts the stated spec] `sgs/decorative-image` still offers the "Draw" effect

**Where:** block editor, inspector panel for a freshly-inserted "SGS Decorative Image" block (I added one temporarily to inspect it, then undid the change — nothing was saved).

**What I saw:** a dedicated panel called **"SVG Path Draw"** with the description *"Draw SVG paths on scroll — When the image scrolls into view, SVG strokes animate in."* This is fully present and described as working.

**Why it matters:** the brief for today's roster change says decorative-image should offer motion-path and scrub, but explicitly **not** draw or morph. This block still has a complete, described "draw" control.

**What I could not confirm either way:** I looked for "motion-path" and "scrub" as explicitly-named controls on this same block and didn't find panels with those exact names — the closest things are a generic "Animation" dropdown (Fade/Slide/Scale/Rotate/Flip/Blur/Bounce — no "motion path" entry) and an "Element parallax" toggle (continuous scroll-linked drift, which may or may not be what "scrub" refers to internally). I'm flagging this as **inconclusive** rather than guessing — worth five minutes of you or a developer confirming what the internal names for motion-path/scrub actually surface as in the UI.

**Screenshot:** none taken (text-only inspector state) — happy to go back and screenshot the panel if useful.

---

### 4. [WORKING] Image-sequence block — all three checks passed

- Hidden from the block inserter: confirmed. I opened the full block library (every category) and "Image Sequence" does not appear anywhere in it.
- Frame count cap: the "Frame count" slider/field in the inspector is capped at max 200 (currently set to 48 on this instance).
- "Verify frames" button: clicked it live — it returned "Verified — frame_0001.webp and frame_0048.webp both loaded successfully." in plain English, which is exactly the kind of message a non-coder client could act on.
- Both instances on page 2083 still render (poster frame shown in editor, canvas element present twice on the front end) and are still editable — the agency-only lockout doesn't block editing an existing instance, only adding new ones, which matches the explanation text in the panel.

The explanatory copy in the inspector ("This block is hidden from the block inserter (agency-only) because setting it up needs a command-line tool with ffmpeg installed — not something a client is expected to do...") is genuinely plain-English and would make sense to you without translation.

---

### 5. [INCONCLUSIVE] Motion roster for container/hero/cta-section/trust-bar (draw allowed, morph not)

I checked the `sgs/container` block's Animation dropdown — it's the same generic list as decorative-image (Fade/Slide/Scale/Rotate/Flip/Blur/Bounce/Reveal — no "draw", no "morph" anywhere in that dropdown for either block). Container does **not** have a dedicated "SVG Path Draw" panel the way decorative-image does. There's a "Background → SVG" sub-tab where you can paste raw SVG markup, and an "Animation" tab appears only *after* SVG is pasted in — I didn't paste a test SVG to see what shows up next, since that's more setup than a quick look-and-feel pass, and I didn't want to leave test SVG markup sitting in a real page's saved content.

**I'm not claiming a pass or fail here — I didn't reach the actual control.** If you want this nailed down, it's a 5-minute follow-up: paste any placeholder SVG into a container's Background→SVG field and see what animation options appear.

---

## What I would show him first

1. **The decorative-image "Draw" panel (#3).** This is the one clear contradiction between what was supposed to ship today and what's actually in the editor — everything else either checked out clean or was a non-bug (the checkerboard) or genuinely needs five more minutes to pin down (#5).
2. **The Before/After block itself is solid (#1's "aside").** Worth knowing the float-clearing fix actually worked at all four widths — that was the main "did today's fix land" question and the answer is yes.
3. **The two editor console warnings (#2)** — low priority, but easy to mention since they're a leftover from the "editor console should be clean" goal.

## What looks genuinely good

- Before/After labels are correctly matched to the right image at every width, divider centred, no layout collapse — the fix from earlier today held up under real testing.
- Image-sequence's three specific changes (hidden from inserter, 200-frame cap, Verify frames button) all work exactly as described, and the client-facing copy explaining *why* it's agency-only is genuinely clear, not developer jargon.
- Front-end console on the wave-c page is completely clean — no errors, no warnings, not even the previously-known google-logo 404 (that one must live on a different page).
- The editor loaded the whole 27-block test page without a single JS error, including after adding/removing a block and clicking the frame-verify button.

## What I could not judge

- Whether "motion-path" and "scrub" are actually present on decorative-image under different internal names (#3) — needs a developer to confirm the intended UI label.
- The full container/hero/cta-section/trust-bar draw-vs-morph roster (#5) — needs someone to paste a test SVG into the Background panel to see the follow-on options; I didn't want to leave test markup in a saved page to get there.
- The five newly-motion-enabled theme patterns (hero-centred, hero-split, services-grid, stats-counter, cta-banner) — these aren't on either canary page, and I didn't insert one into a page given the "report only, don't edit source" instruction extends to not leaving new content sitting in the live site either. If you want these checked, say the word and I'll insert one into a throwaway draft, screenshot it, and discard without publishing.
- Whether the checkerboard marker in finding #1 would look different on a real phone versus this automated browser — I'm confident in the object-fit/crop mechanism because I proved it two ways (raw image inspection + computed style), so this one I'd call solid rather than "needs your eyes", but flagging in case you want to eyeball it on your own phone anyway.
