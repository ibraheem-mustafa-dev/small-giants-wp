"""Gate: every state-bearing selector in the framework's styles maps to a setting, a `states` row, or a recorded fixed behaviour.

SOURCE PASS (always): plugins/sgs-blocks/src/blocks/**/style.css, plugins/sgs-blocks/assets/css/**/*.css,
theme/sgs-theme/assets/css/**/*.css and the string literals of plugins/sgs-blocks/includes/**/*.php. A site is one selector
carrying any token the `states` vocabulary names. Mapping rules and the four outcomes: state_exhaustiveness.py.

LIVE PASS (`--live <url>`, repeatable): state-cssom-scan.mjs loads the page in Playwright and walks every rule in
document.styleSheets, which catches selectors PHP assembles at request time. The same mapping applies; the report lists
what the live pass found that no source selector accounts for.

FIXED BEHAVIOURS: `data/state-fixed-behaviours.json` (file, selector, reason). `--baseline` records every currently
unmapped site whose rule paints fixed values (no setting-like custom property) with the reason below. A setting-like
custom property under a state with no tagged row is never baselined: it is a missing setting or a missing tag.

Usage:
    python check-state-exhaustiveness.py                     # report
    python check-state-exhaustiveness.py --check             # exit 1 on any unmapped site
    python check-state-exhaustiveness.py --baseline          # write the register for the fixed-paint sites
    python check-state-exhaustiveness.py --live URL [--live URL2] [--check]
    python check-state-exhaustiveness.py --self-test
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import state_exhaustiveness as se  # noqa: E402
import state_vocabulary  # noqa: E402

SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
LIVE_SCANNER = Path(__file__).resolve().parent / "state-cssom-scan.mjs"
BASELINE_REASON = se.GENERIC_REASON


def load_db() -> tuple[list[dict], dict, frozenset[str]]:
    if not SGS_DB.exists():
        print(f"FAIL: framework DB not found at {SGS_DB}", file=sys.stderr)
        raise SystemExit(2)
    con = sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        states = [dict(r) for r in con.execute("SELECT state, family, kind, token, reach FROM states")]
        tagged: dict = {None: set()}
        for slug, state in con.execute("SELECT DISTINCT block_slug, css_state FROM block_attributes WHERE css_state IS NOT NULL"):
            tagged.setdefault(slug, set()).add(state)
            tagged[None].add(state)
        slugs = frozenset(r[0] for r in con.execute("SELECT slug FROM blocks"))
    finally:
        con.close()
    return states, tagged, slugs


def scan_source(root: Path, vocab, slugs, walker) -> list[se.Site]:
    published = se.published_vars(root)
    sites: list[se.Site] = []
    for pattern, kind in se.SOURCE_GLOBS:
        for path in sorted(root.glob(pattern)):
            rel = path.relative_to(root).as_posix()
            text = path.read_text(encoding="utf-8", errors="replace")
            if kind == "css":
                sites += se.scan_css_text(rel, text, walker, vocab, slugs, published)
            else:
                sites += se.scan_php_text(rel, text, vocab, slugs, published)
    return sites


def scan_live(url: str, vocab, slugs, published) -> list[se.Site]:
    """Run the Playwright scanner against one URL and turn its rules into sites."""
    with tempfile.TemporaryDirectory() as tmp:
        vocab_file = Path(tmp) / "vocab.json"
        vocab_file.write_bytes(json.dumps(vocab.sources).encode("utf-8"))
        proc = subprocess.run(["node", str(LIVE_SCANNER), url, str(vocab_file)], capture_output=True, text=True, encoding="utf-8")
    if proc.returncode != 0:
        print(f"FAIL: live scan of {url}: {proc.stderr.strip()[:400]}", file=sys.stderr)
        raise SystemExit(2)
    sites = []
    for rule in json.loads(proc.stdout):
        sheet = re.sub(r"^https?://[^/]+", "", rule["sheet"] or "inline")
        sheet = "live:" + sheet.split("?")[0]
        generated = "/uploads/sgs-css/" in sheet
        for part in se.split_selector_list(rule["selector"]):
            states, families = se.selector_states(part, vocab)
            if not states or not _sgs_owned(sheet, part):
                continue
            m = re.search(r"/blocks/([^/]+)/", sheet)
            block = "sgs/" + m.group(1) if m else se.block_for(sheet, part, slugs)
            vars_ = se.setting_vars(rule["body"], block, published)
            # the per-page stylesheet is written from the page's settings: every rule in it is a setting's output
            pubs = tuple(dict.fromkeys(k for v in vars_ for k in se.publishers(v, published) if k != "*"))
            sites.append(se.Site(sheet, part, states, families, block, vars_, bool(vars_) or generated, "live", pubs))
    return sites


def _sgs_owned(sheet: str, selector: str) -> bool:
    """SGS's own stylesheets, plus inline <style> rules that name an SGS class. WooCommerce, WordPress core and other
    plugins' rules are not this gate's subject."""
    if sheet == "live:inline":
        return bool(re.search(r"sgs|is-header-on-", selector))
    return bool(re.search(r"/(sgs-blocks|sgs-theme|sgs-css|sgs-[a-z-]+)/", sheet))


def evaluate(sites: list[se.Site], tagged: dict, register: list[dict]) -> list[se.Mapping]:
    by_file, by_selector = se.register_index(register)
    generic = se.generic_index(register)
    seen: set = set()
    out = []
    for s in sites:
        key = (s.file, s.selector, s.origin)
        if key in seen:
            continue
        seen.add(key)
        out.append(se.classify(s, tagged, by_file, by_selector, generic))
    return out


def write_register(path: Path, entries: list[dict]) -> None:
    entries = sorted(entries, key=lambda e: (e["file"], e["selector"]))
    doc = {
        "_note": "Fixed state behaviours: a selector that paints under a state with fixed values and no setting. Each entry carries the file, the selector and the reason. Read by check-state-exhaustiveness.py.",
        "entries": entries,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((json.dumps(doc, indent=1, ensure_ascii=False) + "\n").encode("utf-8"))


def baseline(mappings: list[se.Mapping], register: list[dict]) -> tuple[list[dict], int, int]:
    have = {(e["file"], e["selector"]) for e in register}
    added = skipped = 0
    entries = list(register)
    for m in mappings:
        if m.kind != "unmapped" or m.site.origin != "source":
            continue
        if m.site.setting_like:
            skipped += 1
            continue
        key = (m.site.file, m.site.selector)
        if key not in have:
            have.add(key)
            entries.append({"file": m.site.file, "selector": m.site.selector, "reason": BASELINE_REASON})
            added += 1
    return entries, added, skipped


def report(mappings: list[se.Mapping], title: str) -> list[se.Mapping]:
    counts = {"setting": 0, "behaviour": 0, "states-row": 0, "register": 0, "unmapped": 0}
    for m in mappings:
        counts[m.kind] += 1
    print(f"== {title}: {len(mappings)} state-bearing selectors")
    print(f"   setting {counts['setting']}  |  behaviour {counts['behaviour']}  |  states-row {counts['states-row']}  |  register {counts['register']}  |  unmapped {counts['unmapped']}")
    per_file = se.summarise(mappings)
    for f in sorted(per_file):
        r = per_file[f]
        print(f"   {f}: setting {r['setting']}, behaviour {r['behaviour']}, states-row {r['states-row']}, register {r['register']}, unmapped {r['unmapped']}")
    failing = [m for m in mappings if m.kind == "unmapped"]
    if failing:
        print(f"\nFAILING ({len(failing)}):")
        for m in failing:
            print(f"  {m.site.file}  {m.site.selector}\n      {m.detail}")
    return failing


def self_test() -> int:
    walker = se.load_rule_walker()
    rows = [
        {"state": "hover", "family": "pointer-keyboard", "kind": "pseudo-class", "token": ":hover", "reach": "force-pseudo"},
        {"state": "open", "family": "open", "kind": "pseudo-class", "token": "[open]", "reach": "set-attribute"},
        {"state": "invalid", "family": "form-field", "kind": "pseudo-class", "token": ":invalid", "reach": "force-pseudo"},
    ]
    vocab = se.load_vocabulary(rows, state_vocabulary.token_regex)
    slugs = frozenset({"sgs/fx"})
    published = {"*": set(), "sgs/fx": {"--sgs-fx-hover-colour"}}
    tagged = {None: {"hover"}, "sgs/fx": {"hover"}}
    f = "plugins/sgs-blocks/src/blocks/fx/style.css"

    def run(css: str, tag: dict, reg: list[dict], file: str = f) -> list[se.Mapping]:
        sites = se.scan_css_text(file, css, walker, vocab, slugs, published)
        return evaluate(sites, tag, reg)

    def kinds(ms: list[se.Mapping]) -> list[str]:
        return [m.kind for m in ms]

    setting_css = ".sgs-fx__btn:hover{color:var(--sgs-fx-hover-colour)}"
    fixed_css = ".sgs-fx__btn:hover{color:red}"
    checks = [
        ("MUST FAIL: a state selector with a setting-like custom property and no tagged row", kinds(run(setting_css, {None: set(), "sgs/fx": set()}, [])) == ["unmapped"]),
        ("positive: the same selector with a tagged row maps to a setting", kinds(run(setting_css, tagged, [])) == ["setting"]),
        ("MUST FAIL: fixed paint under a tagged-family state, unrecorded", kinds(run(fixed_css, tagged, [])) == ["unmapped"]),
        ("positive: the same fixed paint recorded in the register is green", kinds(run(fixed_css, tagged, [{"file": f, "selector": ".sgs-fx__btn:hover", "reason": "r"}])) == ["register"]),
        ("a register entry for another file does not clear it", kinds(run(fixed_css, tagged, [{"file": "other.css", "selector": ".sgs-fx__btn:hover", "reason": "r"}])) == ["unmapped"]),
        ("a register entry for another selector does not clear it", kinds(run(fixed_css, tagged, [{"file": f, "selector": ".sgs-fx__other:hover", "reason": "r"}])) == ["unmapped"]),
        ("positive: a form-field state maps to its states row", kinds(run(".sgs-fx__in:invalid{color:red}", tagged, [])) == ["states-row"]),
        ("a rule with no state token is not a site", run(".sgs-fx__btn{color:red}", tagged, []) == []),
        ("a state in a comma list is judged per selector", kinds(run(".a:hover,.b{color:red}", tagged, [])) == ["unmapped"]),
        ("a theme token is not a setting", kinds(run(".sgs-fx__btn:hover{color:var(--wp--preset--color--primary)}", {None: set(), "sgs/fx": set()}, [])) == ["unmapped"]
         and not run(".sgs-fx__btn:hover{color:var(--wp--preset--color--primary)}", {None: set(), "sgs/fx": set()}, [])[0].site.setting_like),
        ("MUST FAIL: a generic-reason register entry on a rule that uses a published custom property",
         kinds(run(setting_css, {None: set(), "sgs/fx": set()}, [{"file": f, "selector": ".sgs-fx__btn:hover", "reason": se.GENERIC_REASON}])) == ["unmapped"]),
        ("MUST FAIL: a generic-reason register entry also fails the same rule read from a live sheet",
         kinds(evaluate(se.scan_css_text("live:https://x.test/fx.css", setting_css, walker, vocab, slugs, published, origin="live"), {None: set(), "sgs/fx": set()}, [{"file": f, "selector": ".sgs-fx__btn:hover", "reason": se.GENERIC_REASON}])) == ["unmapped"]),
        ("positive: a live rule with a specific register reason is green", kinds(evaluate(se.scan_css_text("live:https://x.test/fx.css", setting_css, walker, vocab, slugs, published, origin="live"), {None: set(), "sgs/fx": set()}, [{"file": f, "selector": ".sgs-fx__btn:hover", "reason": "set by view.js"}])) == ["register"]),
        ("MUST FAIL: a quoted sgs- string outside a custom-property helper publishes no property", se.php_names("wp_enqueue_style( 'sgs-fx-hover-colour' ); $x = array( 'sgs-fx-other' => 1 );") == set()
         and "--sgs-fx-hover-colour~" in se.php_names("$d = sgs_custom_property_gradient_decls( 'sgs-fx-hover-colour', $flat, $g );")),
        ("MUST FAIL without the rule: a transform-only open rule fed by an untagged published setting is behaviour", kinds(run(".sgs-fx__btn:hover{transform:rotate(var(--sgs-fx-hover-colour))}", {None: set(), "sgs/fx": set()}, [])) == ["behaviour"]),
        ("a transform rule that also paints a colour stays unmapped", kinds(run(".sgs-fx__btn:hover{transform:rotate(var(--sgs-fx-hover-colour));color:red}", {None: set(), "sgs/fx": set()}, [])) == ["unmapped"]),
        ("a transform rule fed by a setting tagged with that state maps to the setting", kinds(run(".sgs-fx__btn:hover{transform:rotate(var(--sgs-fx-hover-colour))}", tagged, [])) == ["setting"]),
        ("positive: the same entry with a specific reason is green", kinds(run(setting_css, {None: set(), "sgs/fx": set()}, [{"file": f, "selector": ".sgs-fx__btn:hover", "reason": "set by view.js"}])) == ["register"]),
        ("a bare helper name ('sgs-fx-hover-colour') counts as published, with its -hover and -gradient variants", se.is_published("--sgs-fx-hover-colour-gradient", None, {"*": {"--sgs-fx-hover-colour~"}}) and not se.is_published("--sgs-fx-other", None, {"*": {"--sgs-fx-hover-colour~"}})),
        ("a property published by another block's PHP counts, and that block's tags decide the mapping", kinds(run(setting_css, {None: {"hover"}, "sgs/fx": set(), "sgs/fx-child": {"hover"}}, [], f)) == ["unmapped"] and _cross_block_ok(walker, vocab, slugs)),
        ("baseline records fixed paint but never a setting-like site", _baseline_check(run(fixed_css, tagged, []) + run(setting_css, {None: set(), "sgs/fx": set()}, []))),
    ]
    failed = 0
    for name, ok in checks:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        failed += 0 if ok else 1
    print(f"\n{len(checks) - failed}/{len(checks)} self-test assertions passed.")
    return 1 if failed else 0


def _cross_block_ok(walker, vocab, slugs) -> bool:
    published = {"*": set(), "sgs/fx": set(), "sgs/fx-child": {"--sgs-fx-hover-colour"}}
    sites = se.scan_css_text("plugins/sgs-blocks/src/blocks/fx/style.css", ".sgs-fx__btn:hover{color:var(--sgs-fx-hover-colour)}", walker, vocab, slugs, published)
    with_tag = evaluate(sites, {None: {"hover"}, "sgs/fx": set(), "sgs/fx-child": {"hover"}}, [])
    without = evaluate(sites, {None: {"hover"}, "sgs/fx": {"hover"}, "sgs/fx-child": set()}, [])
    return [m.kind for m in with_tag] == ["setting"] and [m.kind for m in without] == ["unmapped"]


def _baseline_check(mappings: list[se.Mapping]) -> bool:
    entries, added, skipped = baseline(mappings, [])
    return added == 1 and skipped == 1 and entries[0]["selector"] == ".sgs-fx__btn:hover"


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="exit 1 on any unmapped site")
    ap.add_argument("--baseline", action="store_true", help="write the register for every unmapped fixed-paint site")
    ap.add_argument("--live", action="append", default=[], metavar="URL", help="also walk document.styleSheets of this page")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()

    rows, tagged, slugs = load_db()
    vocab = se.load_vocabulary(rows, state_vocabulary.token_regex)
    walker = se.load_rule_walker()
    register = se.load_register()
    source_sites = scan_source(se.REPO, vocab, slugs, walker)
    mappings = evaluate(source_sites, tagged, register)

    if args.baseline:
        entries, added, skipped = baseline(mappings, register)
        write_register(se.REGISTER, entries)
        print(f"BASELINE: {added} entries added ({len(entries)} in the register), {skipped} setting-like sites left failing.")
        mappings = evaluate(source_sites, tagged, entries)
        register = entries

    failing = report(mappings, "source pass")

    if args.live:
        published = se.published_vars(se.REPO)
        source_selectors = {se.norm_selector(s.selector) for s in source_sites}
        for url in args.live:
            live = evaluate(scan_live(url, vocab, slugs, published), tagged, register)
            failing += report(live, f"live pass {url}")
            beyond = [m for m in live if se.norm_selector(m.site.selector) not in source_selectors]
            print(f"   beyond the source pass: {len(beyond)} of {len(live)} live selectors")
            for m in beyond[:40]:
                print(f"     [{m.kind}] {m.site.file}  {m.site.selector}")
            if len(beyond) > 40:
                print(f"     ... {len(beyond) - 40} more")

    print(f"\n{'FAIL' if failing else 'PASS'}: {len(failing)} unmapped state-bearing selector(s).")
    return 1 if (args.check and failing) else 0


if __name__ == "__main__":
    raise SystemExit(main())
