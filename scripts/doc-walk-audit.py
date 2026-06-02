#!/usr/bin/env python3
"""doc-walk-audit.py — force a complete docs-registry + scan-folder doc walk.

Closes the 2026-06-02 gap where a /handoff updated only a handful of docs and
skipped the rest of the registry + the specs/plans/base-.claude folders.

Reads `.claude/docs-registry.yaml`:
  - canonical_docs[].path        — the tracked docs
  - doc_walk_scan_folders[]       — folders to enumerate (non-recursive) for
                                    *.md/*.yaml NOT in canonical_docs (untracked)

Modes
-----
  (default / --audit)
      Print a table of EVERY canonical doc + EVERY scan-folder doc, with each
      doc's last-commit date, sorted oldest-first so stale docs surface. Flags
      UNTRACKED docs (in a scan folder but not in canonical_docs). Pure
      visibility — you cannot claim "walked the registry" without seeing them.

  --gate --since <REF> [--strict]
      Enforcement. Lists every tracked/scanned doc NOT modified in the commit
      range <REF>..HEAD ("this session"). Each such doc needs an explicit verdict
      in `.claude/.doc-walk-receipt.md` (one line: `path — no-change: <reason>`
      OR `path — updated: <commit>`). With --strict, exits 1 if any tracked/
      scanned doc is neither modified this session nor has a receipt verdict —
      so a handoff gate that runs this blocks until the walk is complete.

Run from the repo root. Requires PyYAML + git.
"""
from __future__ import annotations
import argparse
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # Windows console: render em-dashes, not mojibake

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required (pip install pyyaml)", file=sys.stderr)
    sys.exit(2)

REPO = Path(__file__).resolve().parent.parent
REGISTRY = REPO / ".claude" / "docs-registry.yaml"
RECEIPT = REPO / ".claude" / ".doc-walk-receipt.md"
SCAN_EXTS = {".md", ".yaml", ".yml"}


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=REPO, capture_output=True, text=True
    ).stdout.strip()


def last_commit_date(path: str) -> str:
    out = git("log", "-1", "--format=%cs", "--", path)
    return out or "(uncommitted/untracked)"


def load_registry() -> dict:
    return yaml.safe_load(REGISTRY.read_text(encoding="utf-8"))


def canonical_paths(reg: dict) -> list[str]:
    return [d["path"] for d in reg.get("canonical_docs", []) if "path" in d]


def scan_folder_docs(reg: dict) -> list[str]:
    """Non-recursive *.md/*.yaml directly inside each doc_walk_scan_folder."""
    found: list[str] = []
    for entry in reg.get("doc_walk_scan_folders", []):
        folder = (REPO / entry["path"]).resolve()
        if not folder.is_dir():
            continue
        for f in sorted(folder.iterdir()):
            if f.is_file() and f.suffix in SCAN_EXTS:
                found.append(str(f.relative_to(REPO)).replace("\\", "/"))
    return found


def session_modified(since: str) -> set[str]:
    """Repo-relative paths modified in <since>..HEAD."""
    out = git("diff", "--name-only", f"{since}..HEAD")
    return {line.strip() for line in out.splitlines() if line.strip()}


def read_receipt() -> set[str]:
    """Paths given an explicit verdict in .doc-walk-receipt.md."""
    if not RECEIPT.exists():
        return set()
    verdicts: set[str] = set()
    for line in RECEIPT.read_text(encoding="utf-8").splitlines():
        line = line.strip().lstrip("-* ").strip()
        if " — " in line or " -- " in line:
            verdicts.add(line.split(" —" if " — " in line else " --")[0].strip())
    return verdicts


def audit(reg: dict) -> int:
    canon = canonical_paths(reg)
    canon_set = set(canon)
    scanned = scan_folder_docs(reg)
    untracked = [p for p in scanned if p not in canon_set]

    rows = [(last_commit_date(p), p, "registry") for p in canon]
    rows += [(last_commit_date(p), p, "UNTRACKED") for p in untracked]
    rows.sort(key=lambda r: r[0])  # oldest first — stale docs surface at top

    print(f"DOC-WALK AUDIT — {len(canon)} registry docs + {len(untracked)} untracked scan-folder docs")
    print("(oldest last-commit first — review stale docs against this session's work)\n")
    print(f"{'last commit':<12}  {'src':<9}  path")
    print("-" * 78)
    for date, path, src in rows:
        flag = "  <-- UNTRACKED: register or give a verdict" if src == "UNTRACKED" else ""
        print(f"{date:<12}  {src:<9}  {path}{flag}")
    if untracked:
        print(f"\n{len(untracked)} UNTRACKED doc(s) in scan folders — add to canonical_docs or record a no-change verdict.")
    return 0


def gate(reg: dict, since: str, strict: bool) -> int:
    canon = canonical_paths(reg)
    scanned = scan_folder_docs(reg)
    all_docs = list(dict.fromkeys(canon + scanned))  # dedupe, keep order
    modified = session_modified(since)
    verdicts = read_receipt()

    not_modified = [p for p in all_docs if p not in modified]
    unaccounted = [p for p in not_modified if p not in verdicts]

    print(f"DOC-WALK GATE — session range {since}..HEAD")
    print(f"  modified this session : {sum(1 for p in all_docs if p in modified)}")
    print(f"  not modified          : {len(not_modified)}")
    print(f"  of those, no verdict  : {len(unaccounted)}\n")
    if unaccounted:
        print("These docs were neither updated this session nor given a verdict in")
        print(".claude/.doc-walk-receipt.md (`path — no-change: <reason>` / `path — updated: <sha>`):")
        for p in unaccounted:
            print(f"  - {p}")
    if strict and unaccounted:
        print("\nGATE FAILED (--strict): account for every doc before completing the handoff.")
        return 1
    print("\nGATE OK" if not unaccounted else "\nGATE: verdicts needed (non-strict — not blocking).")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Force a complete docs-registry + scan-folder doc walk.")
    ap.add_argument("--audit", action="store_true", help="full table of every doc (default)")
    ap.add_argument("--gate", action="store_true", help="enforcement mode — requires --since")
    ap.add_argument("--since", help="session-base git ref for --gate (e.g. the previous handoff commit)")
    ap.add_argument("--strict", action="store_true", help="exit 1 if any doc is unaccounted (for handoff gating)")
    args = ap.parse_args()

    if not REGISTRY.exists():
        print(f"ERROR: {REGISTRY} not found", file=sys.stderr)
        return 2
    reg = load_registry()

    if args.gate:
        if not args.since:
            print("ERROR: --gate requires --since <ref> (the session-base commit)", file=sys.stderr)
            return 2
        return gate(reg, args.since, args.strict)
    return audit(reg)


if __name__ == "__main__":
    sys.exit(main())
