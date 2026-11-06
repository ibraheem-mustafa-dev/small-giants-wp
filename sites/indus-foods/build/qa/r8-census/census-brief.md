# Indus Round 8 instance census: shared brief

Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better. Work only on what this brief and your lane ask; report what you measured, not what you expect. Every count carries the script that produced it and its raw output file.

## Why
Bean reviewed the live Indus site against its draft and listed findings. Many were global, so he mentioned them once. He wants an honest INSTANCE count: every element on every page where the live site differs from the draft, grouped by root cause. Then he wants each instance's status:
- fixed by a universal framework mechanism and verified;
- capability exists but not yet applied on Indus;
- still needs framework work;
- still needs clone-pipeline work.

Finally, for each root cause, one verdict on future clones: would the next site built from a draft get this right without hand work? Patchwork does not count as fixed.

## Ground truth
- Read `E:/sgs-tmp/indus-r8/council/brief.md` for the setup:
  - the draft is at http://127.0.0.1:5181/ (`#/<page>` routes);
  - the live mirror is http://localhost:8083/ (now running the wave 2 build);
  - measuring lessons;
  - the read-only fence, which applies to you fully.
- Council registers, root causes and cited code: `E:/sgs-tmp/indus-r8/council/merged.json`.
- Clusters: the "Round 8 root-cause register" in `E:/sgs-tmp/wt-indus/sites/indus-foods/build/qa/fix-catalogue.md`.
- What changed in the framework:
  - wave 1 is commits 648508f9d..9c06be0f9 on main;
  - wave 2 is de16441ea..743df200c;
  - read the commit messages with `git -C E:/sgs-tmp/wt-indus log --format=%B -12`;
  - workers' check scripts: `E:/sgs-tmp/indus-r8/wave1/*/check.mjs` and `wave2/*/check.mjs` (most inject the not-yet-applied settings).
- Clone pipeline code (future clones): `E:/sgs-tmp/wt-indus/scripts/computed-route/` and its `lib/`:
  - `skeleton-classify.mjs`, `skeleton-rules.mjs`, `fill-width-ladder.mjs`;
  - the motion and animations readers: `read-animations.mjs`, `motion-behaviours.mjs`, `delivery-map.mjs`.

  To judge the future-clone verdict, check whether the pipeline would carry the draft value (cite the function).
- Pages: home, about, our-story, certifications, community, careers, blog, food-service, retail, manufacturing, wholesale, brands, sanam, shan, green-leaf, lemon-tree, apply, catalogue, delivery, faqs, terms, contact, sustainability, plus header, footer, drawer (375/768) and mega panels (1440). Live slugs are in `sites/indus-foods/build/page-map.json`; draft routes are in `sites/indus-foods/build/qa/parity/<page>.fill-base.mjs`.

## Counting rules
- One instance is one element on one page (one width unless the difference is width-specific) that differs from the draft for that cause. Repeated chrome (header, footer, drawer) counts once, not once per page.
- Measure on the mirror and the draft with headless Playwright, after entrances have played. Use computed styles, `getAnimations()` and `Element.prototype.animate` instrumentation (READING-DC-FILES §5) for motion, a real mouse for hover and `hasTouch` for touch.
- Status per instance, one of:
  - `fixed-verified`: the live element now matches the draft, measured.
  - `tool-applicable`: a setting can now produce it, the Indus content does not set it, and an automatic applier could set it. The applier works from the pairing (`cr-ref-*` class ↔ draft `data-dc-tpl` in `<page>.fill.mjs`) plus the handoff data (the animations.json record, the draft's computed value, surfaces.json, tokens). Name the setting and the data source it would be read from.
  - `tool-blind`: a setting exists, but no pairing or handoff data tells a tool to apply it here. Example: the draft element is not paired, or the effect comes from a structural query no record names. Say what is missing.
  - `framework-open`: no mechanism yet.
  - `pipeline-only`: Indus is right but a future clone would drop it.
  - `accepted`: Bean ruled a divergence, D-1 to D-38.
- Bean's rule (2026-11-06): a hand-applied settings sweep is a patch. The target is a tool that identifies each draft element's live equivalent and applies the value from the draft and the handoff files. For each cluster, therefore, also report:
  - how many instances are covered by a pairing;
  - how many by an animations.json record;
  - how many by a token or surfaces.json value;
  - which existing pipeline function already does part of the mapping (cite it).
- Never estimate a count. If a page could not be measured, say so and count it as unmeasured.

## Output
1. Write `E:/sgs-tmp/indus-r8/census/<lane>.json` with this shape: `{ cluster: { cause, instances_at_review, by_status: {...}, pages: {page: n}, future_clone: {verdict: "protected|not-protected|partial", why, function_cited}, examples: [ {page, selector, draft, live} up to 5 ] } }`
2. Return under 500 words: one table row per cluster with the review-time count, the status split and the future-clone verdict, then anything you could not measure.

## Lane F: process forensics (whole pipeline, every row)
Bean (2026-11-06): the clusters he named were examples from memory. Apply the same scrutiny to all 117 rows in `merged.json` and find every place in the process and the framework that failed this clone. For EACH row:
1. **First failure point.** Name the stage that first lost or mis-mapped the draft's behaviour, and cite `path::symbol`. The stages:
   - (a) draft reading or intake: the handoff readers, `read-animations.mjs`, intake inventory;
   - (b) classification or skeleton: `skeleton-classify.mjs`, `skeleton-rules.mjs`;
   - (c) pairing: `pairs.mjs`, `cr-ref`;
   - (d) value fill or width ladder: `fill.mjs`, `fill-width-ladder.mjs`, the resolver;
   - (e) motion or hover delivery: `motion-behaviours.mjs`, `motion-loop-css.mjs`, `delivery-map`;
   - (f) framework capability missing or buggy;
   - (g) hand finishing in rounds 1 to 7, a value set wrong or a ruling;
   - (h) draft ambiguity, where the draft itself is unclear.
2. **Detection miss.** Say why no check caught it before Bean did:
   - the lean parity walker (`scripts/parity/draft-live-walk.mjs`, `GAP-CHECKLIST.md`);
   - `delivery-map.mjs` (it crashes, and its done marks never read live);
   - site-check;
   - the vision audits of rounds 1 to 7;
   - the fix catalogue: was it seen earlier and accepted, deferred, or never seen? Grep `sites/indus-foods/build/qa/fix-catalogue.md` and `divergences.json`.

   Cite the check's scope rule that excluded it, for example "the walker compares resting computed styles only, not :hover" or "touch is never emulated".
3. **Systemic fix to the process.** The one change to the tool or check that would have prevented or caught it for every client.

Then cluster the rows by failure point and by detection miss. Write `E:/sgs-tmp/indus-r8/census/forensics.json` (rows plus clusters). Return under 600 words:
- the failure-point table (stage → rows → count);
- the detection-miss table (check → why blind → count);
- the ranked list of process fixes by rows prevented.

### Triage of every process fix (Bean 2026-11-06, priority = the three sites ready fastest)
For each process fix in Lane F's ranked list, give:
- impact (rows prevented, instances fixed on Indus);
- effort (S under 1 hour, M a few hours, L more);
- risk (what else it could break);
- a verdict, one of:
  - `tool-now`: high impact, or low effort and low risk;
  - `polish-review`: large, risky, or genuinely hard for tooling to recognise. Document it as an item a post-run review agent checks after every clone, with the check it should do.
  - `later`: low impact and high effort.

Do not recommend perfecting the tooling for its own sake. Bean prefers a short polish stage at the end of a clone to a long tooling project.
