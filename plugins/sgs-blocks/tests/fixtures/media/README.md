# Spec 49 media fixtures

Shared fixtures for the Spec 49 media system. Proofs and package tests read them; nobody writes a second copy. A correction changes the fixture and names the proof that forced it.

| File or folder | Contract | Read by |
|---|---|---|
| `sizing-cases.json` | §7.2 sizing: settings, the declarations the sizing atom prints, the measured box | `scripts/tests/test-media-emitter-parity.mjs`, `tests/js/media-atom-emitters.test.js`, `tests/php/MediaAtomEmittersTest.php` |
| `helper-cases.json` | §7.3 helper decision: PHP `sgs_media_needs_helper` and JS `needsHelper` agree on every case | `scripts/tests/test-media-emitter-parity.mjs` |
| `matrix.json` | C3 selectors, §7.3 helper triggers, §7.4 paint nodes, AC-16's slot matrix | `scripts/tests/test-media-emitter-parity.mjs`, `tests/js/media-preview.test.js` |
| `breakouts.json` | FR-49-12 value safety: what every emitter refuses and keeps | `scripts/tests/test-media-emitter-parity.mjs`, `tests/php/MediaAtomEmittersTest.php` |
| `per-device-kinds.json` | FR-49-8, FR-49-9, §7.1: what may download at each width | `tests/php/MediaElementRenderTest.php` |
| `adopted-block.json`, `adopted-block.expected-attrs.json`, `adopted-overrides.json` | A hand-written adopted block, the attributes the generator must produce for it, and its classification overrides | `scripts/generate-media-attributes.mjs --self-test`, `scripts/check-media-contract.py`, `tests/js/media-panels*.test.js` |
| `pre-adoption/` | Each adopting block's `block.json` and classification overrides as they were before adoption, named `<slug>.block.json` | `scripts/adopt-media-blocks.mjs` |
| `hero/` | `install.mjs` builds a hero page with a media fixture on a mirror; `check.mjs` asserts focal position, overlay and parallax at 375, 768 and 1440 | run by hand against a mirror |
| `gradient-border/` | `install.sh` installs a page of gradient-border media; `check.mjs` asserts the resting and hover border at 375, 768 and 1440 | run by hand against a mirror |

`sizing-cases.json` marks each case `measured` (from the proof reports in `.claude/reports/2026-11-09-media-controls/`) or `to-prove` (the parity test settles it). Find the open ones with `grep -n '"source": "to-prove"' plugins/sgs-blocks/tests/fixtures/media/sizing-cases.json`.
