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
    # js/mjs block comment
    for line in text.splitlines()[:40]:
        s = line.strip().lstrip("*").strip()
        if not s or s in ("/**", "/*", "*/"):
            continue
        if s.startswith(("#!", "//", "import", "const", "'use", '"use')):
            continue
        if s == path.name or s.startswith(path.name):
            continue
        return s
    return ""


_PKG = json.loads(PKG.read_text(encoding="utf-8"))
_PREBUILD_BLOB = _PKG.get("scripts", {}).get("prebuild", "")
_SCRIPTS_BLOB = " && ".join(_PKG.get("scripts", {}).values())


def prebuild_steps() -> list[str]:
    pkg = json.loads(PKG.read_text(encoding="utf-8"))
    chain = pkg.get("scripts", {}).get("prebuild", "")
    if not chain:
        raise SystemExit("FAIL-CLOSED: no prebuild chain in package.json")
    return [s.strip() for s in chain.split("&&") if s.strip()]


def resolve(step: str) -> Path | None:
    m = re.search(r"(?:python|node|npx)\s+(?:-m\s+)?([\w./-]+\.(?:py|js|mjs))", step)
    if not m:
        return None
    p = (REPO / "plugins" / "sgs-blocks" / m.group(1)).resolve()
    return p if p.exists() else None


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
    out.append("Derived from `package.json`'s `prebuild`, in execution order. This chain is")
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
        if len(purpose) > 155:
            purpose = purpose[:152].rstrip() + "…"
        out.append(f"| {i} | `{path.name}` | {purpose} |")
    out.append("")
    out.append(f"**{i} gating scripts.** Regenerate this whole section with:")
    out.append("")
    out.append("```bash")
    out.append("python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py")
    out.append("```")
    out.append("")
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
    out.append("Every runnable script, with the purpose its own author wrote. Most are NOT")
    out.append("wired into any chain, which is exactly why they get forgotten and rebuilt.")
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
            if not f.is_file() or f.suffix not in (".py", ".js", ".mjs"):
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
            if len(purpose) > 130:
                purpose = purpose[:127].rstrip() + "…"
            wired = "gate" if f.name in _PREBUILD_BLOB else ("npm" if f.name in _SCRIPTS_BLOB else "—")
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
