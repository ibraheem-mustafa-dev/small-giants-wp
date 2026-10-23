Invoke /autopilot before doing anything else.

# Track W (measurement and proof), Phase 1: the gap proof and the remaining checks

Context:
- **The cloning tool's closing measure** is the parity walker (`scripts/parity/draft-live-walk.mjs`), which compares a Claude Design draft with its WordPress clone.
- **The plan:** `.claude/plans/2026-10-23-cloning-tool-completion.md` fixes every known issue (Phase 1) before a full three-client re-clone and census (Phase 2).
- **Phase 0 built** an honest walker (W1–W6, W9, W10 and the review's fixes), done marks needing live evidence, G5–G7 live probes, `gaps.json` and `census-all.mjs`.
- **This session is Track W.** It owns `scripts/parity/**`, `census-all.mjs`, `lib/census-mechanism.mjs`, `census.mjs`, `data/census-classes.json`, `lib/delivery-map.mjs`, `lib/gate-chain.mjs`, `lib/gate-probes*.mjs`, `lib/gaps-file.mjs` and their tests.
- **Other tracks:** R (the Fill route), F (framework), S (sites and inputs) run as separate sessions. Announce a walker change with a `W walker <sha> <what changed>` queue line.

Read first: the plan (How the work runs, Rulings, register rows W11–W13 and R7, Phase 0's status cells for P3 to P5 and their open points), Spec 48 FR-48-12, -15, -64, -65, -66, -67, -68, and `scripts/parity/GAP-CHECKLIST.md`.

## Tasks
1. **One wide wave** of API workers (`/delegate`, `api-agent.py --prompt-file <brief> --tools full --cwd <worktree>`, background; `/subagent-prompt` briefs carrying the three brief lines and "Never link or junction any node_modules"):

   | Lane | Work |
   |---|---|
   | W13a | FR-48-65 I-classes |
   | W13b | FR-48-67 instrument-debt list |
   | W13c | FR-48-68 cross-client backlog |
   | W-lint | FR-48-12: `--lint` as a gate, and an unwalked `sc-if` branch not reported as a gap |
   | W-cite | FR-48-15: a canvas citation must have an emission check |
   | W-cons | R7's conservation check in `census.mjs --check`: every declared property read on a paired part ends written, held or unwritten (Track R fixes the drops it finds; tell it through the queue file) |
   | W-open | Phase 0's open points: `lib/delivery-map.mjs` tree evidence bound to the record's own element; a done `state:` key's commit touching that surface's files; `gaps.json` evidence as a command or a file and key (FR-48-66); a `sgsCustomCss` rule with an `.sgs-` selector no longer passing as SGS-owned in G6's hardcode probe |
   | W-second | The second-client header walk before and after Phase 0's walker (Mama's redesign `sites/mamas-munches-redesign/build/qa/parity/` or Eye Care's), with every surviving row filed |
   | W-setup | `scripts/parity/tests/auto-collect-regressions.test.mjs` runnable from a worktree |

   Each lane: MUST FAIL tests red on the old code, mutations red with 0 skipped, `capabilities.mjs --gate`, and a planted negative control for any normalisation.
2. **Merge** each lane, then the full route suite and the plan's gates in the main checkout, then a `W walker` queue line when the walker changed. Before any `git worktree remove`, check for reparse points.
3. **Close:** the full three-rater `/qc-council` (the walker is a shared mechanism), one fix agent, the docs (plan Status, Spec 48 Status lines, README, GAP-CHECKLIST), `/handoff local`, `/compact`.

## Guardrails
- A walker change must never call two different renders equal: keep the `benchmark.mjs --noise` catch rate and every planted control.
- Explicit pathspecs with `git branch --show-current` in the same command; never stash or `git add -A`; never touch `.claude/settings.json`.
- Delete this prompt (`git rm`) in the wave's handoff commit.
