#!/usr/bin/env python3
"""
Every client theme snapshot carries the framework's shadow presets and shadow colour.

A snapshot is copied over the site's theme.json WHOLESALE (push-theme-snapshot.py), so a snapshot
that lacks the shadow presets leaves that client with none, and one that carries the old set puts
the old set back. The presets are framework-owned (only the site shadow colour follows the
client's palette), so this script makes each `sites/<client>/theme-snapshot.json` equal to the
framework `theme/sgs-theme/theme.json` for `settings.shadow` and `settings.custom.shadowColour`.

    python scripts/sync-snapshot-shadow-presets.py --survey          which snapshots differ
    python scripts/sync-snapshot-shadow-presets.py --fix             dry run
    python scripts/sync-snapshot-shadow-presets.py --fix --apply     write
    python scripts/sync-snapshot-shadow-presets.py --check           gate: exit 1 while any differs
    python scripts/sync-snapshot-shadow-presets.py --self-test       assertions + negative control

Text splices at the file's own indentation, never a JSON re-serialise (most snapshots do not
round-trip through json.dumps, so a re-serialise would rewrite the whole file).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
FRAMEWORK = ROOT / "theme" / "sgs-theme" / "theme.json"
SNAPSHOTS = sorted((ROOT / "sites").glob("*/theme-snapshot.json"))


def framework():
    settings = json.loads(FRAMEWORK.read_text(encoding="utf-8"))["settings"]
    return settings["shadow"], settings["custom"]["shadowColour"]


def indent_unit(text):
    """The file's indent step, read from the line after `"settings": {`."""
    m = re.search(r'\n([ \t]*)"settings": \{\n([ \t]*)"', text)
    if not m:
        raise ValueError('no "settings" object')
    return m.group(1), m.group(2)[len(m.group(1)):]


def shadow_text(block, pad, unit):
    """`"shadow": {...}` at indent `pad`, as the framework file writes it."""
    body = json.dumps(block, indent=unit, ensure_ascii=False)
    lines = body.split("\n")
    return "\n".join([lines[0]] + [pad + l for l in lines[1:]])


def synced(text, block, colour):
    """The snapshot text with the framework shadow block and shadow colour."""
    text = text.replace("\r\n", "\n")
    base, unit = indent_unit(text)
    pad = base + unit
    want = '"shadow": ' + shadow_text(block, pad, unit)
    m = re.search(r"\n%s\"shadow\": \{" % re.escape(pad), text)
    if m:
        start = m.start() + 1 + len(pad)
        end = text.index("\n%s}" % pad, start) + len("\n%s}" % pad)
        text = text[:start] + want + text[end:]
    else:
        opening = re.search(r'\n%s"settings": \{\n' % re.escape(base), text)
        text = text[:opening.end()] + pad + want + ",\n" + text[opening.end():]
    key = '"shadowColour": '
    inner = pad + unit
    custom = re.search(r'\n%s"custom": \{\n' % re.escape(pad), text)
    if not custom:
        shadow_end = text.index(want) + len(want)
        block_text = '%s"custom": {\n%s%s%s\n%s}' % (pad, inner, key, json.dumps(colour), pad)
        text = text[:shadow_end] + ",\n" + block_text + text[shadow_end:]
    else:
        existing = re.search(r"\n%s%s[^\n]*" % (re.escape(inner), re.escape(key)), text)
        if existing:
            comma = "," if existing.group(0).rstrip().endswith(",") else ""
            text = text[:existing.start() + 1] + inner + key + json.dumps(colour) + comma + text[existing.end():]
        else:
            text = text[:custom.end()] + inner + key + json.dumps(colour) + ",\n" + text[custom.end():]
    json.loads(text)
    return text


def plan():
    block, colour = framework()
    edits = {}
    for path in SNAPSHOTS:
        raw = path.read_text(encoding="utf-8").replace("\r\n", "\n")
        new = synced(raw, block, colour)
        if new != raw:
            edits[path] = new
    return edits


def self_test():
    ok = True
    block = {"defaultPresets": False, "presets": [{"name": "A", "slug": "a", "shadow": "0 1px 2px red"}]}

    def check(label, cond):
        nonlocal ok
        if not cond:
            ok = False
            print("FAIL " + label)

    for unit in ("  ", "    ", "\t"):
        src = json.dumps({"settings": {"layout": {}, "custom": {"a": 1}}}, indent=unit)
        out = synced(src, block, "var(--x)")
        d = json.loads(out)
        check("insert with unit %r" % unit, d["settings"]["shadow"] == block and d["settings"]["custom"]["shadowColour"] == "var(--x)")
        check("idempotent with unit %r" % unit, synced(out, block, "var(--x)") == out)
        old = json.dumps({"settings": {"shadow": {"presets": [{"slug": "old"}]}, "custom": {"shadowColour": "red"}}}, indent=unit)
        out2 = json.loads(synced(old, block, "var(--x)"))
        check("replace with unit %r" % unit, out2["settings"]["shadow"] == block and out2["settings"]["custom"]["shadowColour"] == "var(--x)")
    # Negative control: a check that compared only the slugs would miss a changed value.
    a = {"presets": [{"slug": "a", "shadow": "1"}]}
    b = {"presets": [{"slug": "a", "shadow": "2"}]}
    check("negative control: a changed value is a difference", a != b)
    print("Snapshot shadow sync self-test: " + ("PASS" if ok else "FAIL"))
    return ok


def main(argv):
    if "--self-test" in argv:
        return 0 if self_test() else 1
    edits = plan()
    if "--check" in argv:
        for p in sorted(edits):
            print("DIFFERS", p.relative_to(ROOT).as_posix())
        print("Snapshot shadow presets: %d snapshot(s) differ" % len(edits))
        return 1 if edits else 0
    for p, new in sorted(edits.items()):
        if "--fix" in argv and "--apply" in argv:
            p.write_text(new, encoding="utf-8", newline="\n")
        print(("wrote " if "--apply" in argv and "--fix" in argv else "would write ") + p.relative_to(ROOT).as_posix())
    print("%d snapshot(s) %s" % (len(edits), "updated" if "--fix" in argv and "--apply" in argv else "differ"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
