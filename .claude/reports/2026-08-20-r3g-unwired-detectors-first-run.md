---
doc_type: report
project: small-giants-wp
created: 2026-08-20
subject: R3-g — first-ever run of the "built but wired to nothing" detectors
---

# R3-g — what the never-run detectors actually find

The R-3 register's stated first action for Bucket 1/2: *"run each Bucket-1/2 script once and
record what it actually finds. A detector nobody has ever run may be reporting a real defect
class today — or may be stale and broken. Cheap to determine, and it decides whether wiring is
worth anything."*

Done. Every figure below is the script's own output, run this session — enumerated, not estimated.

| Script | Exit | Findings | Verdict |
|---|---|---|---|
| `surveys/survey-control-gaps.py` | 0 | **17** | **Real and useful — WIRE IT (advisory).** Shared-component-aware by construction (explicit globs `:178-184`). Findings are genuine control-type mismatches: a `[date]` field rendered as `<TextControl>` (`timeline/edit.js:157`, `trustpilot-reviews/edit.js:569`), a `[url]` field as `<TextControl>` (`trustpilot-reviews/edit.js:250`), a `[css-value]` as `<TextControl>` (`extensions/image-controls.js:217`). 17 is a small, actionable list, not a wall of noise. |
| `surveys/survey-wrapper-capability.js` | 0 | real | **Real — WIRE IT (advisory).** Reports blocks declaring wrapper attrs (`shapeDividerTopColourGradient` etc. on `sgs/site-footer`, `sgs/trust-bar`) plus **2 UNRESOLVED computed-key reads in the wrapper PHP** (`:2416`, `:2418`) — a genuine blind spot in static analysis of the wrapper, worth knowing about. |
| `check-unresolvable-token-refs.py` | 0 | **0** | **DO NOT WIRE YET — and wiring it would be pointless twice over.** (a) It finds 0 today, so it would gate nothing. (b) Confirmed by reading the source: `main()` ends `return 0  # advisory — never fails the build` at **line 355 exactly**, as the register predicted — so even with findings it could not fail. Fix the exit path first, and only then reconsider; there is no value in wiring it while it finds nothing. |
| `check-device-toggle.js` | 0 | ALL PASS | **DO NOT WIRE — correctly unwired.** This is a LIVE editor test: it drove a real block-editor canvas (`Tablet click resizes the canvas iframe — was 1247px, now 781px`). It needs a reachable canary, and per the register's own "explicitly NOT doing" list, gating on a check that warns-and-passes when disconnected proves nothing. **Useful datum: it PASSES today** — the device toggle genuinely drives `getDeviceType()` and the canvas. |

## Net conclusion

Two of the four are worth wiring as advisories (`survey-control-gaps.py`,
`survey-wrapper-capability.js`); two should stay unwired, for two different and specific
reasons. The register's suspicion that a never-run detector might be reporting a real defect
class **was correct for both of the two** — `survey-control-gaps.py`'s 17 findings and
`survey-wrapper-capability.js`'s 2 unresolved wrapper reads have never been looked at.

⚠ `check-device-toggle.js` is the honest counter-example to "unwired means neglected": it is
unwired because it *should* be, and it passes.
