---
plan_id: spec42-phase-1-sgs-form-cpt
phase_name: "Phase 1 — sgs_form CPT, no mandatory rebuild"
project: small-giants-wp
header: "sgs_form CPT registration, slug-keyed resolution, LinkControl picker, cache-independent submit-time config read"
cost_estimate: "~2-3hrs agent time across 8 steps + 3 QA gates (Haiku/Sonnet mix, no opus-shaped steps)"
docscore_grade: not-run (ad-hoc, in-flight)
---

# Phase 1 — `sgs_form` CPT (no mandatory rebuild)

**USP:** Gives the server a durable, authoritative place to look up what a form is — closing
the root cause Spec 42 §1 names (a 24-hour render-time transient the fail-open bug already
exploited once) — while every existing live form keeps rendering exactly as it does today.
Ships the reusable-form foundation Phase 2+ builds on, with zero risk to what's already live.

**Plan label:** [PLAN: sonnet]

**Docscore:** not run (in-flight ad-hoc plan; applies once archived).

**Aggregate cost estimate:** ~2-3hrs, 8 steps + 3 QA gates. No step needs opus — this is
settled-design implementation work (every KJC below is answered before Step 1 starts), and it
touches one CPT registration pattern already proven 4 times in this exact file.

**Phase success criteria (done when):**
- [ ] `sgs_form` CPT registered, capability = `edit_sgs_forms` (not inherited
      `edit_theme_options`), granted to administrator + editor via `add_cap()` on activation
- [ ] `Sgs_Block_CPTs::resolve_form( string $slug ): ?WP_Post` exists, slug-keyed,
      fail-closed, mirrors `resolve_modal()`'s shape but resolves by `post_name` not ID
- [ ] A slug rename is blocked once that form has ≥1 row in `{prefix}sgs_form_submissions`
- [ ] `sgs/form`'s `formId` control is a `LinkPopoverField` picker (the SGS standard link
      control, wrapping core's `LinkControl` inside a `<Popover>` — never mounted directly,
      filtered to `sgs_form`,
      showing a "Form" type badge) for CPT-linked forms — existing free-text/auto-generated
      `formId` values keep working unchanged for forms that have never been linked
- [ ] A CPT-linked form embed whose referenced post is trashed/unpublished degrades to two
      distinct messages (public-visitor fallback vs. editor-only next-action notice) — never
      a raw PHP error
- [ ] `class-form-rest-submission.php::handle_submit` reads `requireLogin`/`rateLimit` from
      the durable CPT (via `resolve_form()`) when the form is CPT-linked, cache-independent —
      the existing transient-based path is untouched for forms that aren't CPT-linked
- [ ] Every existing live `sgs/form` instance on sandybrown renders and submits identically
      to before this phase, verified live, not just asserted

**Entry context (read before starting):**
- `.claude/specs/42-SGS-FORM-CPT-AND-PRICING.md` (v2.1.0) — governing spec, §1-§4, §13 FR-42-1
  through FR-42-8
- `plugins/sgs-blocks/includes/class-sgs-block-cpts.php` — the CPT registration pattern to
  extend (4 existing CPTs: `sgs_header`/`sgs_footer`/`sgs_drawer`/`sgs_modal`), and
  `resolve_modal()` — the closest existing precedent, though it resolves by POST ID; `sgs_form`
  resolves by SLUG (spec §2), so do not copy it verbatim
- `plugins/sgs-blocks/src/blocks/form/block.json` — `formId` is currently `{"type":"string",
  "default":""}`, auto-generated client-side as `form-${clientId.substr(0,8)}` on first insert
  (`edit.js` line ~72-77) and editable as free text (`edit.js` line ~448)
- `plugins/sgs-blocks/src/blocks/form/edit.js` — already mounts `LinkPopoverField` (confirmed
  via grep) for `successRedirect`, a DIFFERENT attribute (the post-submit redirect URL) — this
  is precedent for the component's USE, not code to repurpose directly
- `plugins/sgs-blocks/src/components/LinkPopoverControl.js` — the SGS standard link control
  (Spec 35 §2 LINK). Exports `LinkPopoverContent` (the `<Popover>` primitive, wraps core's
  `LinkControl` with `settings={[]}` and its own toggle rows — core's staged `settings` prop is
  never used, because it silently discards a flipped toggle with no blur/close handler) and
  `LinkPopoverField` (self-contained trigger row + popover, for the single-trigger case this
  block needs). Raw `wp.blockEditor.LinkControl` is BANNED as a direct sidebar mount project-
  wide — it overflows a ~248px inspector panel by ~86px (core sets `min-width:350px`, cancelled
  only inside `.components-popover__content`). **Neither export currently forwards a
  `suggestionsQuery` prop to its internal `LinkControl`** — step 4 must add one (additive,
  optional, defaults to undefined so every other consumer is unaffected) to scope suggestions
  to `sgs_form` posts only
- `plugins/sgs-blocks/includes/forms/class-form-rest-submission.php::handle_submit` — the
  fail-open bug fixed in Phase 0 (commit `4666a3704`) lives here; FR-42-8 replaces ITS
  config-lookup mechanism for CPT-linked forms only
- `plugins/sgs-blocks/includes/forms/class-form-activator.php::activate` — already registered
  as `register_activation_hook` in `sgs-blocks.php`; the new capability grant extends this
  existing hook, not a new one

**References:**
- `.claude/plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md` — parent roadmap, Phase 1
  one-line scope
- D1072 (`.claude/decisions.md`) — the adversarial-council closure that produced Spec 42 v2.1.0
- `plugins/sgs-blocks/includes/class-sgs-mega-menu-cpt.php::resolve_panel_for_menu_item` — a
  second fail-closed-resolution precedent, cited by `resolve_modal()`'s own docblock

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| cli | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` | step 8 deploy |
| cli | `wp eval` / WP-CLI over SSH | QA gates 1-3 |
| mcp | Playwright | QA gates 2, 3 (live editor + live submission) |
| skill | `/qc-inline` | after step 8, per-file check |

---

Step 1 — Register the `sgs_form` CPT with its own capability map
  Model:       sonnet
  Action:      In `class-sgs-block-cpts.php`, add `const FORM_CPT = 'sgs_form';` alongside the
               other CPT consts. Register it inside `register_post_types()` — but NOT via
               `array_merge( $shared, ... )` like the other four, because `$shared`'s
               `capabilities` map routes every primitive to `edit_theme_options` and FR-42-1
               requires a NEW named capability. Build a second capability map
               (`$form_capabilities`, same 12 primitive keys, every value literally
               `'edit_sgs_forms'`), and a `$form_shared` array copying `$shared` but with
               `capabilities => $form_capabilities` and `supports => ['title','editor',
               'revisions']` (no `custom-fields` — FR-42-2, decided). Labels follow the exact
               shape of the other four (`name`/`singular_name`/`add_new`/etc — "Forms"/"Form").
               No `template` arg (matches all four existing CPTs' documented reasoning).
  Files:       plugins/sgs-blocks/includes/class-sgs-block-cpts.php
  Inputs:      Spec 42 FR-42-1 (decided capability = literal `edit_sgs_forms`)
  Outcome:     `sgs_form` CPT is registered on `init`; `wp post-type list` shows it;
               `wp post-type get sgs_form --field=cap` shows the new capabilities, not
               `edit_theme_options`
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        20 min
  Tooling:     none beyond Read/Edit
  On-Fail:     `git diff` the one file; revert via `git checkout --` if `wp post-type list`
               doesn't show `sgs_form` after a deploy
  Cold-Entry:  Read `class-sgs-block-cpts.php::register_post_types` in full (lines ~100-260)
               before editing — the four existing registrations are the template to match
  Test:
    Happy:       `wp post-type get sgs_form --field=public` returns `false` (matches the
                 other four — not a public post type)
    Edge:        `wp post-type get sgs_form --field=cap` shows `edit_sgs_forms` on every
                 primitive, NOT `edit_theme_options`
    Fail:        Omitting `map_meta_cap => true` would break meta-cap derivation — assert it's
                 present in the diff before merging
    Integration: standalone (no other block/CPT reads `sgs_form` yet at this step)

Step 2 — `add_cap()` grant on the existing Form_Activator hook, `resolve_form()`, slug-rename guard
  Model:       sonnet
  Action:      (a) In `class-form-activator.php::activate`, after the existing table-creation
               SQL, add: get the `administrator` and `editor` `WP_Role` objects, call
               `->add_cap( 'edit_sgs_forms' )` on each. Do NOT create a new activation hook —
               `sgs-blocks.php` already registers this one (`register_activation_hook( __FILE__,
               array( Forms\Form_Activator::class, 'activate' ) )`).
               (b) In `class-sgs-block-cpts.php`, add `resolve_form( string $slug ): ?WP_Post` —
               mirror `resolve_modal()`'s fail-closed SHAPE (never a fatal, degrade to null) but
               NOT its body: use `get_page_by_path( $slug, OBJECT, self::FORM_CPT )` (slug-keyed,
               per spec §2 — `resolve_modal()` resolves by int ID, wrong pattern to copy here),
               validate `post_status === 'publish'`, else return null.
               (c) Add a `wp_insert_post_data` filter (registered in `register()`) that blocks a
               `sgs_form` post's slug from changing once
               `$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}sgs_form_submissions WHERE
               form_id = %s", $old_slug)` returns > 0 — return the OLD slug unchanged rather
               than erroring (a silent no-op reads better to a non-coder client than a save
               failure with no visible reason).
  Files:       plugins/sgs-blocks/includes/forms/class-form-activator.php,
               plugins/sgs-blocks/includes/class-sgs-block-cpts.php
  Inputs:      step 1 output (FORM_CPT const must exist first)
  Outcome:     activating the plugin grants `edit_sgs_forms` to admin+editor;
               `resolve_form('some-slug')` returns the right `WP_Post` or null in every
               documented case; renaming a form with submissions silently keeps its old slug
  Exec:        SEQUENTIAL
  Deps:        step 1
  Marker:      (none)
  Time:        30 min
  Tooling:     none beyond Read/Edit
  On-Fail:     if `add_cap()` doesn't stick, check the role object was actually saved
               (`$role->add_cap()` persists automatically in WP — a missing grant usually means
               the plugin was already active before this code shipped; re-run
               `wp cap add administrator edit_sgs_forms` and `wp cap add editor edit_sgs_forms`
               by hand as a one-time backfill, note it in the QA gate)
  Cold-Entry:  n/a (mid-stream)
  Test:
    Happy:       `resolve_form()` on a real published `sgs_form` slug returns that `WP_Post`
    Edge:        `resolve_form()` on a trashed, draft, or nonexistent slug all return `null`;
                 on a slug belonging to a DIFFERENT post type (e.g. a page with the same slug)
                 also returns `null` (the `get_page_by_path` 3rd-arg post-type filter handles
                 this — assert it, don't assume)
    Fail:        renaming a form's slug when it has 1+ submissions: assert the saved post_name
                 is unchanged after the save request completes
    Integration: standalone (`resolve_form()` has no caller yet at this step — that's step 5)

QA Gate — CPT + capability + resolve_form() verified live, not just unit-level
  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    steps 1-2 complete, deployed to sandybrown
  Check:   `ssh hd "cd domains/sandybrown-nightingale-600381.hostingersite.com/public_html &&
           wp post-type get sgs_form --field=cap && wp cap list administrator | grep
           edit_sgs_forms && wp post create --post_type=sgs_form --post_title='QA Test Form'
           --post_status=publish --porcelain"` then `wp eval
           'var_export(\SGS\Blocks\Sgs_Block_CPTs::resolve_form("qa-test-form"));'`
  Pass:    capability map shows `edit_sgs_forms`; `edit_sgs_forms` present in administrator's
           cap list; `resolve_form('qa-test-form')` returns a `WP_Post` object with
           `post_type = sgs_form`
  Fail:    if the cap grant is missing, run the one-time backfill from step 2's On-Fail; if
           `resolve_form()` returns null for a real published post, check the slug matches
           exactly (WP auto-appends `-2` etc on title collisions — read the porcelain output's
           real slug, don't assume "qa-test-form")
  Marker:  QA

Step 3 — Admin submenu + `wp_revisions_to_keep` cap
  Model:       sonnet
  Action:      (a) In `register_submenus()`, add a fifth `add_submenu_page()` call for
               `self::FORM_CPT`, mirroring the other four's shape exactly, but with capability
               `'edit_sgs_forms'` (not `'edit_theme_options'` — a user who only holds the new
               cap must still see the Forms submenu). (b) Add a `wp_revisions_to_keep` filter
               (registered in `register()`) that returns `10` when
               `get_post_type( $post ) === self::FORM_CPT`, else returns `$num` unchanged
               (pass-through for every other post type — do not affect header/footer/drawer/
               modal's existing revision behaviour).
  Files:       plugins/sgs-blocks/includes/class-sgs-block-cpts.php
  Inputs:      step 1 (FORM_CPT const)
  Outcome:     wp-admin shows a "Forms" submenu entry under the SGS menu; a `sgs_form` post's
               revision count is capped at 10 and every other post type's is unaffected
  Exec:        PARALLEL with step 2 (disjoint concern inside the same file — same file, but
               non-overlapping methods; do NOT run truly concurrently in two sessions since
               it's one file — sequential-in-practice, flagged parallel-eligible only if split
               across two dispatched edits with a merge step)
  Deps:        step 1
  Marker:      (none)
  Time:        15 min
  Tooling:     none beyond Read/Edit
  On-Fail:     revert the filter; a wrong `$post` type check would cap EVERY post type's
               revisions at 10 — verify the pass-through branch explicitly before merging
  Cold-Entry:  n/a (mid-stream)
  Test:
    Happy:       "Forms" appears in the SGS admin submenu for an editor-role user
    Edge:        create 12 revisions of one `sgs_form` post; assert only 10 survive
    Fail:        create 12 revisions of an UNRELATED post type (e.g. a page); assert its
                 revision count is untouched by this filter (the pass-through, tested
                 explicitly — this is the negative control for this step)
    Integration: standalone

Step 4 — `formId` becomes a `LinkPopoverField` picker, additive to the existing free-text value
  Model:       sonnet
  Action:      (a) First, extend the SHARED component (not the form block): in
               `src/components/LinkPopoverControl.js`, add an optional `suggestionsQuery` prop
               to both `LinkPopoverContent` and `LinkPopoverField`, forwarded straight to the
               internal `<LinkControl suggestionsQuery={suggestionsQuery} .../>`. Default
               `undefined` — every existing consumer (`sgs/button`, `sgs/icon`, `sgs/media`,
               `sgs/product-card`'s `ctaUrl`, this block's own `successRedirect`) passes nothing
               and gets byte-identical behaviour; only a caller that supplies it gets scoped
               suggestions. (b) In `form/edit.js`, add a SECOND `LinkPopoverField` mount (the
               existing one at line ~491 is for `successRedirect` — do not touch it) with
               `suggestionsQuery={{ type: 'post', subtype: 'sgs_form' }}` and
               `enableInternalResolution={true}` (this form needs the resolved post's internal
               ID/kind, not just a URL string — `searchOnly` stays `false`, the default). Its
               `onChange` receives `{ url, linkId, linkKind }`; write the resolved post's own
               `slug` (fetch via `wp.data.select('core').getEntityRecord('postType','sgs_form',
               linkId)` or an equivalent already-cached read, NOT the URL) into the EXISTING
               `formId` attribute (not a new attribute — spec §2 says the existing embed
               attribute carries the slug), and set the new `formIsLinked` attribute (from step
               6) to `true` in the same `setAttributes` call. Below the picker, keep the current
               free-text `formId` TextControl visible but relabel it "Form ID (used if no form
               is linked above)" — this is the additive path: a form that has never used the
               picker keeps its auto-generated/free-text `formId` working exactly as today. The
               "Form" type badge (FR-42-5) is core's own suggestion-list behaviour for a scoped
               `subtype` — `LinkControl` already labels results by post type/subtype out of the
               box; confirm this renders correctly for a non-public CPT before writing any
               custom badge code (do not build a bespoke renderer speculatively).
  Files:       plugins/sgs-blocks/src/components/LinkPopoverControl.js,
               plugins/sgs-blocks/src/blocks/form/edit.js
  Inputs:      step 1-2 (the CPT + `resolve_form()` must exist for the picker to have anything
               real to suggest, though `LinkControl`'s suggestions come from WP core's own
               `/wp/v2/search` REST endpoint, not a custom call)
  Outcome:     a client can open `sgs/form`'s inspector, search + pick a published `sgs_form`
               post via the SGS-standard popover picker, and see `formId` update to that post's
               slug; the free-text fallback still works for forms that never touch the picker;
               every other `LinkPopoverField`/`LinkPopoverContent` consumer is unaffected
  Exec:        SEQUENTIAL
  Deps:        steps 1-2 (CPT + `show_in_rest` must be live for `/wp/v2/search?subtype=sgs_form`
               to return anything)
  Marker:      (none)
  Time:        40 min
  Tooling:     none beyond Read/Edit
  On-Fail:     if the suggestions endpoint returns empty despite published `sgs_form` posts
               existing, check `show_in_rest: true` landed in step 1 and that the CPT's `rest_
               base`/`show_in_rest` combination is actually queryable by `/wp/v2/search`
               (WP core's search controller requires the post type to be registered with
               `'show_in_rest' => true` AND `public` is NOT required for `/wp/v2/search`
               specifically, per WP core's own controller — verify live, don't assume). If
               adding `suggestionsQuery` to the shared component breaks an EXISTING consumer's
               suggestions (it shouldn't — the prop defaults to `undefined`), revert (a) and
               re-check the diff; this must be a strictly additive change to a shared component
  Cold-Entry:  n/a (mid-stream)
  Test:
    Happy:       picking a real published `sgs_form` post sets `formId` to its exact slug and
                 `formIsLinked` to `true`
    Edge:        a form with an existing auto-generated `formId` (e.g. `form-a1b2c3d4`) that
                 has NEVER used the picker: opening the block in the editor shows the free-text
                 value unchanged, no forced migration, `formIsLinked` stays `false`/absent
    Fail:        searching for a DRAFT `sgs_form` post: it must not appear in suggestions (WP
                 core's search endpoint already excludes non-public-queryable statuses for a
                 non-public CPT by default — confirm this live, it's the kind of assumption
                 that's cheap to get wrong). Also: an existing consumer of `LinkPopoverField`
                 (e.g. `sgs/button`'s link picker) must show UNCHANGED, unscoped suggestions
                 after (a) ships — this is the negative control for the shared-component change
    Integration: WP core's `/wp/v2/search` REST endpoint

Step 5 — `render.php`: CPT-linked forms render the referenced post's content
  Model:       sonnet
  Action:      In `form/render.php`, after resolving `formId`, call
               `Sgs_Block_CPTs::resolve_form( $attributes['formId'] )`. If it returns a
               `WP_Post` (this form is CPT-linked): render that post's `post_content` via
               `do_blocks()` (matching the pattern `resolve_modal()`'s caller already uses for
               `sgs_modal` content) INSTEAD of this block instance's own InnerBlocks. If it
               returns `null` (legacy/unlinked form — the formId doesn't resolve to any
               `sgs_form` post): render EXACTLY as today, this block instance's own InnerBlocks,
               completely unchanged code path. This branch is the one that makes "existing
               forms keep working unchanged" literally true — do not collapse it into a single
               code path that assumes every form is now CPT-linked.
  Files:       plugins/sgs-blocks/src/blocks/form/render.php
  Inputs:      step 2 (`resolve_form()`), step 4 (a real CPT-linked `formId` to test against)
  Outcome:     a CPT-linked `sgs/form` embed renders the CANONICAL post's field structure; an
               unlinked one renders exactly as it did before this phase
  Exec:        SEQUENTIAL
  Deps:        steps 2, 4
  Marker:      (none)
  Time:        30 min
  Tooling:     none beyond Read/Edit
  On-Fail:     if a legacy form's rendering changes AT ALL after this step, that's a blocking
               regression — revert immediately, the branch condition is wrong
  Cold-Entry:  n/a (mid-stream)
  Test:
    Happy:       a CPT-linked embed renders the referenced `sgs_form` post's fields, not its
                 own (empty) InnerBlocks
    Edge:        an embed whose `formId` matches NO `sgs_form` post at all (the common case
                 today, auto-generated string) renders its own InnerBlocks — byte-identical
                 output to before this step
    Fail:        an embed linked to a `sgs_form` post that then gets TRASHED — covered by
                 step 6, not this step; this step's own fail case is a malformed `formId`
                 (empty string, non-string) — assert it degrades to the legacy path, never a
                 PHP notice/warning
    Integration: `do_blocks()` on the resolved post's content (WP core)

Step 6 — Trashed/missing CPT-linked form: two-audience degrade message
  Model:       sonnet
  Action:      Extend step 5's `resolve_form()` null-branch to distinguish two cases: (a)
               `formId` was NEVER linked (legacy — render own InnerBlocks, per step 5) vs. (b)
               `formId` WAS linked at some point but `resolve_form()` now returns null because
               the referenced post is trashed/unpublished/deleted — this second case needs a
               NEW third render branch. Detect it by checking whether `formId` matches the
               slug PATTERN of a real linked reference (this needs a concrete signal — the
               cleanest is: store a boolean `formIsLinked` attribute alongside `formId`, set
               `true` only by step 4's picker `onChange`, `false`/absent for the free-text
               path; render.php then has an unambiguous three-way branch instead of guessing
               from the slug string alone). When `formIsLinked === true` AND `resolve_form()`
               returns null: render (i) the public-visitor fallback — a plain paragraph, "This
               form isn't available right now — please [contact-page-link or site email]
               instead" (site-configurable contact fallback; if none configured, a generic
               "please contact us"), and (ii) when `current_user_can('edit_sgs_forms')`, ALSO
               render an editor-only admin-notice-styled block above it: "This form's reference
               is broken — go to Forms, find the linked form, and republish it or unlink this
               block."
  Files:       plugins/sgs-blocks/src/blocks/form/block.json (new `formIsLinked` boolean attr),
               plugins/sgs-blocks/src/blocks/form/edit.js (set it in step 4's picker
               `onChange`), plugins/sgs-blocks/src/blocks/form/render.php (the third branch)
  Inputs:      step 4 (picker `onChange`), step 5 (the two-branch skeleton to extend)
  Outcome:     a genuinely broken CPT link degrades gracefully for both audiences; an
               never-linked legacy form is never mistaken for a broken one
  Exec:        SEQUENTIAL
  Deps:        steps 4, 5
  Marker:      (none)
  Time:        35 min
  Tooling:     none beyond Read/Edit
  On-Fail:     if a legacy (never-linked) form starts showing the broken-reference message,
               `formIsLinked` isn't being read/written correctly — check block.json's default
               is `false`, not `true`
  Cold-Entry:  n/a (mid-stream)
  Test:
    Happy:       a CPT-linked form with its referenced post published: no degrade message,
                 normal render (step 5's happy path, unaffected)
    Edge:        trash the referenced `sgs_form` post; reload the page as a logged-OUT visitor
                 — see only the generic fallback, no "Forms" or "edit" vocabulary anywhere in
                 the markup
    Fail:        same trashed-post state, logged in as an `edit_sgs_forms` holder — see BOTH
                 the visitor fallback AND the editor notice, in that order
    Integration: `current_user_can()` (WP core capability check)

QA Gate — Live editor round-trip: pick, link, trash, verify all three states
  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    steps 1-6 complete, deployed to sandybrown
  Check:   Playwright: log in, open a page, insert `sgs/form`, use the new picker to link the
           QA test form from the first QA gate, save, view the page logged-out — confirm the
           linked form's own fields render (not the block instance's empty InnerBlocks); then
           `wp post update <qa-form-id> --post_status=draft` over SSH, reload the page
           logged-out — confirm the visitor-fallback message, no technical vocabulary; reload
           logged-in as `Claude` (administrator) — confirm the editor notice ALSO appears
  Pass:    all three states render as specified above, confirmed via
           `page.locator(...).textContent()` assertions, not a visual screenshot alone
  Fail:    if the editor-only notice is visible to the logged-out view too, `current_user_can()`
           is being evaluated in the wrong request context (check for any cached/SSR context
           bleed — this exact class of bug is why `sgs/form` pages must stay cache-aware, per
           FR-42-8 next)
  Marker:  QA

Step 7 — `class-form-rest-submission.php`: cache-independent config read for CPT-linked forms
  Model:       sonnet
  Action:      In `handle_submit`, BEFORE the existing transient read (the one Phase 0 already
               hardened against unresolvable-config, commit `4666a3704`), call
               `Sgs_Block_CPTs::resolve_form( $form_id )`. If it returns a `WP_Post` (CPT-linked):
               `parse_blocks( $post->post_content )`, find the root-level `sgs/form` block in
               the parsed tree, read `requireLogin`/`rateLimit` from ITS `attrs` array directly
               — this is the durable, cache-independent source FR-42-8 requires, since it reads
               the CPT's live `post_content` at submit time, never a render-time cache. If
               `resolve_form()` returns null (legacy/unlinked form): fall through to the
               EXISTING Phase-0-hardened transient path, completely unchanged — this is the
               same "don't touch the legacy path" discipline as step 5.
  Files:       plugins/sgs-blocks/includes/forms/class-form-rest-submission.php
  Inputs:      step 2 (`resolve_form()`), step 6 (a CPT-linked form to test the new path against)
  Outcome:     submitting a CPT-linked form reads its `requireLogin`/`rateLimit` from the
               durable CPT `post_content`, immune to any page-cache layer; submitting a legacy
               form behaves exactly as it did after Phase 0
  Exec:        SEQUENTIAL
  Deps:        steps 2, 6
  Marker:      (none)
  Time:        30 min
  Tooling:     none beyond Read/Edit
  On-Fail:     if `parse_blocks()` doesn't find a root `sgs/form` block (e.g. the CPT post's
               content was hand-edited into something else), degrade to Phase 0's existing
               refuse-outright (503) behaviour — never silently proceed with a guessed value,
               same discipline as FR-42-0
  Cold-Entry:  n/a (mid-stream)
  Test:
    Happy:       a CPT-linked, `requireLogin:true` form: an anonymous submit is correctly
                 rejected (401), reading the value from the CPT's `post_content`, with the
                 CPT's config transient never even queried
    Edge:        edit the CPT-linked form's `requireLogin` from `true` to `false` in wp-admin,
                 republish, submit again anonymously WITHOUT reloading any cached page — must
                 now succeed immediately (proves the read is genuinely cache-independent, not
                 just differently-cached)
    Fail:        a CPT-linked form whose referenced post's content can't be parsed into a root
                 `sgs/form` block: assert the same 503 refusal Phase 0 already ships, not a
                 silent proceed
    Integration: `parse_blocks()` (WP core)

QA Gate — Full-regression sweep: every existing live form submits identically
  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    steps 1-7 complete, deployed to sandybrown
  Check:   `wp post list --post_type=page --s="wp:sgs/form" --format=ids` (or the project's own
           `audit-post-content-blocks.py` scoped to `sgs/form`) to enumerate every live page
           carrying an `sgs/form` instance; for each, Playwright-submit a minimal valid payload
           and assert a 200/expected-error response identical to the pre-Phase-1 behaviour
           (compare against Phase 0's already-passing 34/34 PHPUnit suite as the behavioural
           baseline, not a fresh guess)
  Pass:    every enumerated instance submits with no behavioural change; PHPUnit suite for
           `FormSubmissionTest.php` still 34/34 (run `php vendor/bin/phpunit --filter
           FormSubmissionTest` — a fifth new class of test may be added for the CPT-linked path
           here, expect the count to grow, not shrink)
  Fail:    any regression on a legacy (never-linked) form is a hard blocker — do not deploy
           past this gate; the bug is almost certainly a step-5/step-7 branch condition that
           doesn't correctly fall through to "unlinked"
  Marker:  QA

Step 8 — Deploy + integrate
  Model:       sonnet
  Action:      Run the project's own build-deploy path
               (`python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`,
               scope with `--blocks-only` since this phase touches no theme files), then
               `git add` the specific files touched across steps 1-7 (explicit pathspec, never
               `git add -A`), commit, `git branch --show-current` in the SAME command as the
               commit, `git pull --rebase` + `git push`.
  Files:       (all files touched in steps 1-7 — enumerate explicitly at commit time, do not
               glob)
  Inputs:      steps 1-7 complete, both QA gates passed
  Outcome:     Phase 1 is live on sandybrown and on `origin/main`
  Exec:        SEQUENTIAL
  Deps:        all prior steps + both QA gates
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     `build-deploy.py`, git
  On-Fail:     if the build gate blocks on unrelated concurrent-session debt (the pattern seen
               in Phase 0's deploy — verify genuinely pre-existing before treating as a
               blocker), use the project's own scoped `SGS_F5_SKIP`/`--skip-gate-full`
               mechanisms with disclosure, never `--no-verify`
  Cold-Entry:  n/a (final step)
  Test:
    Happy:       `git log --oneline -1` on `origin/main` shows this phase's commit; sandybrown
                 serves the new picker in the editor
    Edge:        a concurrent session's unrelated dirty files don't block the commit (explicit
                 pathspec) or the push (verify no real divergence before assuming a block)
    Fail:        if deploy's post-deploy verify reports "DEPLOYED-BUT-BROKEN", check
                 independently via `curl`/`openssl` before trusting it — Phase 0 hit a
                 documented local-certifi false alarm here
    Integration: live sandybrown canary

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision:** how does render.php/the REST handler tell a "CPT-linked form whose reference
  broke" apart from a "form that was simply never linked to a CPT at all"? The spec's own text
  doesn't name this distinction, but without it, Phase 1 would either (a) treat every one of
  today's live forms as "broken" the moment it deploys (since none of them resolve to a real
  `sgs_form` post yet), or (b) never be able to show the broken-reference message at all.
  - **Options:** [A] Infer from the `formId` string shape (fragile — a legacy auto-generated
    slug could coincidentally collide with a real CPT slug). [B] Add an explicit
    `formIsLinked` boolean attribute, set only by the picker's `onChange`, read by both
    render.php and the REST handler as the unambiguous discriminator.
  - **Recommendation:** [B] — implemented in step 6.
  - **Why:** [A] is a false-positive/false-negative trap; [B] costs one boolean attribute and
    removes all ambiguity.
  - **Cost of wrong choice:** every live form on the canary shows a "broken form" message the
    moment this phase deploys — a severe, immediately-visible regression.
  - **Who decides:** architect (pre-answered here, not left open for execution to guess).

- **Decision:** does FR-42-8's "cache-independent lookup" apply to EVERY form submission, or
  only CPT-linked ones?
  - **Options:** [A] Universal — read every form's config from `resolve_form()`, drop the
    transient path entirely. [B] Dual-path — CPT-linked forms use the new durable read; legacy
    forms keep Phase 0's already-hardened transient path untouched.
  - **Recommendation:** [B] — implemented in step 7.
  - **Why:** [A] would require migrating every legacy form's config into a `sgs_form` CPT post
    as PART of Phase 1 — that's FR-42-9's mandatory rebuild, explicitly Phase 5's job, not
    Phase 1's. Forcing it here breaks the phase boundary the roadmap itself set.
  - **Cost of wrong choice:** Phase 1 silently absorbs Phase 5's scope, blowing the "no
    mandatory rebuild" success criterion and re-introducing exactly the risk-multiplication
    Ship-PM's adversarial-council finding warned about (D1072).
  - **Who decides:** architect (pre-answered).

- **Decision:** should the `LinkControl` picker REPLACE the existing free-text `formId`
  control, or sit alongside it?
  - **Options:** [A] Replace — cleaner UI, but forces every existing form through a migration
    moment the first time its block is re-saved. [B] Additive — picker on top, free-text
    control stays, relabelled to clarify it's the fallback.
  - **Recommendation:** [B] — implemented in step 4.
  - **Why:** matches this project's own established pattern for exactly this kind of change
    (`modalRef`'s docblock: "an ADDITIVE capability, not a replacement... every existing
    instance keeps working unchanged") and matches Phase 1's own stated success criterion.
  - **Cost of wrong choice:** a silent behaviour change on every existing form the next time a
    client opens and re-saves the page containing it.
  - **Who decides:** architect (pre-answered, following established project precedent).

### Pre-emptive decisions (would otherwise pause mid-execution)

- **Decision:** does WordPress's `/wp/v2/search` REST endpoint actually return results for a
  non-`public` CPT (recall `sgs_form`'s `public => false`, matching the other four CPTs)?
  - **Recommendation:** verify live in step 4, don't assume either way — WP core's search
    controller has its own visibility rules independent of the CPT's `public` flag, gated
    instead by `show_in_rest` + the querying user's read capability. Flagged explicitly as
    step 4's own On-Fail path rather than left to surface mid-step.
- **Decision:** what if the plugin was already active on sandybrown before step 2's `add_cap()`
  code ships (the activation hook won't re-fire on a normal deploy, only on plugin
  activate/deactivate)?
  - **Recommendation:** the QA gate after steps 1-2 includes a one-time manual backfill
    (`wp cap add administrator edit_sgs_forms` / `wp cap add editor edit_sgs_forms`) as its
    documented Fail path — this is expected on a live redeploy, not a bug to chase.
