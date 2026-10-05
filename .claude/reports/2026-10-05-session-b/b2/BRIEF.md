# B2 agent brief: prove or disprove each framework-gap candidate

You are one of six parallel agents in Session B2 of the Eye Care clone audit, repo
`C:\Users\Bean\Projects\small-giants-wp`. You are **read-only**: do not edit any block, theme, plugin, tree, spec or
plan file, do not run a build or a deploy, do not touch a host or a browser. You write exactly one file, your own
verdicts JSON (named in your dispatch).

## Plain English: what this is

Eye Care is a client site being rebuilt from a static HTML "draft" onto the SGS WordPress block framework. A tool
called the walker opens the draft and the live site side by side at 375/768/1440 px and reports every painted
difference as a row (one element, one CSS property). A sweep on 2026-10-05 found 2,373 distinct open differences
across 17 surfaces. A triage script then gave each one a **candidate** class:

- **F — framework gap:** nothing on the block, its enclosing blocks or its extensions can produce the draft value;
  or a hardcoded rule beats a real setting.
- **W — walker or route gap:** the row is a measuring artefact, a knock-on effect of another row, or a setting
  *does* exist but the route cannot find, calibrate, pair or write it.
- **T — tree or content:** fixable now by writing a value in the page tree.
- **D — decided divergence:** Bean deliberately chose a different result from the draft.

Your batch holds the candidates the script called **F**, grouped by **mechanism** (the missing capability), not by
page. Your job is to **prove or disprove each one**. The script's F is a lookup result, not a proven gap.

**The governing rule (do not get this wrong):** "Missing setting" starts as **W until proven F**. A walker or route
gap is never closed by calling it missing functionality. So the burden of proof is on F: if you cannot prove that
nothing can produce the value, the verdict is W (or T), not F.

## Your input

`<your batch>-input.json` in this folder. Shape:

```
{ "batch": "b2a", "totals": { "rows": 107, "combos": 77 },
  "mechanisms": { "M2-box-spacing": { "rows": 107, "combos": [ {
      "block": "sgs/social-icons", "path": ".sgs-social-icons__list", "property": "gap",
      "kind": "style", "rows": 4, "surfaces": ["footer","header"], "decidedBy": "no-setting",
      "examples": [ { "surface": "footer", "ref": "cr-ref-footer-12", "widths": [375,768,1440],
                      "solveReason": "...", "evidence": [ ... ], "source": { ... } } ] } ] } } }
```

One **combo** is one (block, element path, property) mechanism; `rows` is how many distinct sweep issues it covers,
so a combo with 6 rows is worth six times a combo with 1. `evidence` is what the triage script already found
(`check: 'resolver'` with its gap, `check: 'attribute'`/`'extension'`/`'enclosing'` fits, consequence, transient,
used value). `source` is the string-level source pass: the block's `render.php` mentions, its `style.css` rules and
the PHP helpers it reaches. **Treat all of it as a starting point, never as proof.**

## How to prove or disprove (per combo)

Work combo by combo, highest `rows` first.

1. **The framework database.** Every customisable property is a row in `block_attributes`. Query it read-only:
   ```
   python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name, role, css_property, css_element, css_state, source FROM block_attributes WHERE block_slug='sgs/social-icons'"
   ```
   Check **every** attribute of the block, including rows whose `css_property` is NULL (a setting can route by name
   alone), and rows with `source='sgs-ext'` (an extension's setting, which reaches the block through the roster).
   Also query the property across all blocks to find the precedent that already solves it:
   ```
   ... "SELECT block_slug, attr_name, role, css_property, css_element FROM block_attributes WHERE css_property LIKE '%gap%'"
   ```
   Never import `scripts/converter/db/db_lookup.py` (it runs schema migrations on import). Open the DB read-only.

2. **The block's own source.** Read `plugins/sgs-blocks/src/<block>/block.json` (its `attributes` and
   `supports.sgs.*`), `render.php` (does it read the attribute, and how does it emit it: a class modifier, a custom
   property, a wrapper attribute) and `style.css` (which rule declares the property for that element). Cite by
   symbol, never by line: `render.php::sgs_social_icons_render`, `block.json::supports.sgs.boxFamilies`,
   `style.css::.sgs-social-icons__list`.

3. **Enclosing blocks and extensions.** A value may come from a parent (an `sgs/container`'s gap) or from a shared
   extension. The triage evidence names the ones it found; verify them and look for ones it missed.

4. **The precedent test (this is what makes a verdict useful).** If the property is controllable on *any* other
   block, say which and how: the block, the setting, and the shared helper or declaration that does it (for example
   `SgsLengthControl`, the box control, a typography helper, `supports.sgs.boxFamilies`, an extension, the form's
   Field style group as the parent-styles-children precedent). A confirmed F with a named precedent is a cheap fix;
   a confirmed F with no precedent anywhere is a real new control.

## Verdict rules

- **F (confirmed):** you checked every attribute of the block (name and `css_property`, NULL rows included), its
  extensions and its enclosing blocks, and none can produce that property on that element — **or** a setting holds
  the draft value and a rule still beats it (a hardcode: name the winning rule). Quote the 0-row query, or the
  winning rule.
- **W (reclassified):** a setting exists but the route cannot reach it — it is not calibrated to that element,
  calibration shows it not reaching, it needs a state the route does not map, the pairing does not reach the
  element, or the row is a knock-on effect, an entrance-animation transient or a used value. **Name the setting
  that exists, `<block>::<attr>`, and why the route misses it.**
- **T:** the tree can hold it today (the resolver would write it).
- **D:** Bean decided this difference. Only if you find it in the register
  `.claude/plans/2026-10-02-eye-care-fix-register.md` or the ledger
  `sites/eye-care-ward-end/build/qa/divergences.json`; cite the id.

When a combo's rows split (two surfaces, different causes), say so and give the split.

## The proof gate (your output is rejected without this)

**Every verdict must cite either a `file::symbol` or a database row, and quote it.** A verdict that says "no
setting exists" without the query and its 0-row result does not pass. A verdict that says "the setting exists"
without `<block>::<attr>` does not pass. This gate mirrors the one that rejected a shallow pass in Session A
(`scripts/computed-route/lib/register-sweep.mjs::checkStatuses`), so write to it from the start.

## Output

One file, `.claude/reports/2026-10-05-session-b/b2/<your batch>-verdicts.json`:

```json
[ { "mechanism": "M2-box-spacing",
    "combo": "sgs/social-icons|.sgs-social-icons__list|gap",
    "block": "sgs/social-icons", "path": ".sgs-social-icons__list", "property": "gap",
    "rows": 4, "surfaces": ["footer","header"],
    "candidate": "F", "verdict": "F", "changed": false,
    "proof": "one or two sentences, with the citation inline",
    "citations": [ "db: SELECT ... WHERE block_slug='sgs/social-icons' AND css_property LIKE '%gap%' -> 0 rows",
                   "plugins/sgs-blocks/src/social-icons/style.css::.sgs-social-icons__list declares `gap: 12px`" ],
    "precedent": { "block": "sgs/container", "setting": "blockGap", "helper": "supports.sgs.boxFamilies",
                   "note": "how it solves the same property elsewhere, or null if nothing does" },
    "fixShape": "one line: the control that would close it, in the framework's own terms",
    "confidence": "high|medium|low" } ]
```

`changed` is `true` when your verdict differs from `candidate`. Every combo in your input appears exactly once.

## Report back (your final message is all the main thread sees)

- Counts: combos in, F confirmed, reclassified to W / T / D, and the same by **rows** (not just combos).
- The mechanism groups you confirmed, each with the shared helper or precedent that already solves it elsewhere, and
  which blocks need it.
- Every combo you reclassified away from F, with the setting that exists and why the route missed it.
- Anything you could not settle, and what evidence would settle it.
- Anything contradicting the triage evidence or the spec.

Keep it factual and quantified. UK English.
