# migrate-core-blocks — core→SGS block migrator (linter + fixer)

Swaps banned WordPress **core** blocks for their **SGS** replacements, so pages/patterns
built with core blocks (agents forget the "no core blocks with an SGS replacement" rule)
get converted to native SGS blocks — content + styling preserved, **never a silent attr drop**.

The core→SGS map is DB-first: `scripts/data/block-replacements.json` (the single source of
truth; `blocks.replaces` in sgs-framework.db is a derived copy). Each pair has a transformer
in `pairings/`. All SGS blocks are DYNAMIC, so wrapper targets (sgs/container, sgs/multi-button)
emit no save-wrapper `<div>` — the wrapper pairings carry only child-block markup
(`block_parser.inner_blocks_markup`), never the core save-wrapper.

## Two front-ends over one engine

| Script | Operates on | Use |
|--------|-------------|-----|
| `driver.py`   | theme FILES (`parts/`, `patterns/`, `templates/`) — one pairing per run | `python driver.py --pairing core/image [--write] [--file …]` |
| `lint-page.py`| a PAGE's `post_content` (block markup) — all pairings in one pass | see below |

Both share `driver.transform_text()` (leaf-first, re-parse-per-swap, with the **anti-silent-discard
gate**: every emitted attr must be declared by the target block.json, every source attr must be
mapped / dropped-with-reason / flagged as a gap — a loud failure, never a quiet loss).

## The page flow: lint → judge → apply (Bean's workflow, 2026-07-17)

1. **Lint / migrate** — fetch a page's markup (REST, read-only) and run the linter:
   ```bash
   curl -s -u "<user>:<app-pw>" "https://<site>/wp-json/wp/v2/pages/<id>?context=edit" \
     | python -c "import sys,json;print(json.load(sys.stdin)['content']['raw'])" > page.html
   python lint-page.py --input page.html --rel page-<id> --check          # lint only, exit 1 if banned
   python lint-page.py --input page.html --rel page-<id> --fix out.html --json report.json  # migrate
   ```
2. **Judge** — an agent reads `report.json` (`{swapped, refused:[{pairing,line,reason}],
   skipped_pairings, residual_banned, diff}`) and returns a verdict — **safe** (0 refused, 0 residual),
   **needs-tweak** (honest `dropped`/`refused` reasons but acceptable), or **unsafe** (residual banned
   with no pairing, or a refusal that smells like content loss) — WITHOUT re-running anything.
3. **Apply** — ONLY after a safe verdict: push `out.html` into the page via the **editor** (the wp-cli
   hook blocks direct DB writes). See **APPLY.md** for the exact `wp.blocks.parse → replaceBlocks →
   savePost` sequence, the backup-first rule, and the one-section-at-a-time guidance.

## Status
Proven on Indus page 13: 26/26 auto-migrate, 0 refused; editor-apply proven live on the CTA
section (renders identically, no invalid-block warnings). /qc-inline: 92/100 (ship).
