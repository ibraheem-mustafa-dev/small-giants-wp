# Project instructions

This project's drafts become a real WordPress site. Claude Code reads the handoff folder described below and rebuilds every page from the drafts' own code, so the code is what gets cloned: a value, a button or a widget that the code states once and by name arrives right first time, and one that is typed slightly differently in twenty places arrives as twenty one-offs someone has to repair by hand. The rules here exist for that reason. The handoff itself is run by a prompt the user pastes; these are the standing facts and rules for every conversation.

## What we can build

`WHAT-WE-BUILD.md` in the project root lists the sections, widgets and parts the site platform already has, in design words, with the versions each comes in. Read it before drawing a new kind of section or widget. Anything on the list can be styled freely: colours, type, spacing, shape and motion are all yours. When the user asks for something that works differently from everything on the list (a new kind of widget, a new behaviour), say it would have to be built and ask before drawing it. Never name a WordPress or SGS block anywhere in a draft or in the handoff: which block each part becomes is decided later by Claude Code.

## Runtime traps (apply to every edit)

- `componentDidUpdate` receives only `prevProps`. Never write `componentDidUpdate(pp, ps)`: the second parameter is always undefined and that update code never runs. Keep your own snapshot instead (`this._prev = {...this.state}`).
- A script or custom element in `<helmet>` runs on the raw template before the runtime boots. It must not fill itself in at that point (that crashes the first render with a `removeChild` error); let it render after mount.
- A mounted component (`<dc-import>`) renders inside a block-level wrapper `div`, and only `position`, `left`, `right`, `top`, `bottom`, `inset`, `width`, `height`, `z-index` and `transform` from the mount's `style` reach that wrapper. Mount a button or field inside a flex or grid parent, never in the middle of a line of text.
- A hole whose value is `undefined` renders nothing and logs a warning. A component returns `null` from `renderVals()` for an optional prop it was not given (`label: this.props.label || null`).

## Design rules (apply while designing, not only at handoff)

### Tokens: declared once, used by name

- `tokens/` holds every value the design reuses, under this project's own names, as many as the design has: colours, font families, sizes, weights, line heights, letter spacing, spacing, radii, borders, shadows, easings, durations, and any other family the design has (a reveal distance, a header height). `colors.css`, `typography.css` and `spacing.css` always exist; add further files (`motion.css`, `components.css`) when a family deserves its own.
- Every draft loads the token files in its `<helmet>` (`<link rel="stylesheet" href="tokens/colors.css">`, one per file) and uses a token by name wherever its value is meant: `color:var(--ink)`, `style-hover="box-shadow:var(--shadow-7)"`, and in the logic `v('var(--h1-m)', 'var(--h1-t)', 'var(--h1-d)')`. A token that is declared but typed as a raw value in the drafts cannot be traced, so the site would be built with loose numbers in place of the design's scale.
- A value used once or twice stays a literal in the draft (a one-off hex, an odd offset); never add a token for it. A value used three times or more is a token.
- A token is never renamed or re-valued for one element. If one element needs a different value, it uses a different token or a literal.
- Focus: declare exactly three tokens with these names, `--focus-color`, `--focus-width` and `--focus-offset`, in `tokens/spacing.css`. Draw focus once for the whole site from them and never style focus per element; input boxes (text fields, selects, textareas) take the inset look automatically, so give them no focus rule of their own.

### Buttons and form fields: built once, with presets

- The buttons and form fields the design repeats are each one small component file, mounted wherever they are used (`Button.dc.html`, `Field.dc.html`, and the same for a tick box, a pill or a card that repeats). The component holds the design's presets as named versions in `data-props`: an enum prop `version` (`primary`, `secondary`, `quiet`, in this project's own words) and, where the design has them, `size`. Each preset's whole look lives there and reads tokens: rest, hover, keyboard focus, pressed, disabled and its transition.
- What changes from use to use is passed in: the words (`label`, or children for an icon beside the words), the link (`href` makes it a link, no `href` makes it a button), the handler (`onPress="{{ addToBasket }}"`), and state the page owns (`pressed`, `disabled`).
- Use the component wherever a button or field is meant to be one of its presets. The site is built with one preset per version, so every button mounted as `primary` arrives as the primary preset and a change to it changes them all.
- A button or field that is meant to look different is simply drawn where it stands, with its own styles, and is built with its own styles. What to avoid is the middle case: re-drawing a preset by hand with slightly different numbers. That is how one button ended up in eight sizes on an earlier project, and each had to be matched by hand.
- A widget's own working parts (an accordion's header, a tab, a slider's arrows and dots, a drawer's close button) belong to the widget and are drawn with it.
- A header, footer, product card or form that appears on more than one page is a component too, as now.

### Text, lists and widgets are read by meaning

- Inline formatting inside a text element is kept: write bold (`strong`, `b`), italic (`em`, `i`), strikethrough (`s`, `del`), links (`a`) and line breaks (`br`) as ordinary content inside the element. Never flatten them to plain text or split one sentence across several elements to fake them.
- Lists are real lists (`ul` or `ol` with `li`). A breadcrumb is a `nav` with an `aria-label` holding an ordered list, with `aria-current` on the current page.
- A widget carries its real roles and states, and its behaviour matches them, because a widget is recognised by what its code does and these confirm it:
  - accordion: each header is a `button` with `aria-expanded` and `aria-controls` naming its panel's `id`; panels open and close.
  - tabs: `role="tablist"`, `role="tab"` with `aria-selected` and `aria-controls`, `role="tabpanel"`; one tab open at a time.
  - slider or carousel: a container with `aria-roledescription="carousel"` and a label, each slide a `role="group"` with `aria-roledescription="slide"`, real `button` arrows with labels, and dots that are buttons with `aria-current` on the current one.
  - drawer, modal and any panel that covers the page: `role="dialog"`, `aria-modal="true"` and a label; the button that opens it has `aria-expanded` and `aria-controls`.
  - a menu that drops down: its trigger is a `button` with `aria-expanded` and `aria-controls`.
  - a group of chips where one or several can be chosen: buttons with `aria-pressed`.
  A class called "tabs" on a plain `div` is not a tab set.
- Meaningful elements (a section, a drawer, a menu, a form, a call to action) carry a stable `data-part="<id>"` that names what the element is in the design (`hero-cta`, `filter-rail`). Keep an id unchanged between exports.

### Pages, states and what a shop does

- Design every page and state a visitor can reach, not only the main pages: a page or state with no draft is built from guesswork. Every site: the page-not-found page; search results, with results and with none; each form's sent and error states; the menu drawer open. A site with a blog: the list of posts and one post. A site with a shop: the shop listing (with its filters, and with no products found); a product page (one with options, one sold out); the basket page and the basket drawer (each filled and empty); the checkout (as a guest, signed in, and with a field error showing); the order confirmation; sign in, create account and lost password; each account view (orders with and without orders, one order, addresses and editing one, account details); and one success, one information and one error notice.
- A shop runs on WooCommerce, so draw only what it does. It does: products with options and a price per option; a basket with a quantity stepper, remove, a discount code, a gift note and a free-delivery progress bar; a one-page checkout with contact, delivery address, billing address, delivery options, payment, an order note and a terms tick, in that order; card fields and wallet buttons drawn by the payment provider (only their colours, type and corner radius can be styled); an order confirmation with the order's number, items, totals, addresses and delivery method; an account with orders, one delivery and one billing address, account details and, optionally, saved items. It does not, unless the user says the client has it: an address book or a default-address switch; parcel tracking links; a "delivered" step that knows the parcel arrived (the shop knows placed, in progress and sent); delivery or dispatch dates; subscriptions; postcode lookup; a checkout with its steps reordered or split across pages. When the user asks for one of these, say it would have to be built and ask before drawing it.

## Changing a draft during a handoff

A handoff should leave the drafts following the design rules above, so use your judgement and tidy what needs it: a raw value that is plainly one of the tokens, a hand-drawn button that is plainly one of the presets, a fake list, a missing role, state or `data-part`. Say what you changed in your final reply. The one thing to bring back as a question is a change that would alter the design the user approved, or a case where you cannot tell which of two things was meant: only the user knows whether a difference is deliberate. Bugs and missing pages or states are listed under `unresolved` as now. After any change, the whole handoff prompt runs again, so `animations.json`, `surfaces.json` and `MANIFEST.json` always match the drafts.

Inventories follow `handoff-schema/METHOD.md` and validate against its schemas; fix the records, never the schema.

## The finished handoff folder

Done means every item in this map is present and nothing under "Not in the folder" is.

```
design_handoff_<project>/
├── README.md                 the guide, written from handoff-schema/README.template.md and checked against the code; never maps the design to WordPress or SGS blocks
├── <Page>.dc.html            every draft a visitor can reach: the entry draft(s), every component they mount through <dc-import> (buttons and fields included), and every page they link to
├── support.js                the runtime the drafts load
├── <script>.js               every script the drafts load in <helmet> or through x-import
├── assets/                   every image, logo, icon and font file the drafts reference
├── animations.json           every animation and interaction effect (handoff-schema/animations.schema.json)
├── surfaces.json             every page, global element, menu, drawer, accordion, form, step and result, with states (handoff-schema/surfaces.schema.json)
├── READING-DC-FILES.md       how to read and run this project's drafts (modelled on the example in handoff-schema/)
├── tokens/
│   ├── colors.css            the palette as CSS custom properties
│   ├── typography.css        families (with the font URL), sizes, weights, line heights, letter spacing
│   ├── spacing.css           spacing scale, radii, shadows, gutters, section padding, the three focus tokens
│   └── <family>.css          any further token file the design has (motion.css, components.css)
├── handoff-schema/
│   ├── METHOD.md
│   ├── animations.schema.json
│   ├── surfaces.schema.json
│   ├── manifest.schema.json
│   ├── README.template.md
│   └── READING-DC-FILES.example.md
└── MANIFEST.json             written last (handoff-schema/manifest.schema.json): date, project, entry drafts, support.js SHA-256, and path, bytes and SHA-256 of every file above
```

Not in the folder: earlier explorations and superseded page versions, planning or review documents (even when saved as a `.dc.html`), notes, screenshots, uploads, this `CLAUDE.md`, `WHAT-WE-BUILD.md`, skill folders, the runtime trace harness, and the design system's `components/`, `guidelines/`, `styles.css`, `readme.md` and `SKILL.md`. Claude Code's intake check refuses a folder holding any file the map doesn't allow.
