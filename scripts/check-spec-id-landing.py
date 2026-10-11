"""Prove every ID the Spec 32 and Spec 47 section ledgers carry lands in a live spec.

Spec 47 retires into Spec 48 and Spec 32 is rewritten slim (plan
.claude/plans/2026-10-10-claude-design-handover-standard.md, Task B4). Neither is edited in place, so this
check proves nothing the ledgers keep was lost in the rewrite. It reads scripts/spec-id-landing.json and
asserts, against the live specs in .claude/specs/ (never archive/ or _draft/):

  defined   each ID is DEFINED in its spec: a markdown heading, a bold lead at the start of a line or list
            item, or a table row's first cell. A mention in running prose does not count.
  cited     each ID appears anywhere in its spec.
  cut       each ID is not defined anywhere in its spec.
  walker    the spec's walker section numbers every item 1..N.
  sections  each cited section number is a heading in its spec.
  parts     each cited part letter still exists (a "Part X" mention or a document-map row "| **X.").
  terms     each named term appears in its spec.

An ID matches only on its own boundary, so FR-32-4 never matches FR-32-4a and FR-48-1 never matches FR-48A-1.

Usage:
    python scripts/check-spec-id-landing.py            # exit 1 on any failure
    python scripts/check-spec-id-landing.py --self-test  # three negative controls must each fail
"""
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = Path(__file__).resolve().parents[1]
MANIFEST = REPO / "scripts" / "spec-id-landing.json"
SPECS = REPO / ".claude" / "specs"


def id_pattern(ident: str) -> str:
    return r"(?<![A-Za-z0-9-])" + re.escape(ident) + r"(?![A-Za-z0-9])"


def is_definition(line: str, ident: str) -> bool:
    pat = id_pattern(ident)
    stripped = line.strip()
    if re.match(r"^#{1,6}\s", stripped) and re.search(pat, stripped):
        return True
    if re.match(r"^(?:[-*]\s+|\d+\.\s+)?\*\*[^*]*?" + pat, stripped):
        return True
    if stripped.startswith("|"):
        cells = stripped.strip("|").split("|")
        return bool(cells) and re.search(pat, cells[0]) is not None
    return False


def section_lines(text: str, number: str) -> list[str]:
    lines = text.splitlines()
    start = None
    level = 0
    for i, line in enumerate(lines):
        m = re.match(r"^(#{1,6})\s+§?\s?" + re.escape(number) + r"\.?\s", line)
        if m and start is None:
            start, level = i, len(m.group(1))
            continue
        if start is not None and re.match(r"^#{1," + str(level) + r"}\s", line):
            return lines[start:i]
    return lines[start:] if start is not None else []


def check(specs_dir: Path, manifest: dict) -> list[str]:
    failures = []
    texts = {}
    for key, name in manifest["specs"].items():
        path = specs_dir / name
        texts[key] = path.read_text(encoding="utf-8") if path.exists() else None
        if texts[key] is None:
            failures.append(f"spec {key}: {name} missing from {specs_dir}")

    def text(key):
        return texts.get(key) or ""

    for key, ids in manifest.get("defined", {}).items():
        lines = text(key).splitlines()
        for ident in ids:
            if not any(is_definition(line, ident) for line in lines):
                where = "mentioned only in prose" if re.search(id_pattern(ident), text(key)) else "absent"
                failures.append(f"{ident}: not defined in spec {key} ({where})")
    for key, ids in manifest.get("cited", {}).items():
        for ident in ids:
            if not re.search(id_pattern(ident), text(key)):
                failures.append(f"{ident}: not cited in spec {key}")
    for key, ids in manifest.get("cut", {}).items():
        lines = text(key).splitlines()
        for ident in ids:
            if any(is_definition(line, ident) for line in lines):
                failures.append(f"{ident}: cut by the ledger but still defined in spec {key}")
    for key, spec in manifest.get("walker_items", {}).items():
        body = section_lines(text(key), spec["section"])
        found = {int(m.group(1)) for line in body for m in [re.match(r"^\s*(\d+)\.\s", line)] if m}
        missing = [n for n in range(1, spec["items"] + 1) if n not in found]
        if missing:
            failures.append(f"spec {key} §{spec['section']}: walker items missing {missing}")
    for key, numbers in manifest.get("sections", {}).items():
        for number in numbers:
            if not section_lines(text(key), number):
                failures.append(f"spec {key}: no heading for §{number}")
    for key, letters in manifest.get("parts", {}).items():
        for letter in letters:
            if not re.search(r"Part " + letter + r"\b|\|\s*\*\*" + letter + r"\.", text(key)):
                failures.append(f"spec {key}: Part {letter} not found")
    for key, terms in manifest.get("terms", {}).items():
        for term in terms:
            if term not in text(key):
                failures.append(f"spec {key}: term '{term}' not found")
    return failures


def self_test(manifest: dict) -> int:
    """Each negative control must turn the check red; the clean copy must stay as it is."""
    baseline = check(SPECS, manifest)
    if baseline:
        print(f"self-test needs a clean baseline; the live specs fail {len(baseline)} checks")
        return 1
    target_key, ident = "48", "FR-47-3"
    name = manifest["specs"][target_key]
    controls = {
        "ID removed": lambda t: re.sub(id_pattern(ident), "FR-REMOVED", t),
        "ID only in prose": lambda t: "\n".join(
            re.sub(id_pattern(ident), "FR-REMOVED", line) if is_definition(line, ident) else line
            for line in t.splitlines()
        ) + f"\n\nRunning prose that mentions {ident} without defining it.\n",
        "ID only in archive": lambda t: re.sub(id_pattern(ident), "FR-REMOVED", t),
    }
    ok = True
    for label, mutate in controls.items():
        with tempfile.TemporaryDirectory() as tmp:
            tmp_specs = Path(tmp) / "specs"
            shutil.copytree(SPECS, tmp_specs, ignore=shutil.ignore_patterns("archive", "_draft"))
            path = tmp_specs / name
            original = path.read_text(encoding="utf-8")
            path.write_text(mutate(original), encoding="utf-8")
            if label == "ID only in archive":
                (tmp_specs / "archive").mkdir(exist_ok=True)
                (tmp_specs / "archive" / name).write_text(original, encoding="utf-8")
            result = [f for f in check(tmp_specs, manifest) if f.startswith(ident)]
            verdict = "FAILS as it must" if result else "PASSED (control is broken)"
            print(f"  control '{label}': {verdict}" + (f": {result[0]}" if result else ""))
            ok = ok and bool(result)
    print("self-test:", "OK" if ok else "BROKEN")
    return 0 if ok else 1


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if "--self-test" in sys.argv:
        return self_test(manifest)
    failures = check(SPECS, manifest)
    total = sum(len(v) for v in manifest.get("defined", {}).values())
    for failure in failures:
        print("FAIL", failure)
    print(f"{len(failures)} failure(s); {total} defined IDs checked across {len(manifest['specs'])} specs")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
