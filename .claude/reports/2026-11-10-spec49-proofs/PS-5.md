# PS-5: loading resolver on pages, REST and fragments (2026-11-10)

**Verdict:** FAIL on template pages; the other cases pass. A probe mu-plugin ran on local-sandybrown (`sgs-ps5-probe.php`, log `ps5-log.jsonl`, 791 rows) and has been removed; the mirror's mu-plugins are back to their three own files. The mirror runs the older renderer, so the probe emulated `arm()` over the same position logic.

| # | Case | Measured | Result |
|---|---|---|---|
| 1a | Home | The hero (section 1) desktop and mobile pair are eager, and the 1024x1024 image is high; sections 3 onward are lazy | Pass |
| 1b | Five-section page | Sections 1 and 2 give 5 eager images; the first 1920x1080 is the only high one; a 305x102 logo is under 50,000 px² | Pass |
| 1c | Against core | Core makes images 1 to 3 eager and the same image high; the rule also makes images 4 and 5 eager (section 2), by design | Pass |
| 2 | Template pages (`/shop/`, `/blog/`, a product), armed as main now arms | `armed=True` but `fold=False` for every image, including the product's | **Fail** |
| 3 | REST block-renderer | `armed=False`, `REST_REQUEST=true`; lazy, never high. `wp_is_json_request()` was false, so it is not a usable signal | Pass |
| 4 | `do_blocks()` fragment at `wp_head` and `wp_footer` | `fold=False`; lazy, never high | Pass |
| 5 | Two identical blocks sharing a scope hash | A per-request claim gives the first eager and high, the second eager only | Pass |

## Cause of case 2

Checked in code by the main thread:
- `includes/motion/class-sgs-motion-fold.php::is_section_name` excludes only `core/template-part`.
- The theme renders the header and footer blocks itself, so `sgs/site-header` reaches the renderer as a top-level block.
- `arm_from_template` arms at `template_include`, before anything renders, so `class-sgs-motion-renderer.php::opens_at` counts the header as section 0. The real `main` then opens past the tree's sections, and reads `fold=false`.
- Normal pages escape this because `arm_first_section` arms at `the_content`, after the header.
- Probe rows (runs shop4, blog1, prod1): `sgs/site-header sections_opened=1`, then `sgs/container tag=main sections_opened=2 frame_fold=False`.
- Reported to the Eye Care session, whose round 13 owns this code.

## Other findings

- **Stand-in tree:** when a post has no parseable blocks, its stand-in tree of blank sections lets the footer, drawer and mega panel read `fold=true` (post 2100).
- **Third-party fragment caches:** a cached string replays its stored loading attributes, and nothing at replay identifies it. SGS's own drawer and mega-panel caches are hidden surfaces (rule 1).
- **Current `sgs/media` markup:** it prints `loading="eager" fetchpriority="auto"` in REST renders and below the fold today. WP-3 replaces this.

## Spec changes

1. **§7.7: name the signals.** `REST_REQUEST`; the renderer's armed state (a public `Sgs_Motion_Renderer::is_armed()`); and `Sgs_Motion_Renderer::in_above_fold()`. Unarmed, REST, or a position past the tree means lazy. Third-party fragment caches are lazy-only.
2. **§7.7 rule 3: match by identity.** Sections are matched to the armed tree by identity, not by opening order, so blocks the theme renders outside the tree never consume a section. Fixed in the motion renderer before WP-3.
3. **AC-10: assert template pages.** Shop and product pages are asserted on the template-armed path.
