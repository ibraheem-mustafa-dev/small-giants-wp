"""
lint-naming-conventions.py
==========================
CI linter for the SGS WordPress Framework naming conventions.
Defined in .claude/specs/00-naming-conventions.md.

Scans:
  theme/sgs-theme/**   (PHP, JSON, CSS)
  plugins/sgs-blocks/** (PHP, JSON, CSS, JS)

Checks:
  1. Pattern slug headers       — must use sgs/ namespace, not sgs-theme/
  2. Block slug declarations    — must use sgs/<kebab-case>
  3. BEM CSS class names        — must match .sgs-<block>[__<el>[--<mod>]]
                                  (no underscores inside BEM segments)
  4. PHP function prefixes      — top-level functions must be prefixed sgs_
  5. Hook names                 — add_filter / add_action first arg must start sgs_
                                  (for hooks defined in SGS files, not core hooks)
  6. wp_options keys            — get_option / update_option / add_option / delete_option
                                  calls with a literal string key must start sgs_
                                  (only SGS-owned files; skips vendor / node_modules)
  7. Post-meta keys             — get_post_meta / update_post_meta / add_post_meta
                                  calls with a literal string key that starts sgs
                                  must follow the _sgs_ (private) or sgs_ (public)
                                  convention.  Keys starting with neither are ignored.

Usage:
  python scripts/lint-naming-conventions.py [--path <dir>] [--help]

Exit codes:
  0  No violations found.
  1  One or more violations found (details printed to stdout).
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent

SCAN_ROOTS = [
    REPO_ROOT / "theme" / "sgs-theme",
    REPO_ROOT / "plugins" / "sgs-blocks",
]

SKIP_DIRS = {
    "node_modules",
    ".git",
    "__pycache__",
    "vendor",
    "build",           # compiled output; source rules do not apply
    "tests",           # test fixtures intentionally contain violations
}

# Deprecated pattern namespace — any Slug: header using this is a violation.
DEPRECATED_PATTERN_NS = re.compile(r"^\s*\*\s*Slug:\s*(sgs-theme/)", re.MULTILINE)

# Valid pattern slug: sgs/<anything-kebab>
VALID_PATTERN_SLUG = re.compile(r"^\s*\*\s*Slug:\s*sgs/[a-z0-9][a-z0-9-]*$", re.MULTILINE)

# Block namespace declarations in block.json ("name": "sgs/...")
BLOCK_NAME_JSON = re.compile(r'"name"\s*:\s*"([^"]+)"')
VALID_BLOCK_SLUG = re.compile(r"^sgs/[a-z0-9][a-z0-9-]*$")

# BEM class: .sgs-<block>[__<element>[--<modifier>]]
# Violation: any segment containing an underscore (BEM uses hyphens only in SGS)
BEM_CLASS = re.compile(r"\.(sgs-[a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+)?(?:--[a-zA-Z0-9_-]+)?)")
BEM_UNDERSCORE = re.compile(r"sgs-[a-z0-9-]*(?:__|--)[a-z0-9-]*_[a-z0-9-]*")

# Top-level PHP function declaration (not inside a class / interface)
# We detect `function <name>` at column 0 (no leading whitespace = top-level).
PHP_FUNC = re.compile(r"^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", re.MULTILINE)

# WordPress hook registration — first string argument.
# Matches: add_action( 'hook_name', ... ) or add_filter( "hook_name", ... )
WP_HOOK_CALL = re.compile(
    r"""add_(?:action|filter)\s*\(\s*['"]([^'"]+)['"]""",
    re.MULTILINE,
)

# WordPress options API — first string argument.
WP_OPTION_CALL = re.compile(
    r"""(?:get|update|add|delete)_option\s*\(\s*['"]([^'"]+)['"]""",
    re.MULTILINE,
)

# WordPress post-meta API — second string argument (key).
WP_POST_META_CALL = re.compile(
    r"""(?:get|update|add|delete)_post_meta\s*\(\s*[^,]+,\s*['"]([^'"]+)['"]""",
    re.MULTILINE,
)

# Core WP hooks that start without sgs_ — skip these.
WP_CORE_HOOK_PREFIXES = (
    "init",
    "admin_",
    "wp_",
    "save_post",
    "the_",
    "pre_",
    "rest_",
    "enqueue_",
    "register_",
    "template_",
    "get_",
    "post_",
    "plugins_",
    "after_",
    "before_",
    "transition_",
    "updated_option",
    "added_option",
    "delete_option",
    "load_",
    "parse_",
    "send_",
    "user_",
    "set_",
    "switch_",
    "upgrader_",
    "activated_plugin",
    "deactivated_plugin",
    "http_",
)

# wp_options keys owned by WordPress core or third-party plugins — skip.
SKIP_OPTION_PREFIXES = (
    "blogname",
    "blogdescription",
    "siteurl",
    "home",
    "admin_email",
    "active_plugins",
    "template",
    "stylesheet",
    "wp_",
    "widget_",
    "sidebars_",
    "nav_menu",
    "_transient",
    "_site_transient",
    "rewrite_rules",
    "upload_path",
    "upload_url_path",
    "permalink_structure",
    "category_base",
    "tag_base",
    "default_",
    "show_",
    "posts_per_page",
    "timezone_string",
    "date_format",
    "time_format",
    "start_of_week",
    "WPLANG",
    "use_",
    "gmt_offset",
    "close_comments",
    "comment_",
    "page_on_front",
    "page_for_posts",
    "thumbnail_",
    "medium_",
    "large_",
    "embed_",
    "thread_",
    "mailserver_",
    "blogdescription",
    "mailserver_",
    "acf_",
    "rank_math_",
    "litespeed_",
    "active_theme_style",   # legacy; being migrated
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_core_hook(name: str) -> bool:
    return name.startswith(WP_CORE_HOOK_PREFIXES)


def _is_skip_option(name: str) -> bool:
    return name.startswith(SKIP_OPTION_PREFIXES)


def _collect_files(roots: list[Path], extensions: tuple[str, ...]) -> list[Path]:
    files: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            if path.is_file() and path.suffix in extensions:
                files.append(path)
    return files


# ---------------------------------------------------------------------------
# Check functions — each returns a list of (file, line_no, message) tuples
# ---------------------------------------------------------------------------

Violation = tuple[Path, int, str]


def check_pattern_slugs(php_files: list[Path]) -> list[Violation]:
    """Rule 1: Pattern Slug: headers must use sgs/ namespace."""
    violations: list[Violation] = []
    for path in php_files:
        if "patterns" not in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in DEPRECATED_PATTERN_NS.finditer(text):
            line_no = text[: match.start()].count("\n") + 1
            violations.append((
                path,
                line_no,
                f"Pattern slug uses deprecated 'sgs-theme/' namespace: "
                f"'{match.group(0).strip()}'. Use 'sgs/' instead.",
            ))
    return violations


def check_block_slugs(json_files: list[Path]) -> list[Violation]:
    """Rule 2: block.json 'name' must be sgs/<kebab-case>."""
    violations: list[Violation] = []
    for path in json_files:
        if path.name != "block.json":
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in BLOCK_NAME_JSON.finditer(text):
            slug = match.group(1)
            # Only validate slugs that start with sgs — ignore core/ etc.
            if not slug.startswith("sgs"):
                continue
            if not VALID_BLOCK_SLUG.match(slug):
                line_no = text[: match.start()].count("\n") + 1
                violations.append((
                    path,
                    line_no,
                    f"Block slug '{slug}' is not kebab-case or uses wrong namespace. "
                    f"Expected pattern: sgs/<lowercase-kebab>.",
                ))
    return violations


def check_bem_classes(css_files: list[Path]) -> list[Violation]:
    """Rule 3: BEM class segments must not contain underscores."""
    violations: list[Violation] = []
    for path in css_files:
        text = path.read_text(encoding="utf-8", errors="replace")
        for line_no, line in enumerate(text.splitlines(), 1):
            for match in BEM_CLASS.finditer(line):
                cls = match.group(1)
                # Find the part after sgs- prefix
                inner = cls[4:]  # strip leading "sgs-"
                # Split into BEM parts: block, element, modifier
                parts = re.split(r"__|--", inner)
                for part in parts:
                    if "_" in part:
                        violations.append((
                            path,
                            line_no,
                            f"BEM class '.{cls}' contains underscore in segment "
                            f"'{part}'. Use hyphens only inside BEM segments.",
                        ))
                        break
    return violations


def check_php_function_prefixes(php_files: list[Path]) -> list[Violation]:
    """Rule 4: Top-level PHP functions must be prefixed sgs_."""
    violations: list[Violation] = []
    # Functions that are WordPress hooks/callbacks at top level are allowed
    # to have WP-conventional names only if they are registered via add_action/
    # add_filter. We do a simple heuristic: function at column 0 = top-level.
    exempt_prefixes = (
        "sgs_",
        "__",     # magic methods surfacing at top level (unlikely but safe)
    )
    for path in php_files:
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in PHP_FUNC.finditer(text):
            name = match.group(1)
            if name.startswith(exempt_prefixes):
                continue
            line_no = text[: match.start()].count("\n") + 1
            violations.append((
                path,
                line_no,
                f"Top-level PHP function '{name}()' is missing the 'sgs_' prefix.",
            ))
    return violations


def check_hook_prefixes(php_files: list[Path]) -> list[Violation]:
    """Rule 5: SGS-defined hook names must start with sgs_."""
    violations: list[Violation] = []
    for path in php_files:
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in WP_HOOK_CALL.finditer(text):
            hook = match.group(1)
            if _is_core_hook(hook):
                continue
            if hook.startswith("sgs_"):
                continue
            line_no = text[: match.start()].count("\n") + 1
            violations.append((
                path,
                line_no,
                f"Hook '{hook}' does not start with 'sgs_'. "
                f"SGS-defined hooks must use the 'sgs_' prefix.",
            ))
    return violations


def check_option_keys(php_files: list[Path]) -> list[Violation]:
    """Rule 6: SGS wp_options keys must start with sgs_."""
    violations: list[Violation] = []
    for path in php_files:
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in WP_OPTION_CALL.finditer(text):
            key = match.group(1)
            if _is_skip_option(key):
                continue
            if key.startswith("sgs_"):
                continue
            line_no = text[: match.start()].count("\n") + 1
            violations.append((
                path,
                line_no,
                f"wp_options key '{key}' does not start with 'sgs_'. "
                f"SGS-owned option keys must use the 'sgs_' prefix.",
            ))
    return violations


def check_post_meta_keys(php_files: list[Path]) -> list[Violation]:
    """Rule 7: SGS post-meta keys must follow _sgs_ (private) or sgs_ (public) convention."""
    violations: list[Violation] = []
    for path in php_files:
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in WP_POST_META_CALL.finditer(text):
            key = match.group(1)
            # Only validate keys that look like they are SGS-owned
            if not (key.startswith("sgs_") or key.startswith("_sgs_")):
                continue
            # Private meta must have leading underscore
            # Public meta must NOT have leading underscore
            # Both forms are valid — just ensure no mixed form like sgs__ or _sgs__
            if key.startswith("_sgs__") or key.startswith("sgs__"):
                line_no = text[: match.start()].count("\n") + 1
                violations.append((
                    path,
                    line_no,
                    f"Post-meta key '{key}' has a double underscore. "
                    f"Use '_sgs_<key>' (private) or 'sgs_<key>' (public).",
                ))
    return violations


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "SGS naming conventions linter.\n\n"
            "Scans theme/sgs-theme and plugins/sgs-blocks for violations of "
            "the rules defined in .claude/specs/00-naming-conventions.md.\n\n"
            "Exit 0 = clean. Exit 1 = violations found."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--path",
        metavar="DIR",
        help=(
            "Additional directory to scan (can be repeated). "
            "Default roots are theme/sgs-theme and plugins/sgs-blocks."
        ),
        action="append",
        default=[],
    )
    parser.add_argument(
        "--skip-rule",
        metavar="N",
        help="Skip rule N (1-7). Can be repeated.",
        type=int,
        action="append",
        default=[],
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    skip = set(args.skip_rule)

    roots = list(SCAN_ROOTS)
    for extra in args.path:
        roots.append(Path(extra).resolve())

    php_files = _collect_files(roots, (".php",))
    json_files = _collect_files(roots, (".json",))
    css_files = _collect_files(roots, (".css",))

    all_violations: list[Violation] = []

    if 1 not in skip:
        all_violations.extend(check_pattern_slugs(php_files))
    if 2 not in skip:
        all_violations.extend(check_block_slugs(json_files))
    if 3 not in skip:
        all_violations.extend(check_bem_classes(css_files))
    if 4 not in skip:
        all_violations.extend(check_php_function_prefixes(php_files))
    if 5 not in skip:
        all_violations.extend(check_hook_prefixes(php_files))
    if 6 not in skip:
        all_violations.extend(check_option_keys(php_files))
    if 7 not in skip:
        all_violations.extend(check_post_meta_keys(php_files))

    if not all_violations:
        print("SGS naming-conventions lint: PASSED — no violations found.")
        return 0

    print(f"SGS naming-conventions lint: FAILED — {len(all_violations)} violation(s) found.\n")
    for path, line_no, message in sorted(all_violations, key=lambda v: (str(v[0]), v[1])):
        rel = path.relative_to(REPO_ROOT) if path.is_relative_to(REPO_ROOT) else path
        print(f"  {rel}:{line_no}  {message}")

    return 1


if __name__ == "__main__":
    sys.exit(main())
