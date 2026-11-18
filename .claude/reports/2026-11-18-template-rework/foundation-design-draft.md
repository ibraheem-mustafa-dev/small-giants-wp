# DRAFT for review: foundation-first cloning and a block map in the handoff (2026-11-18)

Status: a draft put to a review council at Bean's request. Not approved; nothing is built. Bean's comment on its first telling: "there are some clear gaps and basic reading you should've done before this that you didn't." It was first proposed from the morning's evidence (`inventory.md`, `by-missing-setting.md`, `clone-audit.md`, `checks.md` beside this file) without a full reading of the handoff folder, Spec 48 or Spec 48A. The section "What the handoff already carries" was added after a first look and is not a full reading. The council's job is to say what this draft ignores, duplicates or gets wrong against those sources, and what the better design is.

## The goal

Two new sites are designed in Claude Design and cloned before 2026-11-28: Small Giants Studio's own site (no shop) and a redesign of muslimsinconstruction.uk (a shop). Bean wants cloning to need as little work as possible per page ("child's play"), with no rounds of hand-tuning like Mama's Munches', and no change to a signed-off site (Indus, Eye Care) that it did not opt into.

## Bean's rulings and corrections that bind the design

- Each site starts from a blank slate: the theme's files stay, the route builds each site's own copies (2026-11-18).
- A site is cloned one surface at a time, after a shared foundation, each surface closed by Bean's eye before the next (2026-11-18; Bean's proposal, recommended by this session).
- The foundation is based on the Claude Design handoff folder and what its contents already hold, and on Spec 48 and Spec 48A (2026-11-18).
- A draft does not need a token for every button or other component type the framework has: it carries what it uses, and it may carry extra tokens and presets the framework's default stylesheet does not have (2026-11-18). So a fixed list of four button presets is wrong as a requirement.
- The foundation includes the drawers (nav drawer, basket drawer and the like) and the proper import and application of all tokens and the animation records, so entrance animations and component looks arrive without per-page work (2026-11-18).
- A component's look is read from the draft: the tick box look is the best tick box in the draft, standardised as that site's token (2026-11-18).
- Where no setting holds a look, the route writes Custom CSS and lists it (Spec 48 FR-48-109); a look that would plausibly be used a second time becomes a setting without waiting for a second draft; only a true one-off, or one needing a rebuild not worth its cost, stays CSS (2026-11-18).
- WooCommerce's forms stay WooCommerce's working blocks (Spec 48 FR-48-87).
- Earlier ruling this draft proposes to revisit: the handoff never names an SGS block, "tags may come later" (Bean, 2026-10-30; Spec 48A FR-48A-13 and FR-48A-14).

## What the handoff already carries (first look, 2026-11-18)

- `surfaces.json` (`.claude/claude-design-handoff/handoff-schema/surfaces.schema.json`): 52 to 61 records per client, of kinds page, global, header, footer, menu, drawer, backdrop, panel, accordion, modal, form, form-step and result, each with states and a way to reach them. Mama's lists 2 drawers, 5 accordions, 15 forms, 8 results. A surface record has a `blocks` field, an array of free-text names (Mama's Home: "hero + trust bar", "#build", "FAQ"; Indus: "stats", "hscroll", "cards"; Eye Care: none).
- `animations.json`: 196 to 217 records per client, each with its element, trigger, properties, timing, stagger, breakpoints and routes. Mama's: 145 hover, 26 state-transition, 5 scroll-reveal, 7 carousel, 3 marquee. Eye Care: 93 hover, 78 entrance.
- `tokens/`: the draft's own names and counts (Mama's 38 colour, 47 type, 70 spacing tokens; Indus has `--radius-card`, `--shadow-button`), not the framework's slots.
- `data-part` ids, structured ways into a state, typed state keys and one breakpoint form are in the schema and optional; the Indus, Eye Care and Mama's exports were made before those fields existed (Spec 48A FR-48A-13 Status: "No export made after the update exists yet").

## What the morning's evidence showed

- The route's automatic chain alone does not deliver a presentable regular page (`clone-audit.md`); that audit did not run the finaliser or Solve.
- About 63% of Mama's round-two fixes set a setting or content that already existed. Of her 72,794 characters of Custom CSS, 55% stand in for a setting an SGS block lacks and 28% for one a wrapped WooCommerce or core block lacks.
- Mama's snapshot holds no site reveal rules (`settings.custom.entrance.reveal`), though the mechanism exists (Spec 38A §8.1) and Indus's snapshot holds two; her entrances were added by hand.
- Mama's primary button token holds 21 values; `theme/sgs-theme/assets/css/woocommerce.css` reads 14 of them (not border colour, border width, hover transform, hover timing or the pressed state), and WooCommerce's plain buttons take the colour only. `plugins/sgs-blocks/includes/helpers-button-preset.php` prints a preset onto any selector but accepts only primary and secondary. `sgs/button` offers primary, secondary, outline, link and custom; only the first three have tokens.
- Only button presets are extracted from a draft (Spec 48 FR-32-7 Status).

## The design as first proposed (to be tested, not defended)

A. **Foundation first.** Before any page: tokens; component looks (buttons, fields, tick boxes and radios, cards, notices, links) read from the draft; motion from `animations.json` as site defaults; the shared furniture (header, footer, nav drawer, basket drawer, mega menus, modals, toast); menus, media, business details.

B. **One definition per component, read everywhere.** Each component's look is defined once in the site's tokens and every rendering of it reads the whole definition, WooCommerce's and core's included (as the focus ring and, since `4192dcf56`, the tick box do). A new reader is switched on per site, so a signed-off site does not change.

C. **A components page.** The route builds a private page showing every foundation component in every state; Bean compares it with the draft once.

D. **A block map written by Claude Design.** A compact catalogue generated from the framework database (each block, what it is for, its parts, its either-or options) is uploaded with the handoff files. Claude Design designs with it in view and writes, per meaningful element, which block it is and which child is which part. Bean's version: it also records every piece of content, setting and rule of each component, in the draft's own terms, for the route to translate. The session's refinement: point at the draft element for anything its code states plainly, and write a value out only where the code does not (as `animations.json` already does). The route validates the map against the live database and treats it as the first evidence for block choice and part pairing.

## Questions for the council

1. What does the handoff folder, as specified and as the three exports show it, already provide for each part of A to D, and where would this draft duplicate or contradict it? Is the block map an extension of `surfaces.json` (its `blocks` field), of `data-part`, or a new file?
2. Which parts of the foundation does the route already build (Spec 48 §11 extractor, §12 site build, FR-48-51 presets, FR-48-77 and FR-48-78 motion, Spec 38A §8.1), why did they not deliver for Mama's, and what is really missing?
3. How should presets be open-ended (a draft's own variants and tokens beyond the framework's defaults) within Spec 32's token contract and the blocks' editor controls?
4. Can Claude Design produce the map reliably at the size of a real draft, and what must the instructions and schema say?
5. With ten days, two sites and a second session on the route's general mechanisms, what is the smallest set of changes that makes the next clone markedly easier, and what should wait?
