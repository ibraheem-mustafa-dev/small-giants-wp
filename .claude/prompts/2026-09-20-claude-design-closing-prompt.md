# Claude Design closing prompt: Eye Care Birmingham (single use)

Plan: `.claude/plans/2026-09-20-draft-standardisation-plan.md` (section 4). Decision: D1132.
Delete this file (`git rm`) once the result has been checked, in the same commit that records the outcome.

## How to use it (Bean)

1. Open the Claude Design chat that produced the Eye Care Birmingham draft.
2. Attach the logo file: the "ec" monogram PNG (426 by 214). The client's folder holds only four JPEG logo drafts and no vector file, so a vector or larger original is better when you have one.
3. Paste everything inside the block below as one message.
4. When it finishes, do NOT overwrite the current bundle. Save the new bundle beside it as `sites/eye-care-ward-end/design_handoff_ward_end_eye_care_v2/` and tell me. I run the checker over it.
5. If it ignores items 1 or 2, reply once: "You missed items 1 and 2." Two tries, then the standard is parked (plan, section 5).
6. Send me the list it gives for item 5 (README versus files differences). I found eight; any extras are useful.

## Step 2: the export prompt (use with the "Handoff to Claude Code" skill, after the closing prompt has finished)

Paste this alongside the Handoff to Claude Code skill. Do NOT use "Save as standalone HTML" (it inlines every image as base64).

```
Now export this as a Handoff to Claude Code bundle, everything in one folder exactly as the project stands now: the main .dc.html, Frame Card.dc.html, support.js, image-slot.js, README.md, and the full assets/ folder (ec-logo.png and every .svg). Keep the manifest block inside the main HTML file unchanged. Do not bundle, merge or inline anything, and do not convert any image to base64. Do not change any design, layout or copy. When it is done, list every file in the bundle with its size.
```

Send me that file list along with the zip: I check it against what is on disk.

## Step 1: the closing prompt (already run; kept for the record)

```
Please update this design bundle so that everything a developer needs is in the files themselves, not only in the README. Do not change any visible design, layout or copy.

1. In the main HTML file add one block: <script type="application/json" data-sgs-manifest> holding: every page (id, route, screen label, kind, and the WordPress slug and parent you would give it), every repeated group with the script dataset it comes from and whether it is a fixed list or should be a live product query, and any behavioural rule from the README that the files do not show (for example "show the no-reviews strip when a product has zero reviews").

2. Give every top-level section a CSS class sgs-<name> matching its section name, and list the sections in page order in the manifest.

3. Use our device breakpoints only for layout changes between phone, tablet and desktop: 768px (phone below it) and 1024px (tablet below it). Rename your width flags to mobile, tablet and desktop and change your 760 and 700 thresholds to 768. Keep any other threshold (for example 1280) as a named extra breakpoint in the manifest with the reason.

4. Use the attached logo file (ec-logo.png) for the header and footer logo in place of the drawn mark. Reference it as a file in the bundle (assets/ec-logo.png), not as inline base64, and do the same for every brand logo (files, not embedded data).

5. Where the README and the files disagree, do not choose: list each difference for me.

6. Then shorten the README to intent and rules that cannot be read from the files.
```

## Round 2: fixes after the first check (use after Step 2, before re-exporting)

Result of my check on `design_handoff_ward_end_eye_care_v2` (details in the plan and D1132): manifest valid, 9 pages match the 9 screens, all visible text identical (373 of 373 lines), all datasets identical, no base64 left, breakpoints correct, all assets present. Three problems: the 40 brand logos were deleted (a visible change), the ticker's fit rule was rewritten, and 38 of the 40 `sgs-` classes are section labels, not SGS block names (fine as labels, but the pipeline needs to know which block each is).

Attach `.claude/prompts/2026-09-20-sgs-block-roster.md` (the list of real SGS blocks) and paste:

```
Thank you. Four fixes. Do not change any visible design, layout or copy other than restoring what I name.

1. You removed the brand logos (the LOGOS data and its hasLogo / noLogo handling), so the brand marquee and brand menus now show names only. Restore them exactly as in the previous version: a brand with a logo shows the logo, a brand without one shows its name. Store each logo as a file at assets/brands/<brand-slug>.<ext>, keeping its original format, and reference it by src. No base64.

2. You replaced the ticker's fit rule (four claims from 1010px, three from 820px, two below) with an estimated-width rule. Restore the original rule unless the two give identical claim counts at 375, 768, 1024 and 1440 px. If you keep the new one, tell me the counts both ways.

3. Keep every sgs-<name> class as it is. In the manifest, add a field suggestedBlock to every section: the one block from the attached roster (sgs-block-roster.md) that best fits it, written as the roster name (for example brand-strip), or null if none fits. Do not rename any class.

4. In the manifest use only these words, and put any explanation in a separate note field:
   - page kind: page, wc-archive, single-template, wc-cart, wc-checkout, wc-order-received, choice-flow
   - repeated group data: fixed-list, product-query, taxonomy-query, managed-cache, session-state, derived

Then export again as a Handoff to Claude Code bundle and list every file with its size.
```
