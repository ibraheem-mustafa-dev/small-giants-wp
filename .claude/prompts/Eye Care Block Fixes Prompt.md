Invoke /autopilot before doing anything else.

Context: Eye Care (`eye-care-ward-end`) is being rebuilt from a Claude Design draft onto the SGS WordPress
block framework. Spec 47's measuring route reported 193 candidate framework gaps; Session C2 judged them all
and 178 judged rows reduced to **7 candidate fixes**, of which **Bean approved 5**. Those 5 are the only
block-code work outstanding from that assessment. They are small, well-specified, and each has its exact
files and its reason already written down. Nothing has been built yet.

Read first:
- `.claude/plans/2026-10-05-eye-care-session-c2-finding-assessment.md` §"THE OWED WORK: the five block
  fixes Bean approved" — YOUR task list, with the files per fix.
- `.claude/reports/2026-10-06-session-c2/BEAN-LIST.md` §A — the plain-English reasoning per item and Bean's
  answer on each.

FIVE THINGS THAT WILL MISLEAD YOU IF YOU DO NOT ABSORB THEM FIRST:

1. **You do NOT own the host.** A parallel session is running the Spec 47 route cleanup
   (`.claude/prompts/Spec 47 Cleanup Prompt.md`) and **owns the host until its verification sweep
   completes.** You may write and unit-test code in parallel, but **you must hold BOTH your deploy and your
   reseed** until it signals clear. Three reasons, and the third is decisive: `assertQuiet` aborts its walks
   when `tar`/`rsync` runs on the shared host; your `block.json` additions need an `sgs-update` reseed which
   rewrites the shared framework DB its calibration work reads; and **its committed prediction of F 193 →
   148–168 is only single-variable if the live site does not change** — your fixes close ~19 rows of their
   own, so deploying mid-sweep mixes two causes. Message peer session `small-giants-wp-41` and the cleanup
   session before any host write.

2. **Bean's standing principle governs how these are built, and it overrode a recommendation to refuse A3.**
   > "Our main objective is to make these blocks as modular and mouldable as possible so that our draft
   > sites, no matter how they're coded, are able to be cloned with little to no effort. The padding setup is
   > a workaround that wastes valuable time and tokens."

   Where a draft needs a value, the answer is **a real control with a sensible default**, never a workaround
   reaching the same pixels another way. **Do not re-argue this per block.**

3. **Edit-target shift: the parent holds the control, the CHILD emits the custom property.** An earlier brief
   said `sgs/accordion` "emits `--sgs-accordion-header-gap`". It does not. `accordion/block.json::providesContext`
   has 25 entries and passes values down; `accordion-item/render.php` is what writes
   `--sgs-accordion-header-pad`, and `accordion/style.css` reads it. So A1 and A3 touch **both** blocks: the
   attribute and `providesContext` entry on the parent, the `usesContext` entry and the emit on the child.
   `headerGap` and `headerMinHeight` do not exist in any form today — verified by grep across `plugins/`.

4. **Two of the five fixes are DELETIONS, not additions.** A2 and A6 remove hardcoded CSS so an existing
   control or the draft's own intent can take effect. Do not add a control where the plan says delete a line.

5. **A4 was withdrawn and A7 is an investigation, not a fix.** Do not build either. A4 (`sgs/card-grid`'s
   `noImageLabelLineHeight`) was withdrawn because "Photo to come" is a **draft placeholder** that ceases to
   exist once the client uploads images. A7 is three unexplained symptoms needing one live reading first.

Tasks, in order.

1. **A2 and A6 first — the two deletions (~10 min, inline).** Smallest, lowest risk, and they make existing
   behaviour correct rather than adding surface.
   - **A2:** delete `line-height: 1.4` from `accordion/style.css::.sgs-accordion-item__header`. It currently
     overrides the block's own `lineHeight` control (DB: `sgs/accordion | lineHeight | line-height | wrapper`),
     which paints the root and so loses to a value set directly on the header. This is the same repair
     register **S5** already did for font-size on this exact element.
   - **A6:** delete `text-decoration: underline` from `tabs/style.css::.sgs-tabs__tab:hover`. The draft has no
     underline. Bean: if a tab underline is ever wanted it is done with **border-bottom width and colour**,
     not a text-decoration hardcode. The framework also already ships `.sgs-hover-underline-slide` and
     `.sgs-underline-slide` for anyone who wants the effect.
   - **Done when:** both lines are gone, `sgs/accordion`'s `lineHeight` demonstrably reaches
     `.sgs-accordion-item__title`, and nothing else on either block moved.

2. **A5 — buybox selected-value typography (~10 min, inline).** `buybox/style.css::.sgs-buybox .sgs-buybox__picker-selected-value`
   sets `color` only, so the element inherits 16px where the draft wants **13px** (line-height follows at
   1.5×, so 19.5px against 24px). Note `pickerLabelFontSize` exists but reaches the label span, **not** this
   element — it looks covered from outside and is not. Add the typography call beside the existing
   `pickerLabel` one in `buybox/render.php`, plus the attributes in `buybox/block.json`.
   **Done when:** the selected-value text takes a size from the inspector and the line-height row closes with
   it (verify the second part rather than assuming).

3. **A1 — `sgs/accordion` `headerGap` (~15 min, inline or one subagent).** The only fix on this list that
   changes visible paint. `accordion/style.css::.sgs-accordion-item__header` hardcodes `gap: 12px`; the draft
   wants **20px on Help and 16px on the product template**. (Note: we design the **product page template**,
   not individual product pages.) Follow the `headerPadding` precedent exactly: attribute +
   `providesContext` on `sgs/accordion`, `usesContext` + emit on `sgs/accordion-item`, and
   `gap: var(--sgs-accordion-header-gap, 12px)` in the stylesheet.
   **Done when:** the control appears in the inspector, paints on the front end, and 12px remains the
   fallback when unset.

4. **A3 — `sgs/accordion` `headerMinHeight` (~15 min, inline or one subagent).** Replaces the hardcoded
   `min-height: 44px` with a control **defaulting to 44px**. Precedent: `sgs/tabs | tabMinHeight | min-height | tab`,
   which uses `min-height: var( --sgs-tab-min-height, 44px )`.
   **The 44px default satisfies the touch-target rule by default; a client choosing otherwise in context is
   their call.** This was approved over an objection that it risked WCAG 2.1 AA — see point 2. Do not add a
   floor that refuses sub-44px values unless Bean says so.
   **Done when:** the control exists with a 44px default and the draft's 56px is reachable.

5. **A7 — investigate only, propose nothing until the cause is proven (~20 min).** `sgs/whatsapp-cta` shows
   **three** symptoms on the product page: the icon renders `rgb(20,20,20)` where
   `whatsapp-cta/style.css::.sgs-whatsapp-cta--card .sgs-whatsapp-cta__icon-badge` sets `color` to
   `text-inverse` = `#FAF8F5` and the glyph is `currentColor` — **that CSS cannot produce black**; the text
   carries more weight than the draft; and there is an underline hover effect the draft does not have.
   `git diff` on the block since `94122e326` is empty, so a stale deploy does not explain it.
   **Read the winning rule's origin** on `.sgs-whatsapp-cta__icon-badge` and its `svg` via
   `CSS.getMatchedStylesForNode`, at 375 and 1440. **Done when:** the overriding rule is named with its file
   and selector. Then stop and put the fix shape to Bean — the project rule is to prove the cause before the
   fix, and a guessed colour control would be dead on arrival if the real cause is an override elsewhere.

6. **Build, gate and deploy — ONLY after the cleanup session signals clear (~30 min).**
   - `cd plugins/sgs-blocks && npm run build` — **from PowerShell**, the nvm shim is broken in Git Bash.
   - `python plugins/sgs-blocks/scripts/build-deploy.py --target eye-care-test`
   - A1 and A3 add `block.json` attributes, so an `sgs-update` reseed is needed. **Message peers first** —
     the framework DB is shared and a reseed mid-calibration invalidates another session's DB citations.
   - **Verify by checksum, never by liveness.** `build-deploy.py` builds from an isolated worktree **at
     HEAD**, so an uncommitted change **cannot ship** and the deploy still prints `[DONE]` with every gate
     green. Also: a straight `md5sum` reports CRLF-versus-LF as a content mismatch because git normalises on
     commit — normalise with `tr -d '\r'` first.
   - **Verify both surfaces separately.** A green build proves neither: check each new control appears in the
     real block editor **and** paints on the real front end.

7. **QC and close (~20 min).** `/qc-inline` on the five fixes (or `/qc-council` if two or more fix shapes
   end up contested). Then update the C2 plan's "THE OWED WORK" section to record what shipped with its
   hashes, update `LEDGER.md`, and `/handoff`.

Guardrails:
- **Do not touch anything under `scripts/computed-route/` or `scripts/parity/`.** Those are the cleanup
  session's files and it owns them. Your work is block code only.
- **Gates:** `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` must exit 0 (Spec 32: no SGS
  block renders an inline `style="…"`); `node plugins/sgs-blocks/scripts/check-dead-controls.js`;
  `node plugins/sgs-blocks/scripts/check-editor-render-parity.js`;
  `python scripts/check-no-client-names.py --check`.
- **Pair every new control with its reader in the same commit**, or the control exists, paints nothing, and
  `check-dead-controls.js` goes red.
- **No deprecations and no version bumps** — pre-production, per `.claude/rules/block-authoring.md`. These
  blocks' `save.js` returns `InnerBlocks.Content`, so adding an attribute changes no saved markup.
- **Test the empty `{}` tier default** per family: an empty mobile tier inherits the nearest wider tier, so
  one desktop write silently changes 375px. Check all widths, never 1440 alone.
- **Never stage:** `.claude/reports/serverside-render-disabled-audit.*`,
  `plugins/sgs-blocks/scripts/consistency/*.json`, `plugins/sgs-blocks/scripts/dbschema/seed-history.json`,
  `plugins/sgs-blocks/.phpunit.cache/*`, `reports/phase4-*.txt`,
  `.claude/reports/2026-10-04-route-data-audit/fingerprint/*.json`, or any path containing `Bean Points`.
- `MEMORY.md` was consolidated on 2026-10-06: 111 lesson files folded into 74, and the index is 10,241 bytes against its 16,384 cap, so ~6,100 bytes are free and a new lesson fits without cutting anything. Index lines use a short human title, not the slug repeated: `- [Short Title](the-slug.md) — hook`.
