# Investigation: why the Eye Care Spec 33 palette has only three colours

Date: 2026-09-19. Read-only investigation. No repo file edited except this report. Scratch (gitignored): `pipeline-state/_inv-spec33/` (`facts.json`, `census.json`, `census.js`, `repro.py`, `repro2.py`, `patched/`).

Draft: `sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html`. Extractor: `plugins/sgs-blocks/scripts/theme-extractor/` (`extract.py`, `palette.py`, `roles.py`, `derive.py`, `token_map.py`, `measure.js`).

Legend: PROVEN = reproduced or read directly from a command/file in this session. ASSUMED = inference, not run.

---

## Plain English

**Problem.** The extractor produced a three-colour palette (`surface #faf8f5`, `surface-alt #bdc1c6`, `text #141414`). The accent colour (`#9C8B78` taupe) is missing, and `surface-alt` is a scrollbar hover grey, not a design colour.

**Effect.**
1. The deployed theme would carry no usable brand palette. `push-theme-snapshot.py` strips all three (every entry is marked advisory), so the palette it pushes is empty. That script replaces `theme.json` wholesale, and its own docstring says a missing preset "is DELETED for that client".
2. If someone "fixes" it with `--include-advisory`, the site gets a cool blue-grey `surface-alt` on a warm cream design, and loses the framework's other 18 colour slugs. The snapshot's own button, link and border styles point at four of those slugs (20 references), which would then resolve to nothing.

**Solution.** There are three separate causes, and only the smallest is a one-line fix.
1. The draft is a Claude Design "dc" export. It has no `:root` colour tokens and puts nearly every colour in 822 inline `style=` attributes, which the extractor never reads. So the extractor falls to its "Pass B" guess, which sees only 44 CSS declarations. Not fixable by a small change; it is an input-coverage gap (needs a design-gate).
2. Within those 44 declarations Pass B wrongly counts scrollbar, text-selection and `:hover` rules as design colours. Smallest correct fix: ignore those selectors (diff below, proven against this draft).
3. Pass B replaces the whole framework palette with its advisory guess, then the deploy strips the guess. Needs a decision (overlay vs replace), not a quick patch.

For Eye Care itself: do not push the current snapshot. Author the palette below by hand into the snapshot (or via `--merge-onto`).

---

## Evidence

### 1. How each of the three entries was derived (PROVEN)

Trace: `sites/eye-care-ward-end/theme-extract-trace.json` has 12 rows; the 3 palette rows are all `kind: derive`, reason "Pass B: derived ...", i.e. Pass A produced nothing.

Command (read-only replay of the real extractor functions on the real draft; `pipeline-state/_inv-spec33/repro.py`):

```
python repro.py
root tokens: {}
Pass A palette: []
Pass B palette: surface #faf8f5 | surface-alt #bdc1c6 | text #141414   (all advisory, same as the snapshot)
```

Why Pass A is empty: `token_map.build_draft_root_token_map` reads only `:root` rules inside `<style>` blocks. The draft has exactly one `<style>` block (1,789 characters) and no `:root` rule.

Pass B (`derive.derive_palette` calling `roles.collect_colour_usages`) sees these usages (printed by `repro.py`):

| colour | uses | source rule | role, confidence |
|---|---|---|---|
| `#faf8f5` | 2 | `html,body{background}` | surface 0.95 |
| `#141414` | 2 | `html,body{color}` | text 0.95 |
| `#ffffff` | 1 | `::selection{color:#fff}` | text 0.60 |
| `#f1f3f4` | 1 | `.rev-rail::-webkit-scrollbar-track` | surface-alt 0.70 |
| `#dadce0` | 1 | `.rev-rail::-webkit-scrollbar-thumb` | surface-alt 0.70 |
| `#bdc1c6` | 1 | `.rev-rail::-webkit-scrollbar-thumb:hover` | surface-alt 0.70 |

- `surface`: sole member of its role bucket, share 1.0 (matches the trace).
- `text`: `#141414` 2 of 3 uses in the bucket, share 0.667 (matches the trace; the third is `#fff` from `::selection`).
- `surface-alt`: three candidates with one use each, share 0.333 (matches the trace). `derive.derive_palette` picks `min(bucket, key=(-count, -confidence, hex))`, so a three-way tie is broken by hex ascending, and `#bdc1c6` sorts first. The winner is decided by alphabet, not by design.

So observation (b) is confirmed: `#bdc1c6` is the scrollbar-thumb hover colour of the Google-reviews rail (`.rev-rail`), and it won by tie-break.

Contributing defect: `derive.py` gives no resting-only filter. `palette.py` (Pass A) drops `:hover/:focus/:active/:visited` rules (`_STATE_RE`) but Pass B feeds every rule, including states and UA pseudo-elements, into `roles.collect_colour_usages`.

### 2. Why the accent and the other draft colours did not become tokens

Cause: input coverage, not a threshold. PROVEN:

- `shared_utils.extract_css` concatenates `<style>` blocks only. The draft has 1 `<style>` block and 822 inline `style="` attributes in the template region.
- Hex literals in the template region: 766 occurrences, 71 unique (command in section 4). Almost none are in `<style>`.
- The accent appears in CSS only as `var(--acc,#9C8B78)` inside `input:focus{outline:...}` and `::selection{background:...}`. Neither reaches a role: `outline` is not in `colour_props`, and `::selection` plus `:focus` are non-resting. Separately, `collect_colour_usages` resolves `var()` only through `root_tokens` (empty here) and never uses the `var(--x, fallback)` fallback, so `parse_colour("var(...)")` returns `None`.
- `--acc: {{ acc }}` is a custom property set on a wrapper `<div>` in an inline style (the `x-dc` root, not `:root`), so Pass A would not see it even if `extract_css` read inline styles.
- `#141414` dark sections, `#E6E1DA`, `#F3F0EB`, `#6F6152`, `#EFEAE2`: all present only as inline literals or `var()` fallbacks, so never seen.

By design or defect? Two answers.
- The input limit is by design in v1: Spec 33 says Pass A parses "the draft's `<head>` `:root` + base/preset rules" (spec "complete spine" section) and the corpus is SGS-BEM `<style>` drafts. A dc-template export is outside that corpus. ASSUMED that no later spec amendment widened it (I read FR-33-1 and FR-33-5 and the scope text; I did not read every changelog line).
- The behaviour on that input is a defect against the spec's own contract. FR-33-5 says a token-less draft must never yield "a silent guessed theme, NEVER a partial-deploy", and Pass B is meant to use a "computed-value read". Actual: `derive_palette(base_rules, trace)` receives no `facts` at all, so Pass B never reads a computed value (contradicts FR-33-1's iron law as applied to Pass B), and it emits a guessed 3-colour palette that replaces the framework's.

Spec 33's relative-share threshold (FR-33-5) was not the cause: the code ranks by count, and the ties here are unresolved by any share logic.

### 3. Does `measure.js` see the runtime `--acc`? (PROVEN, and it does not matter)

- The rendered DOM does hold the resolved value. Playwright census (`census.js`, 1440x900, home view): wrapper `getComputedStyle(...).getPropertyValue('--acc')` = `#9C8B78`, `--accInk` = `#6F6152`, `--accSoft` = `#EFEAE2`; its inline style attribute is `--acc: #9C8B78; ...` after the runtime substituted `{{ acc }}`.
- `measure.js` never reads a custom property. Its output keys are `root, body, paragraphs, headings, links, buttons, sections, previewShellMarkers` (`facts.json`). The only `#9C8B78` in `facts.json` is one incidental paragraph `color` (`rgb(156, 139, 120)`), not a token.
- The runtime choice is real: `data-props` declares `accent` enum `taupe|sage|navy`, default `taupe`; the component does `const A = C.ACC[P.accent || 'taupe']`. `static ACC` is `taupe {#9C8B78, ink #6F6152, soft #EFEAE2}`, `sage {#8A9A86, #55654F, #E8ECE6}`, `navy {#3A4A6B, #2B3A55, #E4E7EE}`. A static render only ever sees taupe. Note `README.md` says navy is `#7C8AA0 / #4C5A70 / #E6EAEF`; the code says `#3A4A6B`. The code is what renders; the README is stale on navy.

### 3b. Preview shell (c) is not a factor (PROVEN)

- `const mobilePreview = false;` is hard-coded in the component, so `outerBg` renders `#FAF8F5` (not the `#2a2724` shell colour), `frameShadow` is `none`, `frameW` is `100%`. `facts.json` `previewShellMarkers` is `[]`.
- `styles.color.background` was chosen from `html>body>div>div>div` = `rgb(250, 248, 245)`, which is the correct page colour. Nothing is being wrongly excluded or included by shell logic.

### 4. What a correct palette contains (frequencies)

Two independent sources (PROVEN):

(a) Rendered home view, computed styles on 643 visible elements (`census.json`). Background colour by element count: `#ffffff` 21, `#141414` 9, `#141414@0.08` 8, `#faf8f5` 7 (21.98M px2, dominant by area), `#f3f0eb` 4, `#efeae2` 2. Text colour by element: `#141414` 28, `#70757a` 26 (Google widget), `#faf8f5` 18, `#ffffff` 15, `#202124` 14 (Google widget), `#6f6152` 9, `#77716a` 7, `#5e584f` 4. Border sides: `#e8eaed` 53 (Google widget), `#e6e1da` 46, `#efeae2` 32, `#dadce0` 16 (Google widget).

(b) Whole template, hex literals including views not rendered on home (shop, PDP, checkout): `#141414` 141, `#E6E1DA` 109, `#FFF` 92, `#5E584F` 56, `#77716A` 44, `#6F6152` 40, `#FAF8F5` 39, `#6B655E` 22, `#9C8B78` 21, `#8B8478` 15, `#F3F0EB` 12, `#25D366` 11, `#EFEAE2` 9. `var(--acc*)` references: 58 (`--accInk` 40, `--acc` 13, `--accSoft` 5).

Command: `python` reading the `.dc.html`, splitting at `<script type="text/x-dc"`, `re.findall(r'#[0-9a-fA-F]{6}\b')` (plus 3-digit) on the template part, with `data:image` blobs blanked.

The draft's own `README.md` design-token table agrees with the frequencies (page `#FAF8F5`, ink `#141414`, body `#5E584F`, muted `#77716A`, hairline `#E6E1DA`, soft `#EFEAE2`, accent `#9C8B78`, accent ink `#6F6152`, WhatsApp `#25D366`).

Proposed palette, mapped to the baseline theme's existing slug vocabulary (`theme/sgs-theme/theme.json` has `surface, surface-alt, text, text-muted, text-inverse, primary, primary-text, accent, accent-text, accent-light, border, whatsapp, ...`). The value column is PROVEN from the data above; the slug choice is ASSUMED judgement:

| slug | value | evidence |
|---|---|---|
| `surface` | `#faf8f5` | body computed background; dominant by area; 39 literals |
| `surface-alt` | `#ffffff` | most frequent non-page background (21 elements); 92 literals; README "cards, panels, inputs". Alternative reading: `#efeae2` band. Pick one; do not use `#bdc1c6` |
| `text` | `#141414` | body computed colour; 28 elements; 141 literals |
| `text-muted` | `#5e584f` | 56 literals; README body text |
| `text-inverse` | `#faf8f5` | 18 elements on dark sections |
| `primary` | `#141414` | computed button background (`scpd` in `facts.json` buttons is `rgb(20,20,20)`); README "Ink: buttons" |
| `primary-text` | `#faf8f5` | computed button text on that background |
| `accent` | `#9c8b78` | resolved `--acc`; 21 literals plus 13 `var(--acc)` refs |
| `accent-text` | `#6f6152` | resolved `--accInk`; 9 rendered text elements, 40 refs |
| `accent-light` | `#efeae2` | resolved `--accSoft`; 2 backgrounds, 32 borders |
| `border` | `#e6e1da` | 46 border sides on home; 109 literals |
| `whatsapp` | `#25d366` | 11 literals; equals baseline already |

Not tokens: `#e8eaed`, `#dadce0`, `#f1f3f4`, `#bdc1c6`, `#70757a`, `#202124`, `#3c4043`, `#5f6368`, `#1a73e8` and the multicolour SVG fills are the Google-reviews widget's own palette (widget-scoped). `#f3f0eb` and `#2b2721` are image-placeholder fills. Sage and navy are alternative accent sets that should be delivered as style variations, not as extra palette slugs (the README says the same).

`--include-advisory`: harms (PROVEN for the data, ASSUMED for the live effect, not deployed):
- Default (no flag): `push-theme-snapshot.strip_advisory` removes all 3 entries, so `settings.color.palette` becomes `[]`; `styles.color.background` is still `var:preset|color|surface`, a slug that no longer exists.
- With the flag: pushes `surface-alt #bdc1c6`. It also pushes only 3 slugs.
- Either way the snapshot still references slugs that will not exist. Command: counted `var:preset|color|X` / `--wp--preset--color--X` in `theme-snapshot.json` against its palette: `primary` 8, `accent` 8, `primary-dark` 3, `border` 1 = 20 references to undefined slugs; `text`, `surface`, `surface-alt` resolve. The baseline `theme.json` defines 21 slugs; the snapshot defines 3.
- Why the wipe is likely on the live theme: the `push-theme-snapshot.py` module docstring states the snapshot is SCP'd over `theme.json` wholesale and "A preset missing from a snapshot is DELETED for that client — it does NOT fall back to the framework file." Live effect not tested (no deploy allowed). The three backups in `sites/eye-care-ward-end/theme-snapshot-backups/` all show the pre-push 21-slug palette, so they do not show whether any push completed.
- The palette-slug reference gate (`check-palette-slug-refs.py`) does not catch this: it accepts a slug that exists in the framework `theme.json` or any client snapshot, and these four exist in the framework file.

Adjacent, not investigated further (ASSUMED impact): `palette.BASELINE_SLUGS` lists `border-subtle`, `border-light`, `footer-bg` but the real baseline slug is `border` (grep: `border-subtle` appears 0 times in `theme/sgs-theme/theme.json`). Affects Pass A name-tiebreak for drafts that do have `:root` tokens; not the Eye Care cause.

### 5. Smallest correct change

Cause (b) is proven and has a one-place fix. Causes 2 and 3 are not smallest-change problems; see the end.

**Change A (apply if approved).** Ignore UA-chrome pseudo-elements and interaction states when collecting colour-role evidence. Same resting-only rule Pass A already applies. Diff (line endings ignored; note `roles.py` on disk may be CRLF):

```diff
--- a/plugins/sgs-blocks/scripts/theme-extractor/roles.py
+++ b/plugins/sgs-blocks/scripts/theme-extractor/roles.py
@@ -23,6 +23,13 @@
 _SEL_STATUS_ERROR = re.compile(r"(error|\.red|\.danger|\.invalid|outofstock)", re.I)
 _SEL_BASE = re.compile(r"^(:root|html|body|\*)$", re.I)
 
+# A selector that paints a UA-chrome part (scrollbar, text selection, placeholder, list marker) or an
+# interaction STATE is not a resting design surface, so it must not vote for a palette role. Same
+# resting-only rule palette.py applies to Pass A (its `_STATE_RE`), applied here so Pass B (derive.py)
+# obeys it too. Proven on the Eye Care draft: `.rev-rail::-webkit-scrollbar-thumb:hover{background:
+# #BDC1C6}` won the `surface-alt` role by a hex-ascending tie-break.
+_SEL_NON_RESTING = re.compile(r"::(-webkit-|-moz-|selection|placeholder|marker)|:(hover|focus|active|visited)", re.I)
+
 # A 404 PAGE-TYPE selector is not an error STATE. The status regexes match the bare substring
 # "error", which also occurs in every theme's not-found-page container (WP core's body class is
 # `.error404`; Astra emits `.error-404`). That container's background is just the site's ordinary
@@ -113,6 +120,8 @@
     for sel, prop, value, _imp, _off in base_rules:
         if prop not in colour_props:
             continue
+        if _SEL_NON_RESTING.search(sel):
+            continue
         propfam = _prop_family(prop)
         srole = selector_role(sel)
         # resolve concrete colours in the value (a var → token; else a literal)
```

Companion test (add to `plugins/sgs-blocks/scripts/theme-extractor/tests/test_extractor.py`, next to `test_fr335_nothing_usable_returns_empty`):

```python
def test_fr335_ua_chrome_and_state_selectors_do_not_vote_for_a_role():
    # Eye Care regression: a scrollbar-thumb :hover colour won `surface-alt` by a hex tie-break.
    css = ("body{background:#faf8f5;color:#141414}"
           ".rev-rail::-webkit-scrollbar-thumb{background:#dadce0}"
           ".rev-rail::-webkit-scrollbar-thumb:hover{background:#bdc1c6}"
           "::selection{background:#9c8b78;color:#fff}")
    pal = derive.derive_palette(parse_base_rules(css), [])
    assert {e["slug"]: e["color"] for e in pal} == {"surface": "#faf8f5", "text": "#141414"}
```

Proof of the predicted effect (PROVEN, run against a patched COPY in `pipeline-state/_inv-spec33/patched/`, repo untouched; `repro2.py`):
- Eye Care Pass B now yields `[('surface', '#faf8f5'), ('text', '#141414')]` (no `surface-alt`, no wrong colour).
- Existing derive tests replicated against the patched copy still pass: token-less palette keeps `primary #0066cc` and all entries advisory (True, True); translucent-only draft still returns `[]` (True).
- Negative control: the scrollbar `:hover` rule alone yields `[]`.
- Not run: the full `pytest` suite (I did not run tests in the shared tree). Golden fixtures for Mama's/Indus use Pass A, which does not call `collect_colour_usages` with rules the filter changes for `:root`-declared tokens in the same way, but that is ASSUMED, not run. Run `python -m pytest plugins/sgs-blocks/scripts/theme-extractor/tests -q` before committing.

Honest limit: Change A removes the wrong colour. It does not put the accent in. After it, Eye Care still has a 2-entry advisory palette that the push strips.

**Changes not diffed, because each is a design decision (project rule 7: shared mechanism, design-gate first):**

1. Pass B must not replace the framework palette. Today `extract.build_snapshot` sets `settings.color.palette = pal` (derived only), and `test_fr335_build_snapshot_token_less_uses_advisory_palette` asserts exactly that. Options: overlay derived entries onto the baseline palette by slug and have `push-theme-snapshot.strip_advisory` restore the baseline entry instead of deleting it; or emit no palette change at all when Pass A is empty. This is the one that stops the wipe and the 20 dangling references. It contradicts a current test, so it needs Bean's go-ahead.
2. Read the rendered draft, not only its `<style>`. Have `measure.js` capture custom properties set on any element's inline style plus a computed-colour census, and let Pass B rank from computed values (what FR-33-1 and FR-33-5 already say). Design questions: slug naming (`acc` would become slug `acc`, not `accent`, so a name map is needed), and how sage/navy variants are carried. Larger than one session.

**For Eye Care now (no code change):** write the 12-row palette table above into `sites/eye-care-ward-end/theme-snapshot.json` as `_source: declared` entries (or feed it via `extract.py --merge-onto`), keeping the framework's remaining baseline slugs, and do not run `push-theme-snapshot.py` on the current file.

---

## Commands run (all read-only, or scratch only)

- `python repro.py` (replays `token_map`, `palette.build_palette`, `derive.derive_palette`, `roles.collect_colour_usages` on the real draft CSS and `facts.json`).
- `node measure.js --draft "<draft>" --out facts.json` in `pipeline-state/_inv-spec33/` (writes only there).
- `node census.js` (Playwright, file:// URL, headless, 1440x900; writes `census.json` only there). No server started.
- Did NOT run `extract.py`: `_self_host_google_font` writes font files into `theme/sgs-theme/assets/fonts/` in the repo, which would break the read-only rule.
- I created and then deleted one scratch file (`css.txt`) that I had briefly written inside the draft folder; `git status` shows it gone.

## Open items

- Live effect of the empty-palette push is inferred from the push script's docstring, not observed. Untested by design (no deploy).
- Whether a Spec 33 amendment intended dc-template drafts to be supported was not checked beyond FR-33-1 and FR-33-5 and the scope text.
