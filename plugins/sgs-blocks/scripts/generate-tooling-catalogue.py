#!/usr/bin/env python3
"""generate-tooling-catalogue.py — DERIVE the tooling catalogue in .claude/dev-setup.md.

WHY THIS IS GENERATED AND NOT HAND-WRITTEN
------------------------------------------
This repo's own doc rules say a roster written by hand is a copy that rots: the
`.claude/CLAUDE.md` spec cell drifted twice, `docs-registry.yaml` was dissolved for
listing deleted specs as live, and the CLAUDE.md stage-count line drifted three
times. A catalogue of ~60 enforcement scripts would rot faster than any of them.
So it is derived from two sources that CANNOT drift from the truth, because they
ARE the truth:

  1. the `prebuild` chain in plugins/sgs-blocks/package.json — the actual gate
     list, in actual execution order, as actually run by `npm run build`;
  2. each script's own header/docstring — the purpose its author wrote.

Regenerate with:  python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py
Check without writing:  ... --check   (exit 1 if dev-setup.md is out of date)

⚠ SCRIPT DIRECTORIES ARE PLURAL. Searching one and concluding "no such tool
exists" is a live failure mode in this repo — it is how a tool gets rebuilt that
already existed. Every directory is listed in the generated output for that reason.
"""
from __future__ import annotations

import ast
import json
import re
import sys
import warnings
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
PKG = REPO / "plugins" / "sgs-blocks" / "package.json"
DOC = REPO / ".claude" / "dev-setup.md"
START = "<!-- TOOLING-CATALOGUE:START -->"
END = "<!-- TOOLING-CATALOGUE:END -->"

# Directories that hold real, runnable project tooling. Worktrees under
# .claude/worktrees/ are mirrors of this tree and are deliberately excluded.
SCRIPT_DIR_GLOBS = ("scripts", "plugins/sgs-blocks/scripts", ".claude/scripts",
                    ".claude/hooks", ".claude/skills/wp-sgs-deploy/scripts")


def first_purpose(path: Path) -> str:
    """One-line purpose from the file's own header. Never invented."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""
    # python module docstring — via ast, NOT a regex. A regex that stops at the
    # first newline returns "" for the very common `"""\nText...` shape, and the
    # JS fallback below then returns the literal triple-quote as the "purpose".
    # That bug shipped in this generator's first run and put a bare triple-quote
    # in the catalogue for 4 of 59 rows. ast.get_docstring cannot make that error.
    if path.suffix == ".py":
        try:
            # Silence warnings raised by the file being READ (several catalogued
            # scripts have their own invalid-escape warnings). They are not this
            # generator's, and surfacing them here just makes a clean run look dirty.
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                doc = ast.get_docstring(ast.parse(text)) or ""
        except SyntaxError:
            doc = ""
        for line in doc.splitlines():
            line = line.strip()
            if not line:
                continue
            # Banner/underline rules ("=======", "-------") are not a purpose.
            # The JS path filtered these; the docstring path did not, so five
            # scripts catalogued a row of equals signs as their description.
            if set(line) <= set("-=_~ "):
                continue
            cleaned = re.sub(
                r"^" + re.escape(path.name) + r"\s*[—-]?\s*", "", line
            ).strip()
            # A docstring whose first line is just the filename (no description after
            # it) yields "" here — fall through to the next line rather than printing
            # the filename as its own purpose, which is what row 1 did.
            if not cleaned:
                continue
            return cleaned
        return ""
    # js/mjs header. TWO shapes, and missing the second left 21 rows BLANK:
    # a /** JSDoc */ block, and a bare `//` comment header. The whole
    # inspector-scan/rules/ family uses `//`, and the first version of this
    # generator SKIPPED every `//` line as noise — so the 23 files carrying the
    # richest blind-spot documentation in the repo catalogued as empty cells.
    # An empty cell in a discovery catalogue is worse than no row: it says
    # "looked, found nothing" about a file that documents itself thoroughly.
    stripped = []
    for line in text.splitlines()[:60]:
        s = line.strip()
        # PHP headers open with `<?php` and often `<?php /**` on ONE line, so the
        # opener has to be stripped before the comment marker, not after.
        if s.startswith("<?php"):
            s = s[5:].strip()
        if s.startswith("/**"):
            s = s[3:].strip()
        if s.startswith("#") and not s.startswith("#!"):
            s = s.lstrip("#").strip()
        if s.startswith("//"):
            s = s[2:].strip()
        else:
            s = s.lstrip("*").strip()
        stripped.append(s)
    for s in stripped:
        if not s or s in ("/**", "/*", "*/"):
            continue
        if s.startswith(("#!", "import ", "const ", "'use", '"use', "require(")):
            continue
        if s == path.name or s.startswith(path.name):
            continue
        # separator rules and banner lines carry no meaning
        if set(s) <= set("-=_~ "):
            continue
        # A header line wraps at ~90 chars, so the first LOGICAL sentence spans
        # several comment lines. Returning only the first physical line cuts it
        # mid-clause ("...schema this rule enforces" lost). Join continuations
        # until the sentence ends, then let the caller truncate.
        parts = [s]
        for nxt in stripped[stripped.index(s) + 1:]:
            if not nxt or set(nxt) <= set("-=_~ "):
                break
            if nxt.startswith(("(", "-", "*", "1.", "2.", "3.")):
                break
            if parts[-1].endswith("."):
                break
            parts.append(nxt)
            if len(" ".join(parts)) > 200:
                break
        return " ".join(parts).strip()
    return ""


_PKG = json.loads(PKG.read_text(encoding="utf-8"))
# ⛔ The gate chain no longer lives in the `prebuild` STRING (2026-08-24). It was
# split into `scripts/gates.json` + `run-gates.py`, so reading `prebuild` alone
# now sees SIX commands where it used to see 61 — and every reachability check
# built on it would report 55 live gates as unwired. The roster is spliced in
# here so "is this script in the prebuild chain?" keeps answering correctly.
_GATES_JSON = Path(__file__).resolve().parent / "gates.json"


def _roster_cmds() -> list[str]:
    if not _GATES_JSON.exists():
        raise SystemExit(f"FAIL-CLOSED: gate roster missing: {_GATES_JSON}")
    return [g["cmd"] for g in json.loads(_GATES_JSON.read_text(encoding="utf-8"))]


_PREBUILD_BLOB = " && ".join(
    [_PKG.get("scripts", {}).get("prebuild", "")] + _roster_cmds()
)
_SCRIPTS_BLOB = " && ".join(_PKG.get("scripts", {}).values())

# Runnable suffixes. .php and .sh were EXCLUDED from the table while being
# COUNTED in the directory row above — so the count said one thing and the
# table another, which is worse than either alone. 21 PHP tools under
# plugins/sgs-blocks/scripts were invisible, including golden-master-harness.php
# and product-search-leak-check.php (whose own header calls itself "the REAL
# gate", with the JS grep only a tripwire).
_RUNNABLE = (".py", ".js", ".mjs", ".php", ".sh")

# THERE ARE TWO GATE CHAINS, not one. package.json `prebuild` runs at build
# time; .githooks/sgs-gates.sh runs at COMMIT time — that is the chain holding
# the visual-diff gate, check-markup-neutral.py and check-editor-only.py.
# Reading only `prebuild` reported 9 actively-enforced commit gates as unwired,
# i.e. told a reader they were free to forget the gate that had just blocked them.
_GATES_SH = REPO / ".githooks" / "sgs-gates.sh"
_COMMIT_BLOB = _GATES_SH.read_text(encoding="utf-8", errors="replace") if _GATES_SH.exists() else ""
if not _COMMIT_BLOB:
    print("[tooling-catalogue] WARN: .githooks/sgs-gates.sh unreadable — commit-gate wiring will read as unwired", file=sys.stderr)


# A header claiming one wiring state while the chains say another is the most
# useful thing this catalogue can surface: a reader trusting the file's own words
# would be wrong. audit-inline-styling.js calls itself "not a build gate" and is
# prebuild step 36. Docstrings are copied faithfully, so without this the stale
# claim propagates carrying the catalogue's authority.
_STALE_WIRING = re.compile(r"not wired|not yet wired|not a build gate|advisory only", re.I)


def _header_text(path: Path, lines: int = 60) -> str:
    """The file's first N lines — the region a header/docstring occupies. Read in
    full so a wiring claim is caught wherever in the header it sits, not only if
    it lands inside the truncated one-line purpose."""
    try:
        with path.open(encoding="utf-8", errors="replace") as fh:
            return "".join(next(fh, "") for _ in range(lines))
    except OSError:
        return ""


def _clip(text: str, limit: int) -> str:
    """Truncate on a WORD boundary. Cutting mid-word produced 68 rows ending in
    fragments like "that regressi…", which reads as corruption, not abbreviation."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    if " " in cut:
        cut = cut[: cut.rindex(" ")]
    return cut.rstrip(" ,;:-") + "…"


_GATES_SH_TEXT = _COMMIT_BLOB  # already read above; alias for clarity in this section


def commit_gate_scripts() -> list[Path]:
    """Resolve every script `.githooks/sgs-gates.sh` actually invokes — matched by
    PATH, not by name substring, so a comment merely MENTIONING a filename (e.g.
    make-visual-diff-reports.py, named only in prose at sgs-gates.sh as a script a
    human runs BY HAND, never invoked by the hook itself) is correctly excluded."""
    pat = re.compile(
        r"(?:REPO_ROOT/)?((?:plugins/sgs-blocks/scripts|scripts)/[\w./-]+\.(?:py|js|mjs))"
    )
    out: list[Path] = []
    seen: set[str] = set()
    for rel in pat.findall(_GATES_SH_TEXT):
        p = (REPO / rel).resolve()
        if not p.exists():
            continue
        key = p.relative_to(REPO).as_posix()
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


# ---------------------------------------------------------------------------
# I/O INVENTORY — what each chain script reads and writes, DERIVED FROM CODE.
# ---------------------------------------------------------------------------
# This is a heuristic static-regex extraction over each script's OWN SOURCE
# (never its docstring/comments — a header's prose is exactly what this whole
# generator's stale-wiring check above proves cannot be trusted). It finds
# `open()`/`.read_text()`/`.write_text()`/`fs.readFileSync`/`fs.writeFileSync`
# call sites, `sqlite3.connect()` targets, SQL table names cross-checked
# against the REAL sgs-framework.db schema (never invented), argparse CLI
# flags, `os.environ`/`os.getenv` reads, and `sys.exit()`/`process.exitCode`
# sites. It is best-effort: a script whose I/O is built dynamically (string
# concatenation, a helper function two files away) will show as UNVERIFIED
# rather than have a plausible mechanism invented for it — per this repo's
# rule that an unverifiable claim is written as UNVERIFIED, not guessed.

_RE_PY_OPEN = re.compile(r"open\(\s*([^\n,)]{1,140})\s*(?:,\s*(['\"])([rwaxb+]+)\2)?")
_RE_READ_TEXT = re.compile(r"([A-Za-z_][\w.\[\]'\"]{0,80})\.read_text\(")
_RE_WRITE_TEXT = re.compile(r"([A-Za-z_][\w.\[\]'\"]{0,80})\.write_text\(")
_RE_SQLITE_CONNECT = re.compile(r"sqlite3\.connect\(\s*([^\n,)]{1,140})")
_RE_SQL_FROM = re.compile(r"\bFROM\s+([A-Za-z_]\w*)", re.I)
_RE_SQL_JOIN = re.compile(r"\bJOIN\s+([A-Za-z_]\w*)", re.I)
_RE_SQL_INTO = re.compile(r"\bINTO\s+([A-Za-z_]\w*)", re.I)
_RE_SQL_UPDATE = re.compile(r"\bUPDATE\s+([A-Za-z_]\w*)", re.I)
_RE_PY_EXIT = re.compile(r"sys\.exit\(\s*(\d+)\s*\)")
_RE_PY_SYSTEMEXIT = re.compile(r"raise SystemExit\(")
_RE_ARGPARSE = re.compile(r"add_argument\(\s*(['\"][-\w]+['\"])")
_RE_ENV = re.compile(r"os\.(?:environ\.get|getenv)\(\s*(['\"][A-Z_]+['\"])")
_RE_JSON_DUMP_TARGET = re.compile(r"json\.dump\([^,]+,\s*([A-Za-z_][\w.]{0,60})")
_RE_PATH_CONST = re.compile(
    r"^([A-Z][A-Z0-9_]{2,40})\s*=\s*(.{0,160}(?:Path\(|REPO\b|__file__|\.parent).{0,160})$",
    re.M,
)
_RE_JS_READ = re.compile(r"fs\.readFileSync\(\s*([^\n,)]{1,140})")
_RE_JS_WRITE = re.compile(r"fs\.writeFileSync\(\s*([^\n,)]{1,140})")
_RE_JS_EXITCODE = re.compile(r"process\.exitCode\s*=\s*(\d+)")
_RE_JS_EXIT = re.compile(r"process\.exit\(\s*(\d+)\s*\)")

# Real table names only — from sgs-framework.db's own sqlite_master, so a SQL
# keyword match against unrelated prose ("...the FROM the draft...") can never
# be reported as a table read/write. Kept as a literal list (not a live DB
# query) so this generator has no DB dependency; the roster is DB-authoritative
# per CLAUDE.md and was read via `/sgs-db` at authoring time, not invented.
_KNOWN_TABLES = {
    "blocks", "block_attributes", "block_supports", "block_selectors",
    "block_capabilities", "style_variations", "patterns", "theme_parts",
    "plugins", "hooks", "components", "deploy_steps", "gotchas",
    "pattern_coverage", "animation_tokens", "property_suffixes",
    "modifier_suffixes", "attribute_gap_candidates", "indexed_files", "docs",
    "markup_examples", "schema_metadata", "design_tokens",
    "html_tag_to_core_block", "slots", "roles", "block_composition",
    "variant_slots", "excluded_properties", "array_item_schema",
    "preset_implications", "fx_effects", "schema_migrations", "sqlite_master",
}
_GENERIC_NAMES = {"p", "f", "fh", "fp", "file", "path", "self", "expr", "fd"}


def _useful(name: str) -> bool:
    base = name.strip("'\" ").split(".")[0].split("[")[0]
    return base not in _GENERIC_NAMES and len(base) > 1


def extract_io(path: Path) -> dict:
    """Best-effort code-derived I/O facts for one script. See module note above."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return {}
    reads: set[str] = set()
    writes: set[str] = set()
    tables: set[str] = set()
    exits: set[str] = set()
    flags: set[str] = set()
    envs: set[str] = set()
    consts: dict[str, str] = {}

    if path.suffix == ".py":
        for m in _RE_PY_OPEN.finditer(text):
            mode = (m.group(3) or "").lower()
            target = m.group(1).strip()
            (writes if any(c in mode for c in "wax") else reads).add(target)
        for m in _RE_READ_TEXT.finditer(text):
            reads.add(m.group(1))
        for m in _RE_WRITE_TEXT.finditer(text):
            writes.add(m.group(1))
        for m in _RE_SQLITE_CONNECT.finditer(text):
            reads.add("sqlite3:" + m.group(1).strip())
        for m in _RE_SQL_FROM.finditer(text):
            if m.group(1) in _KNOWN_TABLES:
                tables.add(m.group(1))
        for m in _RE_SQL_JOIN.finditer(text):
            if m.group(1) in _KNOWN_TABLES:
                tables.add(m.group(1))
        for m in _RE_SQL_INTO.finditer(text):
            if m.group(1) in _KNOWN_TABLES:
                tables.add(m.group(1) + " (write)")
        for m in _RE_SQL_UPDATE.finditer(text):
            if m.group(1) in _KNOWN_TABLES:
                tables.add(m.group(1) + " (write)")
        for m in _RE_PY_EXIT.finditer(text):
            exits.add(m.group(1))
        if _RE_PY_SYSTEMEXIT.search(text):
            exits.add("SystemExit(non-zero on failure)")
        for m in _RE_ARGPARSE.finditer(text):
            flags.add(m.group(1).strip("'\""))
        for m in _RE_ENV.finditer(text):
            envs.add(m.group(1).strip("'\""))
        for m in _RE_JSON_DUMP_TARGET.finditer(text):
            writes.add("json.dump->" + m.group(1))
        for m in _RE_PATH_CONST.finditer(text):
            consts[m.group(1)] = m.group(2).strip()[:100]
    else:
        for m in _RE_JS_READ.finditer(text):
            reads.add(m.group(1).strip())
        for m in _RE_JS_WRITE.finditer(text):
            writes.add(m.group(1).strip())
        for m in _RE_JS_EXITCODE.finditer(text):
            exits.add(f"exitCode={m.group(1)}")
        for m in _RE_JS_EXIT.finditer(text):
            exits.add(f"exit({m.group(1)})")

    return {
        "reads": sorted(r for r in reads if _useful(r)),
        "writes": sorted(w for w in writes if _useful(w)),
        "tables": sorted(tables),
        "exits": sorted(exits),
        "flags": sorted(flags),
        "env": sorted(envs),
        "consts": consts,
    }


def build_io_section() -> list[str]:
    build_paths = []
    seen_build: set[str] = set()
    for step in prebuild_steps():
        p = resolve(step)
        if p is None:
            continue
        key = p.relative_to(REPO).as_posix()
        if key in seen_build:
            continue
        seen_build.add(key)
        build_paths.append(p)
    commit_paths = commit_gate_scripts()

    all_paths: dict[str, Path] = {}
    chain_of: dict[str, list[str]] = {}
    for p in build_paths:
        key = p.relative_to(REPO).as_posix()
        all_paths[key] = p
        chain_of.setdefault(key, []).append("build")
    for p in commit_paths:
        key = p.relative_to(REPO).as_posix()
        all_paths[key] = p
        chain_of.setdefault(key, []).append("commit")

    out: list[str] = []
    out.append("### I/O inventory — what each prebuild + commit-gate script reads/writes")
    out.append("")
    out.append(
        f"Scope: every script actually executed by the **prebuild chain** "
        f"({len(build_paths)} resolved scripts) and the **commit-gate chain** "
        f"(`.githooks/sgs-gates.sh`, {len(commit_paths)} resolved scripts) — "
        f"{len(all_paths)} unique scripts after de-duplication (2 run in both "
        f"chains). This is the set that runs automatically, so it is the set "
        f"documented with inputs/outputs first; the other ~450 scripts in the "
        f"full library below are NOT covered here."
    )
    out.append("")
    out.append(
        "Every field below is extracted from the script's own executable code "
        "(regex over `open()`/`.read_text()`/`.write_text()`/`fs.readFileSync`/"
        "`fs.writeFileSync`/`sqlite3.connect()`/SQL keywords/argparse/`sys.exit()`/"
        "`process.exitCode`) — **never from a docstring or comment**, per this "
        "generator's own stale-header finding above. A script with no recognised "
        "call shape (e.g. I/O built dynamically, or delegated to a helper module) "
        "shows **UNVERIFIED** rather than an invented mechanism. `Read-only` is "
        "stated explicitly whenever no write call site was found at all."
    )
    out.append("")
    for key in sorted(all_paths):
        p = all_paths[key]
        chains = "+".join(sorted(set(chain_of[key])))
        io = extract_io(p)
        out.append(f"**`{key}`** ({chains})")
        reads = io.get("reads") or []
        writes = io.get("writes") or []
        tables = io.get("tables") or []
        flags = io.get("flags") or []
        env = io.get("env") or []
        exits = io.get("exits") or []
        consts = io.get("consts") or {}
        if consts:
            const_str = "; ".join(f"`{k}` = {v}" for k, v in list(consts.items())[:6])
            out.append(f"- Path constants: {const_str}")
        if reads:
            out.append(f"- Reads: {', '.join('`' + r + '`' for r in reads[:12])}")
        else:
            out.append("- Reads: UNVERIFIED (no recognised read call site found)")
        if writes:
            out.append(f"- Writes: {', '.join('`' + w + '`' for w in writes[:12])}")
        else:
            out.append("- Writes: **read-only** — no write call site found in source")
        if tables:
            out.append(f"- DB tables (sgs-framework.db): {', '.join(tables)}")
        if flags:
            out.append(f"- CLI flags read: {', '.join('`' + f + '`' for f in flags[:15])}")
        if env:
            out.append(f"- Env vars read: {', '.join('`' + e + '`' for e in env)}")
        if exits:
            out.append(f"- Non-zero exit sites found: {', '.join(exits[:10])}")
        else:
            out.append("- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)")
        out.append("")
    return out


def prebuild_steps() -> list[str]:
    """Every command a build runs, in execution order.

    ⛔ `prebuild` is no longer the whole chain. Since 2026-08-24 it is five
    generators plus `run-gates.py --tier fast`; the 56 gates live in
    `scripts/gates.json`. Returning the raw `prebuild` split would document
    SIX commands and silently drop 55 gates from this catalogue — which is
    exactly what happened on the split commit before this function was fixed.
    The runner invocation is expanded back into its roster here, tier-tagged,
    so the catalogue keeps naming every gate that can block a build or a
    deploy.
    """
    pkg = json.loads(PKG.read_text(encoding="utf-8"))
    chain = pkg.get("scripts", {}).get("prebuild", "")
    if not chain:
        raise SystemExit("FAIL-CLOSED: no prebuild chain in package.json")

    roster = json.loads(_GATES_JSON.read_text(encoding="utf-8"))
    fast = [f"{g['cmd']}  # tier:fast" for g in roster if g["tier"] == "fast"]
    full = [f"{g['cmd']}  # tier:full (pre-deploy, build-deploy.py step_gate_full)"
            for g in roster if g["tier"] == "full"]

    steps: list[str] = []
    for raw in chain.split("&&"):
        step = raw.strip()
        if not step:
            continue
        if "run-gates.py" in step:
            steps.extend(fast + full)
        else:
            steps.append(step)
    return steps


def resolve(step: str) -> Path | None:
    m = re.search(r"(?:python|node|npx)\s+(?:-m\s+)?([\w./-]+\.(?:py|js|mjs))", step)
    if not m:
        return None
    p = (REPO / "plugins" / "sgs-blocks" / m.group(1)).resolve()
    return p if p.exists() else None


_REACH_CACHE = None


def reachability() -> dict:
    """script path -> execution channels, computed LIVE by the audit tool.

    This column used to come from three substring checks against package.json
    and .githooks. That under-reports badly: a script reached via a JSON
    manifest, a .claude hook, a skill, another script, a pytest import or a
    constructed importlib path all rendered as a dash. The catalogue was itself
    manufacturing the "looks dead but isn't" impression this library suffers
    from - inspector-scan's 16 rule modules, all 18 migrate-core-blocks pairing
    transformers and four pytest-imported oracle modules were shown unwired
    while running on every build.

    Calls audit-script-reachability.py directly rather than reading its JSON
    report, so this can never disagree with a stale artefact.
    """
    global _REACH_CACHE
    if _REACH_CACHE is not None:
        return _REACH_CACHE
    try:
        import importlib.util as _ilu
        spec = _ilu.spec_from_file_location(
            "_reach", str(Path(__file__).resolve().parent / "audit-script-reachability.py"))
        mod = _ilu.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _REACH_CACHE = {r["script"]: r["wired_via"] for r in mod.audit()["scripts"]}
    except Exception as exc:  # noqa: BLE001 - never break the catalogue over this
        print(f"[tooling-catalogue] WARN: reachability unavailable ({exc}); "
              "falling back to substring marks", file=sys.stderr)
        _REACH_CACHE = {}
    return _REACH_CACHE


def build() -> str:
    out: list[str] = [START, ""]
    out.append("### Where the tooling lives — **plural, and that matters**")
    out.append("")
    out.append("Searching one directory and concluding a tool does not exist is a live")
    out.append("failure mode here — it is how something gets rebuilt that already existed.")
    out.append("Check every row before building anything new.")
    out.append("")
    out.append("| Directory | Runnable files | Holds |")
    out.append("|---|---|---|")
    blurb = {
        "scripts": "repo-wide tooling (naming lint, site utilities)",
        "plugins/sgs-blocks/scripts": "**the bulk** — every gate, audit, codemod, DB and pipeline tool",
        ".claude/scripts": "working-area helpers",
        ".claude/hooks": "session + commit hooks (handoff preflight, doc gates)",
        ".claude/skills/wp-sgs-deploy/scripts": "deploy-skill helpers",
    }
    for d in SCRIPT_DIR_GLOBS:
        p = REPO / d
        if not p.exists():
            continue
        n = sum(1 for f in p.rglob("*") if f.is_file() and f.suffix in (".py", ".js", ".mjs", ".sh")
                and "node_modules" not in f.parts and "fixtures" not in f.parts)
        out.append(f"| `{d}/` | {n} | {blurb.get(d,'')} |")
    out.append("")
    out.append("Worktrees under `.claude/worktrees/` mirror this tree — never cite them as a source.")
    out.append("")
    out.append("### The prebuild gate chain — what actually blocks a build")
    out.append("")
    _full_ids = [g["id"] for g in json.loads(_GATES_JSON.read_text(encoding="utf-8"))
                 if g["tier"] == "full"]
    out.append(
        "Derived from `package.json`'s `prebuild` PLUS `scripts/gates.json`, in "
        "execution order. ⛔ **These are TWO tiers, not one chain.** The five "
        "generators and the `fast` tier run on every build. The `full` tier — "
        + ", ".join(f"`{i}`" for i in _full_ids) +
        " — was measured at 76.1% of the old chain's time and now runs "
        "PRE-DEPLOY only, via `build-deploy.py`'s `step_gate_full()`. Every gate "
        "that blocked before still blocks; only the timing changed. Run "
        "`npm run gate:list` for each gate's tier and measured cost, and "
        "`npm run gate:wired` to prove the `full` tier is still reachable. "
        "This chain is"
    )
    out.append("what `npm run build` runs first, and what every `/handoff` and deploy relies on.")
    out.append("Each entry's purpose is quoted from the script's own header.")
    out.append("")
    out.append("| # | Script | Purpose (from its own header) |")
    out.append("|---|---|---|")
    seen: set[str] = set()
    i = 0
    for step in prebuild_steps():
        path = resolve(step)
        if path is None:
            continue
        rel = path.relative_to(REPO).as_posix()
        if rel in seen:
            continue
        seen.add(rel)
        i += 1
        purpose = first_purpose(path).replace("|", chr(92) + "|")
        purpose = _clip(purpose, 155)
        out.append(f"| {i} | `{path.name}` | {purpose} |")
    out.append("")
    out.append(f"**{i} gating scripts.** Regenerate this whole section with:")
    out.append("")
    out.append("```bash")
    out.append("python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py")
    out.append("```")
    out.append("")
    out.extend(build_io_section())
    # ---- THE LIBRARY: every runnable script, wired or not.
    # The gate chain above is the part that CANNOT be forgotten — it runs whether
    # anyone remembers it or not. That makes it the least useful thing to
    # catalogue. The reason this section exists is the opposite case: a script
    # built for one task, committed, and then forgotten when the task closed, so
    # the next session hand-does the work or rebuilds the tool from scratch with
    # a fresh round of brainstorming, QC and testing. That has happened enough
    # times that the gate chain above is largely scar tissue from it.
    # THIS is the library to grep before building anything.
    out.append("")
    out.append("### The full library — grep this BEFORE building or hand-doing anything")
    out.append("")
    out.append("Every runnable script, with the purpose its own author wrote and HOW IT")
    out.append("RUNS - npm / commit-gate / hook / skill / manifest / script-call /")
    out.append("test-import / dynamic. A dash means NO execution path was found, which is")
    out.append("a QUESTION (superseded, or built and forgotten?) and never a verdict.")
    out.append("Before writing a new checker, codemod, census, probe or audit — or before")
    out.append("doing that work by hand — search this list. Adapting one of these is nearly")
    out.append("always cheaper than a fresh build plus its brainstorm, QC and tests.")
    out.append("")
    out.append("⚠ The naming is not consistent — the same idea appears as `census-*`,")
    out.append("`survey-*`, `audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`. Grep")
    out.append("for the SUBJECT (colour, gradient, token, element, inline, parity), never")
    out.append("for the verb you happen to have in mind.")
    out.append("")
    roots = [("plugins/sgs-blocks/scripts", "plugins/sgs-blocks"), ("scripts", ".")]
    for rel_root, _base in roots:
        rp = REPO / rel_root
        if not rp.exists():
            continue
        entries = []
        for f in sorted(rp.rglob("*")):
            if not f.is_file() or f.suffix not in _RUNNABLE:
                continue
            if any(x in f.parts for x in ("node_modules", "fixtures", "__pycache__", "tests")):
                continue
            entries.append(f)
        out.append(f"#### `{rel_root}/` — {len(entries)} scripts")
        out.append("")
        out.append("| Script | Wired | Purpose (its own words) |")
        out.append("|---|---|---|")
        for f in entries:
            purpose = first_purpose(f).replace("|", chr(92) + "|")
            purpose = _clip(purpose, 150)
            wired_marks = []
            if f.name in _PREBUILD_BLOB:
                wired_marks.append("build")
            if f.name in _COMMIT_BLOB:
                wired_marks.append("commit")
            if not wired_marks and f.name in _SCRIPTS_BLOB:
                wired_marks.append("npm")
            # Prefer the multi-channel reachability answer; fall back to the old
            # substring marks only if the audit tool could not be loaded.
            _reach = reachability()
            _key = f.relative_to(REPO).as_posix()
            if _key in _reach:
                _via = _reach[_key]
                wired = "+".join(_via) if _via else "—"
            else:
                wired = "+".join(wired_marks) if wired_marks else "—"
            # Search the WHOLE header, not the truncated purpose. The first
            # version searched `purpose` only, so it could catch a contradiction
            # solely when the phrase happened to land in the first ~150 chars.
            # It missed inspector-scan/run.js, whose header says "NOT wired into
            # prebuild yet" four lines down while the file is in BOTH chains —
            # exactly the case the check exists for.
            if wired_marks and _STALE_WIRING.search(_header_text(f)):
                purpose += " ⚠ **header disputes this — it IS wired**"
            sub = f.relative_to(rp).as_posix()
            out.append(f"| `{sub}` | {wired} | {purpose} |")
        out.append("")

    out.append(END)
    return "\n".join(out)


def main() -> int:
    check = "--check" in sys.argv
    doc = DOC.read_text(encoding="utf-8", newline="")
    nl = "\r\n" if "\r\n" in doc else "\n"
    section = build().replace("\n", nl)
    if START in doc and END in doc:
        pre, rest = doc.split(START, 1)
        _, post = rest.split(END, 1)
        new = pre + section + post
    else:
        raise SystemExit(
            f"FAIL-CLOSED: markers not found in {DOC}. Add {START} / {END} first."
        )
    if new == doc:
        print("[tooling-catalogue] up to date")
        return 0
    if check:
        print("[tooling-catalogue] OUT OF DATE — run without --check to regenerate")
        return 1
    DOC.write_text(new, encoding="utf-8", newline="")
    print(f"[tooling-catalogue] regenerated {DOC.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
