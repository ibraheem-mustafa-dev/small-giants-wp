#!/usr/bin/env python3
"""Palette roster migration (Spec 32 FR-32-14): five palette slugs for heading text, link, link hover
and the section ground, written into the framework theme.json and every client snapshot.

    python scripts/migrate-palette-roster-slugs.py --survey            census, one line per file
    python scripts/migrate-palette-roster-slugs.py --survey --json     the same as JSON (the census)
    python scripts/migrate-palette-roster-slugs.py --fix               dry run: a unified diff per file
    python scripts/migrate-palette-roster-slugs.py --fix --apply       write it
    python scripts/migrate-palette-roster-slugs.py --check             gate: exit 1 while any file is stale
    python scripts/migrate-palette-roster-slugs.py --self-test         assertions + negative controls

Target shape (settled by FR-32-14, Spec 32 section 12.2 and 14.2):
  * `settings.color.palette` gains `heading`, `link`, `link-hover`, `section`, `section-text`.
  * Each value equals what that file renders today. `heading`, `link` and `link-hover` take the colour
    the file's own `styles.elements.heading`, `.link` and `.link[":hover"]` resolve to through its own
    palette; where an element sets no colour the framework mapping applies against the file's OWN
    palette: heading = text, link = primary, link-hover = primary-dark. `section` = surface-alt and
    `section-text` = text, again from the file's own palette.
  * `styles.elements.heading.color.text` reads `var:preset|color|heading`, `link` reads `link`, and the
    link `:hover` and `:focus-visible` colours read `link-hover`. Every other key is kept. An element
    that does not exist today is not invented (a missing `:focus-visible` stays missing), except that a
    missing `heading` element is created with only its colour.
  * A slug that already exists is reported and never overwritten; its elements are then left alone.

The edit is a text splice (never a JSON re-serialise), so each file keeps its line endings and layout.
"""
from __future__ import annotations

import difflib
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import snapshot_palette_roster as roster  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
FRAMEWORK = ROOT / "theme" / "sgs-theme" / "theme.json"
NEW_SLUGS = (
    ("heading", "Heading Text"),
    ("link", "Link"),
    ("link-hover", "Link Hover"),
    ("section", "Section Background"),
    ("section-text", "Section Text"),
)
FRAMEWORK_MAPPING = {"heading": "text", "link": "primary", "link-hover": "primary-dark",
                     "section": "surface-alt", "section-text": "text"}
# element slot -> (path inside styles.elements, slug it must read)
ELEMENT_SLOTS = {
    "heading": (("heading", "color", "text"), "heading"),
    "link": (("link", "color", "text"), "link"),
    "link-hover": (("link", ":hover", "color", "text"), "link-hover"),
    "link-focus": (("link", ":focus-visible", "color", "text"), "link-hover"),
}


# ---------------------------------------------------------------- span-aware JSON
class Node:
    """A parsed JSON value that remembers where it sits in the source text."""

    def __init__(self, kind, start, end, value=None):
        self.kind, self.start, self.end, self.value = kind, start, end, value
        self.members: list[tuple[str, int, "Node"]] = []  # object: (key, key_start, node)
        self.items: list["Node"] = []                      # array

    def get(self, key):
        for k, _, n in self.members:
            if k == key:
                return n
        return None


def _ws(t, i):
    while i < len(t) and t[i] in " \t\r\n":
        i += 1
    return i


def parse(t, i=0):
    i = _ws(t, i)
    c = t[i]
    if c == '"':
        j = i + 1
        while t[j] != '"':
            j += 2 if t[j] == "\\" else 1
        return Node("string", i, j + 1, json.loads(t[i:j + 1]))
    if c == "{":
        node = Node("object", i, 0)
        i = _ws(t, i + 1)
        while t[i] != "}":
            k = parse(t, i)
            i = _ws(t, k.end)
            assert t[i] == ":"
            v = parse(t, i + 1)
            node.members.append((k.value, k.start, v))
            i = _ws(t, v.end)
            if t[i] == ",":
                i = _ws(t, i + 1)
        node.end = i + 1
        return node
    if c == "[":
        node = Node("array", i, 0)
        i = _ws(t, i + 1)
        while t[i] != "]":
            v = parse(t, i)
            node.items.append(v)
            i = _ws(t, v.end)
            if t[i] == ",":
                i = _ws(t, i + 1)
        node.end = i + 1
        return node
    j = i
    while j < len(t) and t[j] not in ",}] \t\r\n":
        j += 1
    return Node("literal", i, j, t[i:j])


def descend(node, path):
    for key in path:
        if node is None or node.kind != "object":
            return None
        node = node.get(key)
    return node


def eol_of(text):
    return "\r\n" if "\r\n" in text else "\n"


def indent_at(text, pos):
    """The whitespace between the previous newline and `pos`."""
    nl = text.rfind("\n", 0, pos)
    seg = text[nl + 1:pos]
    return seg if not seg.strip() else seg[:len(seg) - len(seg.lstrip())]


# ---------------------------------------------------------------- analysis
def analyse(text):
    """Return the facts for one file: what exists, what each slot resolves to today, the edit plan."""
    root = parse(text)
    palette_node = descend(root, ("settings", "color", "palette"))
    palette = {}
    for it in palette_node.items:
        d = {k: n.value for k, _, n in it.members if n.kind == "string"}
        if "slug" in d and "color" in d:
            palette[d["slug"]] = d["color"]
    present = {s: s in palette for s, _ in NEW_SLUGS}
    values, sources, problems = {}, {}, []
    elements = descend(root, ("styles", "elements"))
    for slug, _ in NEW_SLUGS:
        if present[slug]:
            continue
        element_value = None
        if slug in ("heading", "link", "link-hover") and elements is not None:
            path = ELEMENT_SLOTS[slug][0]
            node = descend(elements, path)
            if node is not None and node.kind == "string" and roster.slug_of_reference(node.value) != slug:
                element_value = node.value  # an element already reading this missing slug carries no value of its own
        if element_value is not None:
            hexv = roster.resolve_colour(element_value, palette)
            sources[slug] = "element " + element_value
            if hexv is None:
                problems.append("%s: element value %r does not resolve through the palette" % (slug, element_value))
        else:
            ref = FRAMEWORK_MAPPING[slug]
            hexv = roster.resolve_colour(palette.get(ref), palette)
            sources[slug] = "framework mapping (%s)" % ref
            if hexv is None:
                problems.append("%s: framework mapping %r has no resolvable colour in this palette" % (slug, ref))
        values[slug] = hexv
    # element state: does each slot already read its new slug?
    element_state = {}
    for slot, (path, slug) in ELEMENT_SLOTS.items():
        node = descend(elements, path) if elements is not None else None
        if node is None:
            element_state[slot] = "absent"
        elif node.kind == "string" and roster.slug_of_reference(node.value) == slug:
            element_state[slot] = "reads-new"
        else:
            element_state[slot] = "legacy"
    return {"root": root, "palette_node": palette_node, "palette": palette, "present": present,
            "values": values, "sources": sources, "problems": problems, "elements": elements,
            "element_state": element_state}


def entry_text(text, palette_node, slug, name, colour):
    """A palette entry laid out like the file's last entry (same indent, same key order, slug/color/name only)."""
    eol = eol_of(text)
    last = palette_node.items[-1]
    ind = indent_at(text, last.start)
    inner = ind + (indent_at(text, last.members[0][1]) [len(ind):] or "  ")
    keys = [k for k, _, _ in last.members if k in ("slug", "color", "name")]
    vals = {"slug": slug, "color": colour, "name": name}
    body = ("," + eol).join('%s"%s": %s' % (inner, k, json.dumps(vals[k])) for k in keys)
    return "{" + eol + body + eol + ind + "}"


def build_edits(text, facts):
    """List of (start, end, replacement) text splices; empty when the file is current."""
    edits = []
    eol = eol_of(text)
    node = facts["palette_node"]
    new_entries = [(s, n) for s, n in NEW_SLUGS if not facts["present"][s]]
    if new_entries and not facts["problems"]:
        ind = indent_at(text, node.items[-1].start)
        add = "".join("," + eol + ind + entry_text(text, node, s, n, facts["values"][s]) for s, n in new_entries)
        edits.append((node.items[-1].end, node.items[-1].end, add))
    # element rewrites: for a slug this run adds, and for an existing slug whose value equals what the
    # legacy element resolves to today (the rewrite changes nothing the client sees). An existing slug
    # with a different value is left alone and reported by --check, because rewriting would repaint.
    elements = facts["elements"]
    if elements is None or facts["problems"]:
        return edits
    added = {s for s, _ in new_entries}
    for slot, (path, slug) in ELEMENT_SLOTS.items():
        state = facts["element_state"][slot]
        target = descend(elements, path)
        if slug not in added:
            same = (state == "legacy" and slug in facts["palette"] and
                    (roster.resolve_colour(target.value, facts["palette"]) or "").lower()
                    == (roster.resolve_colour(facts["palette"][slug], facts["palette"]) or "?").lower())
            if not same:
                continue
        ref = json.dumps("var:preset|color|" + slug)
        if state == "legacy":
            edits.append((target.start, target.end, ref))
        elif state == "absent" and slot == "heading":
            heading = descend(elements, ("heading",))
            if heading is None:
                last = elements.members[-1][2]
                ind = indent_at(text, elements.members[0][1])
                block = '"heading": {%s%s  "color": {%s%s    "text": %s%s%s  }%s%s}' % (
                    eol, ind, eol, ind, ref, eol, ind, eol, ind)
                edits.append((last.end, last.end, "," + eol + ind + block))
            else:
                ind = indent_at(text, heading.members[0][1]) if heading.members else indent_at(text, heading.start) + "  "
                tail = heading.members[-1][2].end if heading.members else heading.start + 1
                block = '"color": {%s%s  "text": %s%s%s}' % (eol, ind, ref, eol, ind)
                edits.append((tail, tail, ("," if heading.members else "") + eol + ind + block))
    return edits


def apply_edits(text, edits):
    for start, end, rep in sorted(edits, reverse=True):
        text = text[:start] + rep + text[end:]
    return text


def targets():
    return [FRAMEWORK] + sorted((ROOT / "sites").glob("*/theme-snapshot.json"))


def rel(p):
    try:
        return p.relative_to(ROOT).as_posix()
    except ValueError:
        return str(p)


def read(p):
    return p.read_bytes().decode("utf-8")


def transform_text(text):
    facts = analyse(text)
    return apply_edits(text, build_edits(text, facts)), facts


def census(paths=None):
    rows = []
    for p in paths or targets():
        text = read(p)
        new, facts = transform_text(text)
        rows.append({
            "file": rel(p), "stale": new != text, "problems": facts["problems"],
            "slugs_present": [s for s, v in facts["present"].items() if v],
            "slugs_to_add": {s: {"hex": facts["values"][s], "source": facts["sources"][s]}
                             for s, v in facts["present"].items() if not v},
            "element_state": facts["element_state"],
            "pre_existing_slugs_left_alone": [s for s, v in facts["present"].items() if v],
        })
    return rows


# ---------------------------------------------------------------- commands
def write_atomic(p, text):
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_bytes(text.encode("utf-8"))
    os.replace(tmp, p)


def cmd_survey(as_json):
    rows = census()
    if as_json:
        print(json.dumps({"files": rows}, indent=2))
        return 1 if any(r["problems"] for r in rows) else 0
    unrecognised = 0
    for r in rows:
        print(("STALE " if r["stale"] else "ok    ") + r["file"])
        for s, v in r["slugs_to_add"].items():
            print("        + %-13s %-9s from %s" % (s, v["hex"], v["source"]))
        for s in r["pre_existing_slugs_left_alone"]:
            print("        = %s already exists: kept" % s)
        for pr in r["problems"]:
            unrecognised += 1
            print("        ! UNRECOGNISED " + pr)
    print("%d file(s) stale, %d unrecognised" % (sum(r["stale"] for r in rows), unrecognised))
    return 1 if unrecognised else 0


def cmd_fix(apply):
    if any(r["problems"] for r in census()):
        print("unrecognised values present: run --survey, nothing written")
        return 1
    for p in targets():
        text = read(p)
        new, _ = transform_text(text)
        if new == text:
            continue
        json.loads(new)  # still valid JSON
        if apply:
            write_atomic(p, new)
            print("wrote " + rel(p))
        else:
            sys.stdout.writelines(difflib.unified_diff(text.splitlines(True), new.splitlines(True),
                                                       "a/" + rel(p), "b/" + rel(p), n=1))
    return 0


def cmd_check():
    rows = census()
    bad = 0
    for r in rows:
        if r["stale"] or r["problems"]:
            bad += 1
            print("STALE " + r["file"] + ("  " + "; ".join(r["problems"]) if r["problems"] else ""))
    # absence of the old shape, read from the file itself: once the five slugs exist, no element may still read the old colour
    for r in rows:
        if not r["slugs_to_add"]:
            for slot, state in r["element_state"].items():
                if state == "legacy":
                    bad += 1
                    print("OLD SHAPE %s: the %s element does not read its new palette slug" % (r["file"], slot))
    print("Palette roster slugs: %d problem(s)" % bad)
    return 1 if bad else 0


# ---------------------------------------------------------------- self-test
SAMPLE = (
    '{\n  "settings": {\n    "color": {\n      "palette": [\n'
    '        {\n          "slug": "primary",\n          "color": "#112233",\n          "name": "Primary"\n        },\n'
    '        {\n          "slug": "primary-dark",\n          "color": "#001122",\n          "name": "Primary Dark"\n        },\n'
    '        {\n          "slug": "accent",\n          "color": "#EE7700",\n          "name": "Accent"\n        },\n'
    '        {\n          "slug": "surface-alt",\n          "color": "#F0F0F0",\n          "name": "Surface Alt"\n        },\n'
    '        {\n          "slug": "text",\n          "color": "#101010",\n          "name": "Text"\n        }\n'
    '      ]\n    }\n  },\n  "styles": {\n    "elements": {\n      "link": {\n        "color": {\n          "text": "%s"\n        },\n'
    '        ":hover": {\n          "color": {\n            "text": "%s"\n          }\n        },\n'
    '        ":focus-visible": {\n          "color": {\n            "text": "%s"\n          },\n'
    '          "typography": {\n            "textDecoration": "underline"\n          }\n        }\n      }%s\n    }\n  }\n}\n'
)
HEADING = ',\n      "heading": {\n        "typography": {\n          "fontWeight": "700"\n        }%s\n      }'


NL = chr(10)
TAIL = NL.join(["      ]", "    }", "  },"])


def sample(link="var:preset|color|primary", hover="var:preset|color|primary-dark", focus="var:preset|color|primary-dark",
           heading=""):
    return SAMPLE % (link, hover, focus, heading)


def self_test():
    ok = True

    def eq(actual, expected, label):
        nonlocal ok
        if actual != expected:
            ok = False
            print("FAIL " + label + "\n  expected: " + repr(expected) + "\n  actual:   " + repr(actual))

    # 1. defaults map to today's rendering and the elements move to the new slugs
    out, f = transform_text(sample())
    d = json.loads(out)
    pal = roster.palette_map(d)
    eq([pal[s] for s, _ in NEW_SLUGS], ["#101010", "#112233", "#001122", "#F0F0F0", "#101010"], "framework mapping values")
    el = d["styles"]["elements"]
    eq(el["link"]["color"]["text"], "var:preset|color|link", "link reads link")
    eq(el["link"][":hover"]["color"]["text"], "var:preset|color|link-hover", "hover reads link-hover")
    eq(el["link"][":focus-visible"]["color"]["text"], "var:preset|color|link-hover", "focus reads link-hover")
    eq(el["link"][":focus-visible"]["typography"], {"textDecoration": "underline"}, "other keys kept")
    eq(el["heading"], {"color": {"text": "var:preset|color|heading"}}, "a missing heading element is created with only its colour")
    eq(transform_text(out)[0], out, "idempotent")
    # 2. an element that resolves elsewhere wins over the mapping
    out2, _ = transform_text(sample(link="var(--wp--preset--color--accent)", hover="var(--wp--preset--color--primary)"))
    p2 = roster.palette_map(json.loads(out2))
    eq((p2["link"], p2["link-hover"]), ("#EE7700", "#112233"), "raw var() element resolves through the palette")
    out3, f3 = transform_text(sample(heading=HEADING % ',\n        "color": {\n          "text": "var:preset|color|primary-dark"\n        }'))
    eq(roster.palette_map(json.loads(out3))["heading"], "#001122", "an existing heading colour is the value")
    eq(json.loads(out3)["styles"]["elements"]["heading"]["typography"], {"fontWeight": "700"}, "heading typography kept")
    out4, _ = transform_text(sample(heading=HEADING % ""))
    eq(json.loads(out4)["styles"]["elements"]["heading"]["color"], {"text": "var:preset|color|heading"}, "heading colour inserted into an existing element")
    # 3. CRLF files keep CRLF
    crlf = sample().replace("\n", "\r\n")
    outc, _ = transform_text(crlf)
    eq("\n" in outc.replace("\r\n", ""), False, "CRLF kept throughout")
    json.loads(outc)
    # 4. a pre-existing slug is reported, never overwritten, and its elements are left alone
    pre = sample().replace('      ]\n    }\n  },', '        ,{"slug": "link", "color": "#ABCDEF", "name": "Mine"}\n      ]\n    }\n  },', 1)
    outp, fp = transform_text(pre)
    pp = roster.palette_map(json.loads(outp))
    eq(pp["link"], "#ABCDEF", "pre-existing slug not overwritten")
    eq(json.loads(outp)["styles"]["elements"]["link"]["color"]["text"], "var:preset|color|primary", "its element is left alone")
    same = sample().replace(TAIL, '        ,{"slug": "link", "color": "#112233", "name": "Mine"}' + NL + TAIL, 1)
    outs, _ = transform_text(same)
    eq(json.loads(outs)["styles"]["elements"]["link"]["color"]["text"], "var:preset|color|link", "an existing slug with the element's own value: the element moves")
    eq(fp["present"]["link"], True, "pre-existing slug detected")
    # 5. negative control: an unresolvable element value is reported, nothing is written
    outu, fu = transform_text(sample(link="var(--wp--preset--color--ghost)"))
    eq(bool(fu["problems"]), True, "unresolvable value reported")
    eq(outu, sample(link="var(--wp--preset--color--ghost)"), "nothing written when a value is unresolvable")
    # 6. negative control: the stale detector fires on an unmigrated file and not on a migrated one
    eq(transform_text(sample())[0] != sample(), True, "stale file is detected")
    print("Palette roster migration self-test: " + ("PASS" if ok else "FAIL"))
    return ok


def main(argv):
    if "--self-test" in argv:
        return 0 if self_test() else 1
    if "--check" in argv:
        return cmd_check()
    if "--fix" in argv:
        return cmd_fix("--apply" in argv)
    return cmd_survey("--json" in argv)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
