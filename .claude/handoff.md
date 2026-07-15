---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-15
session: D338 — mega-menu links restored; 45 silently-discarded attrs found (36 fixed) + new gate; attribution element; capability roster decided; framework-vs-per-site split identified; 6-persona council on §S9
---

# Session Handoff — 2026-07-15 (D338)

*(Previous session archived → `.claude/memory/handoff-2026-07-14-D336-D337.md`)*

## Completed

1. **Mega-menu links restored (Task 1).** Cause PROVEN on Indus's live `wp_navigation` post 100: `sgs/mega-menu` blocks sit at TOP LEVEL beside `core/navigation-link`; both renderer walks lacked a `case` ⇒ `default: break` ⇒ Sectors + Brands dropped. **Bean's hint was exactly right; the handoff's stated mechanism was wrong** (it claimed `renderer:352` routed them to the drawer content zone — :352 is a COMMENT; the real routing at `render.php:79-85` sent mega-menu to the DESKTOP bar, so they reached neither drawer zone). **Not a nesting limit** (Bean's hypothesis — tested, and the test found the real cause). Live: Indus **7 links / 4 accordions / 18-18 reachable / teal**. Commit `32373d11`.
2. **White drawer root-caused by measurement.** My first hypothesis (missing `primary-dark` token) was **REFUTED** — it resolves to `#076a8e`. Real cause: a cached **0-BYTE** copy of `adaptive-nav/style-index.css?ver=0.1.0` (CSSOM `ruleCount: 0` ⇒ UA-default white). Same URL: `fetch()` = 0 bytes, `fetch(cache:'reload')` = 9014. D293 freezes block versions ⇒ URL never changes; Cloudflare holds it 7 days. Fixed via `filemtime`-derived `?ver` (`bc3b5bf2`) — kills the class.
3. **45 silently-discarded block attrs found; 36 fixed; new gate.** WP discards any attr a block.json doesn't declare — no error, no gate, no build failure. 19× `"type"` (real: `displayType`, default `"phone"` ⇒ description/socials/hours/address/map ALL rendered a **phone number**) + 17× American `"textColor"` (real: British `"textColour"` ⇒ no colour on dark footers) across 5 shipped patterns. New gate `scripts/check-dead-pattern-attrs.py` found **9 more** immediately.
4. **Attribution element** — `sgs/business-info displayType="attribution"`, draggable "Website Credit", text/URL are FRAMEWORK constants (Bean-directed: Site Info is client-owned ⇒ a client could blank the backlink). Specs: **02** (block contract) + **33** (pipeline recognition, both recognisers).
5. **Capability roster decided** (Bean delegated): ~24 dropped as genuinely superseded + 19 already-dead-on-`main`; **~12 kept** as real drawer chrome.
6. **6-persona adversarial council + 2 ground-truth agents** on adaptive-nav + all of §S9. Convergent finding: FR-S9-6 (91% of attrs shipped flat) is the ordering trap.
7. **Track B + Track C prompts** written and corrected with this session's findings.
8. Cart guard, 2× D328 coercion fixes, palette-resolved drawer contrast — **written, NOT verified**.

## Current state

- **Branch `feat/adaptive-nav-dialog-drawer`** (12 commits). **`main` is SAFE** — it ships the old `sgs/mobile-nav`; a council claim that "main ships the broken drawer" was fact-checked **FALSE**.
- **⛔ UNVERIFIED CODE IN THE WORKING TREE** — `site-footer/edit.js`, `cart/render.php`, `adaptive-nav/render.php`. **STOP-67 blocked the commit, correctly** (no visual-diff report; nothing live-verified). **Not bypassed.** Next session's Step 0.
- **Indus (palestine-lives) = ROLLED BACK to `main`** at Bean's instruction, verified live, healthy. **Leave it alone.**
- **Mama's (sandybrown)** = branch deployed. Theme **1.5.25**.
- Committed: pattern fixes, the new gate, specs 02 + 33, CLAUDE.md Spec-15 fix, decisions, prompts.

## Known issues / blockers

- **Bean has NOT signed off** Mama's drawer text flipping cream→black (resolver picks black 5.72:1; cream-on-pink was 3.32:1 = WCAG fail). Baseline-parity vs WCAG genuinely conflict. R-31-13: his eye is co-authoritative. **Screenshot first.**
- **9 dead attrs open** — `sgs/info-box` `iconColour`+`iconBackgroundColour` (×3), `sgs/whatsapp-cta` `buttonText`, `sgs/label` `content`+`labelStyle`. Each needs a typo-vs-missing-capability call.
- **Spec 15 ABROGATED but 148 refs across 76 files cite it.** §8.1/§3 → Spec 00 (CLAUDE.md fixed); §3.3 → Spec 31. Live specs = **00/01/17/33**. `02-SGS-BLOCKS-REFERENCE.md` is auto-generated — fix the GENERATOR.
- **61 tests fail on a CLEAN tree** (`61 failed / 112 passed / 2 skipped`) — pre-existing; the previous handoff's "180 pass" is FALSE. A/B against a stash before blaming a change.
- **FR-S9-6 ordering trap** — 87/95 attrs (91%) flat; D328 + D293 ⇒ building it after configuration silently resets every value.
- `adaptive-nav/render.php:294-309` hardcodes **768/1024/1280**, never references `SGS_Breakpoints` (TABLET_MAX=**1023**, MOBILE_MAX=**767**) — off-by-one + a phantom 1280. Fails FR-S9-6's own "grep-clean" acceptance on the file it names. This is why the burger doesn't switch at 1023 (Bean's report).
- `parts/header.html` INLINES its pattern while `parts/footer.html` REFERENCES it — known drift vector, already drifted.
- STOP-67 reports outstanding: adaptive-nav, site-footer, cart.

## Bean's corrections this session (all mine to own)

- **I nearly told him to re-clone a homepage he designed by hand in Spectra** — would have destroyed the only copy. He stopped it.
- **I "swapped" his social icons to a block they already were**, losing his settings and styles.
- **I claimed `main` shipped the broken drawer.** False.
- **I shipped a contrast fix tested on 1 of 8 client palettes.**
- **I cited Spec 15** — abrogated, doesn't exist.
- **My register told Haiku to empty 3 headings** ⇒ 3 WCAG violations. `Quick Links`/`Contact`/`Opening Hours` are generic FRAMEWORK labels, not client copy — I misapplied his own rule. (He then ruled they shouldn't be in the shared default at all.)
- **My register said "copy the values" without SHAPES** ⇒ Haiku reintroduced D328 (flat `gap` where block.json declares `object`; `border` as a top-level attr when it's a `supports`).
- **I flagged a Goal-3/Track-C clash that doesn't exist.**

## Next priorities (full detail + ordering rationale in `next-session-prompt.md`)

0. **Verify + commit the working tree** (STOP-67 reports; Bean's screenshot sign-off).
1. 2-line zero-dep fixes (uid `wp_unique_id`→`md5`; `var()` fallback).
2. **FREEZE the attribute shape** (decision, ~15 min) — the D328 rework bomb.
3. **⭐ SPLIT framework vs per-site header/footer** (Bean's insight — the root cause of `footer-indus-foods.php` shipping to every client).
4. Restore the 12 kept capabilities → **then** build FR-S9-6 on the final shape.
5. **Goal 4 (Mama's draft)** — Bean moved it BEFORE Goal 1.
6. **Goal 1 (Indus)** — after all tracks; baseline = **lightsalmon**, restorable from git (`e3cd1a04^:header-indus-foods.php`, `0587f638:parts/header.html`).
7. Goal 3 = de-hardcode the base blocks (Bean's definition). 8. Attribution build. 9. 9 dead attrs. 10. Spec-15 sweep.

## Notes for next session

- **The handoff/register you are handed is a HYPOTHESIS.** This session: 3 of the previous handoff's Task-1 claims were wrong, a council claim was FALSE, "180 tests pass" was FALSE. Fact-check before building.
- **The live DOM is the only gate that has ever caught these.** Build + tests + every guard were green while the desktop nav rendered 0 links and a closed `<dialog>` covered both sites.
- **Bean's instinct beat mine every time they conflicted** (mega-menus, the Astra baseline, Goal-3 scope, the attribution model, Spec 15, the framework/per-site split). Test his hypothesis rather than assuming it's wrong — even the one that was wrong (nesting) led straight to the real cause.
- **Node/npm via PowerShell** — nvm shim broken in Git Bash (`node: line 1: This: command not found`).
