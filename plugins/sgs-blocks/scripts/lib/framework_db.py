"""framework_db.py - the one answer to "which framework database does this process use?".

$SGS_FRAMEWORK_DB names a database copy (a private reseed, a worktree, a test); without it the shared database under
~/.claude/skills/sgs-wp-engine/ is used. Every script a reseed runs asks this module instead of building the path
itself, so `sgs-update-v2.py --db <copy>` points the whole pipeline at the copy, not only the scripts that happened to
read the variable. check-framework-db-resolver.py fails a reseed child that builds the default path by hand.

The JavaScript twin is framework-db.js beside this file.
"""
from __future__ import annotations

import ast
import io
import os
import re
import tokenize
from pathlib import Path

ENV = "SGS_FRAMEWORK_DB"
_SKILL_DB = Path("skills") / "sgs-wp-engine" / "sgs-framework.db"

# A script that builds the default path by hand and neither reads the variable nor asks this module.
_NAMES_DEFAULT_DB = re.compile(r"""["'][^"'\n]*sgs-wp-engine[^"'\n]*["']""")
_HONOURS_ENV = ("SGS_FRAMEWORK_DB", "framework_db_path", "frameworkDbPath")


JS_STRIP = re.compile(r"""("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|//[^\n]*|/\*.*?\*/""", re.DOTALL)


def framework_db_path() -> Path:
    """$SGS_FRAMEWORK_DB when set, else the first non-empty shared database (~/.claude, then ~/.agents)."""
    override = os.environ.get(ENV)
    if override:
        return Path(override)
    for root in (".claude", ".agents"):
        candidate = Path.home() / root / _SKILL_DB
        if candidate.is_file() and candidate.stat().st_size > 0:
            return candidate
    return Path.home() / ".claude" / _SKILL_DB


def builds_default_db_by_hand(code: str) -> bool:
    """True when `code` (comments already removed) names the shared database path and does not honour the override."""
    if any(token in code for token in _HONOURS_ENV):
        return False
    return bool(_NAMES_DEFAULT_DB.search(code))


def python_code(source: str) -> str:
    """The source with comments and docstrings removed."""
    lines = source.splitlines(keepends=True)
    try:
        for node in ast.walk(ast.parse(source)):
            if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and ast.get_docstring(node, clean=False) is not None:
                doc = node.body[0]
                for number in range(doc.lineno - 1, doc.end_lineno):
                    lines[number] = "\n"
        source = "".join(lines)
        kept = [tok for tok in tokenize.generate_tokens(io.StringIO(source).readline) if tok.type != tokenize.COMMENT]
        return tokenize.untokenize(kept)
    except (SyntaxError, tokenize.TokenError):
        return source


def javascript_code(source: str) -> str:
    return JS_STRIP.sub(lambda m: m.group(1) or "", source)


def code_of(path: Path) -> str:
    """The script's code with comments (and, for Python, docstrings) removed."""
    text = path.read_text(encoding="utf-8", errors="replace")
    return python_code(text) if path.suffix == ".py" else javascript_code(text)
