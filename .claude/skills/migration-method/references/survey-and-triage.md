# Survey and triage detail (Steps 1, 2, 7, 7b)

Loaded from SKILL.md. Step numbers are cited by scripts; keep them.

## Step 1 — Check the tool already exists

Grep the SUBJECT, never the verb. The same idea ships here as `census-*`, `survey-*`,
`audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`.

```bash
ls plugins/sgs-blocks/scripts/*migrate*
python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py --check
grep -n "<subject>" .claude/catalogues/tooling.md .claude/catalogues/helpers.md
```

⚠ **A tool that covers your subject but lacks `--fix`/`--check`: EXTEND it, do not rebuild it.**
`surveys/survey-typography-controls.py` is a 906-line DB-backed census with no `--survey` and no
fixer; it is most of a detector. Adding the missing modes is hours; rebuilding is the failure this
step exists to prevent.

⚠ **Confirm the CORPUS matches before calling a subject hit a hit.** `surveys/census-tier-siblings.sh`
censuses stored `post_content` on the live canary, not declared attributes in `block.json`: same
words, different corpus.

Rebuilding a tool that exists is this repo's recorded failure mode. Run
`find plugins/sgs-blocks/scripts -maxdepth 1 -type d` (there are dozens): searching one directory
and concluding nothing exists is how it happens.

## Step 2 — Ask the database, but only for what it holds

`block_attributes` answers **"which blocks declare attribute X"** in one query.

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name FROM block_attributes WHERE attr_name LIKE '%Tablet'"
```

⛔ **The DB-first rule scopes to ATTRIBUTE migrations ONLY.** `block_attributes` has columns
for `block_slug` and `attr_name` and **no column for a file or a call site**. For a call-site,
closure, helper or import migration it has nothing to offer: **walk the disk.**

⛔ **`includes/*.php` and the other shared trees are IN SCOPE whichever you use.**
`block_attributes` is foreign-keyed to `blocks(slug)`, so a DB-derived list is block-scoped
and silently omits every shared include. **That omission is D575**: the `minHeight` survey
returned zero findings while the shared wrapper shipped `min-height:Array` to 73 live
declarations.

⛔ **The DB can also be WIDER than the tree.** `block_attributes` holds rows for CORE blocks
(`source='native_wp'`) which have **no directory under `src/blocks/` at all**, so an unfiltered
tier-sibling query returns more pairs than disk has. **Filter `source='sgs'`.** A falsely-WIDE
answer marks a DEAD read as live: the D575 shape. (D775.)

⛔ **`block_attributes` also cannot see WP-NATIVE `supports` controls**, and the client
sees those identically to a declared attr. So a DB-derived list for a client-visible
change silently omits every block that declares the capability through `supports`.

**Reconcile both sides yourself; do not trust a number written here.** A raw grep counts
comment-only mentions as declarations. **Parse each `block.json` and classify per file:
declared attr / `supports` flag / mention only.**

⚠ **A DB/disk count mismatch is a FINDING, not noise.** Reconcile it before applying: it is
usually a stale row or an unseeded block, and it means one of your two sources is lying.

⛔ **If you came here from `migrate-tier-object.py`, three things `--survey` will not tell
you:** `UNCLEAR` render/edit states must be read BY HAND; `--fix --apply` writes `block.json` and
`edit.js` **only, never `render.php`**; and `--check` does **not** gate on `render_state: RAW`, so a
green gate does not mean the render side is done (see its module docstring, grep `are NOT
auto-applied by this script`; the includes-scope hazard is **D575**).

## Step 7 — Survey, and read the whole census

```bash
python plugins/sgs-blocks/scripts/<your-script>.py --survey
python plugins/sgs-blocks/scripts/<your-script>.py --survey --json > reports/migrations/<name>-census.json
```

Read every category, not just the total. **Commit the JSON census in the landing commit**:
it is what makes the migration reviewable. A count printed to a terminal you closed is not
evidence.

⚠ **Split your refusals.** `unrecognised` in the model is a mixed bucket: some are "no rule
matched" (stop, extend the classifier) and some are deliberate, working refusals (odd quote
parity, `->`/`::` prefixes). Report those as **`refused`, with the rule that fired**, and
proceed. `adopt.js` already does this: every refusal carries a named reason and a fixture.

## Step 7b — TRIAGE the findings before you gate them

**Only when the detector already existed and reports a large backlog. Skip for a fresh codemod,
where every finding is one you defined.**

**Get the findings first. This detector is `node`, not `python`, and has no `--survey`:**

```bash
node plugins/sgs-blocks/scripts/inspector-scan/run.js --json > scan.json
# then filter to YOUR rule and to status === "FLAGGED" yourself: there is no per-rule flag,
# and the JSON carries BASELINED findings alongside FLAGGED (see Step 8).
```

⛔ **A finding is not a defect until you have said which of three things it is.** Skipping this is
how a backlog becomes permanent: nobody can act on a number they do not trust, so the rule stays
advisory forever and the count grows.

| Verdict | What it means | What you do |
|---|---|---|
| **REAL** | the defect is genuine | it enters the worklist and the ceiling |
| **DETECTOR BUG** | the rule is wrong, not the tree | ⛔ **fix the rule.** *"A false positive is a detector bug, never baseline fodder."* |
| **ARTEFACT** | true statically, not a real defect: a limit of static analysis | record the limit ON the rule, with the evidence that proves consumption |

⛔ **"Fix the rule" has ONE exception: a resolver SHARED across rules.** If the false positive
traces to shared machinery (e.g. `inspector-scan/core/components.js`), changing it silently
restages OTHER rules' committed ceilings. That is hand-back #9, not a fix you make alone.
Record the class on the rule and hand back.

⛔ **The ARTEFACT class is real and large, so do not skip it.** `34-declared-attr-unrendered`
reports a block's attr as unrendered whenever the render corpus reaches a shared include that reads
`$attributes[ $sgs_attr ]`, a computed key no static pass can resolve. Every composite routing
through `SGS_Container_Wrapper` lands here. Those attrs ARE consumed, cross-verified by
`check-dead-controls.js` reporting zero net-new dead controls across the same change.

⛔ **A false ABSENCE reads exactly like a clean result.** When a count comes in BELOW your
independent prediction, instrument the detector; do not accept the good news (rule 31's first run
undercounted because three blocks built their rows array by `.push()`, a separate const, or a
spread-of-conditional). **Declare the expected population BEFORE the first run, by a method
independent of the rule's own code** (`zeroIsAClaim` in `rules.json`).

⚠ **Diff findings on a CONTENT key, never a line-keyed one, but read one finding first.** Where a
raw key embeds a line number, an unrelated edit above a row reports it as net-new; normalise only
if the key really embeds one. `kind` is null on almost every rule, and on
`21-render-without-control` the raw key is already `rule|block|file|attr`, so normalising it
would collapse every finding on a block into one.

⭐ **The worked example is `plugins/sgs-blocks/scripts/inspector-scan/rules.json`**: its
`advisoryReason` fields record every ceiling movement with its composition enumerated, not
inferred. Read rule 31's before running your own backlog. (D778.)
