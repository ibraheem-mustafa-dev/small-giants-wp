---
paths:
  - "plugins/sgs-blocks/scripts/motion-qa/**"
  - "plugins/sgs-blocks/src/blocks/**/view.js"
  - "plugins/sgs-blocks/includes/**motion**"
---

# Motion QA

```bash
npm run qa:motion                    # all standing live probes (what the deploy runs)
npm run qa:motion:morph              # fx-morph changes SVG geometry (page 2113)
npm run qa:motion:motion-path        # motion-path re-animates on pass 2 (page 2109)
npm run qa:motion:good-by-default    # scrub/scramble/split-reveal/pin-scrub (pages 2103, 2603)
```

Wired into `build-deploy.py` as `step_motion_qa()` — ON by default for blocks deploys, after
`step_verify_payload()`, opt out with `--skip-motion-qa`.

Not in `prebuild`, on purpose — these need a live canary. Post-deploy is the honest home: the
canary is up by definition, and the payload gate has just proven the live plugin is this run's
payload.

The runner registers only the THREE probes that are standing checks with negative controls and
stable fixtures (`PROBES` in `scripts/motion-qa/run-live-probes.mjs`). Other probes in the
directory are one-shot artefacts, runnable by hand, not claimed as covered. Promoting one means
giving it a fixture and a negative control first.

## Load-bearing canary fixtures — the deploy gate depends on these pages

| Page | What it feeds |
|---|---|
| 2103 | scrub / scramble / split-reveal (good-by-default) |
| 2109 | motion-path repeat-trigger |
| 2113 | fx-morph geometry |
| 2603 | pin-scrub pin + good-by-default |
| 2740 | FR-38-31 flowing gradient, single `pastel` instance |
| 3037 | wave-gradient SIX-variant canvas split — the 0/0/0/0/1/1 proof |

All are titled `[GATE — DO NOT DELETE] …` on the canary so they survive a tidy-up. Deleting or
emptying any of them breaks every blocks deploy until the fixture is rebuilt. Probes reference
pages by ID (`?p=`), so renaming a title is safe but re-creating a page under a new ID is not.

Canary fixtures rot, and a probe cannot tell you which failure you have — every probe reports
UNANSWERED separately from a real failure, so read its output rather than assuming a regression. A
fixture authored before a schema change carries the old shape (e.g. a flat `"minHeight":"90vh"`
string where `minHeight` is now a tier object), which is silently coerced to `{}` — never restore a
trashed fixture, author fresh.
