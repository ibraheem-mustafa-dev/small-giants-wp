# Claude Design prompt for a draft (ONE prompt, reusable)

Plan: `.claude/plans/2026-09-20-draft-standardisation-plan.md` (section 4). Decision: D1132.
Tested on Eye Care Birmingham on 2026-09-20: it followed items 1 to 6, and I fixed the residue myself (see D1132). This version adds what that test showed was missing, so a future draft needs ONE paste and ONE export.

## How to use it (Bean)

1. Open the Claude Design chat that produced the draft.
2. Attach the client's logo file (PNG, SVG if you have it).
3. Use the **Handoff to Claude Code** skill (never "Save as standalone HTML": it inlines every image as base64) and paste everything inside the block below as one message.
4. Save the zip into `sites/<client>/design_handoff_<name>_vN/` and tell me. I check it, fix anything it got wrong in a reviewed diff, and report. No second round with Claude Design.

## The prompt (paste everything in this block)

```
Please update this design bundle so that everything a developer needs is in the files themselves, not only in the README, then export it. Do not change any visible design, layout, copy or behaviour except where an item below says so. Never delete or rewrite existing logic, thresholds, images or styles to achieve an item: keep them exactly and move or extend them.

1. In the main HTML file add one block: <script type="application/json" data-sgs-manifest> holding: every page (id, route, screen label, kind, and the WordPress slug and parent you would give it), every repeated group with the script dataset it comes from and whether it is fixed or live, and any behavioural rule from the README that the files do not show (for example "show the no-reviews strip when a product has zero reviews"). Use only these words, and put any explanation in a separate note field: page kind = page, wc-archive, single-template, wc-cart, wc-checkout, wc-order-received, choice-flow; repeated group data = fixed-list, product-query, taxonomy-query, managed-cache, session-state, derived.

2. Give every top-level section a CSS class sgs-<name> matching its section name, and list the sections in page order in the manifest.

3. Use our device breakpoints only for layout changes between phone, tablet and desktop: 768px (phone below it) and 1024px (tablet below it). Rename your width flags to mobile, tablet and desktop and change any threshold within about 60px below 768 (for example 760 or 700) to 768. Keep every other threshold exactly as it is (for example 1280, 1010, 820) and list it in the manifest as a named extra breakpoint with the reason.

4. Use the attached logo file for the site logo in place of any drawn mark. Reference every image as a file in an assets/ folder (assets/<name>.<ext>), never as inline base64. For images that are currently embedded as base64, including the brand logos, save each one as a file in assets/ in its original format and reference it, and keep the markup that shows it (for example a brand with a logo shows the logo, a brand without one shows its name). Do not remove any image.

5. Where the README and the files disagree, do not choose: list each difference for me.

6. Then shorten the README to intent and rules that cannot be read from the files.

7. Export as a Handoff to Claude Code bundle, everything in one folder exactly as the project stands: every .dc.html, support.js, image-slot.js, README.md and the full assets/ folder. Do not bundle, merge or inline anything. When it is done, list every file in the bundle with its size.
```
