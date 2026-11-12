"""framework_db.py - the one answer to "which framework database does this process use?".

$SGS_FRAMEWORK_DB names a database copy (a private reseed, a worktree, a test); without it the shared database under
~/.claude/skills/sgs-wp-engine/ is used. Every script asks this module for the database, the skill folders and the
`db data` CSV folder instead of building a path under ~/.claude or ~/.agents itself, so `sgs-update-v2.py --db <copy>`
points the whole pipeline at the copy and a folder reorganisation is a one-file change.
check-framework-db-resolver.py fails a script that builds one of those paths by hand.

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
SKILL_ROOTS = (".claude",)
FRAMEWORK_SKILL = "sgs-wp-engine"

# A script that builds the default path by hand and neither reads the variable nor asks this module.
# A quoted string that is the shared skill folder or a path ending in the database file (a message that merely mentions
# the file name is not one).
_NAMES_DEFAULT_DB = re.compile(r"""["'][^"'\n]*sgs-wp-engine[^"'\n]*["']|["'](?:[^"'\n]*[/\\])?sgs-framework\.db["']""")
# A line of code that builds a path under a hard-coded ~/.claude or ~/.agents root to the shared skills, their
# database or the `db data` folder (reading $SGS_FRAMEWORK_DB does not excuse it), or any use of the retired ~/.agents root.
_HOME_ANCHOR = re.compile(r"~[/\\]|Path\.home\s*\(|homedir\s*\(|expanduser|\bHOME\b|USERPROFILE|Users[/\\]")
_CLAUDE_ROOT = re.compile(r"\.claude\b")
_AGENTS_ROOT = re.compile(r"\.agents\b")
_SKILL_TARGET = re.compile(r"skills|sgs-wp-engine|sgs-framework|db data|db\\ data")
# Files that own the hard-coded roots.
RESOLVER_FILES = {"framework_db.py", "framework-db.js"}
# Reading the variable, or calling the resolver (a bare import does not count).
_HONOURS_ENV = re.compile(r"SGS_FRAMEWORK_DB|framework_db_path\s*\(|frameworkDbPath\s*\(")


JS_STRIP = re.compile(r"""("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|//[^\n]*|/\*.*?\*/""", re.DOTALL)


def shared_framework_db_path() -> Path:
    """The shared database, ignoring $SGS_FRAMEWORK_DB: the non-empty one under ~/.claude."""
    for root in SKILL_ROOTS:
        candidate = Path.home() / root / _SKILL_DB
        if candidate.is_file() and candidate.stat().st_size > 0:
            return candidate
    return Path.home() / SKILL_ROOTS[0] / _SKILL_DB


def framework_db_path() -> Path:
    """$SGS_FRAMEWORK_DB when set, else the shared database."""
    override = os.environ.get(ENV)
    if override:
        return Path(override)
    return shared_framework_db_path()


SCHEMA_REL = "plugins/sgs-blocks/scripts/dbschema/schema.sql"


def shared_schema_mismatch(repo_root: Path) -> str | None:
    """Why this tree must not write the shared database, or None when it may.

    The shared database follows `origin/main`'s schema; every other session gates against it. A tree whose
    `schema.sql` differs from `origin/main`'s (a feature branch adding a column) would put that schema into the
    shared database, and every ship from `main` then fails `check_schema_drift`. Such a tree writes a copy instead
    ($SGS_FRAMEWORK_DB). Returns None when $SGS_FRAMEWORK_DB is set, when the tree's schema equals origin/main's, or
    when git cannot answer (no repo, no origin/main): the guard only refuses what it can prove."""
    if os.environ.get(ENV):
        return None
    import subprocess
    try:
        main_schema = subprocess.run(["git", "-C", str(repo_root), "show", f"origin/main:{SCHEMA_REL}"],
                                     capture_output=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    local = Path(repo_root) / SCHEMA_REL
    if main_schema.returncode != 0 or not local.is_file():
        return None
    def norm(b: bytes) -> bytes:
        return b.replace(b"\r\n", b"\n").strip()
    if norm(main_schema.stdout) == norm(local.read_bytes()):
        return None
    return (f"this tree's {SCHEMA_REL} differs from origin/main's, so writing the shared framework database would give "
            f"every other session a schema main does not have; set {ENV} to a private copy (for example the one "
            f"`publish-framework-db.py begin --copy` makes) and run again")


def skills_root() -> Path:
    """The folder that holds the skills: ~/.claude/skills."""
    for root in SKILL_ROOTS:
        candidate = Path.home() / root / "skills"
        if candidate.is_dir():
            return candidate
    return Path.home() / SKILL_ROOTS[0] / "skills"


def skill_dir(name: str = FRAMEWORK_SKILL) -> Path:
    """One skill's folder: ~/.claude/skills/<name>."""
    for root in SKILL_ROOTS:
        candidate = Path.home() / root / "skills" / name
        if candidate.is_dir():
            return candidate
    return Path.home() / SKILL_ROOTS[0] / "skills" / name


def skill_scripts_dir() -> Path:
    """The framework skill's own tools (sgs-db.py, sgs-update.py). They live in the shared skill folder whatever
    database copy $SGS_FRAMEWORK_DB names, so a script that runs one asks here, not at the database's folder."""
    return skill_dir() / "scripts"


def shared_csv_dir() -> Path:
    """The shared database's reference CSV folder (`db data`, the space is literal)."""
    return skill_dir() / "db data"


def builds_default_db_by_hand(code: str) -> bool:
    """True when `code` (comments already removed) names the shared database path and does not honour the override."""
    if _HONOURS_ENV.search(code):
        return False
    return bool(_NAMES_DEFAULT_DB.search(code))


def hand_built_skill_lines(code: str) -> list[str]:
    """Lines (a statement split over two lines counts as one) of `code`, comments already removed, that build a path under
    a hard-coded ~/.claude or ~/.agents root to the skills, the framework database or its `db data` folder, whether or not
    the script also reads $SGS_FRAMEWORK_DB. lib/framework_db.py and lib/framework-db.js own those roots."""
    lines = code.splitlines()
    found: list[str] = []
    for index, line in enumerate(lines):
        window = line + " " + (lines[index + 1] if index + 1 < len(lines) else "")
        if _AGENTS_ROOT.search(line) and _SKILL_TARGET.search(window) or _AGENTS_ROOT.search(line) and _HOME_ANCHOR.search(window):
            found.append(line.strip())
        elif _CLAUDE_ROOT.search(line) and _HOME_ANCHOR.search(window) and _SKILL_TARGET.search(window):
            found.append(line.strip())
    return found


def builds_skill_path_by_hand(code: str) -> bool:
    return bool(hand_built_skill_lines(code))


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
