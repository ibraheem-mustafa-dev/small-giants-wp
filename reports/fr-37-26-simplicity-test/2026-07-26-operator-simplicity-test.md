---
doc_type: test-result
spec: FR-37-26 (Spec 37 — Header/Footer Builder, Operator-simplicity test)
date: 2026-07-26
tester: automated proxy arm (Claude Code, chrome-devtools on the sandybrown canary)
target: sgs/site-header on the ACTIVE "Proof Header" CPT (post 1570), WP 7.0.2
verdict: FAIL
---

# FR-37-26 Operator-Simplicity Test — Recorded Result

## The test (verbatim from the spec)
> A non-coder sets **sticky + phone number + drawer content in under 3 minutes without opening
> Advanced.** Floor: Bean plus one blind tester, screen-recorded.

This is the **automated proxy arm only** (Claude driving the editor). The blind-tester arm
(a real non-coder, screen-recorded) is still outstanding and is the authoritative half — this
run is a cheap pre-read that surfaces the friction before a human is spent on it.

## Verdict: **FAIL** — 2 of 3 items pass; drawer content is not settable in the header editor.

A FAIL here is a **finding, not a reason to re-run** (per the FR's own done-when).

## Per-item result

| Item | Result | Detail |
|------|--------|--------|
| **Sticky** | ✅ PASS | Header block → Settings → "Header behaviour" → **"Sticky on scroll"** checkbox, plain-English description. One tick. |
| **Phone number** | ✅ PASS (minor friction) | Empty bottom row shows "Add a header element" → **"Contact details"** button adds a **Business Phone** (click-to-call) block, auto-wired to Site Info — rendered `0121 496 0123` as a `tel:` link in one click. Friction: the button is labelled "Contact details" not "Phone"; the actual number is edited elsewhere (Appearance → SGS Site Info), which an inline notice explains. |
| **Drawer content** | ❌ FAIL | **Not settable from the header editor.** The Nav Menu block's "Mobile drawer" panel exposes only a **"DRAWER ID"** text field (`sgs-nav-drawer`) with the description *"The id of the sgs/nav-drawer block the burger opens."* There is no control for what appears in the drawer — its content lives in a separate `sgs/nav-drawer` block that is not present in the header CPT. A non-coder cannot set drawer content here, and the only field is developer jargon. |

## Blocking friction discovered (before the timed items even start)

**Selecting the header block is not obvious.** Clicking the header in the canvas left the Block
inspector reading **"No block selected."** The header only selected reliably via **Document
Overview → List View → "SGS Site Header"**. A tech-illiterate client would likely stall here
before reaching any of the three settings. (~30–60s of hunting, possibly a hard block on its own.)

## Control-surface inventory (the "7 controls" finding)

Default-visible controls on `sgs/site-header` → **Settings** tab (before opening the "Advanced"
disclosure at the bottom):

1. Header width (OUTER MAX-WIDTH + per-viewport Desktop/Tablet/Mobile)
2. Content band width (Normal/Wide/Full/Custom + per-viewport)
3. Responsive spacing (collapsed panel)
4. Sticky on scroll
5. Transparent until scrolled
6. Shrink on scroll
7. Contrast safety over hero

Plus the **Styles** tab (Layout preset, Header width, per-breakpoint spacing).

**Against the FR-37-27 roster** (Simple default = "Sticky · Show phone / click-to-call";
Advanced = Transparent · Shrink · Hide-on-scroll · Contrast):
- Transparent, Shrink, Contrast are **default-visible** but the roster puts them in Advanced.
- Width + Content-band + Spacing are also default-visible (design/layout, not the 2-item Simple set).
- **"Show phone / click-to-call" does not exist as a header-level toggle** — phone is the
  per-element "Contact details" path instead.

Per the 2026-07-23 correction, ≤3 is a **nudge, not a ceiling** — so the 7-control surface is a
*prompt to reconsider ordering*, **not a defect to fix by hiding controls a client relies on**.

The behaviour controls sit in a WP `ToolsPanel`: Sticky/Transparent/Shrink/Contrast are shown by
default; **Hide-on-scroll is opt-in** via the panel's "Show Hide on scroll" menu item.

## Findings → actions (do NOT re-run the test to chase a pass)

1. **Drawer content has no discoverable, plain-English path.** The single biggest gap. Today the
   only header-side control is a jargon "DRAWER ID" field. Decide where a non-coder edits what the
   mobile drawer shows, and give it a plain-English control. (Feeds the per-row work's relationship
   to the drawer, and is arguably a prerequisite finding for the Simple surface.)
2. **Header-block selection must be one obvious click.** Clicking the header in the canvas should
   select it (it currently reports "No block selected"); needing List View is a non-coder blocker.
3. **Reconsider the Settings-tab ordering toward the FR-37-27 roster** — as a nudge: move
   Transparent/Shrink/Contrast behind the Advanced disclosure, or accept them as deliberate. Not a
   blocker; do not hide anything a client depends on.
4. **Phone works well** — the "Contact details" one-click element is a good pattern; consider
   renaming to make "phone" discoverable, or surfacing it as the roster's Simple toggle.

## Evidence
- Screenshot: `reports/fr-37-26-simplicity-test/site-header-settings-surface.png`
- Live editor: `sandybrown` canary, `post.php?post=1570` (active "Proof Header"), WP 7.0.2, chrome-devtools.
- No changes saved — the test-added Business Phone block was discarded on navigate-away; the active header is untouched.
