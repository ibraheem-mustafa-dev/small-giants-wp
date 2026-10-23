Invoke /autopilot before doing anything else.

# Track S (sites and inputs), Phase 1: correct inputs for the three-client re-clone

Context:
- **The cloning tool** re-clones every surface of three clients in Phase 2 of `.claude/plans/2026-10-23-cloning-tool-completion.md`:
  - Indus Foods on `indus-test`;
  - Mama's Munches' redesign on `mamas-test`;
  - Eye Care Birmingham on the new `eye-care-clone-test`, which is https://mintcream-lyrebird-224487.hostingersite.com, set up in Phase 0.
- **The existing `eye-care-test`** (darkcyan-grouse) is untouched, and is the answer key for Eye Care's page map.
- **This session is Track S.** It owns `site-build*.mjs`, `lib/site-build-*.mjs`, `manifest.mjs`, `intake*.mjs`, `lib/intake-pagemap*.mjs`, `plugins/sgs-blocks/scripts/theme-extractor/`, the clients' `build/page-map.json`, the site setups and the Phase 2 runs.
- **Other tracks:** W, R and F run as separate sessions; signal through `.claude/queue.md` with `S site-setup` / `S site-run-start <client>` / `S site-run-end` lines.

Read first:
- the plan (Rulings B and C, register rows S3, S4 and S5, Phase 0's P1 and P2 cells with their open points, Phase 2);
- Spec 48 §11 (tokens), §12 (site build), §13 (shop surfaces), FR-48-30 (the page-map proposal), Appendix A;
- `scripts/computed-route/README.md`.

## Tasks
1. **One wide wave**, in parallel. API workers through `/delegate` for code; `wp-sgs-developer` through the Agent tool for site work. Briefs come from `/subagent-prompt` with the three brief lines and "Never link or junction any node_modules".

   | Lane | Work | Done when |
   |---|---|---|
   | S5 | The page-map proposal classifies each surface by what it is, not by position or name (Bean, 2026-10-23: the bag drawer is part of the cart block; a checkout header is internal to its surface; only the site header, footer and nav drawer are layout surfaces). Cover the register's cases (a) to (f), then regenerate all three clients' page maps. | Eye Care's map matches the built `eye-care-test` site (list its posts, CPTs, menus and WooCommerce options over SSH, read-only) |
   | S3 | T4: the theme extractor reads `tokens/*.css` (FR-33-1), refuses when its 16px/1.6 fallback fires (FR-33-3), and freshness is checked (FR-33-12). | MUST FAIL tests pass; each client's snapshot diff shown to Bean before any push |
   | S4 | FR-48-58 stock previews uploaded; FR-48-57 `msgRequired` copy, the skeleton's `sgs/form` step and review nodes, and live submission; the route fade's `site-options.json` applied by the site build; FR-48-60, -61 and -62's shop parts and fixtures. | Each FR's done-when |
   | S-mirror | Phase 0's open Appendix A step 13 for `eye-care-clone-test` (the orchestrator's choice: re-point `local-eye-care` at it): create the `cr-calibration` page, `provision-calibration-refs.mjs --site eye-care-clone-test`, a `calibration-targets.json` entry, then `refresh-from-remote.sh local-eye-care eye-care-clone-test` and `sync-build.sh`. | `calibrate.mjs` reads the site |

2. **Put the regenerated page maps to Bean**, Eye Care's beside the `eye-care-test` answer key, as one short self-contained table. Wait for his confirmation before any `--apply`.
3. **Close:** one reviewer for the wave (`/qc-council` Stage 7.5; three raters if `site-build` changed), one fix agent, the docs, `/handoff local`, `/compact`. Phase 2 starts only after Tracks R and W have closed Phase 1.

## Guardrails
- Dry runs only until Phase 2. Never `--apply` the site build, never hand-roll a server copy, never use `--allow-dirty` or `--skip-verify`.
- `push-theme-snapshot.py --target` takes the SSH host, not the target key.
- Explicit pathspecs with `git branch --show-current` in the same command; never stash or `git add -A`; never touch `.claude/settings.json`.
- Delete this prompt (`git rm`) in the wave's handoff commit.
