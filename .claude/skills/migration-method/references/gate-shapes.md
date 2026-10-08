# Gate wiring detail (Step 8)

Loaded from SKILL.md. Contents: when to register, the three gate shapes, the ratchet, gates.json record, tiers.

## Step 8 — Wire the gate BEFORE you write

⛔ **Register the gate and commit it BEFORE `--apply`.** It will fail red until the
migration lands, and **that is the point**: a red gate is the only signal that tells the
*next* session a migration is half-applied. Wired afterwards, an interrupted apply is
undetectable, and with a non-coder owner who cannot read the diff, that state is permanent.

⛔ **RUN your `--check` and see what it returns TODAY before you register it.** A `--check` already
red for reasons beyond your migration (`migrate-tier-object.py --check` exits 1 while ANY property
remains flat) would fail every build on `main` for all five tracks: register a NARROWER mode that
gates only your change. A GUARD-shaped change is green from registration onward (D775): "red until
the migration lands" is a codemod property, not a universal one. ⚠ When the gate IS the change, it
cannot be committed before the code that implements it: register it before the COMMIT and prove it
fails before the commit.

### ⛔ THERE ARE THREE GATE SHAPES

Demanding a binary `--check` on a backlog that cannot reach 0 leaves "make the rule advisory"
as the only compliant move. (D778.)

| Shape | `--check` behaviour | Use when | In `inspector-scan` |
|---|---|---|---|
| **Binary** | 1 while any site remains, 0 when clean | a codemod you will finish in one pass | `mode: "gate"`; `run.js::computeExit` fails on ANY `FLAGGED` finding |
| **Guard** | 0 from registration; 1 only on divergence | it compares a derived copy to its source (D775) | n/a |
| **Ratcheted ceiling** | 1 when findings EXCEED the recorded ceiling | a real backlog too large to clear at once | `mode: "advisory"` plus a numeric `openBacklog`; `run.js::computeExit` fails when `flagged > openBacklog`, refuses advisory with no `openBacklog`, and `run.js::loadRulesTable` refuses a rule with no `advisoryReason` |

⛔ **An advisory rule DOES red the build**: it IS the ratcheted-ceiling shape, not an off switch.
Promoting a backlogged rule to `mode:"gate"` because you believed advisory was toothless reds the
pre-deploy gate for every track. The promotion criterion is Bean-locked in
`inspector-scan/rules.json` `_meta.note`; which rules are advisory, and their ceilings, live
there: query it, do not copy a count here.

⚠ **`mode` and `openBacklog` exist only in `inspector-scan/rules.json`.** A `plugins/sgs-blocks/scripts/gates.json`
record has seven fields and no mode: the runner reads only the exit code. A ratcheted ceiling registered
there keeps its ceiling INSIDE the script, as a sibling baseline that `--check` reads: fail on a site
outside it, and fail on an entry no longer reproduced so the baseline must shrink. Worked examples:
`scripts/check-enum-control-shape.py` + its `-baseline.json`, and `scripts/migrate-box-longhands.py` +
`migrate-box-longhands-baseline.json`.

**The ratchet:**

- The ceiling is **monotonic downward**; every lowering records its composition **enumerated, not inferred**.
- ⛔ **Raising it is permitted ONLY as a stated staleness correction, never to absorb new debt**, said
  in writing on the rule.
- ⛔ **A ceiling above the live count is SLACK, and slack means a brand-new violation lands green.**
  **Re-measure and lower after every drop.**
- ⛔ **Never promote a rule to gating on the run that introduces it**: its first live number is a
  measurement, not yet a trusted one.
- **Advisory is a STARTING state with an exit condition.** Write your rule's exit condition into its
  `advisoryReason`, and if it must stay advisory permanently, write THAT reason there too.

⚠ **Count only what the gate counts.** `inspector-scan`'s `--json` serialises BASELINED findings
alongside FLAGGED ones while the exit code filters to FLAGGED: a raw array length over-counts.

⛔ **If the detector is ALREADY registered, registration is DONE: skip to the ratchet above.**
Confirm with `npm run gate:list` (never by grepping `package.json`); a cold agent following this
step literally adds a duplicate `gates.json` record and a duplicate alias.

Add a record to `plugins/sgs-blocks/scripts/gates.json`, **all seven fields**:

```json
{
  "id": "<your-script>",
  "cmd": "python scripts/<your-script>.py --check",
  "tier": "fast",
  "added_D": "D<n>",
  "added_commit": null,
  "budget_ms": null,
  "order": <max existing order + 1>
}
```

Then the standalone alias in `package.json`, so it is runnable by hand:

```
"check:<name>": "python scripts/<your-script>.py --check"
```

(`gates.json` = what runs automatically; the alias = so you can run it yourself.)

⚠ `added_commit` is `null` at registration: the landing sha does not exist yet.
`order` = `max(existing) + 1`, derived from `npm run gate:list`, never copied.

**Tiers.** `generator` runs in `prebuild` and is not a gate. `fast` runs on every build.
`full` runs pre-deploy via `build-deploy.py`'s `step_gate_full()`. **Pick by measuring**:
`python scripts/run-gates.py --time`. Only `python` and `node` are launchable.
⛔ **If you put anything in `full`, run `npm run gate:wired`.** A gate parked in a tier
nothing runs is enforcement laundering, and that check fails closed if the deploy-side
call ever disappears.

⛔ **A migration is not finished until its `--check` runs automatically.** **Run
`npm run gate:list` to confirm it does**: grepping `package.json` returns a FALSE
POSITIVE, because every gate kept a standalone alias there.
