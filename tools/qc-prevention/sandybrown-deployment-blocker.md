# Sandybrown deployment blocker

**Status:** Active blocker
**Captured:** 2026-05-04 (session 2)
**Affects:** Fix 1 (Mama's variation buttonPresets text colours)

## Problem

The `mamas-munches.json` style variation file is correct locally:
```json
"buttonPresets": {
    "primary":   { "text": "var(--wp--preset--color--text)", ... },
    "secondary": { "text": "var(--wp--preset--color--text)", ... }
}
```

But the deployed sandybrown site at `sandybrown-nightingale-600381.hostingersite.com`
serves CSS with `--wp--custom--button-presets--primary--text: #ffffff` (the OLD
value from when the variation was first loaded into WP's theme.json cache).

## Root cause

Two layers of stale cache:
1. **WP theme.json database cache** — WordPress merges theme.json + variation
   files at first load and caches the result. Editing the variation file
   directly (via SCP, FTP, or WP theme editor) writes the file but doesn't
   invalidate the DB cache.
2. **LiteSpeed CSS optimiser** (likely active on Hostinger) — caches the
   compiled CSS file separately. Even if WP regenerates the inline styles,
   the served `litespeed/css/*.css` file may serve the old version until the
   cache is purged.

## Why I couldn't fix it this session

- **No SSH credentials for sandybrown.** The repo has SSH for
  `palestine-lives.org` (u945238940@141.136.39.73) but no equivalent for
  the sandybrown Hostinger account.
- **WP REST API global-styles endpoint returns 404** — this WP version
  doesn't support the modern global-styles routes that would let me trigger
  a regeneration via API.
- **WP admin theme editor** — file save succeeded ("File edited successfully")
  but the live custom property values didn't change. WP doesn't regenerate
  theme.json CSS on file save (only on theme activation or customizer save).
- **Hostinger hPanel** — would let me purge LiteSpeed cache and access
  File Manager, but no Hostinger credentials.

## Resolution paths (next session)

In rough preference order:

### 1. Get sandybrown SSH credentials (best)
Ask Bean for:
- Hostinger hPanel login for the sandybrown account
- Or the SSH credentials directly (host, port, user, key)

Then deploy via the standard tar method (see framework CLAUDE.md) and run:
```bash
ssh sandybrown "wp theme activate sgs-theme; wp litespeed-purge all"
ssh sandybrown "rm -rf wp-content/litespeed/css/*.css"
```
The `theme activate` triggers theme.json CSS regeneration even though the
theme is already active.

### 2. WP REST API workaround via Site Editor
Navigate to WP admin → Appearance → Editor (Site Editor / FSE). Make a
trivial change (e.g. activate then deactivate a different style variation)
and save. This forces WP to regenerate global styles CSS for the active
variation.

### 3. Move the fix to base theme.json
Change `theme/sgs-theme/theme.json` `settings.custom.buttonPresets.primary.text`
from `"#ffffff"` to `"var(--wp--preset--color--text-inverse)"`. This is a
framework-level change. It would mean:
- For SGS default palette: text-inverse is `#C0D5D6` — not pure white but
  close enough on teal background
- For Mama's: text-inverse can be set in the variation to charcoal
- For all clients: the colour adapts per palette automatically

This is the most architecturally correct fix because hardcoding `#ffffff`
in the framework default violates the "palette tokens, not bare hex" rule
(see `feedback_palette_defaults_for_blocks.md`).

### 4. Override in the variation's `styles.css` field
Add to the `css` field in `mamas-munches.json`:
```css
:root { --wp--custom--button-presets--primary--text: var(--wp--preset--color--text); --wp--custom--button-presets--secondary--text: var(--wp--preset--color--text); }
```
Then the variation's CSS (loaded after the merged theme.json CSS) overrides
the cached values. This was attempted partially this session but the deploy
mechanism is the bottleneck, not the fix itself.

## Workaround in CSS (last resort)

If deployment cannot be sorted: edit the local mamas-munches.json `css`
field to bypass the custom property entirely:

Replace:
```css
.sgs-button.is-style-primary { color: var(--wp--custom--button-presets--primary--text) !important; }
```
With:
```css
.sgs-button.is-style-primary { color: var(--wp--preset--color--text) !important; }
```

(This was attempted in this session — change saved via theme editor but live
page still served stale CSS due to LiteSpeed cache, blocking verification.)
