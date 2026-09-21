#!/usr/bin/env python3
"""
One writer for a shadow's colour: the ShadowControl. Any other colour row for the same attribute
is a duplicate and is removed.

ShadowControl owns a shadow's shape AND its colour and opacity (per layer, Normal and Hover).
Blocks that also listed the same colour attribute as a row in their Colour panel showed the client
two controls for one value, and the second could not show a per-layer colour list (it drew a
garbled swatch for a multi-layer stack). This script finds each such row, proves the block's own
ShadowControl mount covers every attribute the row writes, and only then removes the row.

    python scripts/dedupe-shadow-colour-rows.py --survey          every duplicate row and its status
    python scripts/dedupe-shadow-colour-rows.py --fix             dry run
    python scripts/dedupe-shadow-colour-rows.py --fix --apply     write
    python scripts/dedupe-shadow-colour-rows.py --check           gate: exit 1 while a covered duplicate exists
    python scripts/dedupe-shadow-colour-rows.py --self-test       assertions + negative control

A row is a `{ key: ..., states: [...] }` object in a `rows` array whose `setAttributes` writes a
`...ShadowColour...` attribute. Rows are found by indentation (the files are consistently
formatted), not by a JS parser. A row whose attribute the mount does NOT cover is reported
NOT-COVERED and left alone, so the only writer of a value is never deleted.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PLUGIN = ROOT / "plugins" / "sgs-blocks"
SCAN = [PLUGIN / "src" / "blocks", PLUGIN / "src" / "shared"]
WRITE = re.compile(r"setAttributes\(\s*\{\s*([A-Za-z]*[Ss]hadow[A-Za-z]*Colour[A-Za-z]*)\s*:")
OPEN = re.compile(r"^(\s*)(?:[^\n]*&&\s*)?\{\s*$")


def mount_covers(text):
    """Attribute names the file's ShadowControl mounts write (colour, hover colour, hover shape)."""
    covered = set()
    for m in re.finditer(r"<ShadowControl\b", text):
        end = text.find("/>", m.start())
        el = text[m.start():end if end > 0 else len(text)]
        for k in re.finditer(r"shadowAttrKeys\(\s*'([A-Za-z]+)'\s*(?:,\s*\{([^}]*)\})?\s*\)", el):
            base, opts = k.group(1), k.group(2) or ""
            covered |= {base, base + "Colour"}
            if re.search(r"hover\s*:\s*true", opts):
                covered.add(base + "Hover")
            if re.search(r"hoverColour\s*:\s*true", opts):
                covered.add(base + "ColourHover")
        lit = re.search(r"attrNames=\{\s*\{([^}]*)\}\s*\}", el)
        if lit:
            covered |= set(re.findall(r"(?:base|colour|hover|hoverColour)\s*:\s*'([A-Za-z]+)'", lit.group(1)))
    return covered


def atom_covers(path):
    """A block whose media element declares the `shadow` atom gets `boxShadow*` from the atom's mount."""
    block_json = path.parent / "block.json"
    if block_json.exists() and re.search(r'"atoms"\s*:\s*\[[^\]]*"shadow"', block_json.read_text(encoding="utf-8")):
        return {"boxShadow", "boxShadowColour", "boxShadowColourHover", "boxShadowHover"}
    return set()


def find_rows(lines):
    """[(start, end, attrs)] for each row object that writes a shadow colour attribute."""
    rows = []
    for i, line in enumerate(lines):
        m = WRITE.search(line)
        if not m:
            continue
        for s in range(i, -1, -1):
            o = OPEN.match(lines[s])
            if not o:
                continue
            ind = o.group(1)
            nxt = next((l for l in lines[s + 1:s + 6] if l.strip() and not l.strip().startswith("//")), "")
            if not re.match(r"^%s\s+key\s*:" % re.escape(ind), nxt):
                continue
            e = next((k for k in range(i, len(lines)) if re.match(r"^%s\},?\s*$" % re.escape(ind), lines[k])), None)
            # A row has a `states` list; a single state object (`key: 'normal'`) does not: keep walking outwards.
            if e is None or not any(re.match(r"^%s\s+states\s*:" % re.escape(ind), l) for l in lines[s:e + 1]):
                continue
            rows.append((s, e))
            break
    seen, out = set(), []
    for s, e in rows:
        if (s, e) in seen:
            continue
        seen.add((s, e))
        out.append((s, e, sorted(set(WRITE.findall("\n".join(lines[s:e + 1]))))))
    return out


def scan_file(path, text):
    lines = text.split("\n")
    covered = mount_covers(text) | atom_covers(path)
    result = []
    for s, e, attrs in find_rows(lines):
        status = "COVERED" if covered and all(a in covered for a in attrs) else ("NO-MOUNT" if not covered else "NOT-COVERED")
        result.append({"start": s, "end": e, "attrs": attrs, "status": status})
    return result


def strip_unused_destructures(lines, names):
    out = list(lines)
    body = "\n".join(out)
    for name in names:
        if len(re.findall(r"\b%s\b" % re.escape(name), body)) == 1:
            out = [l for l in out if not re.match(r"^\s*%s\s*(=\s*[^,]*)?,?\s*$" % re.escape(name), l)]
            body = "\n".join(out)
    return out


def apply_rows(text, rows):
    lines = text.split("\n")
    drop = set()
    names = set()
    for r in rows:
        drop.update(range(r["start"], r["end"] + 1))
        names.update(r["attrs"])
    kept = [l for i, l in enumerate(lines) if i not in drop]
    return "\n".join(strip_unused_destructures(kept, names))


def files():
    for base in SCAN:
        for p in sorted(base.rglob("*.js")):
            if "node_modules" not in p.parts and "build" not in p.parts:
                yield p


def plan():
    found = {}
    for p in files():
        text = p.read_text(encoding="utf-8").replace("\r\n", "\n")
        if not re.search(r"[Ss]hadow[A-Za-z]*Colour", text):
            continue
        rows = scan_file(p, text)
        if rows:
            found[p] = (text, rows)
    return found


def self_test():
    ok = True

    def check(label, cond):
        nonlocal ok
        if not cond:
            ok = False
            print("FAIL " + label)

    src = "\n".join([
        "const {",
        "\tboxShadowColour,",
        "\tother,",
        "} = attributes;",
        "<SgsColourPanel rows={ [",
        "\t{",
        "\t\tkey: 'shadow',",
        "\t\tstates: [ { onChange: ( val ) => setAttributes( { boxShadowColour: val ?? '' } ) } ],",
        "\t},",
        "\tflag && {",
        "\t\tkey: 'keep',",
        "\t\tstates: [ { onChange: ( val ) => setAttributes( { textColour: val ?? '' } ) } ],",
        "\t},",
        "] } />",
        "<ShadowControl attributes={ attributes } attrNames={ shadowAttrKeys( 'boxShadow' ) } />",
    ])
    rows = scan_file(Path("x/edit.js"), src)
    check("one covered row found", len(rows) == 1 and rows[0]["status"] == "COVERED" and rows[0]["attrs"] == ["boxShadowColour"])
    out = apply_rows(src, rows)
    check("row removed, other row kept", "boxShadowColour: val" not in out and "textColour" in out)
    check("unused destructure removed", "\tboxShadowColour,\n" not in out and "\tother," in out)
    check("idempotent", not scan_file(Path("x/edit.js"), out))
    # Negative control: a row writing an attribute the mount does not cover must be left alone.
    uncovered = src.replace("boxShadowColour: val", "boxShadowColourHover: val")
    check("negative control: an uncovered attribute is not removed", scan_file(Path("x/edit.js"), uncovered)[0]["status"] == "NOT-COVERED")
    check("negative control: no mount means no removal", scan_file(Path("x/edit.js"), src.split("<ShadowControl")[0])[0]["status"] == "NO-MOUNT")
    print("Shadow colour row dedupe self-test: " + ("PASS" if ok else "FAIL"))
    return ok


def main(argv):
    if "--self-test" in argv:
        return 0 if self_test() else 1
    found = plan()
    covered = 0
    for p, (text, rows) in sorted(found.items()):
        for r in rows:
            covered += r["status"] == "COVERED"
            print("%-12s %s:%d  %s" % (r["status"], p.relative_to(ROOT).as_posix(), r["start"] + 1, ", ".join(r["attrs"])))
    if "--fix" in argv:
        for p, (text, rows) in sorted(found.items()):
            todo = [r for r in rows if r["status"] == "COVERED"]
            if todo and "--apply" in argv:
                p.write_text(apply_rows(text, todo), encoding="utf-8", newline="\n")
        print("%d covered duplicate row(s) %s" % (covered, "removed" if "--apply" in argv else "would be removed"))
        return 0
    print("%d covered duplicate row(s)" % covered)
    return 1 if "--check" in argv and covered else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
