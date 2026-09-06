# Live verification — SVG sanitiser + unified allowlist + captions

**Date:** 2026-08-30
**Canary:** sandybrown-nightingale-600381.hostingersite.com
**Deploy:** `build-deploy.py --target sandybrown --blocks-only`, 212s, exit 0.
83/83 block.json checksums matched the payload; OPcache + LiteSpeed both purged;
motion QA 3/3 green.
**Probe page:** 3143 `[GATE — DO NOT DELETE] SVG sanitiser + captions probe`

verdict: PASS
intent_capture_passed: true

## What was asserted, and why this probe is not vacuous

One SVG carrying BOTH an attack payload and legitimate content that the OLD narrow
allowlist silently destroyed. A payload-only probe cannot tell a working sanitiser
from a shredder; the legitimate half is the control.

### Front end (server `wp_kses`, unified allowlist) — 11/11

| | |
|---|---|
| `<script>` element | stripped |
| `onclick` on `<path>` | stripped |
| `<a href="javascript:…">` | href removed entirely — the SMIL vector, closed |
| `linearGradient` + 2×`<stop>` | **SURVIVE** (previously rejected) |
| `url(#sgsprobe)` reference | intact |
| `<title>` / `<desc>` | **SURVIVE** — SVG accessible name (previously stripped) |
| `<path d>`, `<circle>` | survive |

### Editor canvas (the NEW client sanitiser), real admin session — 10/10

| | |
|---|---|
| `window.SGS_PWNED` top window | `undefined` |
| `window.SGS_PWNED` canvas window | `undefined` |
| `<script>` element AND its text | both gone |
| `onclick` | stripped |
| `a[href]` in canvas | none |
| gradient / stops / title / desc / path / circle | all survive |

⭐ **The two layers DISAGREEING is the positive control.** The server keeps
`window.SGS_PWNED=1` as inert character data (kses strips the tag, not the text);
the editor removes the element and its subtree. Had the JS sanitiser been a no-op,
the editor DOM would have matched the server's byte for byte. Without that
difference, "no script in the editor" would be equally consistent with "the
sanitiser works" and "kses already handled it upstream".

### Captions `<track>` — 6/6 with a negative control

Two `<video>` elements on one page: one with `videoCaptionsUrl` set, one without.
Exactly ONE `<track kind="captions" srclang="en-GB" label="English" … default>`
rendered. The second video emitted none — so the emitter is conditional, not
unconditional.

## Bean's eye (R-31-13)

`svg-gradient-live-2026-08-30.png` — the probe renders a red→blue gradient with a
white diagonal and a black circle. Before the unification the gradient elements
were rejected, so this painted flat. Numbers do not close this; the eye does.

## Not verified

- The SMIL `<a><animate attributeName="href">` bypass remains REASONED, not
  executed (Bean: ship on the reasoning, test later).
- `sgs-framework.db` not reseeded for the four new `videoCaptions*` attributes.
