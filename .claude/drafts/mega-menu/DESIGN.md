# Mega-menu panel set — design direction

**Status:** live. Rewritten 2026-07-21 after seven panels, because the original locked
direction moved twice and most of what follows was learned by getting it wrong first.
**Read this before authoring any mega panel.** It exists because unguided generation
converges on the statistical centre of web design — this file is the direction that stops it.

---

## 1. The two registers

There are **two** approved design languages. A panel belongs to exactly one; never blend them.

| | **A — Editorial Broadsheet** | **B — SGS Modern** |
|---|---|---|
| Used for | client sites wanting authority | Small Giants Studio's own site |
| Ground | dark, inverted (`--text` as background) | **orange (`--accent`)** — Bean's pick |
| Radius | 0 | 12–14px |
| Type | italic serif display + sans body | Inter + JetBrains Mono micro-labels |
| Structure | hairline rules, no boxes | hard 2px borders + flat offset shadows |
| Register | authoritative, curated | casual, modern, high-tech-not-futuristic |
| Built examples | `link-columns-v3`, `photo-grid`, `split-aside-cta` | `browse-switch-sgs`, `info-box-sgs` |

**Register C — bespoke per-client** (e.g. `depth-stack`, boutique hospitality: deep forest +
brass + Fraunces) is legitimate for a single client build but is NOT part of the reusable
starter set. Do not add register-C panels to the framework roster.

**The "high-tech" signal in register B is a mono micro-label with a small status dot.**
Engineering vernacular, not sci-fi chrome. Glow, neon and gradients would say *spaceship*.

## 2. Where the personality lives — and where it must NOT

Panels ship to every client and inherit an unknown palette. So:

| Carries personality | Must NOT carry it |
|---|---|
| Type scale, weight, case, family | Colour choice |
| Unequal columns, asymmetry, height | Photographic subject matter |
| Radius + density (the Radix "two knobs" model) | Anything industry-coded |
| Rule weights, border treatment | A specific hue relationship |
| Motion character | |

This is why a panel can be strongly designed AND brand-neutral at once. Colour is a swap layer.

## 3. Colour — hard rules, all contrast-proven against real client snapshots

Measured against `sites/*/theme-snapshot.json`. These are not preferences.

- **NEVER put text in `--accent` on a light ground.** 1.35:1 Mama's, 1.68:1 Indus, 2.51:1 SGS.
- **NEVER put text in `--primary` on a light ground.** 2.25:1 Mama's.
- **`--accent` IS legal as a large background field** with near-black on it (6.19:1 SGS,
  8.77:1 Mama's) and on a dark inverted ground (6.53–8.77:1).
- **ORANGE IS A GROUND, NEVER AN INDICATOR.** This failed three separate times — a status
  dot (2.92:1), an underline (2.92:1), an active rail (1.79:1). If you want an active state
  in accent, **flip the whole element's ground to accent** and invert its type to near-black.
  That reads stronger than a marker anyway.
- **Inverting the ground raises the contrast ceiling.** On light, only `--text`/`--text-muted`
  pass, which structurally forces greyscale — that is why flat light panels read lifeless.
- Only use token names that exist in real client snapshots. `--focus-ring` and `--on-primary`
  do NOT exist. Never invent a token.
- Every declared token must be used. **A declared-but-unused BRAND token is a design smell,
  not a tidiness one** — it usually means the design defaulted (this is how the SGS panel
  ended up on a near-white ground with the brand's warm tone sitting unused).

### 3a. Two measurement rules that have each caught real bugs

- **Measure an element against the zone it ACTUALLY occupies.** Bottom-anchored text
  (`justify-content: flex-end`) sits in the 90%+ scrim, not the 62% mid-zone. Measuring the
  wrong zone produced confident, precise, wrong failures twice.
- **Any background layer re-computes every ratio above it.** A cursor spotlight lifting the
  ground broke brass text (4.18:1) that passed against the resting background; a room photo
  behind a wash broke it again (3.26:1). A static check against the *design* colours passes
  while the rendered page fails. If you add a background effect, re-measure everything on it.

## 4. Motion

**Permitted, and expected — the panels felt dead without it.** But:

- **Transition ONLY `transform` and `opacity`.** Both are compositor-only.
- **NEVER transition `filter` or `box-shadow`.** Both repaint every frame and were the
  measured cause of the lag Bean reported. For a lift shadow, pre-render it on a pseudo-
  element and fade its **opacity**.
- Spring easing: `cubic-bezier(0.34, 1.4, 0.5, 1)`. Standard ease: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- 3D tilt caps at **7°** — past ~8° it reads as a gimmick, not depth.
- Cursor-reactive backgrounds are fine: write `--mx`/`--my` from a rAF-throttled `mousemove`
  and drive a `radial-gradient`. ~14 lines. Must have a static default.
- Ken Burns scene pans (slow `scale` + `translate3d`, `alternate`) read as video at zero
  video cost. 20–30s.
- **No greyscale-to-colour on hover.** Bean's call — cards are full colour at rest.
- Staggered reveal is permitted on a **panel switch**, not on menu open.
- Everything inside `prefers-reduced-motion: no-preference`, with a static fallback. An
  *informational* state (an active rail) must still render when motion is reduced.

## 5. Interaction model

- **NEVER build hover-only switching.** It makes content unreachable: moving the cursor
  toward a link leaves the trigger and the panel reverts. This is a correctness bug, not a
  polish one.
- Preferred model for a category panel: **drill-down**. Tiles are the menu; clicking one
  opens its drawer over the top; a back control returns. Implemented with `:target` — pure
  CSS, keyboard- and touch-equal. (Caveat: `:target` writes a URL hash and adds history
  entries. A hidden-radio mechanism avoids that at the cost of more markup.)
- **Hit areas:** cards must not overlap by more than ~10%, and hover lift must be VERTICAL —
  a horizontal shift walks a card over its neighbour's click target.
- **Mobile degrades to MORE content, never less.** Hiding panels because hover doesn't exist
  made 12 links unreachable and invisible to mobile-first crawling.

## 6. Structure — SGS pipeline rules (non-negotiable)

- SGS-BEM, one block-root class per node. Canonical: **Spec 00 §3/§3.1**
  (⛔ the `/frontend-design` skill cites Spec 13 — that pointer is DEAD).
- **Use ONLY recognised element tokens.** `__title` `__description` `__cta` `__image`
  `__label` `__tag` `__item` `__eyebrow`. Inventing a clearer name (`__aside-title`,
  `__back`, `__scene`) silently costs the client their editor controls — the leaf renders as
  styled text instead of promoting to its block. Scope variants with a descendant selector
  instead. Decorative, non-content wrappers may use a plain non-SGS utility class.
- **Image slots MUST be real `<img>` elements.** A CSS background does not map to `sgs/media`
  and gives the operator no image controls at all.
- **Every image slot needs a scrim** so the label clears contrast over ANY photo an operator
  later swaps in. This is what makes the slot safe to edit.
- Grid on the direct parent of the items; one optional `__inner` carrying `--content-width`.
- Device tiers only: mobile ≤767, tablet ≤1023, desktop ≥1024.
- No inline `style=""`. Responsive values in `@media`.

## 7. Banned defaults (the rejection clause)

- Equal-width columns / symmetric grids — **columns must be unequal**
- Three equal feature cards ("modular and gross")
- Squat horizontal strips — **use the panel's height**
- **Purple/blue/violet gradients** specifically. Gradients as such are FINE (Bean, 07-21):
  hard pattern fields, duotones, scrims and tonal washes in client tokens are encouraged.
- Drop shadows that blur-and-animate (static flat offsets are the house style)
- Thick coloured left-border as an active state — a named AI tell
- Evenly distributed palettes; Inter alone as the whole typographic idea; emoji icons;
  centred everything; full-screen takeover (cannot full-screen a hover state)

## 8. Exit gate

```bash
python plugins/sgs-blocks/scripts/lints/bem-lint.py <draft.html>
python plugins/sgs-blocks/scripts/lints/token-lint.py <draft.html>
python plugins/sgs-blocks/scripts/lints/draft-vocab-lint.py <draft.html>
```

Target: `bem-lint` PASS · `draft-vocab-lint` **0 errors AND 0 warnings** (warnings mean a
leaf will not promote — treat them as errors) · no unused tokens · no raw hex outside `:root`.

⚠ **`token-lint.py` IS INERT.** It reported "0 declarations" on a draft full of them, so it
would pass a draft made entirely of hardcoded hex. **Every check in this whole programme has
been done by hand.** Until it is fixed, manually verify §3, §3a and the unused-token rule.
Cross-palette contrast is not gated at all. Fixing it is the highest-value outstanding task —
it is the gate protecting the one thing (brand-colour safety) the client set depends on.

## 9. The panel roster

| Panel | Register | Status |
|---|---|---|
| `link-columns-v3` | A | built |
| `photo-grid` | A | built |
| `split-aside-cta` | A | built |
| `split-aside-cta-sgs` (+ `-orange`) | B | built — orange ground approved |
| `info-box-sgs` | B | built, but the NAME is wrong for what it is |
| `browse-switch-sgs` (drill-down) | B | built + approved |
| `depth-stack` | C | built + approved (hospitality, not a starter) |
| `logo-grid` (brand directory) | C — Indus Foods | built + gates green |

**All eight built.** Register C now holds two client builds (`depth-stack` hospitality,
`logo-grid` Indus). The client STARTER set (A vs B) is still unlocked — Bean chose to build
logo-grid for Indus specifically rather than settle it.
