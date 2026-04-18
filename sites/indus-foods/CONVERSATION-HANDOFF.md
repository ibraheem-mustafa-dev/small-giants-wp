# Session Handoff — 12 February 2026 (Session 2)

## Suggested Prompt for Next Session

```
Read `CONVERSATION-HANDOFF.md` in the indus-foods repo, then switch working directory to `c:\Users\Bean\Projects\small-giants-wp\`.

Read the CLAUDE.md in that repo and the full spec `specs/01-SGS-THEME.md`.

Build Phase 1a: SGS Theme — the minimum viable block theme. Follow the build order in `specs/06-BUILD-ORDER.md` section 1a exactly:

1. style.css + theme.json (v3) — design tokens, typography, spacing, colour palette
2. functions.php — theme setup, font preloading, script/style enqueuing
3. templates/index.html + templates/page.html
4. parts/header.html — logo + nav + CTA
5. parts/footer.html — columns + copyright
6. assets/fonts/ — self-hosted DM Serif Display + DM Sans (WOFF2)
7. assets/css/core-blocks.css — style overrides for core WP blocks
8. assets/css/utilities.css — .sr-only, .container, .text-centre, etc.

Use context7 to pull the latest WordPress 6.9 block theme docs before writing theme.json and templates. The Indus Foods HTML mockup at `c:\Users\Bean\Projects\indus-foods\Indus-Foods-Food-Service-V3-With-Images.html` is the design reference for colours, fonts, header/footer layout, and spacing.

Deploy to the dev site (palestine-lives.org) via SCP when complete. Test that the theme activates and a basic page renders correctly.

Available tools to use:
- **wp-developer agent** — delegate WordPress PHP/theme development tasks
- **test-and-explain agent** — run after deploying to verify everything works
- **context7 MCP** — pull latest WordPress 6.9 block theme and theme.json docs
- **Playwright MCP** — visual check of the deployed theme on the dev site
- **/brainstorming** — explore approach before building
- **/writing-plans** — plan multi-step implementation
- **/working-with-claude-code** — reference Claude Code features and patterns
- **/verification-before-completion** — verify the theme works before claiming done
```

## Completed This Session

1. Read all 7 spec documents (00-OVERVIEW through 06-BUILD-ORDER) and both Indus Foods HTML mockups (V3 Food Service, V2 Trade Application)
2. Verified all 10 technical decisions against WordPress 6.9 block theme and Gutenberg block API docs via context7
3. Cross-referenced every mockup section against the block spec — identified 4 critical issues and 6 medium gaps
4. Amended `02-SGS-BLOCKS.md` with 7 changes: renamed image-gallery to card-grid with overlay/card variants, added notice-banner block, expanded hero badges to {number, suffix, label, position, style}, changed trust-bar items to {value, suffix, label, animated}, added info-box hover effects, wrote full certification-bar spec, added --experimental-modules build flag note
5. Amended `04-SGS-FORMS.md` — fixed "JK Foods" reference to "Indus Foods V2 mockup"
6. Amended `06-BUILD-ORDER.md` — pulled 13 core form blocks into Phase 1b, added notice-banner to block list, updated first milestone, pushed booking system to Phases 5-6 (last), moved client notes to Phase 3
7. Amended `01-SGS-THEME.md` — added theme.json v3 verification note
8. Verified local dev environment: Node.js v22.18.0, npm 11.6.4
9. Verified WordPress 6.9.1 on dev site (palestine-lives.org) via SSH
10. Created the `small-giants-wp/` monorepo at `c:\Users\Bean\Projects\small-giants-wp\` with full folder structure, CLAUDE.md, .gitignore, and all spec files
11. Made initial git commit (807f114) with all specs and config
12. Wrote comprehensive spec review plan at `C:\Users\Bean\.claude\plans\lexical-munching-flamingo.md`

## Current State

- **Monorepo created and committed.** `c:\Users\Bean\Projects\small-giants-wp\` with `theme/sgs-theme/`, `plugins/sgs-blocks/`, `plugins/sgs-booking/`, `plugins/sgs-client-notes/`, `specs/`, `CLAUDE.md`, `.gitignore`. One commit on `main`.
- **Specs reviewed, amended, and committed.** All critical issues and medium gaps from the review have been fixed in the spec files. Specs are now the authoritative build reference.
- **No code written yet.** Theme, blocks, and plugin directories exist but are empty. Ready to start Phase 1a.
- **SSH access still working.** `ssh hd` connects. WP-CLI available on dev site.
- **Dev site still clean.** palestine-lives.org — WordPress 6.9.1, Twenty Twenty-Five theme, LiteSpeed Cache only.
- **Indus Foods test site untouched.** lightsalmon-tarsier-683012.hostingersite.com — still Astra + Spectra + SureForms.
- **No GitHub remote.** Monorepo is local only — not pushed to GitHub yet.

## Known Issues / Blockers

1. **No GitHub remote** — monorepo is local git only. Decide if/when to push to GitHub (private repo under Bean's account or SGS org).
2. **WordPress agent skills not installed** — 5 recommended: wp-plugin-development, wp-wpcli-and-ops, wp-block-themes, wp-block-development, wp-performance. These are Claude Code skills, not WP plugins.
3. **`--experimental-modules` flag** — needed for viewScriptModule in @wordpress/scripts. May be stabilised in the version bundled with WP 6.9 — verify when setting up the build toolchain.
4. **theme.json v3 not yet tested on dev site** — WP 6.9.1 should support it (v3 introduced in WP 6.6) but needs a live test with a minimal theme.json upload.
5. **Indus Foods client assets still needed** — real photography, logo files, certification logos, testimonials. Content blockers for launch, not code blockers.
6. **Booking system features still being refined** — Bean is still working on the feature set, so it's been pushed to Phases 5-6 (last in build order).

## Next Priorities (in order)

1. **Build Phase 1a: SGS Theme** — theme.json, templates, header/footer, fonts, core block styles. Deploy to palestine-lives.org and verify it activates cleanly.
2. **Build Phase 1b: SGS Blocks infrastructure** — @wordpress/scripts setup, block categories, shared components (ResponsiveControl, DesignTokenPicker, AnimationControl), then container block as the foundation.
3. **Build Phase 1b: Core blocks** — hero, info-box, counter, trust-bar, icon-list, card-grid, cta-section, process-steps, testimonial, testimonial-slider, heritage-strip, brand-strip, certification-bar, notice-banner, whatsapp-cta.
4. **Build Phase 1b: Core form blocks** — form wrapper, form-step, text/email/phone/textarea/select/radio/checkbox, tiles, file, consent, form-review + processing engine.
5. **Phase 1c: Deploy Indus Foods pages** — build 4 service pages + trade application + homepage using the blocks.

## Files Modified

All new or modified files this session:

| File | Path | Action |
|---|---|---|
| Blocks spec | `c:\Users\Bean\Projects\indus-foods\specs\02-SGS-BLOCKS.md` | 7 amendments |
| Forms spec | `c:\Users\Bean\Projects\indus-foods\specs\04-SGS-FORMS.md` | 1 amendment |
| Build order spec | `c:\Users\Bean\Projects\indus-foods\specs\06-BUILD-ORDER.md` | 3 amendments + booking reorder |
| Theme spec | `c:\Users\Bean\Projects\indus-foods\specs\01-SGS-THEME.md` | 1 amendment |
| Monorepo .gitignore | `c:\Users\Bean\Projects\small-giants-wp\.gitignore` | New |
| Monorepo CLAUDE.md | `c:\Users\Bean\Projects\small-giants-wp\CLAUDE.md` | New |
| Monorepo specs (all 7) | `c:\Users\Bean\Projects\small-giants-wp\specs\*.md` | Copied from indus-foods |
| Review plan | `C:\Users\Bean\.claude\plans\lexical-munching-flamingo.md` | New |
| This handoff | `c:\Users\Bean\Projects\indus-foods\CONVERSATION-HANDOFF.md` | Replaced |

## SSH Quick Reference

```bash
# Connect to Hostinger
ssh hd

# WP-CLI on dev site
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp [command]"

# Deploy theme to dev site
scp -P 65002 -i ~/.ssh/id_ed25519 -r ./theme/sgs-theme/ u945238940@141.136.39.73:~/domains/palestine-lives.org/public_html/wp-content/themes/sgs-theme/

# Deploy blocks plugin to dev site
scp -P 65002 -i ~/.ssh/id_ed25519 -r ./plugins/sgs-blocks/ u945238940@141.136.39.73:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/
```

## Notes for Next Session

- **Start building, not reviewing.** Specs are clean. The review plan at `lexical-munching-flamingo.md` documents every decision. No more spec work needed unless something breaks during build.
- **Work from the monorepo.** All building should happen in `c:\Users\Bean\Projects\small-giants-wp\`, not `indus-foods/`. The indus-foods repo contains the HTML mockups (design reference) and research doc. The monorepo contains the framework code.
- **Reference the HTML mockups** in the indus-foods repo for exact CSS values, layout structures, and responsive breakpoints. The V3 Food Service page is the template for all service pages.
- **Build order matters.** Phase 1a (theme) must be complete before any blocks work. The theme provides the design tokens that all blocks read from.
- **Fonts need downloading.** DM Serif Display and DM Sans WOFF2 files need to be sourced (e.g., from google-webfonts-helper) and placed in `theme/sgs-theme/assets/fonts/`.
- **The framework is called "SGS" (Small Giants Studio)** — all prefixes `sgs-`, namespace `SGS\*`, text domain `sgs-*`.
- **Booking system is deliberately last** (Phases 5-6) — Bean is still working on the feature set.
- **Bean's core motivation:** autonomous workflow where Claude builds client sites without human facilitation. The framework is the infrastructure that enables this.
- **Use context7** to pull latest WordPress block theme docs before writing theme.json — the spec's theme.json example is a guide but check against current schema.
