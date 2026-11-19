#!/usr/bin/env python3
"""check-button-preset-names.py — "a button preset name comes from the site's snapshot, never from a list in code".

THE RULE (Spec 32 FR-32-2, FP-1): the names of a site's button presets are the keys of its snapshot's
`settings.custom.buttonPresets`. The framework's own starter names (primary, secondary, outline) are defined once per
language (`includes/helpers-button-preset-names.php::SGS_BUTTON_STARTER_PRESETS`, `src/blocks/button/preset-names.js`,
`theme-extractor/presets.py::FRAMEWORK_SLOTS`); every other place asks the helper for the names. A second list of the
three names is a place a fifth preset would be lost.

WHAT IT FLAGS (an "instance"):
  list    two or more of the three names quoted close together (within 3 lines) in PHP, JS, Python or a block.json enum,
          with `outline` among them or a button, preset, variant or style word on the cluster's lines (so a palette
          list of `primary`, `secondary` and `accent` is not one)
  css     a stylesheet that declares rules for two or more of the three names under one class prefix
          (`.buybox__add-to-cart--primary` and `--secondary`), or reads two or more of the three names' tokens
          (`--wp--custom--button-presets--primary--` and `--secondary--`)

WHICH ARE ALLOWED: scripts/button-preset-names-allow.json holds one entry per file and kind, each with a `status`
(`defined-here`: the one definition of the starter names in that language; `framework-default`: the starter look the
framework ships, which a snapshot overrides; `deferred`: a closed list a later task opens, with the plan that holds it;
`patch`: handed to the session that owns the file) and a `reason`. `--check` fails on an instance with no entry and on an
entry with no instance (a fixed place must leave the list).

THE TRIAD
  --survey     list every instance with its status (allowed entry or OPEN)
  --check      exit 1 on any OPEN instance or stale entry
  --self-test  positive and negative fixtures, proving it can still fail
There is no --fix: each place is a different language and shape, so the change is a hand edit that swaps the list for a
call to the helper; the survey is the work list and --check is the proof.

Run from the repo root:  python plugins/sgs-blocks/scripts/check-button-preset-names.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ALLOW = HERE / "button-preset-names-allow.json"

NAMES = ("primary", "secondary", "outline")
SCAN = [
    "plugins/sgs-blocks/src", "plugins/sgs-blocks/includes", "plugins/sgs-blocks/assets", "plugins/sgs-blocks/sgs-blocks.php",
    "plugins/sgs-blocks/scripts/theme-extractor", "theme/sgs-theme/inc", "theme/sgs-theme/functions.php",
    "theme/sgs-theme/assets", "scripts/computed-route/lib",
]
SUFFIXES = {".php", ".js", ".mjs", ".py", ".css", ".json"}
SKIP_PARTS = {"node_modules", "build", "vendor", "tests", "test", "fixtures", "expected", "reports", "__pycache__"}
SKIP_SUFFIXES = (".test.js", ".test.mjs", ".min.css", ".min.js")
CONTEXT = re.compile(r"preset|button|btn|\bcta\b|variant|style", re.I)

QUOTED = re.compile(r"""(['"])(primary|secondary|outline)\1""")
JS_KEY = re.compile(r"""^\s*(primary|secondary|outline)\s*:\s*[{\[]""")
# A WordPress component's own `variant="primary"` / `variant: 'secondary'` is not a button preset name.
WP_VARIANT = re.compile(r"\bvariant\s*[=:]")
CSS_CLASS = re.compile(r"\.([A-Za-z_][\w-]*?)--(primary|secondary|outline)\b")
CSS_TOKEN = re.compile(r"--button-presets--(primary|secondary|outline)--")


def files(root: Path):
    for rel in SCAN:
        base = root / rel
        paths = [base] if base.is_file() else sorted(base.rglob("*")) if base.is_dir() else []
        for p in paths:
            if p.is_file() and p.suffix in SUFFIXES and not (set(p.relative_to(root).parts) & SKIP_PARTS) \
                    and not p.name.endswith(SKIP_SUFFIXES):
                if p.suffix == ".json" and p.name != "block.json":
                    continue
                yield p


def clusters(text: str, suffix: str):
    """(first line, names, context text) for each run of the three names within 3 lines of each other."""
    lines = text.splitlines()
    hits = []
    for i, line in enumerate(lines):
        if suffix == ".css":
            continue
        if WP_VARIANT.search(line):
            continue
        for m in QUOTED.finditer(line):
            hits.append((i, m.group(2)))
        k = JS_KEY.match(line)
        if k and suffix in (".js", ".mjs"):
            hits.append((i, k.group(1)))
    out, run = [], []
    for h in hits + [(10**9, None)]:
        if run and h[0] - run[-1][0] > 3:
            names = {n for _, n in run}
            lo, hi = run[0][0], run[-1][0]
            ctx = "\n".join(lines[max(0, lo - 1):hi + 1])
            if len(names) >= 2 and ("outline" in names or CONTEXT.search(ctx)):
                out.append((lo + 1, sorted(names)))
            run = []
        run.append(h)
    return out


def css_families(text: str):
    """The class prefixes that carry two or more of the names, and whether the tokens of two or more are read."""
    by_prefix = {}
    for m in CSS_CLASS.finditer(text):
        by_prefix.setdefault(m.group(1), set()).add(m.group(2))
    prefixes = {p: sorted(n) for p, n in by_prefix.items() if len(n) >= 2}
    tokens = sorted({m.group(1) for m in CSS_TOKEN.finditer(text)})
    return prefixes, tokens if len(tokens) >= 2 else []


def survey(root: Path):
    found = []
    for p in files(root):
        rel = p.relative_to(root).as_posix()
        text = p.read_text(encoding="utf-8", errors="replace")
        if p.suffix == ".css":
            prefixes, tokens = css_families(text)
            for prefix, names in sorted(prefixes.items()):
                found.append({"file": rel, "kind": "css", "key": "." + prefix + "--", "names": names})
            if tokens:
                found.append({"file": rel, "kind": "css", "key": "--button-presets--", "names": tokens})
        else:
            for line, names in clusters(text, p.suffix):
                found.append({"file": rel, "kind": "list", "key": "", "names": names, "line": line})
    return found


def load_allow(path: Path):
    return json.loads(path.read_text(encoding="utf-8")).get("allowed", []) if path.exists() else []


def classify(found, allowed):
    """(rows, stale): each found row with its entry or None; the allow entries no instance matches."""
    used, rows = set(), []
    for f in found:
        entry = None
        for i, a in enumerate(allowed):
            if a["file"] == f["file"] and a["kind"] == f["kind"] and a.get("key", "") == f["key"]:
                entry = a
                used.add(i)
                break
        rows.append((f, entry))
    stale = [a for i, a in enumerate(allowed) if i not in used]
    return rows, stale


def report(rows, stale, show_all=True):
    for f, entry in rows:
        where = f["file"] + (f":{f['line']}" if "line" in f else "")
        tag = entry["status"] if entry else "OPEN"
        if show_all or not entry:
            print(f"{tag:<16} {f['kind']:<5} {where}  {f['key']} {','.join(f['names'])}"
                  + (f"  -- {entry['reason']}" if entry else ""))
    for a in stale:
        print(f"STALE            entry {a['file']} {a['kind']} {a.get('key', '')} no longer matches an instance: {a['reason']}")
    opened = sum(1 for _, e in rows if not e)
    print(f"{len(rows)} instance(s): {len(rows) - opened} allowed, {opened} OPEN, {len(stale)} stale entr{'y' if len(stale) == 1 else 'ies'}")
    return opened, len(stale)


def self_test() -> int:
    bad = 0

    def expect(label, cond):
        nonlocal bad
        print(("PASS  " if cond else "FAIL  ") + label)
        bad += 0 if cond else 1

    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        src = root / "plugins/sgs-blocks/src/blocks/x"
        src.mkdir(parents=True)
        (src / "a.php").write_text("<?php\n$allowed = array( 'primary', 'secondary', 'outline' );\n")
        (src / "palette.php").write_text("<?php\n$slugs = array( 'primary', 'secondary', 'accent' );\n")
        (src / "one.php").write_text("<?php\n$default = 'primary';\n")
        (src / "far.php").write_text("<?php\n$a = 'primary';\n\n\n\n\n$b = 'outline';\n")
        (src / "style.css").write_text(".x--primary{color:red}\n.x--secondary{color:blue}\n.y--primary{a:b}\n")
        (src / "tok.css").write_text(".z{a:var(--wp--custom--button-presets--primary--text);b:var(--wp--custom--button-presets--outline--text)}\n")
        (src / "keys.js").write_text("export const P = {\n\tprimary: {\n\t},\n\toutline: {\n\t},\n};\n")
        (src / "styles.php").write_text("<?php\n$preset_styles = array( 'primary', 'secondary' );\n")
        found = survey(root)
        by = {(f["file"].split("/")[-1], f["kind"], f["key"]) for f in found}
        expect("a list of the three names is found", ("a.php", "list", "") in by)
        expect("a palette list of primary, secondary and accent is not a preset list", ("palette.php", "list", "") not in by)
        expect("one name alone is not a list", ("one.php", "list", "") not in by)
        expect("names more than 3 lines apart are not one list", ("far.php", "list", "") not in by)
        expect("a stylesheet with two names under one prefix is a family", ("style.css", "css", ".x--") in by)
        expect("a prefix with one name is not a family", ("style.css", "css", ".y--") not in by)
        expect("two names' tokens in one stylesheet are found", ("tok.css", "css", "--button-presets--") in by)
        expect("unquoted JS keys are found", ("keys.js", "list", "") in by)
        expect("primary and secondary on a preset line are found", ("styles.php", "list", "") in by)
        rows, stale = classify(found, [{"file": "plugins/sgs-blocks/src/blocks/x/a.php", "kind": "list", "key": "", "status": "defined-here", "reason": "t"},
                                       {"file": "plugins/sgs-blocks/src/blocks/x/gone.php", "kind": "list", "key": "", "status": "deferred", "reason": "t"}])
        expect("an allowed instance is classified", any(f["file"].endswith("a.php") and e for f, e in rows))
        expect("an instance with no entry is OPEN", any(f["file"].endswith("keys.js") and not e for f, e in rows))
        expect("an entry with no instance is stale", len(stale) == 1 and stale[0]["file"].endswith("gone.php"))
    return 1 if bad else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--survey", action="store_true", help="list every instance")
    ap.add_argument("--check", action="store_true", help="exit 1 on an OPEN instance or a stale entry")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--root", default=str(REPO), help="checkout to scan (default: this one)")
    ap.add_argument("--allow", default=str(ALLOW))
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    rows, stale = classify(survey(Path(a.root)), load_allow(Path(a.allow)))
    opened, old = report(rows, stale, show_all=a.survey)
    return 1 if a.check and (opened or old) else 0


if __name__ == "__main__":
    sys.exit(main())
