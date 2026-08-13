---
doc_type: reference
title: "Visual-diff report — container · background pickers to one ResponsiveControl"
block: container
date: 2026-08-13
property: backgroundImage / bgVideo (control shape only)
verdict: PASS
first_paint_capture_passed: true
source_sha: a808c7a90131ff01
---

# container — three stacked background pickers replaced by one `ResponsiveControl` (UI only, attribute shape untouched)

**Verdict: PASS.** This is an **editor-surface** change with **no rendered-output
change by construction**, and that claim is proven below rather than asserted.

## What changed, and what deliberately did NOT

`BackgroundPanel` (`container/components/ContainerWrapperControls.js`) rendered
three always-visible stacked `MediaUpload` pickers per media family — "Desktop
image" / "Tablet image (optional)" / "Mobile image (optional)", and the same shape
again for video. Each family is now ONE base picker plus ONE `<ResponsiveControl>`
override gated on the base existing.

⛔ **The attribute shape was NOT touched, and must not be.** It still writes three
separately-declared flat attrs — `backgroundImage` / `backgroundImageTablet` /
`backgroundImageMobile` (payload `{id,url,alt}`) and `bgVideo` / `bgVideoTablet` /
`bgVideoMobile` (payload `{id,url}`). Folding them into a tier object would break
the cloning pipeline: `scripts/converter/tests/test_family_modifier_scan.py:111-116`
asserts the lift lands on `backgroundImageMobile` and explicitly
`assert "backgroundImage" not in lifts`, and the triple is registered in the DB
across 7 blocks. This file's own comments (~:355-366, ~:518-528) record the rule:
tier-OBJECT attrs use `ResponsiveOverride`; flat suffix triples use
`ResponsiveControl`. Ours is the latter.

## Evidence that render is unchanged

| Check | Result |
|---|---|
| `container/block.json` in `git status` | **absent** — attribute shape untouched by construction |
| Files changed | exactly one: `ContainerWrapperControls.js` |
| `MediaUpload` elements (word-boundary count) | 6 → **4** (2 base + 2 tier) |
| Converter guard `test_family_modifier_scan.py` | **3 passed** |
| Added `setAttributes` writes | `backgroundImage:{id,url,alt}`, `[key]:{id,url,alt}`, `bgVideo:{id,url}`, `[key]:{id,url}` — `key` resolves to the Tablet/Mobile names |
| `inspector-scan` rule 25 (no own device switcher) | **0 flagged** (GATE) |
| Live canary after deploy | HTTP 200, `payload-verify` all 83 `block.json` match |

⛔ The count was verified with a **word-boundary** pattern. A bare `grep -c
"<MediaUpload"` returns 8 because it also matches `<MediaUploadCheck` — that
substring error produced a false discrepancy against the implementer's correct
report before it was caught.

## A defect found and fixed during review

The first implementation put the **base** picker inside the `ResponsiveControl`'s
desktop branch. That hides the primary control whenever the global device toggle
sits on tablet or mobile — a client previewing narrow could not set the main image
at all — and the tier gate's copy ("set a desktop image **above**") then pointed at
nothing. Both tabs now keep the base picker OUTSIDE the switcher, always visible,
with the tier override below it gated on the base, matching
`src/blocks/media/edit.js`. The implementer flagged this deviation rather than
silently resolving it, which is why it was caught before deploy.

## Known advisory finding, deliberately NOT "fixed"

`inspector-scan` rule 26 drops from 8 flagged to **2**, and the 2 remaining are
these new controls (`:840`, `:967`), classified `hollow-tier` because the desktop
branch returns explanatory text. **That is the canonical `media/edit.js:236`
pattern**, which the rule cannot see: its corpus is `*/components/*.js` +
`extensions/*.js`, never `*/edit.js`. Satisfying the rule would mean folding the
base picker back into the desktop branch — reintroducing the exact defect fixed
above. Left flagged for a DETECTOR fix, not baselined: the rule's own doctrine
says a false positive is a detector bug, and a baseline records accepted debt.

## Residual risk

- `BackgroundPanel` is SHARED by container / hero / cta-section / trust-bar (D591).
  This change is UI-only and adds no attribute, but the surface is shared — the
  hero host was exercised live in the same deploy (see
  `reports/visual-diff/hero-2026-08-13.md`); cta-section and trust-bar were not
  individually opened in the editor.
- Rule 26's 2 findings above, pending a detector fix.
