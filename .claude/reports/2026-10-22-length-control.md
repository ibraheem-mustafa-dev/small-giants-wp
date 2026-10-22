# Length control rebuild: live check on the canary

Date: 2026-10-22. Site: the sandybrown canary, scratch page 5677 (not one of the motion fixtures). Run by `plugins/sgs-blocks/scripts/qa/probe-length-control.mjs` against the deployed build, with real inspector input in a headed Chrome. Screenshots and `results.json` are in `2026-10-22-length-control/`.

## Result

All 12 checks pass: for each of the 6 controls, the editor canvas followed every step, and the published page matched at 375, 768 and 1440 wide, including a Tablet and a Mobile value where the control is per-device. Your eye is still the closing check (FP-13): the cropped pairs below are the ones to look at.

| Control | Scale | Block | Canvas followed (steps that changed / steps read) | Live 1440 | Live 768 (Tablet) | Live 375 (Mobile) |
|---|---|---|---|---|---|---|
| Icon size (per device) | font-size | sgs/icon | 9 / 10 | 57.6px | 18px | 12px |
| Social icons size (per device) | font-size | sgs/social-icons | 9 / 10 | 57.6px | 18px | 12px |
| Gap between icons (per device, with presets) | spacing | sgs/social-icons | 6 / 8 | 105.6px | 18px | 12px |
| Border radius | spacing | sgs/label | 5 / 6 | 64% | 64% | 64% |
| Gap (per device) | spacing | sgs/container | 8 / 9 | 921.6px | 18px | 12px |
| Outer max-width (per device) | spacing | sgs/container | 8 / 9 | 921.6px | 18px | 12px |

## What each step did on the canvas

### Icon size (per device)

| Step | Canvas computed value | Changed |
|---|---|---|
| Desktop: preset Large | 20px | yes |
| Desktop: custom 40px | 40px | yes |
| Desktop: custom 2rem | 32px | yes |
| Desktop: custom 3em | 48px | yes |
| Desktop: custom 4vw | 40px | yes |
| Desktop: custom 5vh | 36.95px | yes |
| Desktop: slider drag | 47.3px | yes |
| Tablet: Tablet 18px | 18px | yes |
| Mobile: Mobile 12px | 12px | yes |

Control after the desktop edit: ![icon-size](2026-10-22-length-control/icon-size-2-after-desktop.png)

### Social icons size (per device)

| Step | Canvas computed value | Changed |
|---|---|---|
| Desktop: preset Large | 20px | yes |
| Desktop: custom 40px | 40px | yes |
| Desktop: custom 2rem | 32px | yes |
| Desktop: custom 3em | 48px | yes |
| Desktop: custom 4vw | 40px | yes |
| Desktop: custom 5vh | 36.95px | yes |
| Desktop: slider drag | 47.3px | yes |
| Tablet: Tablet 18px | 18px | yes |
| Mobile: Mobile 12px | 12px | yes |

Control after the desktop edit: ![social-icons-size](2026-10-22-length-control/social-icons-size-2-after-desktop.png)

### Gap between icons (per device, with presets)

| Step | Canvas computed value | Changed |
|---|---|---|
| Desktop: preset M | 24px | yes |
| Desktop: custom 24px | 24px | no (same value as before) |
| Desktop: custom 2rem | 32px | yes |
| Desktop: custom 3em | 48px | yes |
| Desktop: slider drag | 105.6px | yes |
| Tablet: Tablet 18px | 18px | yes |
| Mobile: Mobile 12px | 12px | yes |

Control after the desktop edit: ![social-icons-gap](2026-10-22-length-control/social-icons-gap-2-after-desktop.png)

### Border radius

| Step | Canvas computed value | Changed |
|---|---|---|
| Desktop: custom 24px | 24px | yes |
| Desktop: custom 2rem | 32px | yes |
| Desktop: custom 3em | 36px | yes |
| Desktop: custom 30% | 30% | yes |
| Desktop: slider drag | 64% | yes |

Control after the desktop edit: ![label-radius](2026-10-22-length-control/label-radius-2-after-desktop.png)

### Gap (per device)

| Step | Canvas computed value | Changed |
|---|---|---|
| Desktop: custom 24px | 24px | yes |
| Desktop: custom 2rem | 32px | yes |
| Desktop: custom 3em | 48px | yes |
| Desktop: custom 30% | 30% | yes |
| Desktop: custom 4vw | 40px | yes |
| Desktop: slider drag | 640px | yes |
| Tablet: Tablet 18px | 18px | yes |
| Mobile: Mobile 12px | 12px | yes |

Control after the desktop edit: ![container-gap](2026-10-22-length-control/container-gap-2-after-desktop.png)

### Outer max-width (per device)

| Step | Canvas computed value | Changed |
|---|---|---|
| Desktop: custom 24px | 24px | yes |
| Desktop: custom 2rem | 32px | yes |
| Desktop: custom 3em | 48px | yes |
| Desktop: custom 30% | 30% | yes |
| Desktop: custom 4vw | 40px | yes |
| Desktop: slider drag | 640px | yes |
| Tablet: Tablet 18px | 18px | yes |
| Mobile: Mobile 12px | 12px | yes |

Control after the desktop edit: ![container-width](2026-10-22-length-control/container-width-2-after-desktop.png)

## The published page

![375](2026-10-22-length-control/live-375.png) ![768](2026-10-22-length-control/live-768.png) ![1440](2026-10-22-length-control/live-1440.png)

## What the live check found and fixed along the way

1. **Nameless controls.** Container "Gap" and "Outer max-width" (and every other mount inside a per-device wrapper) passed no label, so the value box, preset select and slider had no accessible name. `ResponsiveOverride` now provides its label through `ControlLabelContext` and the control uses it when it has none of its own (test in `tests/js/sgs-length-control.test.js`).
2. **A cramped preset row.** At the 280px inspector width the preset select collapsed to "C…". The select now keeps 76px, the value box is 88px and the slider keeps a 56px floor. The select still shows "Cus…" for the Custom state; the preset names (XXS to XXXL, none) read in full, and the value box beside it shows the number.
3. **Panels collapse when the inspector tab changes**, which only the probe needed to handle.
4. The host's bot wall (a reCAPTCHA page from the edge) blocked browsers for about 90 minutes after the first runs, so the live check waited for it to lift; it is not a product fault.

## A stored two-value gap

Seven blocks used to accept a free-typed gap (button's icon gap, container, local-time, mega-aside, multi-button and the site header and footer rows), and one real value of that kind exists on the canary: the homepage's trust-bar gap is `16px 12px` (row gap then column gap, left by a clone). The length control is a single-length row, so it now keeps any stored CSS value it cannot edit as one length and shows it as "Set as CSS: 16px 12px. Pick a preset or type a single length to replace it.", with the value box showing it as a placeholder and the slider disabled. Nothing is rewritten and the page output does not change. Read-only check on page 2742 (`scripts/qa/probe-css-only-value.mjs`, three checks pass): ![css-only](2026-10-22-length-control/css-only-value-trust-bar-gap.png)

## Notes on units and scales

- The font-size controls are core's real FontSizePicker (gear, preset dropdown, unit box, slider; 0-100 px, 0-10 em, rem, vw, vh). The spacing controls are the new row (preset select, value box, slider; 0-300 px, 0-100 %, vw, 0-10 em, rem), with only the units a block offers (the label radius offers px, rem, em and %).
- vw and vh sizes resolve against the viewport, so the editor canvas (a narrower iframe) and the page show different pixel values for the same stored value, for example 4vw is 41.6px in the canvas and 57.6px at 1440 wide. The stored value is the same in both.

## Not covered by this run

The probe exercises one block per scale and role, as the brief asked, not every one of the 210 mounts. The detector (`survey-length-control-scale.py --check`) is what guards the rest: every mount declares its scale from the framework database, and all 210 resolve.
