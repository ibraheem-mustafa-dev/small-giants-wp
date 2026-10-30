"""identity_facts_selftest -- planted fixtures for `block_identity_facts.py --self-test`.

A throwaway repo tree is written to a temp folder and read by the real extractor:

- sgs/fx-tabs prints role="tablist" only through a helper it calls (`sgs_fixture_tablist()`), and its view script
  selects one tab of many: tablist yes, open-state exactly-one yes;
- sgs/fx-crumbs opts into an extension (`supports.sgs.enabledExtensions: ["fixtureCurrent"]`) whose `render_block`
  filter adds aria-current with WP_HTML_Tag_Processor: aria-current yes. sgs/fx-crumbs-off does not opt in: no;
- sgs/fx-outer renders sgs/fx-tabs inside itself (`'blockName' => 'sgs/fx-tabs'`): it holds tablist too;
- sgs/fx-dyn prints a tag and a role from a value read at run time (get_option): every tag and role it does not prove
  is unknown, never no;
- sgs/fx-plain (negative controls) prints `<p>` only; a CSS selector `[aria-selected="true"]`, a needle
  `strpos( $html, '<table' )` and a `querySelector( '[role="tab"]' )` read are not writes: tablist, aria-selected,
  table and tab are no; its view script moves a track from setInterval: self-moving timer yes;
- sgs/acme-badge carries a registry brand's name: platform acme yes; sgs/fx-plain: no;
- sgs/fx-field may sit only inside sgs/fx-form (a form): context form yes, any no;
- the live import (`live_rows`): a live yes on sgs/fx-dyn's unknown `table` becomes one source='live' row; the same on
  sgs/fx-plain's code `no` is a conflict and no row; a live entry that is not `yes` is ignored;
- the roster predicate equals `sgs-update-v2.py::_extension_applies` on every real block.json and roster rule.
"""
from __future__ import annotations

import importlib.util
import json
import shutil
import sqlite3
import tempfile
from pathlib import Path

from identity_markup import DbInputs, Extractor, Paths, _extension_applies
from block_identity_facts import Rows, live_rows

FIXTURE_PHP = {
    "includes/helpers-fixture.php": """<?php
function sgs_fixture_tablist( $label ) {
	return '<div class="x" role="tablist" aria-label="' . esc_attr( $label ) . '">';
}
""",
    "includes/fixture-current.php": """<?php
namespace SGS\\Blocks;
add_filter( 'render_block', __NAMESPACE__ . '\\\\fixture_add_current', 10, 2 );
function fixture_add_current( $content, $block ) {
	$type = \\WP_Block_Type_Registry::get_instance()->get_registered( $block['blockName'] );
	$list = $type->supports['sgs']['enabledExtensions'] ?? array();
	if ( ! in_array( 'fixtureCurrent', $list, true ) ) {
		return $content;
	}
	$p = new \\WP_HTML_Tag_Processor( $content );
	if ( $p->next_tag( 'a' ) ) {
		$p->set_attribute( 'aria-current', 'page' );
	}
	return $p->get_updated_html();
}
""",
}

BLOCKS = {
    "fx-tabs": ({"supports": {}}, """<?php
echo sgs_fixture_tablist( 'Tabs' );
echo '<button role="tab" aria-selected="true">One</button></div>';
""", """const tabs = root.querySelectorAll( '[role="tab"]' );
tabs.forEach( ( btn ) => btn.setAttribute( 'aria-selected', btn === active ? 'true' : 'false' ) );
"""),
    "fx-crumbs": ({"supports": {"sgs": {"enabledExtensions": ["fixtureCurrent"]}}}, """<?php
echo '<nav><a href="/">Home</a></nav>';
""", None),
    "fx-crumbs-off": ({"supports": {}}, """<?php
echo '<nav><a href="/">Home</a></nav>';
""", None),
    "fx-outer": ({"supports": {}}, """<?php
echo '<section>' . render_block( array( 'blockName' => 'sgs/fx-tabs', 'attrs' => array() ) ) . '</section>';
""", None),
    "fx-dyn": ({"supports": {}}, """<?php
$tag  = get_option( 'fixture_tag' );
$role = get_option( 'fixture_role' );
echo '<' . $tag . ' class="x" role="' . esc_attr( $role ) . '">hi</' . $tag . '>';
""", None),
    "fx-plain": ({"supports": {}}, """<?php
$css = '.x[aria-selected="true"]{color:red}';
if ( false !== strpos( $content, '<table' ) ) { $css .= ''; }
echo '<p class="x">' . esc_html( $css ) . '</p>';
""", """const t = root.querySelector( '[role="tab"]' );
setInterval( () => { track.scrollTo( { left: 10 } ); }, 3000 );
"""),
    "acme-badge": ({"supports": {}}, "<?php\necho '<span>Acme</span>';\n", None),
    "fx-form": ({"supports": {}}, "<?php\necho '<form></form>';\n", None),
    "fx-field": ({"supports": {}, "parent": ["sgs/fx-form"]}, "<?php\necho '<input>';\n", None),
}


def _build(root: Path) -> Paths:
    plugin = root / "plugins" / "sgs-blocks"
    for rel, text in FIXTURE_PHP.items():
        (plugin / rel).parent.mkdir(parents=True, exist_ok=True)
        (plugin / rel).write_text(text, encoding="utf-8")
    for name, (meta, render, view) in BLOCKS.items():
        d = plugin / "src" / "blocks" / name
        d.mkdir(parents=True, exist_ok=True)
        bj = {"name": f"sgs/{name}", "attributes": {}, **meta}
        if view:
            bj["viewScriptModule"] = "file:./view.js"
            (d / "view.js").write_text(view, encoding="utf-8")
        (d / "block.json").write_text(json.dumps(bj), encoding="utf-8")
        (d / "render.php").write_text(render, encoding="utf-8")
    brands = root / "brand-registry.json"
    brands.write_text(json.dumps({"brands": [{"slug": "acme", "label": "Acme", "colour": "#123456"},
                                             {"slug": "phone", "label": "Phone", "colour": ""}]}), encoding="utf-8")
    return Paths(repo=root, blocks=plugin / "src" / "blocks", php_roots=[plugin / "includes", plugin / "src"],
                 roster=root / "none.json", qualifying=root / "none.json", brands=brands, decisions=root / "none.json")


def _roster_parity() -> list[str]:
    """`_extension_applies` here against the seeder's, on every real block.json and roster rule."""
    here = Path(__file__).resolve().parent
    spec = importlib.util.spec_from_file_location("sgs_update_v2", here.parent / "sgs-update-v2.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    blocks = here.parents[1] / "src" / "blocks"
    roster = json.loads((blocks / "extensions" / "extension-roster.json").read_text(encoding="utf-8")).get("extensions") or []
    bad = []
    for bj_path in sorted(blocks.glob("*/block.json")):
        bj = json.loads(bj_path.read_text(encoding="utf-8"))
        for ext in roster:
            rule = ext.get("rule") or {}
            if _extension_applies(rule, bj) != mod._extension_applies(rule, bj):
                bad.append(f"roster predicate differs from the seeder's for {bj.get('name')} / {ext.get('id')}")
    return bad


def run() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="sgs-idfacts-"))
    try:
        paths = _build(tmp)
        db = DbInputs(icon_kinds=["emoji", "lucide"], icon_fields={"sgs/fx-plain": [("items.icon", "icon")]},
                      source_enums={"sgs/fx-plain": [("iconSource", ["lucide"])]}, fx={})
        rows = Rows(Extractor(paths, db), db).build()
        state = {(r[0], r[1], r[2]): r[3] for r in rows}
        expect = [
            ("sgs/fx-tabs", "renders-role", "tablist", "yes", "a role printed only through a helper"),
            ("sgs/fx-tabs", "open-state", "exactly-one", "yes", "a one-of-many aria-selected write"),
            ("sgs/fx-crumbs", "renders-aria", "aria-current", "yes", "aria-current added by an opted-into extension's render_block filter"),
            ("sgs/fx-crumbs-off", "renders-aria", "aria-current", "no", "the same filter on a block that does not opt in"),
            ("sgs/fx-outer", "renders-role", "tablist", "yes", "a nested block's role held by the block that renders it"),
            ("sgs/fx-dyn", "renders-tag", "table", "unknown", "a tag from a run-time value stays unknown"),
            ("sgs/fx-dyn", "renders-role", "tablist", "unknown", "a role from a run-time value stays unknown"),
            ("sgs/fx-dyn", "renders-tag", "p", "unknown", "no tag is ruled out beside an untraced tag"),
            ("sgs/fx-plain", "renders-role", "tablist", "no", "negative control: nothing prints it"),
            ("sgs/fx-plain", "renders-role", "tab", "no", "a querySelector('[role=\"tab\"]') read is not a write"),
            ("sgs/fx-plain", "renders-aria", "aria-selected", "no", "a CSS attribute selector is not a write"),
            ("sgs/fx-plain", "renders-tag", "table", "no", "a strpos() needle is not a write"),
            ("sgs/fx-plain", "renders-tag", "p", "yes", "a literal tag"),
            ("sgs/fx-plain", "self-moving", "timer", "yes", "setInterval moving a track"),
            ("sgs/fx-plain", "open-state", "none", "yes", "no disclosure or tab"),
            ("sgs/fx-tabs", "self-moving", "none", "yes", "no track moves"),
            ("sgs/acme-badge", "platform", "acme", "yes", "a registry brand's name in the block name"),
            ("sgs/fx-plain", "platform", "acme", "no", "no brand name"),
            ("sgs/fx-field", "context", "form", "yes", "inside its form parent"),
            ("sgs/fx-field", "context", "any", "no", "a parent restriction rules out anywhere"),
            ("sgs/fx-plain", "accepts-kind", "items.icon=icon:lucide", "yes", "an icon field's kind from its enum-mode source"),
            ("sgs/fx-plain", "accepts-kind", "items.icon=icon:emoji", "unknown", "a kind the source does not name is not traced"),
            ("sgs/fx-tabs", "accepts-kind", "*=icon:emoji", "no", "no icon field"),
        ]
        fails = [f"{slug} {fact}={value}: expected {want}, got {state.get((slug, fact, value), 'no row')} ({why})"
                 for slug, fact, value, want, why in expect if state.get((slug, fact, value)) != want]
        # The live import: a live yes lands only on a code unknown; beside a code no it is a conflict, never a row.
        live_file = tmp / "block-live-facts.json"
        live_file.write_text(json.dumps({"readOn": "2026-10-30", "blocks": {
            "sgs/fx-dyn": {"facts": {"renders-tag": {"table": {"state": "yes", "evidence": ["local-x / @375 .wp-block-sgs-fx-dyn[0] table"]}}}},
            "sgs/fx-plain": {"facts": {"renders-tag": {"table": {"state": "yes", "evidence": ["local-x / @375 .wp-block-sgs-fx-plain[0] table"]}},
                                       "renders-role": {"tablist": {"state": "unknown", "evidence": []}}}},
        }}), encoding="utf-8")
        live, lstats = live_rows(rows, live_file)
        if [r[:5] for r in live] != [("sgs/fx-dyn", "renders-tag", "table", "yes", "live")]:
            fails.append(f"sgs/fx-dyn renders-tag=table (live): expected exactly one live yes row, got {[r[:5] for r in live]}")
        if lstats["conflict"] != ["sgs/fx-plain renders-tag=table"]:
            fails.append(f"sgs/fx-plain renders-tag=table (live): expected a conflict, got {lstats['conflict']}")
        if any(r[1] == "platform" and r[2] == "phone" for r in rows):
            fails.append("a contact entry (no colour) became a platform")
        con = sqlite3.connect(":memory:")
        ddl = (Path(__file__).resolve().parents[1] / "migrations" / "2026-10-30-block-identity-facts-table.py").read_text(encoding="utf-8")
        con.execute(ddl.split('DDL = """', 1)[1].split('"""', 1)[0])
        con.executemany("INSERT INTO block_identity_facts VALUES (?,?,?,?,?,?)", rows)
        fails += _roster_parity()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    for f in fails:
        print("  FAIL " + f)
    print(f"[block-identity-facts self-test] {len(expect) - len([f for f in fails if ' expected ' in f])}/{len(expect)} planted facts right, "
          f"{len(rows)} rows insert under the table's constraints" + ("" if not fails else f"; {len(fails)} failure(s)"))
    return 1 if fails else 0
