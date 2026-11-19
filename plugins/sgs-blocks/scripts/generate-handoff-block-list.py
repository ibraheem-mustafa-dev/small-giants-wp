"""Write the list of what the site platform has, in design words, for upload to a Claude Design project.

The framework database says which blocks are built and which options each has; the wording file beside this
script's data folder (data/handoff-block-list.words.json) says how a designer would name each thing and each option. The script joins the
two and refuses to write when they disagree, so the list cannot drift from the framework:

  - a built SGS block that no entry and no "not_listed" reason accounts for;
  - an entry naming a block, an option or an option value the database does not hold;
  - an option value the database holds that an entry's wording leaves out (list it under the version's "skip"
    with the others when it is not a designer's choice);
  - a block slug or a setting name leaking into the written list.

Usage:
  python plugins/sgs-blocks/scripts/generate-handoff-block-list.py            write .claude/claude-design-handoff/WHAT-WE-BUILD.md
  python plugins/sgs-blocks/scripts/generate-handoff-block-list.py --check    exit 1 when that file differs from what would be written

The list is uploaded to each Claude Design project beside CLAUDE.md (Spec 48A FR-48A-12). It names no block and no
setting: a handoff never maps a design to blocks (Spec 48A FR-48A-8).

The database is opened read-only.
"""
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
from framework_db import framework_db_path  # noqa: E402

DB = str(framework_db_path())
HERE = Path(__file__).resolve().parent
WORDS = HERE / "data" / "handoff-block-list.words.json"
OUT = HERE.parents[2] / ".claude" / "claude-design-handoff" / "WHAT-WE-BUILD.md"


def enum_values(raw):
    try:
        values = json.loads(raw) if raw else None
    except ValueError:
        return None
    if not isinstance(values, list):
        return None
    return [str(v) for v in values if v != ""]


def load(con):
    built = {r[0] for r in con.execute("select slug from blocks where source='sgs' and status='built' and is_stale=0")}
    attrs = {}
    for slug, name, kind, raw in con.execute("select block_slug, attr_name, attr_type, enum_values from block_attributes"):
        attrs[f"{slug}.{name}"] = (kind, enum_values(raw))
    return built, attrs


def build(words, built, attrs):
    problems = []
    seen = {}
    for entry in words["entries"]:
        for slug in entry["blocks"]:
            if slug not in built:
                problems.append(f"{entry['name']}: {slug} is not a built block in the database")
            if slug in seen:
                problems.append(f"{slug} is in two entries: {seen[slug]} and {entry['name']}")
            seen[slug] = entry["name"]
        if entry["group"] not in words["groups"]:
            problems.append(f"{entry['name']}: group {entry['group']!r} is not in the groups list")
        for version in entry.get("versions", []):
            kind_values = attrs.get(version["of"])
            if kind_values is None or kind_values[1] is None:
                problems.append(f"{entry['name']}: {version['of']} is not an option list in the database")
                continue
            have = set(kind_values[1])
            named = set(version["say"]) | set(version.get("skip", []))
            for value in sorted(named - have):
                problems.append(f"{entry['name']}: {version['of']} has no value {value!r} in the database")
            for value in sorted(have - named):
                problems.append(f"{entry['name']}: {version['of']} value {value!r} has no wording (add it to say or skip)")
        for extra in entry.get("can", []):
            kind_values = attrs.get(extra["of"])
            if kind_values is None:
                problems.append(f"{entry['name']}: {extra['of']} is not a setting in the database")
    for slug in words.get("not_listed", {}):
        if slug not in built:
            problems.append(f"not_listed: {slug} is not a built block in the database")
        if slug in seen:
            problems.append(f"{slug} is both listed ({seen[slug]}) and under not_listed")
    for slug in sorted(built - set(seen) - set(words.get("not_listed", {}))):
        problems.append(f"{slug} is built and no entry or not_listed reason accounts for it")

    lines = ["# What we can build", ""]
    for paragraph in words["intro"]:
        lines += [paragraph, ""]
    for group in words["groups"]:
        lines += [f"## {group}", ""]
        for entry in (e for e in words["entries"] if e["group"] == group):
            lines.append(f"**{entry['name']}.** {entry['is']}")
            for version in entry.get("versions", []):
                lines.append(f"- {version['label']}: " + ", ".join(version["say"].values()) + ".")
            if entry.get("can"):
                lines.append("- It can also: " + "; ".join(extra["say"] for extra in entry["can"]) + ".")
            if entry.get("cannot"):
                lines.append(f"- It cannot do: {entry['cannot']}")
            lines.append("")
    text = "\n".join(lines).rstrip("\n") + "\n"

    setting_names = {key.split(".", 1)[1] for key in attrs}
    for word in sorted(set(re.findall(r"\b[a-z]+[A-Z][A-Za-z]*\b", text)) & setting_names):
        problems.append(f"the written list names a setting: {word}")
    if re.search(r"\bsgs/|\bwoocommerce/|\bcore/|WordPress|\bSGS\b", text):
        problems.append("the written list names a block, WordPress or SGS")
    return text, problems


def main():
    words = json.loads(WORDS.read_text(encoding="utf-8"))
    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    text, problems = build(words, *load(con))
    if problems:
        print(f"{len(problems)} problem(s); nothing written:")
        for problem in problems:
            print("  " + problem)
        return 1
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print(f"out of date: {OUT}")
            return 1
        print("up to date")
        return 0
    OUT.write_text(text, encoding="utf-8", newline=chr(10))
    print(f"wrote {OUT}: {len(words['entries'])} entries, {len(text.encode('utf-8'))} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
