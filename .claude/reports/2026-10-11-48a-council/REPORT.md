# Adversarial council on the Spec 48A design draft (2026-10-11)

Artefact: `DESIGN.md` (this folder). Panel, run in parallel and blind: the Cynic (veteran tooling engineer), the Spec-Lawyer, the Ship-PM, the Abuse Red-Teamer, the Producer Realist (whoever makes the folder in Claude Design) and the Consumer (the Spec 48 implementer who builds sites from it). Each finding below was checked against the files before it was kept; the verification is noted where it changed or confirmed a claim.

## Headline

The direction holds (one folder, byte-for-byte placement in `sites/<client>/handoff/`, our own inventory as the check on Claude Design's). As drafted, though, the 48A check **would reject all three real exports** and still **would not carry several facts a build needs**. Five reviewers converge on the same cause: the design asks Claude Design to be exact about things our intake can do better (manifest, README layout, inventories), and leaves out the build facts only the designer knows (WordPress page map, how to reach each route, image sources, form targets, menus).

GO on the direction; revise five decisions before writing Spec 48A.

## Convergent findings (two or more reviewers, independently)

| # | Finding | Reviewers | Verified |
|---|---|---|---|
| 1 | "Refuse a `.dc.html` no entry draft mounts" rejects Mama's 11 pages, which link to each other with plain `href`s; only header, footer and product card are mounted. | Lawyer, PM, Cynic, Producer, Consumer | yes (B1 mount graph) |
| 2 | The 16 exact README sections fail all three real READMEs; Claude Design's own "Handoff to Claude Code" writes its own layout, and two exports add an SGS block-mapping section the design bans. | Lawyer, PM, Cynic, Producer, Consumer | yes (B1 headings) |
| 3 | A producer-written manifest proves consistency, not completeness or authenticity: the Indus manifest lists five files that are gone and omits `tokens/`, and its paths name a folder that does not exist. Our intake should hash the folder itself. | Producer, Lawyer, Cynic, PM, Red-Team | yes |
| 4 | The automatic runtime probe accepts too much: existence of two functions doesn't prove the element numbering is unchanged (the Indus logo-id failure mode), and the runtime runs fetched code through `new Function`. | Red-Team, Cynic, PM, Lawyer | yes (`support.js` line ~1218; React, ReactDOM and Babel load from unpkg with SRI) |
| 5 | Re-deriving the whole inventory at intake is unbuilt research; Claude Design's inventories plus `trace-check.mjs` already caught the one real defect. State which source wins in the meantime. | PM, Producer, Cynic | yes |
| 6 | 48A fixes a format before task B0 (download every project before 14 Dec; test the artifact-based Claude Design). | PM, Cynic, Producer | yes (plan B0 open) |
| 7 | The client builds wait behind the whole Spec 48/32/47 rewrite: the stall trap. Split 48A into a small v1 that lets Indus start. | PM, Producer | n/a (scheduling) |
| 8 | Validate against our own schema copy; the copy inside each export can drift and should not be required. | Cynic, Lawyer, PM, Producer | yes |
| 9 | `trace-check.mjs` sits in a dated report folder; a permanent reader must live in `scripts/computed-route/`. | Cynic, PM | yes |

## Single-reviewer findings kept because they are build-breaking

- **Missing build facts (Consumer).** No file reliably gives each page's WordPress slug, parent and type. Only Eye Care's embedded `data-sgs-manifest` does, and it maps `/lenses` to `prescription-lenses`, which no code can infer (verified). Also absent: how to reach each route (hash, file or `go()` call), image sources and licences (Indus photos are live Unsplash URLs, logos are empty image slots), form targets and recipients, menus, per-page SEO, legal pages, placeholder-versus-real copy, required plugins. Mama's product data exists only in `store.js` (verified).
- **Running untrusted code (Red-Team).** Drafts execute in a browser on a machine that holds live-site credentials. Fix: a throwaway browser profile, network limited to the draft server plus the three pinned CDN files, no secrets in the intake process, and a negative control (a draft that calls another local port must fail).
- **Prompt injection (Red-Team).** README text is written by a tool a client may edit, and agents with SSH access read it. Fix: README facts are extracted into fixed fields by a tool-less reader; imperative or command-like text is flagged to Bean.
- **Asset and content safety (Red-Team).** Sanitise SVGs (no script, event handlers, `foreignObject`), cap sizes, scan for personal data before commit, allow only https/tel/mailto/wa.me links and show every changed contact link to Bean.
- **Differences lists break on re-export (Consumer).** Element numbers change when a draft changes, so each entry needs the handoff hash and a stale check. Eye Care is reference-only, so this is a Spec 48 matter.

## Proposed revisions (for Bean's decision)

1. Manifest: our intake hashes the folder on arrival and writes its own record outside `handoff/`; Claude Design ends its reply with a plain file listing. Replaces decision (b).
2. README: ship `README.template.md`; require only the sections the code cannot supply (Business details, Forms, Judgement calls, Open items, Revision); the rest are recommended; no SGS block mapping. Replaces decision (c).
3. Runtime: an unknown `support.js` stops intake and runs a probe that reproduces a checked-in numbering fixture and shows the diff against the nearest known build; one command adds it after review. Replaces decision (d).
4. Build facts: a required `site.json` from Claude Design (schema shipped in `handoff-schema/`), generalising Eye Care's `data-sgs-manifest`: pages (route, how to reach it, WordPress slug/parent/type), menus, forms (target, recipient), media (source, licence, placeholder), content status, plugins. New.
5. Unknown files: intake copies only required and reachable files into `handoff/` (reachable = `dc-import`, `x-import`, helmet scripts and links to `*.dc.html`), names everything it left out, and fails only on a missing required file. Amends decision (a).
6. Inventories: v1 uses Claude Design's two files, checked by `trace-check.mjs` (moved to `scripts/computed-route/`); intake re-derivation becomes a Spec 48 stage. Amends decision (e).
7. Order: B0 first; 48A v1 is the check script plus the template files; Indus intake starts once v1 passes.
