# Visual diff — mega-panel — 2026-07-27

Scope: media-cards + brands variants, dark value set, card hover-lift, stagger/spotlight wiring.

## What WAS verified (live, sandybrown canary, 2026-07-27, post-deploy)

- Deploy integrity: md5 local == server on all 5 sampled artefacts (mega-panel/view.js,
  mega-aside/view.js, nav-menu/view.js, mega-brands-1.php, theme style.css).
- Server theme version 1.5.47 confirmed live; both NEW starter patterns
  (`sgs/mega-brands-1`, `sgs/mega-media-cards-1`) confirmed REGISTERED via the
  block-patterns REST endpoint (5 mega patterns total, was 3). Without the version
  bump WP would have served its cached 3-pattern list and both new variants would
  have been uninsertable.
- Page /t1-nav/ HTTP 200, 88KB, ZERO PHP fatals/warnings/deprecations in output.
- `prefers-reduced-motion` rules present in the SERVED stylesheet.
- Drawer markup still present (7 hits) — no structural regression from the
  mega-disclosure changes (which deliberately never touch store('sgs/nav')).
- Live mega trigger confirms the disclosure contract:
  `<button class="sgs-nav-menu__mega-trigger" aria-expanded="false"
   aria-controls="sgs-nav-menu-e8cbbff6-mega-1745"
   data-wp-bind--aria-expanded="context.isOpen">`
  — proving the Interactivity binding is on the TRIGGER, not the panel, which is
  exactly what the corrected stagger observer targets.
- Opt-in effects correctly absent when off: `sgs-nav-menu__indicator` appears ONLY
  in CSS, never as markup, with `data-sgs-nav-indicator` absent (indicatorStyle
  defaults to 'none').

## What was NOT verified — stated plainly, NOT waved through

- **NO first-paint capture was performed.** `first_paint_capture_passed` is therefore
  reported FALSE below. It is not set true.
- Stagger/spotlight/magnet/indicator ANIMATING was not observed. The canary's mega
  panel (CPT post 1745) is EMPTY, so there is no panel content to reveal. Populating
  it is the separate Gate-3 composed-nav task.
- axe on an OPEN mega panel: not run (same dependency).
- Dark colour scheme rendering: not visually observed (no page sets colourScheme).
- media-cards / brands variants rendering: patterns register, but no page inserts one yet.
- Bean's visual sign-off (R-31-13): NOT obtained.

## Verdict

verdict: INCOMPLETE
first_paint_capture_passed: false

This report deliberately does NOT claim PASS. The code is deployed and
server-side-verified; the motion behaviour is unproven until a populated panel
exists on a real page. Fabricating a PASS here would defeat the only check standing
between this work and a client site.
