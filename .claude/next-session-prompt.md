recommended_model: sonnet
session_tag: small-giants-wp-2026-05-05-mamas-homepage-clone

Invoke `/autopilot` before doing anything else.

You are a senior SGS WordPress framework developer cloning the Mama's Munches mockup pixel-faithfully into the live sandybrown site (post 8). The button architecture, info-box upgrade, feature-grid, and ingredients pattern all shipped 2026-05-04 — they're ready to use. This session is content authoring + visual fidelity work, not framework work.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-05-mamas-homepage-clone"`

Read `.claude/handoff.md` and `CLAUDE.md` for full context. Then read the mockup at `sites/mamas-munches/mockups/homepage/index.html` — that's the visual target. Reference the design-extract data in `sites/mamas-munches/research/` if useful.

## Where You Are

The previous session shipped:
- sgs/button (87 attrs) + sgs/multi-button container
- Button presets at Settings → SGS Button Presets (with Mama's coral pink + charcoal-text outline values already set in mamas-munches.json)
- sgs/info-box rebuilt with 5 toggleable reorderable elements (icon/emoji/image · title · subtitle · text · button)
- sgs/feature-grid container (auto-flex default + fixed-columns mode)
- ingredients-section block pattern (4-column emoji-led feature-grid + disclaimer notice-banner)
- Hero/cta-section/product-card refactored to InnerBlocks composition with deprecations
- WhatsApp CTA fully functional (render.php was missing, now created); inserter icon now official WhatsApp logo
- Icon-block deprecated; back-to-top hidden from inserter

What didn't quite land that this session needs to fix:
- Hero CTAs render with placeholder labels ("Primary Action"/"Secondary Action") — original CTA text wasn't preserved through deprecation. Re-author manually.
- Product-card images point to `/wp-content/uploads/cookies-stacked.jpeg` which doesn't exist. Re-pick images from media library (IDs 21-25 are uploaded).
- Existing ingredient info-boxes still have `icon: 'star'` instead of emojis. Replace existing ingredients block with the new ingredients pattern from the inserter, OR edit each info-box's media field to mediaType:emoji.

## Sandybrown live URL

https://sandybrown-nightingale-600381.hostingersite.com/

WP admin: /wp-admin
Login: Claude / MigrationSweep2026! (TEMPORARY — reset on first session opening)
Or use REST app password: `WP_USER_MAMAS` / `WP_APP_PWD_MAMAS` from `~/.openclaw/.secrets/wp-app-passwords.env`

## Pages to clone

- **Post 8: Mamas Munches Homepage** — primary target. Already has the migrated structure but needs content fidelity work.
- **Post 5: Mamas Munches Homepage Test** — secondary target, may be retired after post 8 lands.

## Tasks (in order)

### Task 1 — Reset Claude password (~1 min)

```bash
ssh hd 'cd ~/domains/sandybrown-nightingale-600381.hostingersite.com/public_html && wp user update Claude --user_pass="<new password>"'
```

Set whatever password you want — current "MigrationSweep2026!" was temporary.

### Task 2 — Open the mockup + sandybrown side-by-side (~5 min)

Use Playwright to open both:
- Tab 1: https://sandybrown-nightingale-600381.hostingersite.com/?page_id=8
- Tab 2: file:///C:/Users/Bean/Projects/small-giants-wp/sites/mamas-munches/mockups/homepage/index.html

Take screenshots at 1440 and 375 of both. Diff section by section. Record gaps in a checklist.

### Task 3 — Hero re-authoring (~30 min)

Open page 8 in the editor. The hero block already has the InnerBlocks slot with two buttons (currently labelled "Primary Action"/"Secondary Action"). Replace those with the mockup's actual CTA labels (look at `.btn-primary` and `.btn-secondary` text in the mockup HTML).

Set the headline + sub-headline to match. Use the new responsive typography attrs:
- `headlineFontSizeDesktop` — match the mockup's hero h1 size
- `headlineFontSizeMobile` — match the mockup's mobile h1 size
- `subHeadlineMaxWidth` — match the mockup's sub-headline column width
- `splitImageMobileHeight` — if hero is split layout

### Task 4 — Product cards re-authoring (~30 min)

Open page 8. For each product-card (Zookies + Trial Pack):
1. Re-pick the image from the media library (IDs 21-25 — pick the matching mockup image)
2. Update the InnerBlocks button label to match the mockup's CTA text (likely "Shop Now" or similar)
3. Verify variantStyle is set correctly (standard for Zookies, trial for Trial Pack)

### Task 5 — Ingredients section (~15 min)

The mockup ingredients section has 4 emoji items (🌾 oats, 🍯 honey, 🥥 coconut, 🌰 seeds — or whatever the actual mockup uses). The new ingredients pattern is in the inserter as "Ingredients Section". Either:
- Delete the existing ingredients group and insert the pattern, then customise text per item
- OR edit each existing info-box: change `mediaType` to `emoji` and set `mediaEmoji` to the right character

### Task 6 — Brand story / quote / footer fidelity (~30 min)

Walk the rest of the page section by section. Use sgs/info-box, sgs/cta-section, sgs/testimonial, sgs/notice-banner, sgs/feature-grid as needed. Reference the mockup directly — don't invent layouts.

### Task 7 — Visual diff at 1440 and 375 (~20 min)

After all sections are re-authored:
1. Save page 8
2. View frontend at 1440 → compare to mockup → list gaps
3. Resize to 375 → compare → list gaps
4. Run `design-reviewer` agent if gaps remain

### Task 8 — Commit + handoff (~10 min)

If you made any framework code changes (shouldn't — this is content work), commit them. Otherwise just verify on sandybrown, run `/handoff`, write the next-session prompt.

## Skills to Invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | All SGS work |
| `/wp-block-themes` | If theme.json or style variation tweaks needed |
| `/wp-block-development` | If block edits needed (likely none) |
| `/visual-qa` | After Task 7 — full pipeline |
| `/handoff` | End of session |

## MCP Servers & Tools

| Tool | What for |
|------|---------|
| `mcp__plugin_playwright_playwright__*` | Open editor on page 8, drive content changes via `wp.data.dispatch`, capture screenshots |
| `mcp__plugin_chrome-devtools-mcp__*` | If Playwright struggles — use Chrome DevTools for layout debugging |
| `mcp__wp-blockmarkup` | Validate block markup if hand-crafting any post_content |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | If structural framework changes surface (shouldn't this session) |
| `design-reviewer` | After Task 7 — automated mockup-to-live diff |

## Guardrails

- Don't modify the framework code. This session is content authoring. If a real framework gap surfaces (e.g. an info-box element option that's missing), park it and continue.
- Don't modify post_content directly via wp-cli or PHP — use Playwright + `wp.data.dispatch('core/block-editor')`. The PreToolUse hook blocks `wp eval` for safety.
- All sgs/button instances use `inheritStyle: 'primary'` or `'secondary'` — DO NOT switch to `inheritStyle: 'custom'` and start setting per-button colours. The Mama's preset values already match the mockup.
- Use the existing media library IDs 21-25 for hero/product-card images — don't re-upload.
- Branch discipline: this is client content (Mama's), so work on a feature branch like `feat/mamas-homepage-clone`, not main. The framework changes from 2026-05-04 are already on main.

## Success criteria

This session is done when:

1. Sandybrown post 8 visually matches the mockup at 1440 and 375 (within reasonable fidelity — typography, colours, spacing, content)
2. All hero CTAs, product-card CTAs use the correct labels from the mockup
3. Product-card images load (no broken alt text)
4. Ingredients section uses emojis (not star icons)
5. design-reviewer agent reports no critical visual gaps
6. handoff.md updated for the next session (likely the recogniser-v2 generalisation per parking P-9, or migrating page 8 patterns to other Mama's pages)
