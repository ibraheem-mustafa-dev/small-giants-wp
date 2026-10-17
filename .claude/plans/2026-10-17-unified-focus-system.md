---
doc_type: plan
title: One keyboard focus system for the whole framework (accent glow with a solid core)
status: built, awaiting grouped deploy and live verification
date: 2026-10-17
governing_specs: Spec 32 (new §14.5, FR-32-22), Spec 38A (§10, §12, FR-38A-30, FR-38A-42, FR-38A-49)
evidence: .claude/reports/2026-10-17-focus-indicator/A-standards-and-technique.md, B-design-system-survey.md (B-glow-*.png), C-sgs-inventory.md
---

# One keyboard focus system

## 0. Owner decisions (2026-10-17)

- G1 (accent glow with a solid core) is the framework default, G2 (two-tone dark and light bloom) the fallback, G3 (animated conic border glow) an opt-in per button. All three keep a solid core.
- Q1 (accent too pale for the ground): option B. Keep the client's hue and darken the RING only until it reaches 3:1 against the worst light ground (OKLCH lightness moved the shortest distance, the rule `derive-dark-palette.py` already uses); the bloom stays the true accent. Decided on the planner's and the main thread's recommendation; reversible by changing only the snapshot fixer (`check-snapshot-focus-tokens.py --fix`), no CSS change.
- Q2 (full bloom on inline links and form fields): decided from the Task 4 screenshots, not before. The plan builds the same look everywhere.
- Q3 (Signature beyond `sgs/button`): option A, `sgs/button` only now; reach to buybox add-to-cart, the product-card CTA and the pricing CTA is recorded as a new FR in `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` at its next revision.

## 1. Goal

**End state in plain words.** Every button, link and control in the framework (SGS buttons and multi-buttons, buybox add-to-cart, product-card CTAs, WooCommerce buttons, nav and drawer items, form controls, sliders, tabs, accordions and pagination) shows the same keyboard focus look. That look is a thin inner hairline in the site's surface colour, a 2px ring in the client's accent (darkened only as far as needed to reach 3:1 on the site's light grounds) and a soft bloom in the true accent (G1). Where there is no accent, the same shape is drawn in the site's dark ink with a light inner line (G2). Behind photos and videos it is always G2. A button can opt in to the animated, client-coloured border glow (G3) from its inspector. The look is defined in one theme file, restyled per client only through `sites/<client>/theme-snapshot.json`, never overridden with `!important`, and it no longer changes a button's corner radius on focus. The motion hover ring and accent line no longer stack on top of it on keyboard focus.

**Measurable acceptance (all must hold):**

- A live Tab-through of the canary home page, `/shop/`, one product page, the cart, and the new focus fixture page records ONE look per variant: every stop's computed `outline-width`, `outline-style` and `outline-offset` are identical, apart from stops carrying `sgs-focus--inset` or `sgs-focus--signature`. Its `outline-color` and `box-shadow` match the G1 or G2 token set for its ground. Command: `node plugins/sgs-blocks/scripts/qa/probe-focus-system.mjs --site sandybrown --pages home,shop,product,cart,<fixture-id>` prints `looks: 1 (+ inset, signature)` and exits 0.
- The number of distinct indicator declaration forms in shipped CSS drops from 67 to the system's own (at most 6, all in `theme/sgs-theme/assets/css/focus.css`). Command: `node plugins/sgs-blocks/scripts/check-focus-system.js --survey` prints `bespoke: 0` and `distinct indicator forms: <=6 (all system)`.
- The core reaches at least 3:1 against what is next to it on light, dark and photo grounds. For a G2 stop, either band reaching 3:1 counts (WCAG C40). The glow is never counted. Measured at 1440, 768 and 375 by the probe's pixel check, and per snapshot by `python plugins/sgs-blocks/scripts/check-snapshot-focus-tokens.py --check`.
- Under emulated `forced-colors: active` every stop still paints a visible outline in `Highlight`, and under `prefers-reduced-motion: reduce` the G3 border does not rotate (probe flags `--forced-colors` and `--reduced-motion`).
- axe reports no new violations on the fixture page (wcag2aa, wcag21aa, wcag22aa tags).
- CSS shipped per page does not grow. The probe's CSS-bytes line for the home page is at most its pre-change value (the system file is about 3.5 KB unminified; the rules it replaces are larger).

## 2. Target shape (settled on one instance)

### 2.1 Decisions taken here, with the alternative each one beat

1. **The core is a real `outline`; the hairline and bloom are `box-shadow`.** The G1 and G2 renders draw a 2px inner band then a 2px ring. Drawing the ring as `outline` at offset 2px with a 2px `box-shadow` hairline filling the gap gives the identical picture. The compliant part then lives on a property that no block paints at rest, and forced-colours repaints it in `Highlight` with no extra trick, which satisfies the "transparent outline safety net" requirement in a stronger form. Rejected: the B snippets' box-shadow core plus a transparent outline. There, any block shadow that wins the cascade (a button `boxShadow`, the shadow lift, WooCommerce) deletes the core and the element falls back to the transparent outline, which is invisible outside forced-colours.
2. **The selector list is weighted (1,1,0) by its own exclusion list, not by `!important`.** Every arm carries `:not(#wpadminbar *, …)`, which is needed anyway because the admin bar has its own focus styles. That ID argument lifts the list above every class-based block, WooCommerce and core rule, so the system owns `outline`, `outline-offset` and `box-shadow` on a focused element. Blocks and clients customise it only through `--sgs-focus-*` custom properties (the override contract, §2.4). Rejected: a (0,1,0) or `:where()` list. It loses `box-shadow` to every per-instance button shadow (`.sgs-btn-<uid>`, printed after the theme), to `sgs_shadow_hover_rules()`'s `:focus-visible` half and to WooCommerce's own button focus rules, which brings back the detached "gap ring" the owner rejected. "Low specificity" survives where it matters: the tokens sit on (0,1,0) selectors, so any section, element or snapshot re-points them.
3. **G1 versus G2 is a token VALUE, not a selector.** Both draw the same four layers; only the colours differ. So one declaration serves both. The site default is chosen per snapshot by contrast (§2.3), and per place by the framework's existing ground classes: `sgs-on-dark` / `sgs-on-light` from `includes/helpers-surface-tone.php::sgs_surface_tone_class`, and `sgs-container--has-bg-image` / `--has-bg-video` from `includes/class-sgs-container-wrapper.php`, which force G2. G3 is the only class-selected variant.
4. **The C40 pair is the site's own text and surface.** The inner hairline is `surface` and the ink is `text`. Both are palette references, so the theme's dark mode remaps them automatically, and every snapshot's text/surface pair already contrasts. The snapshot gate requires at least 9:1 between them and falls back to `#ffffff` / `#0b1020` if a site fails.
5. **One file in the theme, loaded synchronously, also in the editor canvas.** `theme/sgs-theme/assets/css/focus.css` is enqueued in `functions.php::enqueue_styles` as `sgs-focus` (dependency `sgs-core-blocks-critical`) and is not in `defer_non_critical_css`'s list, so the indicator exists before the first Tab. It is added with `add_editor_style( 'assets/css/focus.css' )` in `functions.php::setup`. It lives in the theme because it reads theme tokens and styles core, WooCommerce and SGS elements alike, and the plugin already relies on theme focus tokens today. Rejected: folding it into `core-blocks-critical.css`, which would bury the one system inside a 25 KB file the detector would have to special-case.
6. **No `transition` on the base rule.** A `transition` shorthand on every focused element would cancel blocks' own transitions (the Council ruling recorded in `includes/helpers-shadow-hover.php::sgs_shadow_hover_rules`). The bloom simply appears; G3 is the only animated variant.
7. **Programmatic focus targets get no ring.** `[tabindex="-1"]` (skip-link targets, step headings, dialog shells such as the choice-flow showcase) is excluded, the GOV.UK pattern. It replaces today's `choice-flow` `outline: none` and the shop heading's `:focus:not(:focus-visible)` suppressor.
8. **Range inputs ring the thumb, not the track.** `input[type="range"]` is excluded from the element arm and gets thumb arms, one per engine, so the dual-thumb WooCommerce price slider shows which thumb has focus.
9. **Hidden controls hand their ring to a visible proxy.** A visually hidden input carries `sgs-focus-source` and draws nothing. Its visible stand-in carries `sgs-focus-proxy`, either as the next sibling (option-picker pill, pricing toggle label, file label, shop bool switch) or inside a `sgs-focus-scope` ancestor (before-after handle). This fixes the 1px ring on the option-picker radio.

### 2.2 The system file, exactly

`theme/sgs-theme/assets/css/focus.css` (Task 4 writes it verbatim, then tunes only the two bloom sizes against the owner's screenshots):

```css
/*
 * Keyboard focus: the one focus system (Spec 32 §14.5, FR-32-22).
 * The core is the outline (it survives forced colours); the inner hairline and the bloom are box-shadow layers.
 * Every arm carries :not(#wpadminbar *, ...), which gives the list (1,1,0) weight so it owns outline, outline-offset
 * and box-shadow on a focused element. Blocks change the look ONLY through the --sgs-focus-* custom properties below
 * (the override contract); a bespoke outline or box-shadow on a :focus* selector fails check-focus-system.js.
 * G1 (accent) and G2 (duotone) are token values; G3 (signature) is the .sgs-focus--signature class.
 */
@property --sgs-focus-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
@keyframes sgs-focus-spin { to { --sgs-focus-angle: 360deg; } }

/* 1. Tokens: the client's snapshot (settings.custom.focus -> --wp--custom--focus--*), framework defaults from the palette. */
:root,
.sgs-on-light {
	--sgs-focus-width: var(--wp--custom--focus--width, 2px);
	--sgs-focus-inner: var(--wp--custom--focus--inner, var(--wp--preset--color--surface, #fff));
	--sgs-focus-ink: var(--wp--custom--focus--ink, var(--wp--preset--color--text, #0b1020));
	--sgs-focus-ring: var(--wp--custom--focus--ring, var(--wp--preset--color--accent, var(--sgs-focus-ink)));
	--sgs-focus-near: var(--wp--custom--focus--near, var(--sgs-focus-ring));
	--sgs-focus-far: var(--wp--custom--focus--far, var(--sgs-focus-ring));
	--sgs-focus-sig-a: var(--wp--custom--focus--signature-a, var(--wp--preset--color--primary));
	--sgs-focus-sig-b: var(--wp--custom--focus--signature-b, var(--wp--preset--color--accent));
	--sgs-focus-sig-c: var(--wp--custom--focus--signature-c, var(--wp--preset--color--accent-light));
}
.sgs-on-dark {
	--sgs-focus-ring: var(--wp--custom--focus--ring-on-dark, var(--wp--preset--color--accent, var(--sgs-focus-inner)));
	--sgs-focus-near: var(--wp--custom--focus--near-on-dark, var(--sgs-focus-ring));
	--sgs-focus-far: var(--wp--custom--focus--far-on-dark, var(--sgs-focus-ring));
}
/* G2 wherever the ground is a photo or video, or an element asks for it. Later than .sgs-on-dark on purpose. */
.sgs-container--has-bg-image,
.sgs-container--has-bg-video,
.sgs-focus--duotone {
	--sgs-focus-ring: var(--sgs-focus-ink);
	--sgs-focus-near: var(--sgs-focus-inner);
	--sgs-focus-far: var(--sgs-focus-ink);
}
/* Inside a clipping or full-bleed container: the ring sits on the element's edge, the hairline inside it. */
.sgs-focus--inset {
	--sgs-focus-offset: calc(var(--sgs-focus-width) * -1);
	--sgs-focus-halo: inset 0 0 0 calc(var(--sgs-focus-width) * 2) var(--sgs-focus-inner);
}

/* 2. The indicator: one declaration set, four arms (element, adjacent proxy, scoped proxy, editor preview). */
:focus-visible:not(#wpadminbar *, .editor-styles-wrapper :is([contenteditable], .block-editor-block-list__block, .components-button, [class*="block-editor-"]), [tabindex="-1"], .sgs-focus-source, input[type="range"]),
.sgs-focus-source:focus-visible + .sgs-focus-proxy:not(#wpadminbar *),
.sgs-focus-scope:has(.sgs-focus-source:focus-visible) .sgs-focus-proxy:not(#wpadminbar *),
.sgs-focus-preview:not(#wpadminbar *) {
	outline: var(--sgs-focus-width) solid var(--sgs-focus-ring);
	outline-offset: var(--sgs-focus-offset, var(--sgs-focus-width));
	box-shadow:
		var(--sgs-focus-halo,
			0 0 0 var(--sgs-focus-offset, var(--sgs-focus-width)) var(--sgs-focus-inner),
			0 0 calc(var(--sgs-focus-width) * 6) calc(var(--sgs-focus-width) * 2) color-mix(in srgb, var(--sgs-focus-near) 55%, transparent),
			0 0 calc(var(--sgs-focus-width) * 15) calc(var(--sgs-focus-width) * 5) color-mix(in srgb, var(--sgs-focus-far) 30%, transparent)),
		var(--sgs-focus-under, 0 0 #0000);
}
/* Sliders: the thumb carries the ring (one rule per engine; an unknown pseudo-element drops the whole rule). */
input[type="range"]:not(.sgs-focus-source):focus-visible:not(#wpadminbar *)::-webkit-slider-thumb {
	outline: var(--sgs-focus-width) solid var(--sgs-focus-ring);
	outline-offset: var(--sgs-focus-width);
	box-shadow: 0 0 0 var(--sgs-focus-width) var(--sgs-focus-inner);
}
input[type="range"]:not(.sgs-focus-source):focus-visible:not(#wpadminbar *)::-moz-range-thumb {
	outline: var(--sgs-focus-width) solid var(--sgs-focus-ring);
	outline-offset: var(--sgs-focus-width);
	box-shadow: 0 0 0 var(--sgs-focus-width) var(--sgs-focus-inner);
}

/* Browsers without color-mix(): the core and the hairline, no bloom. */
@supports not (color: color-mix(in srgb, red 50%, transparent)) {
	:root, .sgs-on-light, .sgs-on-dark { --sgs-focus-near: transparent; --sgs-focus-far: transparent; }
	.sgs-focus--signature::before { display: none; }
}

/* 3. G3 signature: a G2 core plus a rotating conic border in the client's own colours (opt-in per button). */
.sgs-focus--signature { position: relative; }
.sgs-focus--signature:focus-visible:not(#wpadminbar *) {
	--sgs-focus-ring: var(--sgs-focus-ink);
	--sgs-focus-near: var(--sgs-focus-sig-b);
	--sgs-focus-far: var(--sgs-focus-sig-a);
}
@supports (mask-composite: exclude) {
	.sgs-focus--signature:focus-visible:not(#wpadminbar *)::before {
		content: "";
		position: absolute;
		inset: calc(var(--sgs-focus-width) * -3);
		padding: var(--sgs-focus-width);
		border-radius: inherit;
		background: conic-gradient(from var(--sgs-focus-angle), var(--sgs-focus-sig-a), var(--sgs-focus-sig-b), var(--sgs-focus-sig-c), var(--sgs-focus-sig-a));
		mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
		mask-composite: exclude;
		pointer-events: none;
		animation: sgs-focus-spin 3s linear infinite;
	}
}

/* 4. Preferences. */
@media (prefers-reduced-motion: reduce) {
	.sgs-focus--signature:focus-visible:not(#wpadminbar *)::before { animation: none; }
}
@media (prefers-contrast: more) {
	:root, .sgs-on-light, .sgs-on-dark, .sgs-container--has-bg-image, .sgs-container--has-bg-video, .sgs-focus--duotone {
		--sgs-focus-width: 3px;
		--sgs-focus-ring: var(--sgs-focus-ink);
		--sgs-focus-near: transparent;
		--sgs-focus-far: transparent;
	}
	.sgs-focus--signature:focus-visible:not(#wpadminbar *) { --sgs-focus-near: transparent; --sgs-focus-far: transparent; }
	.sgs-focus--signature:focus-visible:not(#wpadminbar *)::before { display: none; }
}
@media (forced-colors: active) {
	:focus-visible:not(#wpadminbar *), .sgs-focus-proxy:not(#wpadminbar *), .sgs-focus-preview:not(#wpadminbar *) { outline-color: Highlight; }
	.sgs-focus--signature::before { display: none; }
}
```

Notes the implementer must keep:

- The four indicator properties are declared once (the base arm). The thumb arms and the `@supports` fallback are the only other indicator forms. That gives 6 forms in total, the acceptance ceiling.
- `outline` follows `border-radius` in every supported browser (Chrome 94, Firefox 88, Safari 16.4, report A §3), and `box-shadow` always does. Nothing sets a radius, so the old `border-radius: 4px` clobber is gone by construction.
- `@property`, `:has()`, `color-mix()`, `mask-composite` and `:focus-visible` are all supported by the framework's browser baseline (report A §3, report B "Glow-style focus"). Each feature-gated part has a fallback that keeps the core.

### 2.3 Tokens and snapshot keys

New key `settings.custom.focus` in `theme/sgs-theme/theme.json` and in every `sites/*/theme-snapshot.json`. WordPress prints each key as `--wp--custom--focus--<kebab-key>`. The framework defaults are below; the snapshot fixer writes per-client values.

| Key | Framework default | G1 value | G2 value | Read by |
|---|---|---|---|---|
| `width` | `2px` | `2px` | `2px` | `--sgs-focus-width` |
| `inner` | `var(--wp--preset--color--surface)` | same | same | hairline, G2 light band |
| `ink` | `var(--wp--preset--color--text)` | same | same | G2 ring, duotone, contrast-more |
| `ring` | `var(--wp--preset--color--accent)` | accent, darkened only as far as needed for 3:1 on the worst light ground (decision Q1-B) | `var(--wp--preset--color--text)` | core on light grounds |
| `near` | `var(--wp--preset--color--accent)` | the true accent | `var(--wp--preset--color--surface)` | inner bloom on light grounds |
| `far` | `var(--wp--preset--color--accent)` | the true accent | `var(--wp--preset--color--text)` | outer bloom on light grounds |
| `ringOnDark` | `var(--wp--preset--color--accent)` | accent (lightened only if it fails 3:1 on the worst dark ground) | `var(--wp--preset--color--text)` | core on `sgs-on-dark` grounds |
| `nearOnDark` | `var(--wp--preset--color--accent)` | the true accent | `var(--wp--preset--color--surface)` | inner bloom on dark grounds |
| `farOnDark` | `var(--wp--preset--color--accent)` | the true accent | `var(--wp--preset--color--text)` | outer bloom on dark grounds |
| `signatureA` / `signatureB` / `signatureC` | `primary` / `accent` / `accent-light` palette vars | same | same | G3 conic stops, G3 bloom |

**How the snapshot values are chosen** (`plugins/sgs-blocks/scripts/check-snapshot-focus-tokens.py --fix`, owner decision Q1-B):

- Each ground slug (`surface`, `surface-alt`, `section`, `footer-bg`) is classified light or dark with the rule `includes/helpers-colour-wcag.php::sgs_colour_background_tone` uses: dark when white text would win.
- `ring` is the accent when it reaches 3:1 on every light ground; otherwise the accent with its OKLCH lightness moved the shortest distance that reaches 3:1 on the worst light ground, written as a literal hex (one-off colours are hex, never new palette tokens). `near` and `far` always stay the true accent, so the bloom keeps the brand colour. `ringOnDark` is decided the same way against the dark grounds, lightening instead of darkening.
- The G2 values are used only when the site has no accent, or when the darkened ring would drift so far from the hue that its chroma collapses below a floor the fixer states (then `ring` falls back to the site's ink).
- A hand-set value is checked and never overwritten, the same rule as `derive-dark-palette.py`'s hand-set palette entries.

Today's data, from the snapshots' own hex values: accent against `surface` is 1.35 (mamas-munches), 1.94 (mamas-munches-redesign), 2.15 (indus-foods), 2.22 (helping-doctors), 2.45 (sgs-mosque), 2.69 (sgs-healthcare), 3.11 (sgs-construction, but 2.81 on `section`), 3.11 (eye-care-ward-end) and 6.38 (sgs-professional). On `footer-bg` most pass (4.9 to 8.8). So 7 of 9 need a darkened ring on light grounds.

**Tokens retired** (gone from code, CSS, PHP, JSON and tests; the detector's `legacy-token` category proves it): `--sgs-focus-color`, `--sgs-focus-glow`, `--sgs-focus-shadow`, `settings.custom.focus-ring` / `--wp--custom--focus-ring--*`, `--sgs-focus-ring-width|colour|opacity|offset`, `--sgs-focus-underlay-colour`, `--sgs-filter-search-focus`, `--sgs-ps-focus-ring`, and the keys `styles.elements.button[":focus"]` in `theme.json` and five snapshots. `styles.elements.link[":focus-visible"]` (link colour and underline on focus) stays: it is a state colour, not the indicator. The motion names `--sgs-focus-s` and `--sgs-focus-op` (proximity focus, FR-38A-39) are unrelated and stay; the detector names them as exempt.

### 2.4 The override contract for blocks (no `!important`)

- A block NEVER declares `outline*` or `box-shadow` on a `:focus`, `:focus-visible` or focusable-element `:focus-within` selector, and never sets `outline: none|0` on a focusable element.
- A block MAY set these custom properties on its own resting selectors: `--sgs-focus-offset` (a different gap), `--sgs-focus-under` (its own shadow, so the focus look composes over it instead of deleting it), and any token in §2.3 for an element or section (rare; the snapshot is the normal place).
- A block MAY add these classes in its own markup: `sgs-focus--inset`, `sgs-focus--duotone`, `sgs-focus--signature` (sgs/button only, via its control), `sgs-focus-source`, `sgs-focus-proxy`, `sgs-focus-scope`.
- Allowed exceptions live in `plugins/sgs-blocks/scripts/check-focus-system-allow.json`, one entry per rule with `path`, `selector` and `reason`, limited to editor or admin chrome. `--check` fails on a stale entry.

## 3. The detector, first

`plugins/sgs-blocks/scripts/check-focus-system.js` (Node, postcss and postcss-scss ASTs, both already in `plugins/sgs-blocks/node_modules`; shape copied from `scripts/hover-guard/audit.js`). It replaces `scripts/check-focus-ring-token.py` and its `gates.json` record `check-focus-ring-token`. That gate's rule ("colour the ring from the focus-ring token") is the opposite of the new rule ("no bespoke ring at all"), and its regex parser cannot power a `--fix` that removes multi-line rules (migration-method Step 4). Its allow-list reasons are carried into the new allow file where they still apply.

- **Corpus:** `git ls-files` (so git-ignored files such as `theme/sgs-theme/styles/*.css` are skipped). It covers `*.css` and `*.scss` under `theme/sgs-theme/assets/css/`, `plugins/*/src/**`, `plugins/*/assets/**`, plus PHP string emitters under `plugins/*/includes/**` and `plugins/*/src/blocks/**`, JS emitters under `plugins/sgs-blocks/src/**`, and `theme/sgs-theme/theme.json` plus `sites/*/theme-snapshot.json`. It excludes `build/`, `node_modules/`, `vendor/`, `stackable/`, `tests/`, `scripts/` (including `hover-guard/test-fixtures/`) and `*.min.css`. It asserts that every `EXCLUDE` path still exists.
- **Categories** (every rule is put in exactly one; content-keyed as path + selector + property, never by line):
    - `system`: `focus.css`.
    - `bespoke`: a target. An indicator property on a `:focus*` selector of the focused element itself, including `--sgs-focus-shadow`.
    - `suppress`: a target. `outline: none|0` on a focusable selector.
    - `radius-on-focus`: a target. `border-radius` in a focus-only rule.
    - `legacy-token`: a target. Any retired token from §2.3 anywhere in the corpus.
    - `php-emitter` and `json-focus`: targets, fixed by hand.
    - `shared-state`: allowed. `:hover`/`:focus-visible` pairs painting colour, background or transform.
    - `shared-shadow`: allowed but listed. A hover/focus pair painting `box-shadow`; it now loses on focus and should hand in `--sgs-focus-under`.
    - `container`: allowed. A `:focus-within` state on a container.
    - `forced-resting`: allowed. `:not(:focus-visible)` inside forced-colours.
    - `allow`: allowed, from the allow file.
    - `unrecognised`: mandatory and non-fatal.
- **CLI** (migration-method contract): `--survey` prints counts per category and per group, plus `distinct indicator forms: N (system M)`. `--survey --json` writes the census (committed as `reports/migrations/focus-system-census.json`). `--fix [--group <g>|--path <glob>]` prints a unified diff that deletes `bespoke`, `suppress` and `radius-on-focus` declarations from CSS/SCSS and drops rules left empty; a comment directly above a dropped rule is shown in the diff for the implementer to delete by hand, never deleted automatically. `--fix --apply` writes atomically (`.tmp` then rename, `newline=''`). `--check` is binary: it exits 1 on any finding in a target category, on `unrecognised`, on a stale allow or registry entry, on a corpus-control failure, and on the presence of `plugins/sgs-blocks/scripts/check-focus-system-baseline.json` (a baseline is refused). `--prune-baseline` and `--write-baseline` exit 2 with a message that the gate is binary. `--self-test` runs the fixtures.
- **Groups** (the task partition; a path table in the script): `theme-core` (`core-blocks-critical.css`, `utilities.css`, `core-blocks.css`), `buttons`, `woocommerce`, `nav`, `forms`, `widgets`, `links-other`, `focus-ring-attr`, `motion`, `editor`, `json`, `php`.
- **Fixtures** (`plugins/sgs-blocks/scripts/focus-system/fixtures/`, six minimum per Step 6):
    - Positive: a `:focus-visible` outline, which is removed.
    - Definition: a retired token, which is flagged.
    - Edge: a nested `@media` and an SCSS `&:focus-visible`.
    - Negative control: a `:hover`-only rule and a `:focus-within` container rule, byte-identical after `--fix`.
    - Idempotence: `--fix` twice gives the same output.
    - Corpus control: a dumb `:focus` substring count reconciled against the classifier's total, with a `WIDTH_OK` reason.
- **Self-test:** copies the corpus to a temp dir, plants `.x:focus-visible{outline:2px solid red}` in a block stylesheet, expects `--check` to exit 1, removes it, expects 0.
- **Gate:** registered in the fast tier as a binary gate: `--check` fails on any target finding, with no baseline and no ceiling.

## 4. Tasks

Before every task: `git status --porcelain -- <the task's paths>` must be empty of work you did not write (migration-method hand-back #2), and `git branch --show-current` in the same command as the commit. Commit straight to `main` with an explicit pathspec. Deploy only with `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` (`--theme-only` where stated), never `--allow-dirty`. The deploys are grouped: no task deploys on its own unless the owner asks; one grouped deploy carries the whole focus build with the other waiting S4 work.

### Task 1: Detector `check-focus-system.js`, census and ratchet gate

- **Files:** `plugins/sgs-blocks/scripts/check-focus-system.js` (new), `plugins/sgs-blocks/scripts/focus-system/fixtures/*` (new), `plugins/sgs-blocks/scripts/check-focus-system-allow.json` (new), `plugins/sgs-blocks/scripts/check-focus-system-baseline.json` (new), `plugins/sgs-blocks/scripts/gates.json`, `plugins/sgs-blocks/package.json` (alias `check:focus-system`), `scripts/check-focus-ring-token.py` (delete), `reports/migrations/focus-system-census.json` (new).
- **Steps:**
    1. Write the fixtures and the self-test harness first.
    2. Write the classifier and `--survey`.
    3. Reconcile `--survey` against report C. Expected about 330 shipped rules, 168 indicator-shaped, 67 distinct forms, 81 files. Explain any difference in the census JSON's `notes`; `unrecognised` must be 0.
    4. Write `--fix` and `--check`, then the allow file with reasons. Initial entries: `src/components/SavedPostPicker.css`, `assets/css/motion-thumbnails.css`, `assets/admin/customiser-button-presets.css` and `assets/admin/site-info-custom-fields.css`, all editor or admin chrome painted in the WP admin colour.
    5. Write the baseline from the census.
    6. Replace the `check-focus-ring-token` record in `gates.json`, using the same `order` slot. Add a separate `check-focus-system-self-test` record at `max(order)+1`, derived from `npm run gate:list`.
- **Failing test first:** `node plugins/sgs-blocks/scripts/check-focus-system.js --self-test` fails (file absent), then passes.
- **Proof:** from `plugins/sgs-blocks`, run `node scripts/check-focus-system.js --self-test` (prints `self-test: 6 passed, 0 failed`, exit 0), then `node scripts/check-focus-system.js --check` (exit 0), then `npm run gate:list` (shows `check-focus-system` in fast). Plant a rule by hand: `--check` exits 1. Remove it: `--check` exits 0.
- **Commit:** `focus: detector check-focus-system (survey, fix, check, self-test) replaces check-focus-ring-token`

### Task 2: Tab-through probe and the focus fixture page (baseline "before" run)

- **Files:** `plugins/sgs-blocks/scripts/qa/probe-focus-system.mjs` (new), `plugins/sgs-blocks/tests/fixtures/focus/focus-system.tree.json` (new), `.claude/rules/motion-qa.md` (record the new page id beside the fixture table, as a focus fixture that must not be repurposed).
- **Steps:**
    1. Write the probe with two modes.
    2. `--local` loads `theme/sgs-theme/assets/css/focus.css` and a generated HTML fixture into Chromium, Firefox and WebKit (the `scripts/motion-qa/probe-focus-glow-scope.mjs` pattern). It covers light, dark (`.sgs-on-dark`) and photo (`.sgs-container--has-bg-image`) grounds, each with a filled button, an outline button, a text link, an input, a range, a proxied radio, an inset tab and a signature button.
    3. `--site <target> --pages <list>` presses Tab up to 60 times at 1440, 768 and 375. For each stop it records `outline-*`, `box-shadow` and `border-radius` at rest and on focus. It runs the clip test (any ancestor that clips the outline box plus `width + offset`). It samples pixels: for each stop it takes an unfocused and a focused screenshot of the element's box grown by 8px, compares the ring colour and the inner colour against the unfocused pixels 1px outside the ring at 16 points, and passes a stop when the minimum over points of `max(contrast(ring, bg), contrast(inner, bg))` is at least 3. It also records the CSS bytes per page. It runs its pages serially (parallel probes trip the canary's CDN bot protection).
    4. `--forced-colors` and `--reduced-motion` emulate the media features. `--axe` uses `scripts/motion-qa/probe-motion-a11y-lib.mjs::axeSourcePath`. `--shots <dir>` saves one PNG per stop per width.
    5. Build the fixture page on the canary: `node scripts/wp-build-page.js --env-file .claude/secrets/sandybrown.env --env-key SANDYBROWN --tree plugins/sgs-blocks/tests/fixtures/focus/focus-system.tree.json --create page --title "Focus system fixture" --slug focus-system-fixture --status publish`.
    6. Run the probe on the canary BEFORE any change and keep the JSON as the baseline.
- **Failing test first:** `node plugins/sgs-blocks/scripts/qa/probe-focus-system.mjs --site sandybrown --pages home,<fixture-id>` exits 1 today (report C §7: 6 looks at 1440, contrast 1.04 to 1.75 on light grounds). That red run IS the test.
- **Proof:** the "before" JSON in `reports/2026-10-17-focus-system/before.json` shows `looks: 6` and `min contrast: 1.04`.
- **Commit:** `focus: Tab-through probe and focus fixture page (before baseline)`

### Task 3: Snapshot focus tokens: gate and fixer

- **Files:** `plugins/sgs-blocks/scripts/check-snapshot-focus-tokens.py` (new; reuses `snapshot_palette_roster.py::contrast_ratio` and `::resolve_colour`), `plugins/sgs-blocks/scripts/push-theme-snapshot.py::roster_guard` (refuses a push whose snapshot lacks a `settings.custom.focus` key), `plugins/sgs-blocks/scripts/gates.json`, `plugins/sgs-blocks/package.json`.
- **Steps:**
    1. `--survey` prints, per snapshot, which keys are present, the ring verdict for light and for dark grounds with the ratios, and the `inner`/`ink` ratio.
    2. `--fix` prints a diff that writes the full `settings.custom.focus` object, choosing values per §2.3 (darkened or lightened ring as a literal hex, true-accent bloom) and preserving hand-set values. `--fix --apply` writes the snapshots and `theme/sgs-theme/theme.json` (framework defaults).
    3. `--check` fails on a missing key, on a core value under 3:1 against its grounds, or on `inner`/`ink` under 9:1. `--self-test` covers a missing key, a failing accent (the fixer darkens it to 3:1), a hand-set value and a fully desaturated accent (the ink fallback).
    4. Register it in the fast tier. Do NOT apply yet: the reader (`focus.css`) lands in Task 4 in the same commit (Spec 32 §14.3, "a snapshot key needs a reader"). The gate is registered in this commit with `--check` passing only on the `--self-test` record. The `--check` record is added in Task 4.
- **Failing test first:** `python plugins/sgs-blocks/scripts/check-snapshot-focus-tokens.py --self-test` fails (absent), then passes.
- **Proof:** `python plugins/sgs-blocks/scripts/check-snapshot-focus-tokens.py --survey` lists 9 snapshots with the ratios in §2.3.
- **Commit:** `focus: snapshot focus-token gate and fixer`

### Task 4: The system file, tokens, global dedupe, radius and `!important` removal (the one visible commit)

- **Files:**
    - `theme/sgs-theme/assets/css/focus.css` (new, §2.2 verbatim).
    - `theme/sgs-theme/functions.php::enqueue_styles` (enqueue `sgs-focus`) and `::setup` (`add_editor_style`).
    - `theme/sgs-theme/assets/css/core-blocks-critical.css`: delete the `:root` focus tokens and the D467 comment block, the global `:focus-visible`, the `:root :where(.wp-element-button…)` `!important` rule, the core navigation focus rule, the `.wp-block-button__link:focus-visible` duplicate, and the three focus lines of the `prefers-contrast: more` block.
    - `theme/sgs-theme/assets/css/utilities.css`: delete `*:focus-visible` with its `border-radius: 4px`, and the skip-link outline (keep the skip link's positioning).
    - `theme/sgs-theme/assets/css/core-blocks.css`: all focus indicators, i.e. `is-style-sgs-*` buttons, link-list, responsive close, pagination and social links.
    - `theme/sgs-theme/theme.json` and `sites/*/theme-snapshot.json`: remove `settings.custom.focus-ring` and `styles.elements.button[":focus"]`; add `settings.custom.focus` via Task 3's `--fix --apply`.
    - `plugins/sgs-blocks/tests/js/focus-system-contract.test.js` (new), `plugins/sgs-blocks/scripts/gates.json` (the snapshot `--check` record), `plugins/sgs-blocks/scripts/check-focus-system-baseline.json` (prune).
- **Steps:**
    1. Write the contract test first. It asserts that `focus.css`:
        - declares `outline`, `outline-offset` and `box-shadow` exactly once outside the thumb and `@supports` arms;
        - every arm contains `:not(#wpadminbar`;
        - has no `!important`, no `transition` and no `border-radius`;
        - has `@media (forced-colors: active)`, `prefers-reduced-motion` and `prefers-contrast: more` blocks;
        - and that no other theme stylesheet holds an indicator.
    2. Add the file and the enqueue.
    3. Run `node scripts/check-focus-system.js --fix --group theme-core`, read the diff, then `--fix --apply --group theme-core`. Delete the orphaned comments by hand.
    4. Edit `theme.json` by hand. Run `python scripts/check-snapshot-focus-tokens.py --fix --apply`, then read `git diff --stat sites/`.
    5. Run `--prune-baseline`.
    6. Do not deploy here (grouped deploy). Instead run `probe-focus-system.mjs --local --shots` to render the light, dark and photo contact sheets of G1, G2 and the inset variant from the local fixture.
    7. **STOP for the owner's eye (migration-method Step 3):** send those screenshots (and settle Q2 from them). Tasks 5 to 11 can proceed meanwhile because they are visually inert.
- **Failing test first:** `cd plugins/sgs-blocks && npm run test:unit -- focus-system-contract` is red (file missing). `node scripts/qa/probe-focus-system.mjs --local` is red (no `focus.css`).
- **Proof:**
    - `npm run test:unit -- focus-system-contract` is green.
    - `node scripts/qa/probe-focus-system.mjs --local --forced-colors` passes in three engines.
    - `python scripts/check-snapshot-focus-tokens.py --check` exits 0.
    - After the grouped deploy, on the live canary, `probe-focus-system.mjs --site sandybrown --pages home,<fixture-id>` prints `looks: 1 (+ inset, signature)` and `min contrast >= 3.0`. The SGS button radius is unchanged between rest and focus (10px), which was report C §4 item 2.
- **Commit:** `focus: one focus system (focus.css, settings.custom.focus) replaces the global, !important and theme rules`

### Task 5: SGS buttons and commerce CTAs, plus the shadow hand-in

- **Files:**
    - `plugins/sgs-blocks/src/blocks/{button,buybox,cart,choice-flow,choice-flow-question,choice-flow-result,whatsapp-cta,product-card,wishlist-link,wishlist-panel,account}/style.css`.
    - `plugins/sgs-blocks/src/blocks/button/render.php`: add `--sgs-focus-under:<the same value>` beside every `box-shadow` the button prints at rest and on hover (`$scoped_css_parts`).
    - `plugins/sgs-blocks/includes/helpers-shadow-hover.php::sgs_shadow_hover_rules`: decls become `box-shadow:X;--sgs-focus-under:X`.
    - `plugins/sgs-blocks/scripts/shadow-lift/transform.js`: the same pair on the generated `:focus-visible` half.
    - The baseline.
- **Steps:**
    1. `--fix --group buttons`, read the diff, `--apply`. Keep `.sgs-button:hover, .sgs-button:focus-visible` (the hover fill on focus is state parity, not the indicator) and `.sgs-button:focus:not(:focus-visible)`.
    2. Add the hand-in in the three emitters.
    3. Run `node scripts/shadow-lift/run.js --self-test` and the hover-guard check.
    4. `--prune-baseline`.
    5. Note that buybox's `wp-element-button` class needs no change: it is no longer special.
- **Failing test first:** add a case to `plugins/sgs-blocks/tests/php` (or the existing shadow-hover test file) asserting that `sgs_shadow_hover_rules()` output contains `--sgs-focus-under:`; it is red. `node scripts/check-focus-system.js --check --group buttons --strict` (strict ignores the baseline) is red.
- **Proof:** both green, and `node scripts/check-focus-system.js --survey` shows `buttons: bespoke 0`. On the fixture page, the probe shows a focused shadowed button whose `box-shadow` ends with its resting shadow.
- **Commit:** `focus: SGS buttons and commerce CTAs on the focus system; shadows hand in via --sgs-focus-under`

### Task 6: WooCommerce

- **Files:** `theme/sgs-theme/assets/css/woocommerce.css`, `theme/sgs-theme/assets/js/sgs-shop-filters-extras.js` and `sgs-shop-filters-groups.js` (whichever builds the bool switch and segments: give the bool input `sgs-focus-source` and its switch `sgs-focus-proxy`, adjacent; give segments `sgs-focus--inset`), and the baseline.
- **Steps:**
    1. `--fix --group woocommerce`, read the diff, `--apply`. Delete the `outline: none; box-shadow 20%` text-input suppressor, the price-thumb focus outlines (now the system's thumb arms) and the `.sgs-shop-filters__heading:focus:not(:focus-visible)` suppressor.
    2. Keep the forced-colours resting outlines.
    3. Add the classes in JS.
    4. Prune the baseline.
- **Failing test first:** `node scripts/check-focus-system.js --check --group woocommerce --strict` is red. `node plugins/sgs-blocks/scripts/qa/probe-shop-filters.mjs` (existing) is green before the change and must stay green.
- **Proof:** strict check green. After the grouped deploy, `probe-focus-system.mjs --site sandybrown --pages shop,cart` gives `looks: 1`, and the price slider stop shows its ring on the focused thumb.
- **Commit:** `focus: WooCommerce on the focus system`

### Task 7: Navigation, drawer, mega, skip links and theme toggles

- **Files:**
    - `plugins/sgs-blocks/src/blocks/{nav-bar-menu,nav-drawer,nav-drawer-menu,mega-group,language-switch,breadcrumbs,store-selector}/style.css`, `plugins/sgs-blocks/assets/css/slider-nav.css`.
    - `plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php` (delete both focus rules; add `sgs-focus--inset` to submenu links and toggles in their markup builder).
    - Drawer menu items and the drill-back button: add `sgs-focus--inset` where the current rules use a negative offset.
    - `plugins/sgs-blocks/src/blocks/store-selector/render.php` (inset on items).
    - `theme/sgs-theme/assets/css/dark-mode.css` (toggle rules).
    - `plugins/sgs-accessibility/includes/class-frontend.php` (delete the hard-coded `#005fcc` skip-link outline, keep positioning).
    - The baseline.
- **Steps:** run `--fix --group nav` and `--apply`, then the hand edits above, then prune.
- **Failing test first:** `--check --group nav --strict` is red. `node plugins/sgs-blocks/scripts/check-focus-system.js --survey --json` lists `php-emitter` entries for the two PHP files.
- **Proof:** strict check green. After the grouped deploy, the probe on home with the drawer open (`--open-drawer`) and a mega panel open (`--open-mega`) gives `looks: 1 (+ inset)` and `clipped: 0`.
- **Commit:** `focus: navigation, drawer, mega and skip links on the focus system`

### Task 8: Forms, proxies and per-block focus colour controls

- **Files:**
    - `plugins/sgs-blocks/src/blocks/form/{style.css,render.php,block.json,edit.js}`: delete `formFocusRingColour`, `formFocusRingWidth`, `formFocusRingOpacity`, `formFocusRingOffset`, their controls, and `render.php`'s `$focus_ring_css_vars`.
    - `plugins/sgs-blocks/src/blocks/form-field-file/render.php` (`sgs-focus-source` on the input, `sgs-focus-proxy` on the label, adjacent).
    - `plugins/sgs-blocks/src/blocks/{filter-search,product-search}/{style.css,render.php,edit.js,block.json}`: delete `focusRingColour` and its custom property.
    - `plugins/sgs-blocks/src/blocks/option-picker/{style.css,render.php}` (radio gets `sgs-focus-source`, the pill `sgs-focus-proxy`, in the `$pills_html` sprintf).
    - `plugins/sgs-blocks/src/blocks/pricing-table/{style.css,render.php}` (toggle input and label pair).
    - `plugins/sgs-blocks/src/blocks/before-after/{style.css,render.php}` (root `sgs-focus-scope`, range `sgs-focus-source`, handle `sgs-focus-proxy`).
    - `plugins/sgs-client-notes/assets/css/frontend.css` (delete the `:focus` suppressors; `.sgs-cn-highlight` is not a focus rule and stays).
    - `plugins/sgs-blocks/assets/css/contrast.css` (delete; its only media query, `prefers-contrast: high`, is not a valid value and never matches) and its enqueue in `plugins/sgs-blocks/includes/class-sgs-blocks.php`.
    - `plugins/sgs-blocks/includes/class-sgs-colour-audit-cli-commands.php` (drop `focusRingColour`).
    - The baseline.
- **Steps:**
    1. Before removing attributes, census stored content: `python plugins/sgs-blocks/scripts/audit-post-content-blocks.py` (its survey mode) for `formFocusRing*` and `focusRingColour`. A stored value becomes an undeclared attribute and must be stripped on each test site before deploy (pre-production, no deprecations, R-31-14).
    2. Run `--fix --group forms` and `--apply`, then the markup edits.
    3. Reseed per the guarded procedure (a throwaway worktree at a fresh unique path, `git worktree add` on its own line, `git -C <path> log -1` checked): `python plugins/sgs-blocks/scripts/sgs-update-v2.py`.
    4. Prune the baseline.
- **Failing test first:** `--check --group forms --strict` is red. A new local probe case, "the option-picker's focused radio has a zero-size ring and its pill carries the ring", is red under `probe-focus-system.mjs --local`.
- **Proof:**
    - Strict check green and local probe green.
    - `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name FROM block_attributes WHERE attr_name LIKE 'formFocusRing%' OR attr_name='focusRingColour'"` returns 0 rows.
    - `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0, and `node scripts/inspector-scan/run.js` reports no new findings.
- **Commit:** `focus: forms and hidden-control proxies on the focus system; per-block focus colour attributes retired`

### Task 9: Sliders, tabs, accordions, galleries, media controls and pagination

- **Files:**
    - `plugins/sgs-blocks/src/blocks/{accordion,tabs,testimonial-slider,gallery,google-reviews,trustpilot-reviews,audio,media,collapsible-text,product-faq,modal,notice-banner,card-grid}/style.css`.
    - `plugins/sgs-blocks/src/blocks/tabs/render.php` (add `sgs-focus--inset` to `sgs-tabs__tab`; delete the resting `outline: none`).
    - `plugins/sgs-blocks/src/blocks/gallery/render.php` (inset on `__item-link`).
    - `plugins/sgs-blocks/assets/css/{device-toggle,motion-pause,fx-marquee,fx-lottie,fx-generative-background,fx-wave-gradient}.css`.
    - The baseline.
- **Steps:**
    1. Run `--fix --group widgets` and `--apply`.
    2. The google-reviews and trustpilot brand-coloured rings and the white video-control rings go: the system is the indicator everywhere. Owner decision "every interactive element unifies"; the old allow-list reasons do not survive it.
    3. Any control sitting over a video or dark canvas is covered by its container's ground class, or gets `sgs-focus--duotone` in its markup when it has no ground class: video controls, the generative-background toggle and the wave-gradient toggle.
    4. Prune the baseline.
- **Failing test first:** `--check --group widgets --strict` is red. The before-baseline probe shows the testimonial arrows at `3px rgba(31, 122, 122, 0.4)` (report C row 17).
- **Proof:** strict check green. After the grouped deploy, the probe on home has no stop with `outline-width: 3px` (outside contrast-more), and the slider arrows show the system ring at contrast of at least 3.
- **Commit:** `focus: sliders, tabs, accordions, galleries, media and pagination on the focus system`

### Task 10: Links, social, cards and the remaining controls

- **Files:** `plugins/sgs-blocks/assets/css/extensions.css` (`.sgs-block-link-overlay`, `.sgs-block-link-source`, `a.sgs-field-fallback`), `plugins/sgs-blocks/src/blocks/{brand-strip,icon,info-box,team-member,trust-bar}/style.css`, `plugins/sgs-blocks/src/blocks/responsive-logo/style.scss`, `plugins/sgs-blocks/assets/floating-ui/floating-ui.css`, `plugins/sgs-blocks/assets/toast/toast.css`, `plugins/sgs-blocks/src/shared/info-toggle.css`, and the baseline.
- **Steps:** run `--fix --group links-other` and `--apply`, then prune.
- **Failing test first:** `--check --group links-other --strict` is red.
- **Proof:** strict check green, and `node scripts/check-focus-system.js --survey` shows `bespoke: 0` except the `focus-ring-attr`, `motion` and `editor` groups.
- **Commit:** `focus: links, social, cards and remaining controls on the focus system`

### Task 11: Retire `sgsFocusRing`

- **Files:**
    - `plugins/sgs-blocks/src/blocks/extensions/extension-roster.json`.
    - `plugins/sgs-blocks/src/blocks/extensions/hover-effects/{attributes.js,index.js,resolve.js,panels/HoverPanel.js}` (the "Focus ring" toggle and `focusRing` default).
    - `plugins/sgs-blocks/includes/hover-effects/classes.php` (`sgs-has-focus-ring`).
    - `plugins/sgs-blocks/assets/css/extensions.css::.sgs-has-focus-ring`.
    - `supports.sgs.hoverDefaults.focusRing` in `plugins/sgs-blocks/src/blocks/{google-reviews,info-box,pricing-table,product-card,team-member,whatsapp-cta}/block.json`.
    - The baseline.
- **Why:** the system rings every focusable element automatically. The toggle is redundant, and `.claude/rules/colour-emission.md` already records it as near-inert on non-focusable roots.
- **Steps:**
    1. Run the stored-content census for `sgsFocusRing` (as in Task 8) and strip it on each test site.
    2. Delete the code above.
    3. Run `node scripts/generate-extension-attributes.js` and `node scripts/check-extension-roster.js`.
    4. Reseed per the guarded procedure and prune the baseline.
- **Failing test first:** `git grep -n "sgsFocusRing\|sgs-has-focus-ring\|focusRing" -- plugins/sgs-blocks/src plugins/sgs-blocks/includes plugins/sgs-blocks/assets` lists hits; the target is none.
- **Proof:** that grep is empty. `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT COUNT(*) FROM block_attributes WHERE attr_name='sgsFocusRing'"` returns 0. `npm run build` is green.
- **Commit:** `focus: retire sgsFocusRing (the focus system rings every focusable element)`

### Task 12: Motion composition: the focus indicator wins on `:focus-visible`

- **Files:**
    - `plugins/sgs-blocks/assets/css/motion.css`: delete `[data-sgs-mc~="box-shadow"]:focus-visible` and its comment. The base channel rule stays, and on a focused element the system's weighted rule replaces its ring and accent line while every other hover channel still plays.
    - The form Focus state loses its ring and keeps border colour, background colour and timing: `plugins/sgs-blocks/includes/motion/class-sgs-motion-focus-state.php` (drop the ring and `FALLBACK_RING`), `plugins/sgs-blocks/src/blocks/extensions/motion/canvas/emit-focus.js` (its editor twin), `plugins/sgs-blocks/schemas/motion.schema.json` (`$defs/FocusStateValues` and `$defs/FocusStateValuesDevice` lose `ringSpread` and `ringColour`; descriptions rewritten), the regenerated `src/components/motion/generated-motion-defs.json`, `plugins/sgs-blocks/tests/fixtures/motion/canvas-parity.json` (the two form-focus cases), and `plugins/sgs-blocks/scripts/motion-qa/probe-motion-form-states.mjs`.
    - `plugins/sgs-blocks/tests/js/motion-css-contract.test.js`: replace `describe( 'keyboard focus keeps the theme focus glow beside the hover ring and accent line' )` with "no motion rule paints on :focus-visible, and the focus system outranks the box-shadow channel".
    - `plugins/sgs-blocks/scripts/motion-qa/probe-focus-glow-scope.mjs`: delete it; its subject `--sgs-focus-glow` is retired. Its successor check, "a section's own tokens re-colour the focus look", moves into `probe-focus-system.mjs --local` as a case.
    - The Spec 38A lines in the docs list below, and the baseline.
- **Spec 38A lines that change** (current truth only; status history gains a v1.8 line):
    - §10, the `box-shadow` row: replace the parenthesis from "(on `:focus-visible` the rule composes the theme's glow first …" through "… keeps the theme's `!important` glow alone;" with: "(on a keyboard-focused element the focus system (Spec 32 §14.5) owns `outline` and `box-shadow`, so the ring and the accent line do not draw while it has focus; the element's other hover channels still play;".
    - §12, third bullet: "Hover effects also apply on `:focus-visible` (and `:focus-within` for root-driven targets), so keyboard users get the same feedback, except the ring and the accent line, which give way to the focus indicator on the focused element itself."
    - FR-38A-30: "keyboard focus reproduces every hover effect" becomes "keyboard focus reproduces every hover effect except the ring and the accent line on the focused element, where the focus indicator replaces them".
    - FR-38A-42, status: replace the sentence from "On keyboard focus the theme's `:focus-visible` glow replaced the ring;" through the `fd3fc8301` clause with "On keyboard focus the focus system replaces the ring and accent line (Spec 32 §14.5; this plan)."
    - FR-38A-49: add "`sgs/button`'s signature focus glow (`sgs-focus--signature`, Spec 32 §14.5) owns `::before` while focused and is refused with any other `::before` owner."
    - The form Focus state text in `schemas/motion.schema.json::$defs/FocusState` and `class-sgs-motion-focus-state.php`'s docblock: "the focus system stays the accessible indicator".
- **Steps:**
    1. Write the new contract test first.
    2. Run the edits above.
    3. Run `python scripts/run-motion-gates.py` (note `check-motion-literals.py` is the unswept M5.18 detector and fails by design until S7's sweep; every other gate must pass).
    4. Reseed per the guarded procedure (the motion DB tables reseed from the schema).
- **Failing test first:** `cd plugins/sgs-blocks && npm run test:unit -- motion-css-contract` is red on the new assertion "no `:focus-visible` box-shadow rule in motion.css".
- **Proof:**
    - `npm run test:unit -- motion-css-contract` is green and `python scripts/run-motion-gates.py` passes every gate except the known M5.18 detector.
    - After the grouped deploy, live on page 5310 (the measured motion composition, read-only fixture), `probe-focus-system.mjs --site sandybrown --pages 5310` shows the focused `a.sgs-button.t1-btn` with the system `box-shadow` only. Report C §4 item 7 had shown the glow, then the ring, then the accent line.
- **Commit:** `focus: the focus indicator wins on :focus-visible; hover ring and accent line no longer stack (Spec 38A §10, §12, FR-38A-30/42/49)`

### Task 13: The inspector control (`sgs/button` "Keyboard focus")

- **The minimum honest control set:** ONE attribute on `sgs/button`, `focusStyle` (string enum `""`, `"duotone"`, `"signature"`, default `""`), shown as a `ToggleGroupControl` labelled "Keyboard focus" with options "Default" / "Contrast" / "Signature" (all labels 12 characters or fewer, D812 band). It sits in the Styles tab's existing "Effects" `PanelBody` in `plugins/sgs-blocks/src/blocks/button/edit.js`. Help text: "Default uses the site's focus style. Contrast always uses the dark-and-light ring (use it on photos or busy grounds). Signature adds a slowly turning border in the site's colours; it stops for visitors who prefer less motion."
- **Why only this:** the colours, width and bloom are per-site tokens restyled in the snapshot, so a per-block colour would recreate the 67 forms. `sgs/multi-button` needs nothing: its children are `sgs/button` blocks and multi-selection edits the attribute across them.
- **Files:** `plugins/sgs-blocks/src/blocks/button/{block.json,edit.js,render.php,editor.css}`.
- **Refusal:** `render.php` adds `sgs-focus--duotone` or `sgs-focus--signature` to `$btn_classes`. Signature is refused, both server-side (no class) and in the editor (the option is disabled with a short reason, the ring-guard pattern of `includes/motion/class-sgs-motion-ring-guard.php`), when the button draws a gradient border (`::before`, built by `sgs_border_gradient_css`) or carries a motion effect that owns `::before` (cursor-field, wave-gradient, FR-38A-49).
- **Steps:**
    1. Add the attribute and the control.
    2. Add the class to the canvas element in `edit.js` too (the canvas twin) and the refusal in both places.
    3. Reseed per the guarded procedure; register the attribute's role as behaviour.
    4. Run `node scripts/inspector-scan/run.js`, `python scripts/check-enum-control-shape.py --check` and `node scripts/check-editor-render-parity.js`.
- **Failing test first:** a PHP render test, beside the button's existing render tests in `plugins/sgs-blocks/tests/php`, asserting:
    - `focusStyle: "signature"` gives `sgs-focus--signature`;
    - with a gradient border it gives no class;
    - `"duotone"` gives `sgs-focus--duotone`. It is red.
- **Proof:**
    - The test is green.
    - `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name, default_value FROM block_attributes WHERE attr_name='focusStyle'"` returns the one `sgs/button` row.
    - After the grouped deploy, on the fixture page, the probe's signature stop shows a `::before` with `animation-name: sgs-focus-spin`, and `animation-name: none` under `--reduced-motion`.
- **Commit:** `focus: sgs/button Keyboard focus control (default, contrast, signature)`

### Task 14: The editor-canvas look

- **Files:** `plugins/sgs-blocks/src/blocks/button/edit.js` (an unsaved `useState` "Show the focus look in the editor" `CheckboxControl` under the Keyboard focus control, adding `sgs-focus-preview` to the canvas button while ticked), every `plugins/sgs-blocks/src/blocks/*/editor.css` focus rule the detector's `editor` group lists, and the allow file.
- **Steps:**
    1. Confirm `focus.css` loads in the canvas iframe and that typing in rich text, selecting blocks and the inserter show NO system ring (the `.editor-styles-wrapper :is(...)` exclusions).
    2. Delete each `editor.css` rule that mirrored the front-end ring (now redundant). Allow-list genuine editor chrome with reasons.
    3. Prune the baseline.
- **Failing test first:** a Playwright editor probe, extending `plugins/sgs-blocks/scripts/motion-qa/probe-editor-canvas-lib.mjs`'s login and open helpers. It opens the fixture page in the editor, focuses a paragraph's rich text and a button's label, and asserts `outline-style: none` from `focus.css` on both; it is red if the exclusions are wrong. Ticking the preview gives the button the system ring.
- **Proof:** the editor probe is green and `--check --group editor --strict` is green.
- **Commit:** `focus: editor canvas shows the focus look on request and never on editing chrome`

### Task 15: DB reconciliation and the gate goes binary

- **Files:** `plugins/sgs-blocks/scripts/check-focus-system-baseline.json` (delete), `plugins/sgs-blocks/scripts/check-focus-system.js` (`--check` with no baseline means binary), `plugins/sgs-blocks/scripts/gates.json` (record unchanged), and `reports/migrations/focus-system-census.json` (re-run, committed).
- **Steps:**
    1. Reseed once more per the guarded procedure and regenerate `.claude/specs/02-SGS-BLOCKS-REFERENCE.md`.
    2. Re-grep the WHOLE repo for the retired tokens and attributes (Step 9b).
    3. Run the full chain: `npm run build`, `npm run gate:full`, `npm run gate:wired`.
- **Failing test first:** `node plugins/sgs-blocks/scripts/check-focus-system.js --check --strict` must already be green. Deleting the baseline while any finding remains turns it red.
- **Proof:**
    - `--survey` prints `bespoke 0, suppress 0, legacy-token 0, php-emitter 0, json-focus 0, unrecognised 0, distinct indicator forms 5 (system 5)`.
    - `git grep -n -E "sgs-focus-(color|glow|shadow)|focus-ring--|formFocusRing|focusRingColour|sgsFocusRing" -- . ':!*.md' ':!reports/'` is empty.
    - `npm run gate:full` exits 0.
- **Commit:** `focus: focus-system gate binary; DB and reference regenerated`

### Task 16: Docs to current truth

- **Files:**
    - `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`:
        - §14.3 row: replace `focus-ring` with `focus`, consumer `theme/sgs-theme/assets/css/focus.css`.
        - New §14.5 "Keyboard focus", holding the §2.1 decisions, the §2.3 token table, the §2.4 override contract and FR-32-22, with its done-when copied from §1's acceptance.
        - §5 accessibility bullet: one sentence, "the indicator itself is the focus system (§14.5); a hover rule's focus counterpart paints state, never a ring".
        - FR-32-14 snapshot completeness: the focus keys join the completeness rule.
    - `.claude/specs/02-SGS-BLOCKS.md` (drop `sgsFocusRing` from the universal hover attributes; add `focusStyle` to `sgs/button`).
    - `.claude/specs/18-SGS-FLOATING-UI.md` (the "Visible focus ring" row reads "the focus system (Spec 32 §14.5)").
    - `.claude/specs/04-SGS-FORMS.md` (if it names the form ring attributes).
    - `.claude/specs/common-wp-styling-errors.md` §Y (remove the `":focus"` outline from the sample `theme.json`; one line saying focus lives in `focus.css` and `settings.custom.focus`).
    - `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` (a new FR: Signature focus on buybox add-to-cart, the product-card CTA and the pricing CTA, owned by this spec's next revision; owner decision Q3).
    - `.claude/rules/colour-emission.md` ("Shadows" paragraph: `hoverDefaults` loses `focusRing`; add one line on `--sgs-focus-under`).
    - `.claude/LEDGER.md` (replace "The focus ring stays the client accent (D467)" with the current rule and this plan's status).
    - `.claude/archive/decisions.md` is frozen and read-only: do not write to it. The ruling goes in the Spec 32 §14.5 text and the commit message instead (a decision lives in the doc it changes).
    - `plugins/sgs-blocks/CLAUDE.md` (one line under Gates naming `check-focus-system.js`).
    - `.claude/catalogues/tooling.md` via `python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py` only if this plan owns the drift.
    - `.claude/specs/go-live-checklist.md` (one line: real Windows High Contrast pass of the focus fixture).
    - `.claude/dev-setup.md` needs no change: it names no focus tooling (checked with grep).
- **Failing test first:** `python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py --check` is red (the catalogue names the deleted `check-focus-ring-token.py` and `probe-focus-glow-scope.mjs`). The spec-drift lint, `lint-spec-drift.py` per root `CLAUDE.md`, is red on any cited symbol that no longer exists.
- **Proof:** both green, and `python scripts/check-md-wrap.py --check` passes on every touched `.md`.
- **Commit:** `focus: specs, rules, ledger and the Spec 32 ruling to the one focus system`

### Task 17: Verification and owner screenshots

See §5. Run it after the grouped deploy (`python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`), and repeat on `indus-test` and `eye-care-test` with `--target sandybrown,indus-test,eye-care-test` once their snapshots are pushed (`push-theme-snapshot.py --client <slug> --target <host>`, dry-run first, owner go/no-go).

- **Fixture coverage at Task 17:** the live fixture (page 5389, about 100 stops, default `--max-stops 130`) carries the inset, signature and duotone buttons and a `sgs/before-after` range input on its light section. It carries no `sgs-focus-source` + `sgs-focus-proxy` pair yet, because no SGS block renders one until the proxy tasks (option-picker, pricing toggle, file label, shop switch) land; after them, rebuild the fixture with `wp-build-page.js` and confirm the option-picker stops report `proxied`. The dual-thumb WooCommerce price slider is not on the fixture because no SGS block renders it (the SGS DB has `sgs/filter-search` but no price-range block; the dual thumb comes from WooCommerce's own filter markup); `/shop/` stands in for it.
- **Commit:** `focus: verification reports and screenshots` (reports only).

## 5. Verification plan

- **Unit and contract:**
    - `cd plugins/sgs-blocks && npm run test:unit -- focus-system-contract motion-css-contract`.
    - The PHP render test for `focusStyle` and the shadow-hover test.
    - `node scripts/check-focus-system.js --self-test`.
    - `python scripts/check-snapshot-focus-tokens.py --self-test`.
    - `python scripts/run-motion-gates.py`.
- **Gates:** `npm run gate:fast` (prebuild), `npm run gate:full` (pre-deploy), `npm run gate:wired`, `node scripts/audit-inline-styling.js --check`, `python scripts/check-no-client-names.py --check` (no client names in the new files), `python scripts/check-md-wrap.py --check`.
- **Local engine matrix:** `node plugins/sgs-blocks/scripts/qa/probe-focus-system.mjs --local --engine chromium --engine firefox --engine webkit`, plus `--forced-colors` and `--reduced-motion` (Chromium emulation).
- **Live Tab-through:** `node plugins/sgs-blocks/scripts/qa/probe-focus-system.mjs --site sandybrown --pages home,shop,product,cart,<fixture-id> --widths 1440,768,375 --axe --shots reports/2026-10-17-focus-system/after/`. It runs serially. It must report:
    - looks 1 (plus inset and signature);
    - min core contrast of at least 3.0 on the light, dark and photo sections of the fixture;
    - clipped 0, or every clipped stop already inset;
    - radius at rest equal to radius on focus for every stop;
    - axe with no new violations;
    - CSS bytes at most the before value.
- **Emulations live:** the same command with `--forced-colors` (every stop paints `outline-style: solid` and colour `Highlight`, box-shadow none) and `--reduced-motion` (signature `animation-name: none`).
- **Second clients:** the same probe on `indus-test` and `eye-care-test` (a darkened ring on light grounds, the true accent on dark footers).
- **Owner pack:** in `reports/2026-10-17-focus-system/`, one contact sheet per width of G1, G2, inset and G3 on light, dark and photo, plus the before/after summary table from the two probe JSONs.

## 6. Risks and the order that keeps the site working

- **Old rules cannot fight the new system mid-migration.** From Task 4 onward the system's arms carry (1,1,0) weight and own `outline`, `outline-offset` and `box-shadow` on every focused element. Task 4 also deletes the only two `!important` focus rules (the core-button rule and the contrast-more block) and the global `border-radius: 4px` clobber in the same commit. Every old block rule therefore stops painting the indicator the moment Task 4 deploys. Tasks 5 to 11 only delete dead declarations, so a half-finished state looks identical to a finished one. The ratchet gate stops a NEW bespoke rule landing in between. Old block rules that set `border-radius` on focus (cart trigger, breadcrumbs, form progress step, store selector, collapsible text) still apply until their task removes them; that radius change is cosmetic and short-lived.
- **The weighted selector overrides third-party focus styles.** WooCommerce, core blocks and any other plugin's ring are replaced. This is the intent ("every button and link unifies"); the admin bar and the editor's own chrome are excluded explicitly. Task 6's live shop and cart run and Task 14's editor probe are the checks. If a third-party widget needs its own look, it gets an allow-list entry with a reason, never a weaker system.
- **Snapshots replace `theme.json` wholesale.** A snapshot without `settings.custom.focus` would still render (palette fallbacks in `focus.css`) but could miss 3:1. The snapshot gate (fast tier) and `push-theme-snapshot.py::roster_guard` both refuse it.
- **Clipping.** The core sits 2 to 4px outside the element and the bloom up to about 20px. Containers with `overflow: hidden` clip them. Inset is applied where the census shows negative offsets today (tabs, gallery links, drawer and submenu items, store-selector items, shop segments); the probe's clip test finds any others, which get `sgs-focus--inset` in their own block's markup.
- **An element's own shadow disappears while focused** unless it hands it in. Task 5 covers `sgs/button` and both shadow-lift emitters; other shadowed focusables lose their shadow only while focused, which is acceptable and listed by the detector's `shared-shadow` category for later polish.
- **`.sgs-focus--signature { position: relative }`** is applied only by `sgs/button`, whose root is static; an absolutely positioned button cannot carry the class.
- **Shared-helper blast radius** (migration-method hand-back #9): Task 5 changes `sgs_shadow_hover_rules()` and the shadow-lift transform, which many blocks call. The change only ADDS a custom property next to an existing declaration and is covered by the helper's test and `node scripts/shadow-lift/run.js --check`. Still, show the diff to the owner with Task 4's screenshots.
- **Other tracks on `main`:** motion sessions edit `motion.css`, the schema and the canvas twin. Task 12 runs `git status --porcelain` on those paths first and hands back if foreign work is present.
- **Deploy:** never `--allow-dirty` (D336). Commit before deploying. The deploys are grouped (owner ruling 2026-10-17).

## 7. Model routing and the shape of the work

The effort column in the planner's draft was far above this repo's actuals (the global time-estimates rule: real runs come in 3 to 15 times under cautious estimates), and the owner ruled that one session of subagent tasks is all this takes, so no durations are carried here. Routing:

| Task | Model |
|---|---|
| 1 Detector | Opus |
| 2 Probe and fixture page | Sonnet |
| 3 Snapshot token gate and fixer | Sonnet |
| 4 System file and theme cleanup | Opus |
| 5 Buttons, CTAs, shadow hand-in | Sonnet |
| 6 WooCommerce | Sonnet |
| 7 Navigation and skip links | Sonnet |
| 8 Forms, proxies, attribute removal | Sonnet |
| 9 Sliders, tabs, media, pagination | Sonnet |
| 10 Links and remaining controls | Sonnet |
| 11 Retire `sgsFocusRing` | Sonnet |
| 12 Motion composition and Spec 38A | Opus |
| 13 Inspector control | Opus |
| 14 Editor canvas | Sonnet |
| 15 DB and binary gate | Sonnet |
| 16 Docs | Sonnet |
| 17 Verification and screenshots | Sonnet (Opus reviews the pack) |

Order:

- 1 → 2 → 3 → 4, strictly sequential.
- After 4: 5, 6, 7, 8, 9, 10 and 11 touch separate file sets, but they share the baseline and the shared worktree, so they run one at a time under subagent-driven development (an implementer, then a reviewer per task).
- 12 and 13 follow 11.
- 14 follows 13.
- 15 follows all of these, then 16, then 17.

## 8. What needed the owner

Decided 2026-10-17 (see §0): Q1 option B (darken the ring only), Q2 from the Task 4 screenshots, Q3 option A.

**Decided here, for the owner to know (not questions):**

- The per-block focus colour controls (`formFocusRing*` x4 on `sgs/form`, `focusRingColour` on filter-search and product-search) and the `sgsFocusRing` toggle (8 blocks) are retired. One look, restyled per site in the snapshot.
- The form motion "Focus state" keeps border and background changes but loses its ring.
- D467 ("2:1 accent ring is enough") is superseded by the 2026-10-17 ruling, recorded in Spec 32 §14.5.

**Deferred, each with a named home:**

- A real Windows High Contrast (not emulation) pass: `.claude/specs/go-live-checklist.md`, added in Task 16, run at each client's go-live.
- Signature on commerce CTAs: `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md`, next revision (new FR, Task 16).
- `--sgs-focus-under` hand-in for the remaining shadowed focusables the detector lists as `shared-shadow`: Spec 32 FR-32-22's done-when, closed when that list is empty, measured by `check-focus-system.js --survey`.
