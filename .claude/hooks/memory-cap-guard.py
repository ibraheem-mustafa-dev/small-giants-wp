#!/usr/bin/env python
"""PostToolUse(Write|Edit) guard — warn when MEMORY.md exceeds the autoload cap.

Doc-council enforcement fix (2026-06-06): "MEMORY.md > 24576 bytes silently drops the
bottom rules from autoload" was a prose rule (memory `feedback_memory_md_silent_dropout_safety_bug`)
with no enforcement — and it DID silently overflow (found at 25172 bytes this session).
PostToolUse cannot block an edit that already happened, so this surfaces a loud
systemMessage telling the session to archive stubs to MEMORY-archive.md NOW.

Fires on any edited file named MEMORY.md (covers the CC project-memory MEMORY.md).
FAIL-OPEN on any error.
"""
import json
import os
import sys

CAP = 24576


def main() -> int:
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
    except Exception:
        return 0

    if data.get("tool_name") not in ("Write", "Edit"):
        return 0
    path = (data.get("tool_input") or {}).get("file_path", "")
    if not isinstance(path, str) or os.path.basename(path) != "MEMORY.md":
        return 0
    try:
        size = os.path.getsize(path)
    except OSError:
        return 0
    if size <= CAP:
        return 0

    over = size - CAP
    msg = (
        f"MEMORY.md is {size} bytes — {over} OVER the {CAP}-byte autoload cap. "
        "Past this limit the BOTTOM rules silently stop autoloading (safety bug "
        "`feedback_memory_md_silent_dropout_safety_bug`). Archive the oldest/lowest-value "
        "stubs to MEMORY-archive.md NOW (move, don't delete) until `wc -c MEMORY.md` <= "
        f"{CAP}. Do not add more stubs until it's back under the cap."
    )
    print(json.dumps({"systemMessage": msg}))
    return 0


def _self_test():
    """Must fire on an over-cap MEMORY.md, stay silent under the cap and on other files."""
    import io
    import tempfile
    from contextlib import redirect_stdout

    def run(tool, path):
        buf = io.StringIO()
        sys.stdin = io.StringIO(json.dumps({"tool_name": tool, "tool_input": {"file_path": path}}))
        with redirect_stdout(buf):
            main()
        return buf.getvalue()

    failed = 0
    with tempfile.TemporaryDirectory() as d:
        big, small, other = (os.path.join(d, n) for n in ("big", "small", "other"))
        for sub in (big, small, other):
            os.mkdir(sub)
        open(os.path.join(big, "MEMORY.md"), "w").write("x" * (CAP + 1))
        open(os.path.join(small, "MEMORY.md"), "w").write("x" * CAP)
        open(os.path.join(other, "NOTES.md"), "w").write("x" * (CAP + 1))
        cases = [
            ("over-cap MEMORY.md warns", run("Write", os.path.join(big, "MEMORY.md")), True),
            ("MEMORY.md exactly at cap is silent", run("Edit", os.path.join(small, "MEMORY.md")), False),
            ("an over-cap file not named MEMORY.md is silent", run("Write", os.path.join(other, "NOTES.md")), False),
            ("a non-edit tool is ignored", run("Bash", os.path.join(big, "MEMORY.md")), False),
        ]
    for name, out, want in cases:
        ok = ("systemMessage" in out) == want
        failed += not ok
        print(f"  {'ok  ' if ok else 'FAIL'} {name}")
    print("SELF-TEST " + ("PASSED" if not failed else f"FAILED ({failed})"))
    return 1 if failed else 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(_self_test())
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)
