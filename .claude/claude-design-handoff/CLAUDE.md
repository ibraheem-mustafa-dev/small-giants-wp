# Project instructions

This project's drafts are cloned into WordPress by Claude Code, which reads the handoff folder described below. The
handoff itself is run by a prompt the user pastes; these are the standing facts and rules for every conversation.

## Runtime traps (apply to every edit, not only the handoff)

- `componentDidUpdate` receives only `prevProps`. Never write `componentDidUpdate(pp, ps)`: the second parameter is
  always undefined and that update code never runs. Keep your own snapshot instead (`this._prev = {...this.state}`).
- A script or custom element in `<helmet>` runs on the raw template before the runtime boots. It must not fill itself in
  at that point (that crashes the first render with a `removeChild` error); let it render after mount.

## Rules

- Don't change the drafts, their scripts or assets while preparing a handoff. List bugs under `unresolved` and ask
  before fixing. After any fix, the whole handoff prompt runs again, so `animations.json`, `surfaces.json` and
  `MANIFEST.json` always match the drafts.
- `tokens/` holds the brand palette, type and spacing only. A colour used once or twice in a draft stays a hex value in
  the draft; never add a token for it.
- Inventories follow `handoff-schema/METHOD.md` and validate against its schemas; fix the records, never the schema.

## The finished handoff folder

Done means every item in this map is present and nothing under "Not in the folder" is.

```
design_handoff_<project>/
├── README.md                 the guide, written from handoff-schema/README.template.md and checked against the
│                             code; never maps the design to WordPress or SGS blocks
├── <Page>.dc.html            every draft a visitor can reach: the entry draft(s), every DC they mount through
│                             <dc-import>, and every page they link to
├── support.js                the runtime the drafts load
├── <script>.js               every script the drafts load in <helmet> or through x-import
├── assets/                   every image, logo, icon and font file the drafts reference
├── animations.json           every animation and interaction effect (handoff-schema/animations.schema.json)
├── surfaces.json             every page, global element, menu, drawer, accordion, form, step and result, with
│                             states (handoff-schema/surfaces.schema.json)
├── READING-DC-FILES.md       how to read and run this project's drafts (modelled on the example in handoff-schema/)
├── tokens/
│   ├── colors.css            brand palette as CSS custom properties
│   ├── typography.css        families (with the font URL), sizes, weights, line heights
│   └── spacing.css           spacing scale, radii, shadows, gutters, section padding, easings
├── handoff-schema/
│   ├── METHOD.md
│   ├── animations.schema.json
│   ├── surfaces.schema.json
│   ├── manifest.schema.json
│   ├── README.template.md
│   └── READING-DC-FILES.example.md
└── MANIFEST.json             written last (handoff-schema/manifest.schema.json): date, project, entry drafts,
                              support.js SHA-256, and path, bytes and SHA-256 of every file above
```

Not in the folder: earlier explorations and superseded page versions, planning or review documents (even when saved as
a `.dc.html`), notes, screenshots, uploads, this `CLAUDE.md`, skill folders, the runtime trace harness, and the design
system's `components/`, `guidelines/`, `styles.css`, `readme.md` and `SKILL.md`. Claude Code's intake check refuses a
folder holding any file the map doesn't allow.
