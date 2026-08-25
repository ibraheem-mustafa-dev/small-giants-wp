---
doc_type: research-proposal
title: C15 — Block Bindings API scope proposal (ground truth, gold standard, competitor UX, gap register)
generated: 2026-08-28
project: small-giants-wp
purpose: |
  Research-backed proposal for what SGS should ADD to its scope register around the
  WordPress Block Bindings API. Establishes what SGS has today by enumeration
  (not estimate), what core supports as of WP 6.7-7.1, how Kadence / Spectra /
  GenerateBlocks / ACF expose dynamic data to a non-technical client, and a
  prioritised gap register.
status: proposal — awaiting Bean's scope decision
browser_use: none (Playwright / chrome-devtools MCP deliberately not used; repo + web only)
---

## In one paragraph

SGS has the Block Bindings API wired at a **hobbyist depth**: two sources registered, three
blocks bindable, six bound attributes existing anywhere in the tree, and **zero client-facing
UI**. Every binding in the repository was hand-typed into a pattern PHP file by a developer.
A client sitting in the block editor cannot create, see, change, or remove a binding — the
capability is invisible to exactly the audience SGS exists to serve. Meanwhile core shipped
an *Attributes* panel in 6.7 and a custom-source field picker in 6.9, and every commercial
competitor (Kadence, Spectra, GenerateBlocks, ACF) ships a click-to-bind control. The gap is
not "more sources" — it is **the editor surface**, plus one latent correctness bug: SGS uses
a WordPress **6.9** filter while declaring a **6.7** floor, so on 6.7/6.8 the contact patterns
render their developer placeholder text to visitors.

---

## 1. Ground truth — what SGS has today

Everything in this section came from a command run against the working tree at
`c:\Users\Bean\Projects\small-giants-wp` on 2026-08-28. The command is named per claim.
`build/`, `vendor/` and `.claude/worktrees/` were excluded from every count — they are
compiled or duplicated copies, not source.

### 1.1 The headline figure

Bean's working figure was "roughly 3 blocks and 2 sources". **Both numbers are correct**, but
they flatter the position in two ways set out below (§1.3 dead source, §1.5 no UI).

| Thing | Count | How counted |
|---|---|---|
| Binding **sources** registered | **2** | `grep -rn "register_block_bindings_source"`, excluding the test stub + worktrees |
| SGS **blocks** made bindable | **3** | the `SUPPORTED_ATTRIBUTES` const, `class-sgs-block-bindings-support.php:70-74` |
| **Attributes** bindable across those 3 blocks | **6** | same const: 1 + 1 + 4 |
| Total SGS blocks in the plugin | **83** | `ls plugins/sgs-blocks/src/blocks/*/block.json \| wc -l` |
| Bound attributes existing anywhere in the tree | **6 instances, 2 files** | `grep -rn '"bindings"'` over `theme/`, `src/`, `includes/`, `patterns/` |
| Editor-side JS binding API calls | **0** | `grep -rn "registerBlockBindingsSource\|useBlockBindingsUtils\|getFieldsList" plugins/sgs-blocks/src \| wc -l` → `0` |

So: **3.6% of SGS blocks (3 of 83) can carry a binding at all.**

### 1.2 Source 1 — `sgs/site-info` (live, used)

- Registered at `plugins/sgs-blocks/includes/class-sgs-site-info-binding.php:56`, inside
  `register_source()`, hooked on `init` (`:41`).
- Booted from `plugins/sgs-blocks/sgs-blocks.php:286`.
- Args passed: `label`, `get_value_callback`, `uses_context => array()`
  (`class-sgs-site-info-binding.php:58-62`). **No `set_value_callback`.**
- Reads the `sgs_site_info` `wp_options` record via `Sgs_Site_Info::get()`
  (`class-sgs-site-info-binding.php:90-92`), supporting dot notation
  (`socials.facebook`, `opening_hours.mon`).
- Known keys, from the GDPR sensitivity map at `class-sgs-site-info.php:73-82`:
  `phone`, `email`, `support_email`, `address`, `registered_office`, `vat_number`,
  `copyright`, `tagline` — plus the `socials.*` and `opening_hours.*` sub-trees.
- Carries a real, hard-won correctness note in its own comments
  (`class-sgs-site-info-binding.php:50-55`): passing `can_user_edit_value` to the PHP
  registration makes core reject the **entire** registration silently. It is not a PHP-side
  key at all; editability is the JS `canUserEditValue()` (§2.3). Worth restating, because it
  is the exact trap any future source will hit.

**Consumers — all six, enumerated** (`grep -rn '"bindings"'`):

| File:line | Block | Attribute | Source key |
|---|---|---|---|
| `theme/sgs-theme/patterns/contact-form.php:28` | `sgs/text` | `text` | `email` |
| `theme/sgs-theme/patterns/contact-form.php:29` | `sgs/text` | `text` | `phone` |
| `theme/sgs-theme/patterns/contact-form.php:30` | `sgs/text` | `text` | `address` |
| `theme/sgs-theme/patterns/contact-form.php:32` | `sgs/text` | `text` | `opening_hours.mon` |
| `theme/sgs-theme/patterns/contact-minimal.php:20` | `sgs/button` | `url` | `email` |
| `theme/sgs-theme/patterns/contact-minimal.php:21` | `sgs/button` | `url` | `phone` |

That is the complete set. Two patterns. No template, no template-part, no block default and
no client page uses a binding.

### 1.3 Source 2 — `sgs-product/field` (registered, **zero consumers**)

- Registered at `plugins/sgs-blocks/includes/class-product-bindings.php:45`, hooked on
  `init` priority 15 (`:34`). Booted from `includes/class-sgs-blocks.php:135`.
- Args: `label`, `uses_context => array('postId','postType')`, `get_value_callback`
  (`class-product-bindings.php:47-50`).
- Resolves `price`, `title`, `image_url`, `image_alt`, `stock_status`,
  `short_description` against WooCommerce or the `sgs_product` CPT
  (`class-product-bindings.php:65-89`).

**Verified**: `grep -rn "sgs-product/field"` over the whole repo (worktrees excluded) matches
**only inside `class-product-bindings.php`'s own docblock and its own registration call**.
No block markup, no pattern, no template, no converter emit ever writes
`"source":"sgs-product/field"`.

**Why it is dead, mechanically** — two independent verified reasons:

1. `sgs/product-card` renders by calling the resolver **directly**, bypassing the bindings
   pipeline: `plugins/sgs-blocks/src/blocks/product-card/render.php:521` calls
   `\SGS\Blocks\Product_Bindings::get_product_data( $product_id, $source_mode )`. That is a
   different public method (`class-product-bindings.php:276`) from the binding callback
   `get_value()` (`:65`).
2. Even if a binding *were* emitted on `sgs/product-card`, it would be inert: that block is
   not in `SUPPORTED_ATTRIBUTES` (`class-sgs-block-bindings-support.php:71-73` lists only
   `sgs/text`, `sgs/heading`, `sgs/button`).

**INFERRED (marked):** the `get_value()` callback path is therefore almost certainly **never
executed in production**. I did not run it live — that needs the browser I was told not to
use — so this is an inference from two verified static facts, not a measurement. Confirm it
before anyone relies on, extends, or deletes that code path.

### 1.4 The bindable-attribute widener

`plugins/sgs-blocks/includes/class-sgs-block-bindings-support.php` adds one
`block_bindings_supported_attributes_{$block_type}` filter per block (`:94`), booted from
`sgs-blocks.php:296`. The map (`:70-74`):

```php
'sgs/text'    => array( 'text' ),
'sgs/heading' => array( 'content' ),
'sgs/button'  => array( 'url', 'label', 'linkTarget', 'rel' ),
```

The file's docblock is unusually good: it quotes core's own allowlist read live off WP 7.0.1
and explains that a non-listed block resolves to an empty array, `process_block_bindings()`
bails, and the block silently renders its raw placeholder. That is the correct mental model
and should be preserved through any refactor.

### 1.5 What is absent — verified by zero-match greps

| Capability | Grep | Result |
|---|---|---|
| JS source registration (editor UI) | `registerBlockBindingsSource` in `src/` | **0** |
| Field-list dropdown for a custom source | `getFieldsList` in `src/` | **0** |
| Programmatic bind/unbind helper | `useBlockBindingsUtils` in `src/` | **0** |
| Write-back from the editor to the source | `set_value_callback` anywhere | **0** |
| Editability flag | `canUserEditValue` in `src/` | **0** |
| Core's `core/post-meta` source used in markup | `"source":"core/post-meta"` | **0** |
| `core/pattern-overrides` used | `pattern-overrides` in `theme/` + `src/` | **0** |

The last two matter. `includes/content-types/class-product-cpt.php:73` and `:217` state
explicitly that the product meta keys were registered with `show_in_rest => true` and without
a leading underscore **so that `core/post-meta` could surface them** — and then nothing ever
does. The plumbing was laid and never connected.

### 1.6 A latent correctness bug (VERIFIED, not inferred)

- `plugins/sgs-blocks/sgs-blocks.php:11` declares `Requires at least: 6.7`.
- The `block_bindings_supported_attributes_{$block_type}` filter SGS depends on was
  **introduced in WordPress 6.9** (developer.wordpress.org, §2; the SGS file's own docblock
  at `class-sgs-block-bindings-support.php:26` says "Since WP 6.9" too).

On a WordPress 6.7 or 6.8 install — which the plugin header says it supports — core never
calls that filter, `sgs/text` / `sgs/heading` / `sgs/button` never join the allowlist, and the
two contact patterns render their literal placeholder to a public visitor:
`placeholder — replaced at render`. The canary runs 7.1, so this is invisible there.

The fix is a judgement, not a build: either raise the header floor to 6.9, or add a
`version_compare` guard with a defined fallback. Bean picks; I have changed nothing.

---

## 2. The gold standard — WordPress core, 6.5 → 7.1

Sources: [Bindings — Block Editor Handbook](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-bindings/),
[Block Bindings improvements in WordPress 6.9](https://make.wordpress.org/core/2025/11/12/block-bindings-improvements-in-wordpress-6-9/),
[Block Bindings: Improvements to the Editor Experience in 6.7](https://make.wordpress.org/core/2024/10/21/block-bindings-improvements-to-the-editor-experience-in-6-7/),
[Block Bindings in WordPress 7.0 — Gutenberg #73467](https://github.com/WordPress/gutenberg/issues/73467).

### 2.1 Core's default bindable allowlist

| Block | Bindable attributes |
|---|---|
| `core/paragraph` | `content` |
| `core/heading` | `content` |
| `core/image` | `id`, `url`, `title`, `alt`, `caption` |
| `core/button` | `url`, `text`, `linkTarget`, `rel` |
| `core/post-date` | `datetime` |
| `core/navigation-link` | `url` |
| `core/navigation-submenu` | `url` |

Anything outside this map needs the `block_bindings_supported_attributes_{$block_type}`
filter (6.9+) — which is precisely what SGS does.

### 2.2 Core sources

| Source | Since | What it reads |
|---|---|---|
| `core/post-meta` | 6.5 | registered post meta with `show_in_rest => true` |
| `core/pattern-overrides` | 6.6 | per-instance overrides inside a synced pattern |
| `core/post-data` | 6.9 | post `date`, `modified`, `link` |
| `core/term-data` | 6.9 | term `id`, `name`, `link`, `slug`, `description`, `parent`, `count` |

### 2.3 The two-sided registration API

**PHP** — `register_block_bindings_source( $name, $args )` on `init`:
`label`, `get_value_callback`, `uses_context`, and **`set_value_callback` (6.7+)** for
write-back. There is **no** `can_user_edit_value` key in PHP — passing it makes core reject
the whole registration, the bug SGS already hit and documented.

**JS** — `registerBlockBindingsSource( args )` in the editor:
`name`, `label`, `usesContext`, `getValues()`, **`setValues()` (6.7+)**,
**`canUserEditValue()` (6.7+)**, **`getFieldsList()` (6.9+)**.

A source registered **only in PHP** renders correctly on the frontend but is **mute in the
editor**: no live preview of the real value, no in-place editing, and — critically — it cannot
populate the picker dropdown. That is exactly SGS's current state for both sources.

Supporting utilities: `useBlockBindingsUtils()` (6.7+) with `updateBlockBindings()` and
`removeAllBlockBindings()`; and the `block_bindings_source_value` filter (6.7+) for last-mile
value shaping.

### 2.4 The editor UX core actually ships

- **6.7** — an **Attributes panel** appears in the block sidebar for the supported core
  blocks. Where registered post meta exists it is interactive: the client picks a field from
  a dropdown and the attribute is bound. Custom sources *displayed* in the panel but could
  not be *connected* through the UI.
- **6.9** — `getFieldsList()` closes that gap: a custom source populates the picker with
  `{ label, type, args }` field objects, so custom sources become selectable in the UI.
  Source switching was simplified and bind/unbind became single-click.
- **7.0 / 7.1** — per Gutenberg #73467 the open work is: filtering the field list by attribute
  format; opening Pattern Overrides to custom dynamic blocks; binding several attributes from
  one source (image `url` + `alt` together); a repeater concept for galleries; and
  server-side-only source definitions. **These are open explorations, not shipped features** —
  I found no evidence any landed, and I did not verify against a live 7.1 install.

### 2.5 What is *not* supported, at any version

- Binding is per-**attribute**, and the value is a scalar the block renders. There is no
  repeater/loop primitive (it is an open 7.0 exploration).
- Bound values are **read-only in the editor by default**; making them editable requires the
  JS `canUserEditValue()` **and** a `setValues()` / `set_value_callback` pair.
- Pattern Overrides remains restricted to core blocks in practice; extending it to custom
  dynamic blocks is open work.

---

## 3. What competitors do — the client-facing UI

This is the part that matters. SGS clients are tech-illiterate and live in the block editor.

### 3.1 Kadence Blocks Pro — the most complete picker

Sources: [Kadence — Dynamic Content](https://docs.nexcess.com/software/kadence/dynamic-content/),
[Kadence — Dynamic HTML Block](https://www.kadencewp.com/help-center/docs/kadence-blocks/how-to-use-the-kadence-dynamic-html-block/).

- A **database icon** appears in two places: the block toolbar, and inline **next to an
  individual setting field**. One click on the icon beside a setting makes that setting
  dynamic. This is the single most important UX idea on this page.
- The picker groups sources the way a person thinks, not the way a database does:
  **Post / Archive / Site / Media / Author / Meta Relationship / Current User / Time**.
  "Time → current year" in a footer copyright line becomes a one-click job.
- Custom meta keys can be typed in directly for fields the picker did not auto-detect.
- A **source selector** defaults to "Current Post" but can point at another post.
- Two modes: **Inline** (value blended into surrounding static text) and **Replacement**
  (value takes over the whole setting).
- Applies to text, images, links and other block settings, on Kadence *and* core blocks.

### 3.2 Spectra Pro

Sources: [Spectra — Dynamic Content extension](https://wpspectra.com/docs/how-to-use-dynamic-content/),
[Spectra — Dynamic Content](https://wpspectra.com/blocks-and-extensions/dynamic-content/).

- A toolbar icon on text selection; for images the icon sits in the image-upload panel.
- The site owner chooses **popup or sidebar** presentation for the picker — the same
  capability at two levels of intrusiveness, which is a genuinely thoughtful touch.
- Sources: post/page title, dates, author, comments, **post meta / term meta / author meta**,
  and featured image or custom field value **for backgrounds**.
- ACF, Pods and Meta Box compatible.
- Block coverage is narrower than Kadence — heading, image, container.

### 3.3 GenerateBlocks Pro — "Dynamic Tags"

Sources: [Dynamic Tags — Learn GeneratePress](https://learn.generatepress.com/blocks/block-guide/getting-started-generateblocks/dynamic-tags/),
[Dynamic Data — GeneratePress docs](https://docs.generatepress.com/article/dynamic-data/).

- A different model: **tags inserted into content**, previewed live in the editor, rather than
  a per-attribute binding record. Around 25 tags, each with its own arguments.
- A tag can go in block content, a block **setting** (e.g. image URL), or an
  **Advanced → Data Attribute** (Pro only) — so a dynamic value can drive a `data-*` hook that
  custom JS reads. Neither core bindings nor SGS has that.
- ACF integration since Pro 1.4.0; relational ACF fields (taxonomy, post object) are **not**
  supported because they need queries and loops.

### 3.4 ACF — the one that actually uses core's API

Sources: [ACF — Block Bindings](https://www.advancedcustomfields.com/resources/block-bindings/),
[ACF 6.8.1 — Block Editor Datastore & Enhanced Block Bindings](https://www.advancedcustomfields.com/blog/acf-6-8-1-released/).

- ACF registered an `acf/field` binding source in **ACF 6.2.8**, targeting WP 6.5's API — it
  did not build a parallel system.
- **ACF 6.8.1** is the state of the art and the closest analogue to what SGS should build:
  - ACF fields appear **in core's own 6.7 Attributes panel**. A client binds a Heading,
    Paragraph, Image or Button to an ACF field from the editor, no code.
  - **Live preview** — the bound attribute updates in real time as the ACF field changes.
  - **In-place editing** — the client edits the bound text *inside the block on the canvas*
    and it writes back to the ACF field. That is `setValues()` / `canUserEditValue()` in action.
  - Gated per field by an **"Allow Access to Value in Editor UI"** setting on the field's
    Presentation tab, plus an `acf/fields` datastore enabled via
    `acf/settings/enable_datastore`.

**The lesson for SGS:** ACF proves the winning move is *not* a bespoke dynamic-content system
(Kadence, Spectra and GenerateBlocks each built one). It is to implement core's editor-side API
properly and inherit core's panel, its keyboard handling, its accessibility and its future
improvements for free. That is also what Spec 35 already says
(`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md:576` — Block Bindings API beats "any bespoke
dynamic-content attr system", priority HIGH) and what the archived P2 design gate concluded
(`.claude/plans/archive/2026-07-18-P2-builder-ux-design-gate.md:836`).
**SGS made the right architectural call and then stopped one layer short of the client.**

---

## 4. The gap register

Sizes use this repo's convention — smallest plausible figure. `S` ≈ under an hour,
`M` ≈ a few hours, `L` ≈ a day or more. Priority is my recommendation, not a decision.

| # | Gap | Why it matters to a client | Size | Priority |
|---|---|---|---|---|
| **C15-1** | **A 6.9 filter used behind a 6.7 declared floor** (§1.6). On 6.7/6.8 the contact patterns print `placeholder — replaced at render` to visitors. | A client on slightly older WordPress has their contact details replaced by developer placeholder text on a live page. Silent — nothing errors. | S | **P0 — correctness** |
| **C15-2** | **No editor-side JS source registration.** `registerBlockBindingsSource` count = 0; both sources are PHP-only and therefore mute in the editor. | The client sees the real value only after previewing. In the editor they see placeholder text and reasonably conclude the page is broken. | M | **P0** |
| **C15-3** | **No `getFieldsList()` for `sgs/site-info`.** Core 6.9's picker can list a custom source's fields; SGS supplies none. | The client cannot *choose* "phone" or "opening hours → Monday" from a dropdown. Binding stays a developer-only act. This single change is what turns bindings into a client feature. | M | **P0** |
| **C15-4** | **No write-back: no `set_value_callback` / `setValues()` / `canUserEditValue()`.** | A client who wants to change the phone number must find the SGS Site Info admin page. ACF 6.8.1 lets them type it straight into the block. Round-tripping to a settings screen is exactly the friction SGS exists to remove. | M | **P1** |
| **C15-5** | **Only 3 of 83 blocks are bindable (3.6%).** No `sgs/image`, no link, no card/hero/CTA slot, nothing in the shop family. | Dynamic data stops at plain text and one button URL. A client cannot bind a logo, a hero image, a price, or an address inside a card. | M per tranche | **P1** |
| **C15-6** | **`sgs-product/field` is registered with zero consumers** (§1.3), and `sgs/product-card` is not on the bindable allowlist, so a binding on it would be inert anyway. | Dead code that reads as a shipped feature. The next person to touch product cards will assume bindings work there and lose an afternoon. | S to decide, M to wire | **P1** |
| **C15-7** | **`core/post-meta` never used, though the product CPT was explicitly built for it** (`class-product-cpt.php:73`, `:217`). | The cheapest dynamic-content win available — core's own source, zero SGS code — is sitting unclaimed. Any client CPT (menu item, service, team member) could drive block content today. | S | **P1** |
| **C15-8** | **No `core/pattern-overrides` usage anywhere.** | A client cannot reuse one synced pattern (a service card, a testimonial) with different text per instance. Today they duplicate and diverge, and the design drifts within weeks. | M | **P2** |
| **C15-9** | **No author-set fallback for an unfilled binding.** The site-info source returns an operator-only hint and an empty string publicly (`class-sgs-site-info-binding.php:85-101`) — correct, but there is no per-binding default the way Kadence offers. | An empty bound field silently collapses the layout instead of showing sensible default copy. | S | **P2** |
| **C15-10** | **No dynamic value into a `data-*` attribute** (GenerateBlocks Pro has this). | Lets a bound value drive behaviour, not just text — a phone number reaching a click-to-call handler, for instance. Genuinely differentiating; not urgent. | M | **P3** |
| **C15-11** | **No source-group taxonomy in the picker** — Kadence's Post / Site / Author / Media / Time grouping. Even with C15-3 done, one flat list of site-info keys will not scale past a handful. | Decides whether the picker is still usable at 60 fields or only at 10. A design decision best made *with* C15-3 rather than retrofitted after. | S (design) | **P2** |
| **C15-12** | **Binding coverage has no gate.** Nothing fails a build when a new block ships without a bindable-attribute declaration, and nothing catches a binding emitted onto a non-allowlisted block — which renders inert and silent. | This is the repo's own recurring failure mode: a losing rule is indistinguishable from an absent one. A detector turns C15-5 into a one-commit rollout instead of a per-block slog. | M | **P1 — build before C15-5** |

### Recommended sequencing

1. **C15-1** on its own — a live correctness bug that costs a line.
2. **C15-12** next, before any block rollout, per `.claude/THE-MIGRATION-METHOD.md`: build the
   detector before the fourth file edit. It also forces the target shape for C15-5 to be
   settled first, which is the step that separated the fast rollout from the slow one.
3. **C15-2 + C15-3 together** — they are one piece of work (a JS source registration whose main
   payload is `getFieldsList`), and together they convert bindings from a developer feature
   into a client feature. This is the highest-value item in the register.
4. Then **C15-7** (free win), **C15-6** (decide: wire or delete), **C15-4**, **C15-5**.

### What I could not establish

- Whether `Product_Bindings::get_value()` ever executes in production. Two static facts say it
  does not (§1.3); confirming needs a live render, which needs the browser I was told not to
  use. **Blocker: browser access, deliberately withheld for this task.**
- Which of the Gutenberg #73467 items, if any, actually shipped in 7.0 or 7.1. The issue does
  not mark status per release and I did not inspect a live 7.1 install. Treat §2.4's 7.0/7.1
  bullet as open explorations, not roadmap commitments.
- Exact competitor version numbers for the Kadence and Spectra dynamic-content features — the
  vendor documentation is unversioned.
