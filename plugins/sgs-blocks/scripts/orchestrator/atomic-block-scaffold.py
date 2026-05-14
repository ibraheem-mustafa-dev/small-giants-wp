#!/usr/bin/env python3
"""atomic-block-scaffold.py -- Spec 15 Phase 5b.8 atomic-block scaffold.

When the bucket-C classifier (5a.2) surfaces a new-block candidate, this
module emits the four minimal Gutenberg files (block.json + render.php
+ edit.js + save.js) for that block:

  - File names follow Spec 13 BEM: `.sgs-<slug>__<element>--<modifier>`
  - Attributes reflect the classifier's role (e.g. role=color emits
    a `backgroundColor` attribute on the wrapper; role=text emits a
    `text` attribute on a body element)
  - canonical_slot rows are emitted for the sgs-framework.db so the
    new block joins the vocabulary

Scaffolding defaults to a STAGING directory inside pipeline-state.
Use `--promote` to copy the scaffold into the canonical
`plugins/sgs-blocks/src/blocks/<slug>/` tree (the FR21-designated
channel through which new blocks enter SGS).

FR21 contract: the staged scaffold mutates NOTHING outside
pipeline-state/ until --promote is explicit.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import importlib.util as _ilu
import json
import re
import shutil
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent

_so_spec = _ilu.spec_from_file_location("staged_output", HERE / "staged_output.py")
_so = _ilu.module_from_spec(_so_spec)
_so_spec.loader.exec_module(_so)


def _load_trace():
    """Lazy-load orchestrator.trace.Trace; soft-fail to a no-op if unavailable."""
    from pathlib import Path as _Path
    here = _Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        candidate = parent / "orchestrator" / "trace.py"
        if candidate.exists():
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
        candidate2 = parent / "trace.py"
        if candidate2.exists() and parent.name == "orchestrator":
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate2)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
    return None


_Trace = _load_trace()

CANONICAL_BLOCKS_ROOT = Path("plugins/sgs-blocks/src/blocks")


# Role -> default attribute scaffold the new block will declare.
_ROLE_TO_ATTR_SCAFFOLD: dict[str, dict] = {
    "color": {
        "backgroundColor": {"type": "string", "default": ""},
        "textColor": {"type": "string", "default": ""},
    },
    "typography": {
        "headline": {"type": "string", "default": ""},
        "fontSize": {"type": "string", "default": ""},
    },
    "layout": {
        "padding": {"type": "string", "default": ""},
        "gap": {"type": "string", "default": ""},
    },
    "text-content": {
        "text": {"type": "string", "default": ""},
    },
    "image-object": {
        "image": {"type": "object", "default": {"id": None, "url": "", "alt": ""}},
    },
    "motion": {
        "animation": {"type": "string", "default": "none"},
        "duration": {"type": "number", "default": 300},
    },
}

_SLUG_RE = re.compile(r"^[a-z][a-z0-9-]*$")


class ScaffoldError(ValueError):
    pass


def _validate_slug(slug: str) -> None:
    if not _SLUG_RE.match(slug):
        raise ScaffoldError(
            f"invalid block slug {slug!r} -- must match {_SLUG_RE.pattern}"
        )
    if slug in {"hero", "container", "form"}:  # reserved-name guard
        raise ScaffoldError(f"slug {slug!r} clashes with an existing SGS block")


def _block_json_payload(slug: str, role: str, label: str | None = None) -> dict:
    """Emit minimal-but-valid block.json content."""
    attrs = _ROLE_TO_ATTR_SCAFFOLD.get(role, {"text": {"type": "string", "default": ""}})
    return {
        "$schema": "https://schemas.wp.org/trunk/block.json",
        "apiVersion": 3,
        "name": f"sgs/{slug}",
        "title": label or slug.replace("-", " ").title(),
        "category": "sgs-content",
        "icon": "block-default",
        "description": f"Scaffolded by spec-15-p5b.8 from a bucket-C role={role} gap. Needs human polish.",
        "textdomain": "sgs-blocks",
        "version": "0.1.0-scaffold",
        "attributes": attrs,
        "supports": {
            "html": False,
            "anchor": True,
            "sgs": {"imageControls": role == "image-object"},
        },
        "editorScript": "file:./index.js",
        "render": "file:./render.php",
        "style": "file:./style.css",
    }


def _render_php(slug: str, role: str) -> str:
    return f"""<?php
/**
 * Render template for sgs/{slug}.
 * Scaffolded by spec-15-p5b.8 -- needs human polish before shipping.
 * Spec 13 BEM: .sgs-{slug}__<element>--<modifier>
 */
$attrs = is_array($attributes ?? null) ? $attributes : array();
$class = 'sgs-{slug}';
?>
<div class="<?php echo esc_attr($class); ?>" <?php echo get_block_wrapper_attributes(); ?>>
    <?php echo esc_html($attrs['text'] ?? ''); ?>
    <!-- TODO(human): polish for role={role} -->
</div>
"""


def _edit_js(slug: str, role: str) -> str:
    return f"""import {{ useBlockProps }} from '@wordpress/block-editor';

/**
 * Editor for sgs/{slug}.
 * Scaffolded by spec-15-p5b.8 (role={role}) -- needs human polish.
 */
export default function Edit({{ attributes, setAttributes }}) {{
    const blockProps = useBlockProps({{ className: 'sgs-{slug}' }});
    return (
        <div {{ ...blockProps }}>
            {{/* TODO(human): polish for role={role} */}}
            <span>{{ attributes.text || 'sgs/{slug} (scaffold)' }}</span>
        </div>
    );
}}
"""


def _save_js(slug: str) -> str:
    """Dynamic block -- save returns null + render.php drives output."""
    return f"""// Dynamic block: render.php drives the output.
// Scaffolded by spec-15-p5b.8.
export default function Save() {{
    return null;
}}
"""


def _index_js(slug: str) -> str:
    return f"""import {{ registerBlockType }} from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit.js';
import Save from './save.js';

registerBlockType(metadata.name, {{ edit: Edit, save: Save }});
"""


def _style_css(slug: str) -> str:
    return f""".sgs-{slug} {{
    /* Spec 13 BEM block root. Scaffolded by spec-15-p5b.8. */
}}
"""


def scaffold(
    slug: str,
    role: str,
    run_id: str,
    label: str | None = None,
    root: Path = _so.PIPELINE_ROOT,
) -> dict:
    """Write the 6 scaffold files to the run's staging dir.

    Returns a manifest of files written + the block_attributes rows
    that would be inserted on promotion.
    """
    _validate_slug(slug)
    if role not in _ROLE_TO_ATTR_SCAFFOLD:
        # Unknown role -- fall back to text-content (safest scaffold).
        role = "text-content"

    target = _so.run_dir(run_id, root=root) / f"scaffold-{slug}"
    target.mkdir(parents=True, exist_ok=True)

    block_json = _block_json_payload(slug, role, label=label)
    files = {
        "block.json":  json.dumps(block_json, indent=2, ensure_ascii=False),
        "render.php":  _render_php(slug, role),
        "edit.js":     _edit_js(slug, role),
        "save.js":     _save_js(slug),
        "index.js":    _index_js(slug),
        "style.css":   _style_css(slug),
    }
    for name, content in files.items():
        (target / name).write_text(content, encoding="utf-8")

    # Block-attributes rows that would land in sgs-framework.db on promote.
    pending_rows = [
        {"block_slug": f"sgs/{slug}", "attr_name": k,
         "attr_type": v.get("type"), "canonical_slot": None}
        for k, v in block_json["attributes"].items()
    ]
    manifest = {
        "slug": f"sgs/{slug}",
        "role": role,
        "run_id": run_id,
        "staging_dir": str(target),
        "files": sorted(files),
        "pending_db_rows": pending_rows,
        "promoted": False,
    }
    (target / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Call-site 16 — Stage 9b: scaffold proposed (trace map §16).
    tr = (_Trace.for_run(_so.run_dir(run_id, root=root)) if _Trace else None)
    if tr:
        try:
            tr.event(
                stage="stage_9b_scaffold_proposed",
                slug=f"sgs/{slug}",
                role=role,
                run_id=run_id,
                staging_dir=str(target),
                files=sorted(files.keys()),
                pending_db_rows_count=len(pending_rows),
            )
        except Exception:
            pass

    return manifest


def promote(
    manifest: dict,
    canonical_root: Path = CANONICAL_BLOCKS_ROOT,
    db_path: Path | None = None,
) -> dict:
    """Copy the staged scaffold into canonical src/blocks/ + register in DB.

    FR21: this is the DESIGNATED channel through which new blocks enter
    canonical. Caller must confirm operator approval BEFORE calling.
    """
    slug = manifest["slug"].split("/", 1)[1]
    src = Path(manifest["staging_dir"])
    if not src.exists():
        raise ScaffoldError(f"staging dir missing: {src}")
    dest = canonical_root / slug
    if dest.exists():
        raise ScaffoldError(f"canonical block already exists: {dest}")
    canonical_root.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dest)

    db_rows_inserted = 0
    if db_path is not None and db_path.exists():
        conn = sqlite3.connect(str(db_path), timeout=5.0)
        try:
            # block_attributes is the canonical table per Spec 15 Phase 1.
            for row in manifest.get("pending_db_rows", []):
                conn.execute(
                    """INSERT OR IGNORE INTO block_attributes
                         (block_slug, attr_name, attr_type, canonical_slot)
                       VALUES (?, ?, ?, ?)""",
                    (row["block_slug"], row["attr_name"], row["attr_type"],
                     row["canonical_slot"]),
                )
                db_rows_inserted += 1
            conn.commit()
        finally:
            conn.close()

    manifest = {**manifest, "promoted": True, "canonical_path": str(dest),
                "db_rows_inserted": db_rows_inserted}
    (Path(manifest["staging_dir"]) / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Call-site 17 — Stage 9b: scaffold promoted (trace map §17).
    # run_dir is the parent of staging_dir (staging_dir = <run_dir>/scaffold-<slug>).
    _promote_run_dir = Path(manifest["staging_dir"]).parent
    tr = (_Trace.for_run(_promote_run_dir) if _Trace else None)
    if tr:
        try:
            tr.event(
                stage="stage_9b_scaffold_promoted",
                slug=manifest["slug"],
                canonical_path=str(dest),
                db_rows_inserted=db_rows_inserted,
                promoted=True,
            )
        except Exception:
            pass

    return manifest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--slug", required=True)
    parser.add_argument("--role", default="text-content")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--label", default=None)
    parser.add_argument("--promote", action="store_true",
                        help="Copy scaffold into canonical src/blocks/ + register in DB (FR21 channel)")
    parser.add_argument("--db-path", type=Path, default=None,
                        help="sgs-framework.db path (only used with --promote)")
    args = parser.parse_args(argv)

    manifest = scaffold(args.slug, args.role, args.run_id, label=args.label)
    print(json.dumps(manifest, indent=2))
    if args.promote:
        promoted = promote(manifest, db_path=args.db_path)
        print(json.dumps({"promoted": True, "canonical_path": promoted["canonical_path"],
                          "db_rows_inserted": promoted["db_rows_inserted"]}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
