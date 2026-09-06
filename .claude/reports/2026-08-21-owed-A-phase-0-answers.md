# Phase 0 answers — owed-A shared-mechanism cleanups

**Date:** 2026-08-21
**Status:** Phase 0 COMPLETE. QA Gate 0 result below. Three of four phases changed shape.
**Method:** every figure below is ENUMERATED from a command, never reasoned to.

---

## Q6 — is another track live? (answered FIRST, it gates everything)

**YES — a second session is actively committing.** Last commit `9f4e1761` landed 9 minutes
before this survey began.

| Check | Result |
|---|---|
| Branch | `main` |
| Dirty files | `package.json`, `scripts/build-deploy.py`, `scripts/motion-qa/probe-good-by-default.mjs` |
| Dirty `src/blocks/*/render.php` | **zero** |
| Dirty `includes/*.php` | **zero** |
| Last 6 commits touching `render.php` | **zero** |

That track is working in `block.json`, `edit.js`, theme templates, patterns and scripts. Its
declared next step (`9f4e1761`) is *"PHASE 3 — every theme template, one at a time"* — moving
further away from block PHP, not toward it.

**Verdict: file-disjoint, so not blocking.** One semantic overlap to respect: commit `d09ad332`
gave `hero` owned box attrs via `block.json` + `edit.js`. Phase 1 touches `hero/render.php`.
Different files, same block. Coordinate before touching hero, or do hero last.

---

## Q1 — corner-keyed helper signature — **GO**

**Enumerated: 8 definitions + 17 call sites** (the brief said 21 sites; 17 is the counted figure).

All 8 bodies are byte-identical except `before-after`, which is untyped and carries its own
`is_array()` guard because it is called with a raw null:

```php
$radius_tab_val = $sgs_radius_shorthand( $attributes['borderRadiusTablet'] ?? null );
```

A typed `array` parameter would throw `TypeError` on that call and fatal the page.

**Decision — signature:**

```php
function sgs_corner_object_shorthand( $box ): ?string
```

`mixed` (untyped) parameter, internal `is_array()` guard returning `null`, `?string` return.
Sibling to the existing `sgs_box_object_shorthand()`, which stays keyed top/right/bottom/left.
Lives in `includes/helpers-box.php`.

**Files:** `before-after`, `button`, `counter`, `hero`, `icon-list`, `option-picker`, `timeline`,
`whatsapp-cta`.

---

## Q2 — uid boilerplate adoption — **NO-GO. The premise is false.**

The brief assumed the 21 files "hand-roll `wp_unique_id()`/`uniqid()` **instead of**
`sgs_scope_class_for_root()`". They do not, and the two are not substitutable.

**Proof 1 — the helper's own contract.** `sgs_scope_class_for_root( string $root_tag_html, string $prefix )`
takes *already-rendered root tag HTML* and either finds an existing uid class in it or mints one.
It exists for `render_block` **filter injectors**, which receive rendered HTML. A `render.php`
generates markup; at uid-minting time it has no rendered HTML to pass. The argument cannot be
supplied.

**Proof 2 — the actual callers.** Every caller is an injector; **zero** `render.php` files call it,
and none should:

| Caller | Purpose |
|---|---|
| `includes/hover-effects.php` | hover CSS vars |
| `includes/parallax.php` | parallax CSS vars |
| `includes/image-controls.php` | image CSS vars |
| `includes/fx-path-routes.php` | anchor-name vars |
| `includes/fx-shape-routes.php` | anchor-name vars |

**Proof 3 — the 21 are not duplication.** 16 of the 21 use *both* mechanisms, for two different
jobs. `modal/render.php` is the clearest case:

```php
$modal_id = 'sgs-modal-' . wp_unique_id();                       // DOM id  → aria-controls
$uid      = 'sgs-modal-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );  // CSS scope class
```

`wp_unique_id()` mints a **per-instance DOM identifier** for accessibility wiring. The md5 mints a
**content-addressed CSS scope class** so identical attributes dedup across pages. Same split in
`star-rating` (lines 95 and 193). Collapsing them breaks either a11y or CSS dedup.

Only 5 of 21 are uid-only: `collapsible-text`, `feature-grid`, `multi-button`, `product-card`,
`trust-bar` — and these use `wp_unique_id()` *as* the CSS scope class, which is a consistency
question, not duplication.

**Decision: NO-GO. Phase 2 does not run.** The plan's own fail condition ("if any uid changes,
stop — that invalidates cached lifted CSS in `uploads/sgs-css/`") would trip on the first file.

---

## Q3 — style-engine helper — **premise false; recommend DELETE, not a helper**

**Enumerated: 73 occurrences across 63 files.**

**The guard is vacuous.** `wp_style_engine_get_styles()` shipped in **WP 6.1**. Both the plugin
(`sgs-blocks.php:11`) and the theme (`style.css:8`) declare **Requires at least: 6.7**. Every one
of the 73 guards tests for a function its own declared floor guarantees is present. It has never
been able to fail.

**Nothing else converges.** Only the single guard line repeats. What sits inside it does not:

| Args family | Files sharing the shape (of 63) |
|---|---|
| `border` | 39 |
| `spacing` | 22 |
| `typography` | 10 |
| `color` | 9 |

The line *following* the guard has **~37 distinct shapes** — the largest cluster is 21 files on
`$base_style_engine_args = array();`, the rest are one-offs with block-private variable names
(`$tp_`, `$tabs_`, `$slider_`, `$shr_`, `$gr_`, `$cta_` …).

So a helper owning only the guard saves one vacuous line per site and adds indirection; a helper
owning args-assembly cannot exist, because assembly diverges 37 ways.

**Decision: do not build a helper.** Recommend instead deleting the dead guard and re-indenting —
mechanical, 63 files, zero behaviour change by construction (the false branch is unreachable).
This is a different and smaller job than the brief's Phase 3. **Needs Bean's ruling before it runs.**

Out of scope but noted: `wp_interactivity_data_wp_context` (4) and `wp_enqueue_script_module` (3)
are guarded the same way and are also below the 6.7 floor.

---

## Q4 — sanitiser hardening — **GO in principle, but it is its own session**

**Enumerated: 247 call sites across 58 files** — not the small migration the brief implies.

`sgs_css_length_sanitise()` is one line: `preg_replace( '/[^A-Za-z0-9.%]/', '', $value )`.
It strips hyphens, spaces and parentheses unconditionally. Deltas, **produced by running them**:

| input | crude output | correct? |
|---|---|---|
| `10` | `10` | unchanged — the only risky delta |
| `-10px` | `10px` | sign silently lost |
| `clamp(1rem, 2vw, 3rem)` | `clamp1rem2vw3rem` | corrupted |
| `var:preset\|spacing\|40` | `varpresetspacing40` | **corrupted — 5th delta, not in the brief** |

The fifth delta matters most: `var:preset|spacing|40` is exactly what WP's `BoxControl` emits for
a preset value, so this is a live corruption path, not a theoretical one.

**The risky delta has no observed source.** `10` → `var(--wp--preset--spacing--10)` is the only
change that turns a working value into a *different* working value. Enumerated every
`borderRadius` corner default across all `block.json` files: **zero bare-number defaults exist**.

**Decision: GO on the merits, but NOT in this plan.** 247 sites across 58 files is a behaviour
change an order of magnitude larger than the brief's 1.5 h estimate. It ships alone, in its own
session, with its own commit and live verification — which is what the brief itself demands.

---

## Q5 — ordering and parallelism — **revised**

The brief's ordering assumed four phases. Two are gone and one changed shape, so parallelism is
moot — only one phase survives as specified.

Revised: **Phase 1 alone** (8 files, additive, lowest blast radius). Phase 2 cancelled. Phase 3
re-scoped to a deletion pending ruling. Phase 4 deferred to its own session.

---

## QA Gate 0 — result

| Question | Verdict | Contains "probably" / "TBD" / "depends"? |
|---|---|---|
| Q1 | GO — signature written | no |
| Q2 | NO-GO — premise disproved | no |
| Q3 | NO-GO as briefed; DELETE proposed, awaiting ruling | no |
| Q4 | GO on merits, deferred to own session | no |
| Q5 | revised ordering | no |
| Q6 | live track, file-disjoint | no |

**Gate PASSES.** Phase 1 is dispatchable. Phases 2 and 4 are closed. Phase 3 needs one ruling.
