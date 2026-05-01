"""Module 6 — Output Router.

Routes serialised block markup to the right destination:

  <header>  -> theme/sgs-theme/parts/header-<slug>.html
  <footer>  -> theme/sgs-theme/parts/footer-<slug>.html
  <main>    -> wp post create --post_type=page --post_content=...

S-tier bonus: also register header/footer as patterns in
theme/sgs-theme/patterns/.

Spec: .claude/plans/recogniser-v1.md  Module 6.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Serialiser bridge — prefer Module 5; fall back to a minimal local stub.
# ---------------------------------------------------------------------------

def _fallback_serialise_one(decision: dict[str, Any]) -> str:
    """Minimal stand-in serialiser used only if Module 5 isn't ready.

    Emits a single self-closing block comment. Mirrors WordPress' block
    comment format closely enough for downstream PHP parse_blocks() to
    accept it for non-nested blocks. Production runs MUST use Module 5.
    """
    match = decision.get("match", {}) or {}
    block_name = match.get("block_name", "core/group")
    attrs = match.get("extracted_attrs", {}) or {}
    inner = match.get("inner_blocks") or []

    attrs_json = json.dumps(attrs, ensure_ascii=False, separators=(",", ":"))

    if not inner:
        if attrs:
            return f"<!-- wp:{block_name} {attrs_json} /-->"
        return f"<!-- wp:{block_name} /-->"

    inner_markup = "\n".join(_fallback_serialise_one({"match": ib}) for ib in inner)
    if attrs:
        return (
            f"<!-- wp:{block_name} {attrs_json} -->\n"
            f"{inner_markup}\n"
            f"<!-- /wp:{block_name} -->"
        )
    return (
        f"<!-- wp:{block_name} -->\n"
        f"{inner_markup}\n"
        f"<!-- /wp:{block_name} -->"
    )


def _serialise(decision: dict[str, Any]) -> str:
    """Dispatch to Module 5 if importable; otherwise use the fallback."""
    try:
        from tools.recogniser.serialiser import serialise_one  # type: ignore
        return serialise_one(decision)
    except Exception:
        return _fallback_serialise_one(decision)


# ---------------------------------------------------------------------------
# Semantic-role inference
# ---------------------------------------------------------------------------

def _infer_role(decision: dict[str, Any]) -> str:
    """Infer semantic role.

    Prefers an explicit `semantic_role` key on the decision (Module 1
    output) but falls back to inspecting the matched block name and the
    section_id when absent.
    """
    role = decision.get("semantic_role")
    if role in {"header", "footer", "main", "aside"}:
        return role  # type: ignore[return-value]

    block_name = (decision.get("match") or {}).get("block_name", "") or ""
    section_id = (decision.get("section_id") or "").lower()

    if block_name == "sgs/header" or section_id in {"site-header", "header"}:
        return "header"
    if block_name == "sgs/footer" or section_id in {"site-footer", "footer", "shop"}:
        # `shop` is Mama's Munches' footer section_id (last decision in fixture)
        # but only treat as footer if block is sgs/footer.
        if block_name == "sgs/footer":
            return "footer"
    if "header" in section_id and block_name.startswith("sgs/"):
        return "header"
    if "footer" in section_id and block_name.startswith("sgs/"):
        return "footer"
    return "main"


# ---------------------------------------------------------------------------
# Pattern PHP header builders
# ---------------------------------------------------------------------------

def _slug_to_title(slug: str) -> str:
    """`mamas-munches` -> `Mamas Munches`. Pure cosmetic."""
    return " ".join(part.capitalize() for part in slug.split("-") if part)


def _pattern_php(
    *,
    role: str,
    slug: str,
    markup: str,
) -> str:
    """Build a WordPress pattern PHP file for a header or footer."""
    title = f"{_slug_to_title(slug)} {role.capitalize()}"
    pattern_slug = f"sgs-theme/{role}-{slug}"
    block_type = f"core/template-part/{role}"
    return (
        "<?php\n"
        "/**\n"
        f" * Title: {title}\n"
        f" * Slug: {pattern_slug}\n"
        f" * Categories: {role}\n"
        f" * Block Types: {block_type}\n"
        " * Inserter: yes\n"
        " */\n"
        "?>\n"
        f"{markup}\n"
    )


# ---------------------------------------------------------------------------
# Main entrypoint
# ---------------------------------------------------------------------------

def route_outputs(
    decisions_path: str,
    slug: str,
    theme_dir: str = "theme/sgs-theme",
    *,
    write_files: bool = True,
    emit_patterns: bool = True,
) -> dict[str, Any]:
    """Route decisions to template parts, patterns, and a post-content file.

    See module docstring for the contract.
    """
    decisions_file = Path(decisions_path)
    with decisions_file.open("r", encoding="utf-8") as fh:
        decisions: list[dict[str, Any]] = json.load(fh)

    theme_path = Path(theme_dir)
    parts_dir = theme_path / "parts"
    patterns_dir = theme_path / "patterns"
    reports_dir = Path("reports")

    # Bucket decisions by semantic role.
    buckets: dict[str, list[dict[str, Any]]] = {
        "header": [],
        "main": [],
        "aside": [],
        "footer": [],
    }
    for decision in decisions:
        role = _infer_role(decision)
        buckets[role].append(decision)

    warnings: list[str] = []

    # Aside fallback: concatenate aside sections with main if any.
    if buckets["aside"]:
        buckets["main"].extend(buckets["aside"])
        buckets["aside"] = []

    # Build markup blobs.
    def _markup_for(role: str) -> str:
        return "\n".join(_serialise(d) for d in buckets[role])

    header_markup = _markup_for("header")
    footer_markup = _markup_for("footer")
    main_markup = _markup_for("main")

    if not header_markup:
        warnings.append("No header section found in decisions — skipping header part/pattern.")
    if not footer_markup:
        warnings.append("No footer section found in decisions — skipping footer part/pattern.")
    if not main_markup:
        warnings.append("No main/body sections found in decisions — page content will be empty.")

    # Resolve output paths.
    header_part = parts_dir / f"header-{slug}.html"
    footer_part = parts_dir / f"footer-{slug}.html"
    header_pattern = patterns_dir / f"header-{slug}.php"
    footer_pattern = patterns_dir / f"footer-{slug}.php"
    post_content_file = reports_dir / f"{slug}-page-content.html"

    if write_files:
        parts_dir.mkdir(parents=True, exist_ok=True)
        patterns_dir.mkdir(parents=True, exist_ok=True)
        reports_dir.mkdir(parents=True, exist_ok=True)

        if header_markup:
            header_part.write_text(header_markup + "\n", encoding="utf-8")
        if footer_markup:
            footer_part.write_text(footer_markup + "\n", encoding="utf-8")

        if emit_patterns:
            if header_markup:
                header_pattern.write_text(
                    _pattern_php(role="header", slug=slug, markup=header_markup),
                    encoding="utf-8",
                )
            if footer_markup:
                footer_pattern.write_text(
                    _pattern_php(role="footer", slug=slug, markup=footer_markup),
                    encoding="utf-8",
                )

        # Always write the page-content file (even if empty) so the
        # orchestrator can detect "missing main" via the warning list.
        post_content_file.write_text(main_markup + ("\n" if main_markup else ""), encoding="utf-8")

    # Build the WP-CLI command. Use single-quote-escaped title and
    # cat-substitution for content to avoid shell escaping pain.
    title_human = f"{_slug_to_title(slug)} Homepage Test"
    title_escaped = title_human.replace("'", "'\\''")
    post_name = f"{slug}-homepage-test"
    # Path with forward slashes for cross-platform shell consumption.
    post_content_posix = post_content_file.as_posix()

    wp_cli_command = (
        "wp post create "
        "--post_type=page "
        "--post_status=publish "
        f"--post_title='{title_escaped}' "
        f"--post_name={post_name} "
        f"--post_content=\"$(cat {post_content_posix})\""
    )

    return {
        "header_part": header_part.as_posix() if header_markup else "",
        "footer_part": footer_part.as_posix() if footer_markup else "",
        "header_pattern": header_pattern.as_posix() if (emit_patterns and header_markup) else "",
        "footer_pattern": footer_pattern.as_posix() if (emit_patterns and footer_markup) else "",
        "post_content_file": post_content_file.as_posix(),
        "wp_cli_command": wp_cli_command,
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _build_argparser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Module 6 — Output Router for SGS Recogniser pipeline.",
    )
    parser.add_argument(
        "--decisions",
        required=True,
        help="Path to recogniser-decisions JSON (Module 4 output).",
    )
    parser.add_argument(
        "--slug",
        required=True,
        help="Client/site slug, e.g. mamas-munches.",
    )
    parser.add_argument(
        "--theme-dir",
        default="theme/sgs-theme",
        help="Path to the SGS theme directory (default: theme/sgs-theme).",
    )
    parser.add_argument(
        "--emit-patterns",
        action="store_true",
        help="Also write header/footer pattern PHP files (S-tier).",
    )
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="Dry run — compute paths and command but do not touch disk.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    args = _build_argparser().parse_args(argv)

    result = route_outputs(
        decisions_path=args.decisions,
        slug=args.slug,
        theme_dir=args.theme_dir,
        write_files=not args.no_write,
        emit_patterns=args.emit_patterns,
    )

    print(json.dumps(result, indent=2, ensure_ascii=False))
    print("\n# WP-CLI command (run via SSH on the WP host):")
    print(result["wp_cli_command"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
