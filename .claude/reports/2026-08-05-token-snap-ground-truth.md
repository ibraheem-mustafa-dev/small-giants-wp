# Token / global matching in the cloning pipeline — GROUND TRUTH

**Date:** 2026-08-05
**Scope:** read-only investigation. No code changed.
**Requirement under test (Bean):** *"when the css is properly matched to the right element
and we're about to copy it over, we should ALWAYS first check if it is a custom global that
could match one of the ones in my stylesheet snapshot."*

**Verdict: PARTIAL — and narrower than the docstrings claim.**
A pre-write snapshot check exists for exactly ONE input shape (a draft `var(--X)` colour
whose `:root` hex EXACTLY equals a snapshot palette hex), reached only by write sites that
pass through `extract_token_or_hex`. Every other token family — font-size, spacing,
font-family, shadow, and raw hex colour literals — is written verbatim with **no snapshot
consulted at any point**.

---

## 1. Where the check actually is

### 1.1 The one real pre-write check

`plugins/sgs-blocks/scripts/converter/services/styling_helpers.py:369-391`
`_resolve_draft_colour_var(raw)`:

```
if not raw or not _THEME_PALETTE_MAP or "var(--" not in raw:
    return raw                                   # ← line 375: gated on "var(--"
...
hexval = _DRAFT_ROOT_COLOUR_MAP.get(slug.lower())
if hexval is None: return full
theme_slug = _THEME_PALETTE_MAP.get(hexval.lower())   # ← line 386: EXACT hex key lookup
if theme_slug: return f"var(--wp--preset--color--{theme_slug})"
return hexval
```

It is called from ONE place: `extract_token_or_hex` (`styling_helpers.py:463`), the first
statement of that function — so where `extract_token_or_hex` is on the path, the check IS
before the write.

`_THEME_PALETTE_MAP` is built from the snapshot at
`styling_helpers.py:243-261` `_load_theme_palette_map` → reads
`sites/<client>/theme-snapshot.json` → `settings.color.palette` only.
Installed once per run at `converter/entry.py:192-197`
(`configure_colour_resolution_from_run`).

**Three hard limits, all verified in code:**

| Limit | Evidence |
|---|---|
| Only fires on `var(--…)` values — a raw hex/rgb literal never enters the matcher | `styling_helpers.py:375` |
| Only EXACT hex equality (no ΔE, no shorthand `#fff`→`#ffffff` normalisation) | `styling_helpers.py:386`, dict `.get` |
| Only the colour palette. Nothing else in the snapshot is loaded for matching | `styling_helpers.py:258-261` |

`extract_token_or_hex` line 478 is the terminal proof for raw literals:
```
if v.startswith("#"):
    return v.split()[0]        # returned verbatim — palette never consulted
```

### 1.2 `token_snap` — the service the spec names — is an identity function

`converter/services/token_snap.py:16-20` (whole body):
```
def token_snap(css_property, value, conn):
    if css_property in _LITERAL_PROPERTIES: return value
    # Step-3: colour/spacing token snapping. Identity until those resolvers land.
    return value
```
Called at `resolvers/grid.py:180`, `resolvers/content_band.py:112,271`,
`resolvers/outer_box.py:411`. **All four call sites are no-ops.** The docstring's
"colour (ΔE≤1) and spacing (≤1px) token snapping … owned by the resolvers" is a promise,
not a description — no resolver implements it (§3 below measures the consequence).

### 1.3 `_shadow_token_snap` — snaps against the DB, not the snapshot

`resolvers/outer_box.py:153-176` matches a raw `box-shadow` against
`design_tokens WHERE token_type='size' AND slug LIKE 'shadow-%'` (framework DB), and gaps
honestly on a miss (`outer_box.py:311-320`). It never reads
`theme-snapshot.json → settings.shadow.presets`. For a client whose snapshot shadows differ
from the framework DB rows, this snaps against the wrong source. UNVERIFIED whether the
Mama's snapshot shadows and the DB `design_tokens` rows currently agree — not measurable
from this run (zero shadow emissions, §3).

### 1.4 `token_resolution_check.py` — POST-write, advisory, never mutates

`services/token_resolution_check.py:377-390` `check_attrs` runs at the assembly chokepoint
on the **already-merged** attrs dict and only reports unresolvable `var(--name)`
references. Module docstring lines 30-38 state explicitly: *"This module NEVER mutates a
value, drops an attribute, or fails a build."* It is a detector, not the pre-write gate
Bean is asking for. It does read the snapshot (`:180-191`) but only for `settings.color.palette`
slugs + `settings.custom` flattening, and only to annotate findings.

### 1.5 DEAD CODE: the button-preset snapshot route

`styling_helpers.py:341-366` `button_preset_colour_attrs()` — the module comment at
`:286-298` says *"The converter routes those COLOUR values into the button's own colour
attrs"*. **It does not.** Repo-wide grep for `button_preset_colour_attrs` returns the
definition + `converter/tests/test_button_preset_seed.py` only — **zero production callers.**
`assembly.py` "step 5b" (`:357-376`) now does the opposite: it *strips* lifted colours for a
preset button and sets none. Treat `styling_helpers.py:286-338` as a stale comment block.

---

## 2. What the theme snapshot carries

`sites/mamas-munches/theme-snapshot.json` (718 lines):

| Family | JSON path | Entries | Consulted for matching? |
|---|---|---|---|
| Colour palette | `settings.color.palette` | 21 (17 with a literal hex; 2 are slug-aliases, 2 non-hex) | **YES** — the only one |
| Gradients | `settings.color.gradients` | 0 | n/a (empty) |
| Font families | `settings.typography.fontFamilies` | 4 (`body`/`heading`/`display`/`dm-sans`) | **NO** |
| Font sizes | `settings.typography.fontSizes` | 7 (12/14/18/20/24/36/50 px) | **NO** |
| Spacing sizes | `settings.spacing.spacingSizes` | 8 (0.25→8rem) | **NO** |
| Spacing units | `settings.spacing.units` | 6 | **NO** |
| Shadow presets | `settings.shadow.presets` | 4 (`sm`/`md`/`lg`/`glow`) | **NO** (DB used instead — §1.3) |
| Custom props | `settings.custom.*` | `buttonPresets`, `borderRadius`, `transition`, `duration`, `easing`, `fontLinks`, `header`, `footer`, `sgs`, `maxWidth` | **NO** for value matching (`buttonPresets` loader exists but is dead code, §1.5; `token_resolution_check` reads them for advisory slug annotation only) |

---

## 3. COVERAGE — measured against the live run

**Source:** `pipeline-state/mamas-munches-homepage-2026-08-04-154529/stage-4.json`
→ `output.block_markup` + `output.per_section_results[*].block_markup`
(9 sections, 55,549 chars of markup, 154 blocks with attribute JSON parsed,
**1,704 scalar attribute values** — that is the denominator for "everything written").

| Family | Writes measured | Denominator | Had a snapshot global available | Snapped today |
|---|---|---|---|---|
| **Colour — bare draft `var(--X)`** | 22 | 22 bare-var refs in emitted values | **22 (100%)** | **0** |
| **Colour — already `var(--wp--preset--color--X)`** | 26 | 26 | — (already a global) | 26 (pass-through / the §1.1 snap succeeded upstream) |
| **Colour — raw hex literal** | 30 | 30 hex-valued attrs | 0 (none of `#ffffff`, `#00B67A` are in the 17-hex palette) | 0 — gap is **latent**, not realised on this draft |
| **font-size** | 98 numeric writes (+84 `fontSizeUnit`) | 98 | **34 (34.7%)** exact-match a snapshot `fontSizes` px value | **0** |
| **spacing (padding/margin/gap)** | 334 px-valued writes | 334 | **94 (28.1%)** exact-match a `spacingSizes` value converted at 16px root | **0** |
| **font-family** | 38 | 38 | **38 (100%)** — `"Fraunces", serif` → `display`/`heading`; `'Inter', sans-serif` → `body` (quote-style differs, value identical) | **0** |
| **box-shadow** | 0 | 0 | n/a on this draft | n/a |

**Headline measured number (direct answer to the brief's item (d)):**
**188 raw literals were written to block attributes in this run while an exact-matching
snapshot global existed** — 22 colour (bare draft var), 34 font-size, 94 spacing,
38 font-family. Out of 1,704 scalar attribute values written = **11.0%**.
Zero of the 188 were snapped.

### The 22 unsnapped colour vars, itemised

| Block | Attribute | Draft var | Draft `:root` hex | Snapshot slug that WAS available | Count |
|---|---|---|---|---|---|
| `sgs/button` | `colourBorder` | `var(--primary)` | `#e68a95` | `primary` | 8 |
| `sgs/button` | `colourBorderHover` | `var(--text)` | `#3a2e26` | `text` | 8 |
| `sgs/button` | `colourBorder` | `var(--border)` | `#e8d5c0` | `border-subtle` | 2 |
| `sgs/button` | `colourBorderHover` | `var(--primary)` | `#e68a95` | `primary` | 2 |
| `sgs/trust-bar` | `items[3].iconSvg` (inline `style="fill:…"`) | `var(--primary-dark)` | `#c56a7a` | `primary-dark` | 2 |

Every one of these renders as an **undefined custom property on the WordPress page** — the
exact defect class `token_resolution_check.py`'s own docstring (lines 4-28) describes, and
the D306 ghost-border bug. The snap that would have fixed them was available and was not
reached.

---

## 4. Is a draft `var(--something)` ever resolved? Where?

**Yes — exactly one path.** `styling_helpers._resolve_draft_colour_var` (§1.1), reachable
ONLY through `extract_token_or_hex`. Its four production entry points:

| Caller | file:line | Gate that must pass first |
|---|---|---|
| typography resolver, colour props | `resolvers/typography.py:123` | `prop in _COLOUR_PROPS` |
| OUTER-box resolver, colour-role attrs | `resolvers/outer_box.py:363` | `db_lookup.attr_is_colour_role(block, attr)` |
| CONTENT-band resolver, colour-role attrs | `resolvers/content_band.py:224` | `db_lookup.attr_is_colour_role(block, attr)` |
| WP-native supports lift | `styling_helpers.py:519` (`_colour_value_to_style`) | value reached the native `style.color.*` lift |

A second, unrelated var resolver exists — `fold_helpers._resolve_co_declared_var`
(`content_band.py:35,111`, `outer_box`) — but it resolves a var against **co-declared
properties in the same draft rule**, not against the snapshot. It is not a global check.

Two draft-var kinds are NEVER resolved anywhere: a `var(--X)` in a **non-colour** property
(spacing, radius, font-size), and a `var(--X)` embedded in **content markup**
(the `sgs/trust-bar iconSvg` case above).

---

## 5. Write sites that bypass the check — Bean's gap, precisely

### GAP-1 (PROVEN, realised in the live run) — `role != 'color'` routes a colour value to the verbatim branch

`db_lookup.attr_is_colour_role` (`db/db_lookup.py:1076-1103`) gates on
`block_attributes.role = 'color'` in SQL. `sgs/button.colourBorder` carries **`role='styling'`**
(DB-verified):

```
sgs/button  colourBorder       styling       border-color
sgs/button  colourBorderHover  styling       border-color
```

Trace confirms the value reaches that attr:
`convert-trace-b2.jsonl` → `{"stage":"attr_for_layer_property_column","block_slug":"sgs/button",
"layer":"CONTENT","css_property":"border-color","attr_name":"colourBorder"}`

Path taken in `resolvers/content_band.py`: `box_family_for` (`:211`) no → `attr_is_colour_role`
(`:224`) **no** → `attr_is_number` (`:238`) no → falls to the terminal verbatim write
**`content_band.py:271-272`**:
```
value = token_snap(prop, value_serialise("string", None, resolved), ctx.conn)   # identity
return Write(attr=attr, value=value, property=prop, tier=decl.tier)
```
`var(--primary)` is written raw. `outer_box.py:411-412` is the byte-identical sibling branch.

**Blast radius (DB-measured):** of 202 `block_attributes` rows whose `css_property` is a
colour property, **12 across 6 blocks** carry a non-`color` role and therefore bypass the
check entirely:

| block | attr | role |
|---|---|---|
| sgs/button | colourText, colourTextHover | text-content |
| sgs/button | colourBorder, colourBorderHover | styling |
| sgs/container | gridItemBorder | styling |
| sgs/cta-section | gridItemBorder | styling |
| sgs/hero | gridItemBorder | styling |
| sgs/product-card | ctaColourText, ctaColourTextHover | text-content |
| sgs/product-card | ctaColourBorder, ctaColourBorderHover | styling |
| sgs/nav-drawer | surfaceOpacity | visual |

(190/202 = 94% carry `role='color'` and DO route correctly. This is a 12-row data defect,
not a broken mechanism — but the mechanism has no independent safety net, so the data defect
becomes a rendering defect.)

### GAP-2 (STRUCTURAL) — every non-colour resolver branch writes verbatim

These write sites never consult the snapshot for ANY family. All reached after the colour
branch declines:

| Write site | file:line | What it writes verbatim |
|---|---|---|
| CONTENT-band terminal string branch | `content_band.py:271-272` | any string-typed attr |
| CONTENT-band numeric branch | `content_band.py:240-267` | number + Unit companion (font-size, gap, padding) |
| OUTER-box terminal string branch | `outer_box.py:411-412` | any string-typed attr |
| OUTER-box numeric branch | `outer_box.py:375-405` | number + Unit companion |
| OUTER-box box-family self-merge | `outer_box.py:337-348` | `{top,right,bottom,left}` px strings |
| CONTENT-band box-family self-merge | `content_band.py:211-222` | `{top,right,bottom,left}` px strings |
| CONTENT-band `contentBandPadding` route | `content_band.py:111-113` | px strings |
| typography numeric branch | `typography.py:143-168` | font-size / line-height / letter-spacing |
| typography terminal string branch | `typography.py:171-176` | **font-family**, font-style, text-align |
| typography font-weight branch | `typography.py:132-140` | keyword→numeric only |
| grid resolver | `grid.py:180` | via identity `token_snap` |

This is where the 34 font-size + 94 spacing + 38 font-family literals of §3 were written.

### GAP-3 — the WP-native supports lift snaps colours but nothing else

`root_supports.py` explodes `background`/`border` shorthands (`:154-190`) and hands colour
to `_colour_value_to_style` → `extract_token_or_hex` (snap applies). The spacing/typography
it lifts to `style.spacing.*` / `style.typography.*` never sees a snapshot. Measured: all 334
px spacing writes in §3 came out of this + the box-family branches.

### GAP-4 — content-embedded values are outside the CSS path entirely

`sgs/trust-bar items[].iconSvg` carries `style="fill: var(--primary-dark);"` inside SVG
markup. Content lifts never enter any resolver, so no check of any kind runs. 2 occurrences.

### GAP-5 — shadow snaps against the framework DB, not the client snapshot

§1.3. Structural mismatch with the per-client theming model (Spec 33): every other
per-client token lives in the snapshot; shadow alone is matched against `design_tokens`.

---

## 6. Method notes / limits

- Every count in §3 is derived from ONE run's stage-4 artefacts. Denominators are stated
  inline. `stage-4.json` `block_markup` (27,776 chars) is the composed top-level output;
  the 9 `per_section_results[*].block_markup` blobs were added to reach 55,549 chars —
  this double-counts a section that appears in both, so the per-family counts are an
  upper bound on unique writes but the RATIOS (matched/total) are unaffected.
- Spacing matching used a 16px root for the rem→px conversion. If the draft's root
  font-size is not 16px the 94/334 figure moves. UNVERIFIED: draft root font-size.
- `#3a2e26` appears twice in the palette (`text`, `footer-bg`). Production
  `build_theme_palette_map` uses `setdefault` (`styling_helpers.py:207`) so first-wins =
  `text`; the table in §3 reports `text`.
- Docstrings were treated as unreliable and checked against code. Three were found stale:
  `token_snap.py`'s "owned by the resolvers" (no resolver implements it),
  `styling_helpers.py:286-298`'s button-preset routing claim (dead code),
  and `converter/entry.py:100`'s reference to the token-snap service as if functional.
