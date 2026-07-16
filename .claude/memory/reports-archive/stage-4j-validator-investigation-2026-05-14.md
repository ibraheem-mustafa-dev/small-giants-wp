# Stage 4j validator "invalid with no diagnostics" investigation

_Investigation date: 2026-05-14_

---

## What `validate_block_markup` actually does

`validate_block_markup` in `plugins/sgs-blocks/scripts/orchestrator/wp_integration.py` is a thin subprocess wrapper. It calls `python ~/.claude/hooks/wp-blocks.py validate <markup>` (the shared block CLI), captures stdout, and returns whatever JSON the CLI emits. If the CLI exits non-zero it raises `WpBlocksValidateError`; if it exits 0 it parses and returns the JSON as-is.

The CLI itself (`cmd_validate` in `wp-blocks.py`) does four checks on the markup string: (1) presence of WP block comment delimiters, (2) balanced open/close tags, (3) valid JSON in block attributes, and (4) that every block name exists in either the core SQLite DB or the SGS SQLite DB. It sets `status = "valid"` only when `issues == []`.

---

## Why it returned "invalid" on this run

The `extract.json` `block_markup` field (21,740 chars) contains six custom block names that are **not registered in `sgs-framework.db`**:

```
sgs/social-proof
sgs/footer
sgs/featured-product
sgs/header
sgs/gift-section
sgs/ingredients-section
```

The CLI found all six, found no matching row in either DB, appended `"Unknown block: <name>"` to `issues`, and correctly set `status: "invalid"`. Exit code was 0, so `validate_block_markup` parsed and returned the result normally.

**The reason `stage-4j.json` shows `errors: []` and `warnings: []` with `status: "invalid"** is a field-name mismatch. The CLI returns `{"status": ..., "issues": [...], "blocks_found": [...]}`. The orchestrator maps the result like this (lines 1800–1804):

```python
stage_4j_summary["validate_block_markup"] = {
    "status": validation.get("status"),
    "errors": validation.get("errors") or [],
    "warnings": validation.get("warnings") or [],
}
```

The CLI emits `"issues"`, not `"errors"` or `"warnings"`. Both `.get("errors")` and `.get("warnings")` return `None`, which the `or []` guards turn into empty lists. The `issues` list — which held all six diagnostic messages — is silently discarded.

---

## Is it a real problem?

**Verdict: gap-in-error-surfacing**

The "invalid" signal is a real signal — six bespoke Mama's Munches blocks (`sgs/header`, `sgs/footer`, `sgs/social-proof`, `sgs/featured-product`, `sgs/gift-section`, `sgs/ingredients-section`) are not in `sgs-framework.db`. Whether those blocks should be registered before the clone pipeline runs is a separate question. The validator correctly detected the gap.

However, the diagnostic detail is silently dropped by the orchestrator's field-name mismatch, so any operator looking at `stage-4j.json` sees `"invalid"` with no explanation — which makes the signal nearly useless.

Additionally, the stage is **advisory-only** at this point. The orchestrator comment (line 1790) explicitly says "Soft-fails so a missing CLI or malformed markup never blocks the autonomy decision." There is no `if status != "valid": halt` gate downstream — the pipeline continues regardless.

---

## Recommended fix

**Two-line fix in `sgs-clone-orchestrator.py`**, lines 1801–1804. Replace the field mapping to pass `issues` through as `errors`:

```python
stage_4j_summary["validate_block_markup"] = {
    "status": validation.get("status"),
    "errors": validation.get("issues") or validation.get("errors") or [],
    "warnings": validation.get("warnings") or [],
}
```

This surfaces the diagnostic messages while staying backwards-compatible if the CLI field name is ever normalised to `"errors"` later.

**Separately:** the six unknown blocks are Mama's Munches–specific bespoke components. They either need to be:
- Added to `sgs-framework.db` as planned/built blocks before the next pipeline run, **or**
- Accepted as expected unknowns for a client-specific draft and the validator updated to allow namespace-prefixed unknowns from the active client's style variation.

No action needed on `wp_integration.py` itself — it is working correctly.

---

## Evidence

**CLI run against actual markup:**
```
returncode: 0
{
  "status": "invalid",
  "issues": [
    "Unknown block: sgs/social-proof",
    "Unknown block: sgs/footer",
    "Unknown block: sgs/featured-product",
    "Unknown block: sgs/header",
    "Unknown block: sgs/gift-section",
    "Unknown block: sgs/ingredients-section"
  ],
  "blocks_found": ["sgs/heritage-strip","sgs/social-proof","sgs/footer",
    "sgs/hero","sgs/featured-product","sgs/header","sgs/gift-section",
    "sgs/ingredients-section","html","sgs/trust-bar"]
}
```

**Orchestrator mapping (the bug):**
```python
# CLI returns "issues", orchestrator reads "errors" and "warnings" — both None → []
"errors": validation.get("errors") or [],    # always []
"warnings": validation.get("warnings") or [], # always []
```

**stage-4j.json (the symptom):**
```json
{ "validate_block_markup": { "status": "invalid", "errors": [], "warnings": [] } }
```
