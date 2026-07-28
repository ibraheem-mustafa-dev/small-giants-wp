# Next session — Brand-strip inspector completeness + framework inspector standard

**Branch:** `feat/brand-strip-inspector-rebuild` (pushed to origin). Canary: sandybrown.
**Governing standard:** `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — READ IN FULL first.
**Verify page:** sandybrown page 1513 ("brand-strip verify TEMP") has the block + 5 logos.
**Browser:** Playwright MCP was locked by a co-active session; the **chrome-devtools MCP** worked
(separate instance) — use it. Login via `.claude/secrets/sandybrown.env`.

## Invoke /autopilot first.

## Shipped this session (all committed + pushed, verified live)
1. Sidebar rebuilt — native Settings/Styles tabs, element-grouped panels, one panel-level Normal/Hover
   `StateToggleControl`, `hideExtensions` opt-out removed the duplicate hover + Block Link/Click
   Effects/Parallax/Spacing; marquee panel renamed.
2. **Responsive device switcher FIXED** — `ResponsiveControl` now reads+drives WP's native device
   preview (`core/editor` getDeviceType/setDeviceType); switching a control resizes the real canvas;
   all responsive controls lockstep; columns migrated. Shared component → all blocks. Verified live.
3. **Editor preview FIXED via ServerSideRender** — the block hand-built its preview and it reflected
   0/5 setting changes; now renders through real render.php → 5/5 reflect. This is the framework-wide
   pattern for the whole "preview doesn't update / base look inaccurate" bug class. Verified live.
4. **Spec 35** written — full researched standard (6 streams): control completeness, feature parity,
   prefer-native list, a11y, anti-patterns, SGS gap register, upgrade roadmap.

## Remaining queue (priority order — all Bean-approved / Bean-requested)
1. **Custom 3-tab inspector (Settings / Styles / Advanced)** — Bean wants Advanced as its own column
   (WP native only gives 2 tabs + Advanced-as-a-section). Build a shared tabbed-inspector component
   (Kadence-style) used by all blocks. Non-native → maintain carefully; note WP-inspector-change risk.
2. **Cross-file alignment linter** (Bean's ask) — a script that deterministically checks a block's
   `block.json` ↔ `edit.js` ↔ `render.php` ↔ `style.css` stay in sync: every declared attr has a
   control + is consumed in render + (if a CSS var) is referenced in style.css; classes emitted in
   edit.js match render.php; no dead/duplicate. Extends `scripts/check-dead-controls.js`. Wire to prebuild.
3. **Box value unification** — `BoxControl` link/unlink already gives "1 value = all sides"; add
   `splitOnAxis` (top+bottom / left+right) on the ResponsiveBoxControl usages; apply to single box props.
4. **SSR rollout** — apply the ServerSideRender preview pattern to other blocks that hand-build previews.
5. **Spec 35 waves** — alpha/transparent colour (`DesignTokenPicker` `enableAlpha`+`clearable`,
   framework-wide; watch `safecss` functional-colour strip → normalise to hex); real shadow builder
   (replace None/Small/Medium); **LinkControl** with internal-page as-you-type suggestions (replace raw
   URL fields); bulk/gallery logo upload (`multiple="add"`+`gallery`, array attr already exists);
   focal point + image-size + aspect-ratio + object-fit (extend `imageControls`); per-device settings
   as `{desktop,tablet,mobile}` objects; preset + fine-tune slider combos; dead/duplicate control audit;
   correct Settings/Styles/Advanced distribution; `templateLock:"contentOnly"` client-safe patterns.

## Gotchas (this session's hard-won)
- **Shared worktree** — co-active Track A/B/C sessions edit LEDGER.md, decisions.md, header-footer docs,
  lucide-icons.php. COMMIT ONLY YOUR FILES; put `git branch --show-current` in the SAME command as the
  commit; do NOT run `/handoff` (it rewrites LEDGER and would clobber another track).
- **SSR** is the preview-accuracy fix — don't re-hand-build previews.
- **Device switcher** = WP native `core/editor` deviceType; don't reintroduce local-state switchers.
- **`ownHover`/`hideExtensions`** (`src/blocks/extensions/hide-extensions.js`) is the universal panel
  opt-out — reuse it, don't hardcode per-block.
- **No version bumps / no deprecations** (D270/D293). No-inline contract still binds render.php.
- **Spec-id collision** — 34 was taken (adaptive-nav); this spec is 35. Check before numbering.
