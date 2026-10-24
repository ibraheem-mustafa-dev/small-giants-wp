#!/usr/bin/env python3
"""generate-motion-base-transitions.py - the stylesheet transition entries a hover state would otherwise replace.

A hover state makes the motion emitter write one scoped `transition` list on the part's element; it replaces the list
the block's own style.css holds on that part, so `transform`, `translate` and `opacity` stop easing (a button's lift
snapped). `Sgs_Motion_Base_Transitions` appends the entries this script records: for every block with
`supports.sgs.motion`, each motion target (the root, and each part that is not an `isWrapper` or `"motion": false`) whose
unconditional style.css rule declares a `transition` naming `transform`, `translate` or `opacity` contributes those
entries, word for word (whitespace collapsed), to `includes/motion/data/base-transitions.json`.

    python plugins/sgs-blocks/scripts/generate-motion-base-transitions.py --write      regenerate the data file
    python plugins/sgs-blocks/scripts/generate-motion-base-transitions.py --check      gate: exit 1 while the file differs
    python plugins/sgs-blocks/scripts/generate-motion-base-transitions.py --self-test   assertions + negative control

Only a rule whose selector list names the part's own selector exactly counts; a rule inside an at-rule, a state
(`:hover`, `.is-open`) or a descendant chain is conditional and left out.
"""
import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path

PLUGIN = Path(__file__).resolve().parents[1]
BLOCKS = PLUGIN / "src" / "blocks"
OUT = PLUGIN / "includes" / "motion" / "data" / "base-transitions.json"
PROPERTIES = ("transform", "translate", "opacity")


def strip_comments(css):
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def top_level_rules(css):
    """(selector, body) for every unconditional top-level rule; at-rules are skipped whole."""
    css = strip_comments(css)
    rules, buf, j = [], "", 0
    while j < len(css):
        if css[j] == "{":
            selector, depth, k = buf.strip(), 1, j + 1
            while k < len(css) and depth:
                depth += {"{": 1, "}": -1}.get(css[k], 0)
                k += 1
            if not selector.startswith("@"):
                rules.append((selector, css[j + 1 : k - 1]))
            buf, j = "", k
            continue
        buf += css[j]
        j += 1
    return rules


def split_top_level(text):
    """Split on commas outside parentheses."""
    parts, depth, cur = [], 0, ""
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return [re.sub(r"\s+", " ", p).strip() for p in parts if p.strip()]


def entries_for(rules, part_selector):
    """The transform, translate and opacity entries of the last unconditional rule naming the selector."""
    found = []
    for selector, body in rules:
        names = [s.strip() for s in selector.split(",")]
        if part_selector not in names and f":where({part_selector})" not in names:
            continue
        m = re.search(r"(?<![-\w])transition\s*:\s*([^;]+);", body)
        if m:
            found = [e for e in split_top_level(m.group(1)) if e.split(" ", 1)[0] in PROPERTIES]
    return found


def targets(block_json):
    sgs = block_json.get("supports", {}).get("sgs", {})
    if not sgs.get("motion"):
        return {}
    slug = block_json["name"].split("/", 1)[1]
    out = {"root": f".sgs-{slug}"}
    for key, spec in (sgs.get("elements") or {}).items():
        if isinstance(spec, dict) and (spec.get("motion") is False or spec.get("isWrapper")):
            continue
        selector = spec.get("selector") if isinstance(spec, dict) else None
        out[key] = f".sgs-{slug}__{key}" if not selector else f".sgs-{slug} ." + selector.strip().lstrip(".").replace(" .", " .")
    return out


def build():
    table = {}
    for block_json_path in sorted(BLOCKS.glob("*/block.json")):
        block_json = json.loads(block_json_path.read_text(encoding="utf-8"))
        css_path = block_json_path.parent / "style.css"
        if not css_path.exists():
            continue
        rules = top_level_rules(css_path.read_text(encoding="utf-8"))
        for part, selector in targets(block_json).items():
            entries = entries_for(rules, selector)
            if entries:
                table.setdefault(block_json["name"], {})[part] = entries
    return table


def render(table):
    return json.dumps(table, indent="\t", ensure_ascii=False) + "\n"


def self_test():
    rules = top_level_rules(".a{transition:color 1s, transform .2s ease,\n opacity var( --d ) var(--e, ease);}.a:hover{transition:none}@media (x){.a{transition:translate 9s}}.b, .a{x:y}")
    assert entries_for(rules, ".a") == ["transform .2s ease", "opacity var( --d ) var(--e, ease)"], entries_for(rules, ".a")
    assert entries_for(rules, ".a:hover") == [], "a state rule is not a part's resting rule"
    assert entries_for(top_level_rules("@media (x){.a{transition:translate 9s}}"), ".a") == [], "an at-rule is conditional"
    assert split_top_level("a var(x, y), b") == ["a var(x, y)", "b"]
    built = build()
    assert built.get("sgs/button", {}).get("root"), "sgs/button root must carry entries"
    print("generate-motion-base-transitions: self-test OK")
    return 0


def main(argv):
    mode = argv[1] if len(argv) > 1 else ""
    if mode == "--self-test":
        return self_test()
    text = render(build())
    if mode == "--write":
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(text, encoding="utf-8", newline="\n")
        print(f"wrote {OUT.relative_to(PLUGIN.parents[1])} ({sum(len(v) for v in json.loads(text).values())} parts)")
        return 0
    if mode == "--check":
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != text:
            print(f"generate-motion-base-transitions: {OUT.name} differs from the stylesheets; run --write")
            return 1
        print("generate-motion-base-transitions: OK")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
