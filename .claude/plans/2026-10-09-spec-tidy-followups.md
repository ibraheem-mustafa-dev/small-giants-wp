---
doc_type: plan
title: "Spec tidy: decisions and small fixes left over"
spec: .claude/specs/README.md
created: 2026-10-09
status: not started
---

# Spec tidy: what is left

**Purpose.** The spec tidy (2026-10-09) left a short list of choices only Bean can make and some small fixes outside the specs. None blocks other work.

## Bean's decisions

1. **Spec 05 (client notes).** The roster says `deferred`; the code says built and live on sandybrown (`plugins/sgs-client-notes/`, commits "live on sandybrown", emails on note creation and reply). Bean thinks WordPress's native Notes feature replaced it. Notes are editor-side block comments; this plugin is a front-end annotation tool for clients. Decide: keep and mark `active`, or retire the plugin and the spec. Spec 05 was left untouched.
2. **R-47-1 wording.** `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` R-47-1 still says "Spec 31 code" and "Spec 31's plans". The corrected wording is in the council notes below; editing a rule row needs Bean's approval.
3. **WCAG level.** Spec 27 Parts 1 and 3 claim WCAG 2.2 AA; the framework baseline is 2.1 AA (root `CLAUDE.md`). Record 2.2 as a deliberate raise, or lower the claim.
4. **Status ownership.** Spec 36 says build status lives only in `.claude/LEDGER.md`; Spec 37 puts a Status line on every FR. Pick one.
5. **Spec 36 Part 14** (the condensed Spec 41) is 173 KB. A second pass could cut about 30% more but would trim rules that code and gates read. Optional.
6. **Parked product items** with no plan home: the universal gradient rollout (Spec 35), Spec 35A's open items (spacing token control, brand-strip gallery picker, Section Styles, `populate-db.py` retirement, PHPUnit environment), `wp sgs seed-template-parts` and `seeding-arm` (still use the style-variation wording the theme dropped), the `decorative-foods` PNGs in the theme (client art), `.claude/specs/design-brain/` (rubrics for user-global skills), Spec 04's unbuilt payment, address-lookup, max-files and retention features.

R-47-1 corrected wording: replace "Spec 31 code" with "the retired converter code" and "Spec 31's plans" with "the retired converter's plans" (council note, 2026-10-09).

## Small fixes (outside the specs)

- Skills outside the repo cite retired specs and need a shown diff before editing: `~/.claude/skills/sgs-wp-engine`, `sgs-clone`, `wp-sgs-deploy`, `ui-ux-pro-max` (its `references/sgs-draft-vocabulary.md` should keep the product-card draft-class table Spec 02 dropped).
- Code comments citing deleted spec forms in live files: `plugins/sgs-blocks/includes/custom-css.php`, `helpers-button-style.php` and `class-sgs-css-registry.php` (FR-31-5.2, FR-31-22 become Spec 32 FR-32-13 and section 6.1), `class-sgs-container-wrapper.php` ("Spec 31 KIND doctrine" and "Spec 31 §13.6" become Spec 02 "Composite wrapper rule"), `class-sgs-configurator-compat.php` (CPT fallback comment), `class-sgs-header-footer-cli-commands.php` ("cloning pipeline" wording), `scripts/css-pattern-audit.js` (cites "H-9", which has no row). Old forms still resolve through the roster's "Not a live spec" table, so this is tidy-up, not a break.
- `FR-37-29` is cited by `plugins/sgs-blocks/src/components/ResponsiveControl.js` and defined nowhere: define it in Spec 37 or reword the comment (the drift lint lists it).
- Mama's Munches' accepted testimonials-slider divergence was in the old `common-wp-styling-errors.md` section S and nowhere else: re-home it in `sites/mamas-munches/CLAUDE.md` or drop it.
- Unverified Spec claims to check against code: Spec 42 FR-42-5 (type badge) and FR-42-7a (broken-form notices); Spec 38's wave-gradient "BUILT AND LIVE" look (needs a live render); Spec 18's LEDGER pointer for the reduced-motion scroll gap.
- Spec 04 lost its Indus multi-step example; restore it under `sites/indus-foods/` if wanted.
