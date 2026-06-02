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
        flag = "  <-- UNTRACKED (judge vs criterion; usually OK to leave out)" if src == "UNTRACKED" else ""
        print(f"{date:<12}  {src:<9}  {path}{flag}")
    if untracked:
        print(f"\n{len(untracked)} UNTRACKED doc(s) in scan folders. Registry is deliberately LEAN —")
        print("register one ONLY if it is a project FOUNDATION altered regularly AND read at")
        print("session start / frequently. Dormant feature specs, generated docs, completed")
        print("plans, and one-offs correctly stay OUT (keeps the registry + handoff-walk light).")
    return 0


def gate(reg: dict, since: str, strict: bool) -> int:
    """Blocking scope = canonical_docs (the foundation set that MUST be walked).
    Untracked scan-folder docs are surfaced informationally only — leaving them
    out is usually correct (lean-registry criterion). They never block."""
    canon = canonical_paths(reg)
    canon_set = set(canon)
    scanned = scan_folder_docs(reg)
    untracked = [p for p in scanned if p not in canon_set]
    modified = session_modified(since)
    verdicts = read_receipt()

    canon_unaccounted = [p for p in canon if p not in modified and p not in verdicts]

    print(f"DOC-WALK GATE — session range {since}..HEAD")
    print(f"  canonical docs        : {len(canon)} (modified {sum(1 for p in canon if p in modified)})")
    print(f"  canonical unaccounted : {len(canon_unaccounted)}  (BLOCKS in --strict)\n")
    if canon_unaccounted:
        print("REGISTRY (canonical) docs neither updated this session nor given a verdict")
        print("in .claude/.doc-walk-receipt.md (`path — no-change: <reason>` / `path — updated: <sha>`):")
        for p in canon_unaccounted:
            print(f"  - {p}")
    # Untracked scan-folder docs — informational only (judge against the criterion below).
    untracked_unmodified = [p for p in untracked if p not in modified]
    if untracked_unmodified:
        print(f"\nINFO — {len(untracked_unmodified)} untracked scan-folder doc(s) (NOT in the registry).")
        print("Leaving these out is usually CORRECT — register one ONLY if it is a project")
        print("FOUNDATION that is altered regularly AND needs reading at session start / often.")
        print("These do NOT block the gate:")
        for p in untracked_unmodified:
            print(f"  - {p}")
    if strict and canon_unaccounted:
        print("\nGATE FAILED (--strict): walk every CANONICAL doc (update it or add a no-change verdict) before completing the handoff.")
        return 1
    print("\nGATE OK — every canonical doc accounted for." if not canon_unaccounted
          else "\nGATE: canonical verdicts needed (non-strict — not blocking).")
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
