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
  sgs/fx-plain's code `no` is a conflict and no row, computed from this seed's code rows (a stale `conflicts` list stored
  in the file, naming sgs/fx-tabs' code-yes tablist, is ignored); a live entry that is not `yes` is ignored;
- the false `no` shapes the live read found, and their kin (each MUST FAIL on the extractor before the fix):
  sgs/fx-wrapper sets `$args['role'] = 'dialog'` and `$args['aria-modal']` on the array it hands to
  get_block_wrapper_attributes (dialog, aria-modal yes); sgs/fx-fieldset opens `<fieldset <?php echo $w; ?>>` in raw
  HTML (fieldset yes); sgs/fx-content prints a setting through wp_kses_post (br, strong yes from the core kses
  snapshot; roles unknown, kses lets any role through), nl2br and a literal wp_kses allowlist (mark, aria-label yes);
  sgs/fx-image calls wp_get_attachment_image (img yes from the core snapshot, so `video` is no, not unknown);
  sgs/fx-npm imports a pinned package that builds a div and, through a helper called with literals, a span with
  aria-hidden (yes; table no), while sgs/fx-unpinned imports one package-lock.json does not pin (table unknown);
  sgs/fx-shapes builds `'<' . 'section'` by concatenation (section yes), writes `toggleAttribute( 'aria-pressed' )`
  (yes) and a constant-named attribute that is not ARIA (aria-busy no), and its `_doing_it_wrong` message `<code>` is
  no page markup (code no); sgs/fx-varattr writes an attribute named by an uploaded document (aria-pressed unknown);
- inner blocks (MUST FAIL before the fold): sgs/fx-hero prints its InnerBlocks and accepts any block; its editor
  template inserts sgs/fx-head, whose <h1> it can show (yes, evidence naming the child), and every value no child
  settles is unknown (table); sgs/fx-list allows only sgs/fx-item (block_composition), so its <li> is yes and a
  value neither prints stays no (table); sgs/fx-box accepts any block with no template (table unknown, its own div yes);
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
    "fx-wrapper": ({"supports": {}}, """<?php
$wrapper_args               = array( 'class' => 'x' );
$wrapper_args['role']       = 'dialog';
$wrapper_args['aria-modal'] = $modal ? 'true' : 'false';
$w = get_block_wrapper_attributes( $wrapper_args );
echo '<div ' . $w . '></div>';
""", None),
    "fx-fieldset": ({"supports": {}}, """<?php
$w = 'class="x"';
?>
<fieldset <?php echo $w; ?>>
<legend>Pick</legend></fieldset>
""", None),
    "fx-content": ({"supports": {}}, """<?php
echo '<li>' . wp_kses_post( $item['text'] ) . '</li>';
echo '<p>' . nl2br( esc_html( $attributes['note'] ) ) . '</p>';
echo wp_kses( $attributes['label'], array( 'mark' => array( 'aria-label' => true ) ) );
""", None),
    "fx-image": ({"supports": {}}, """<?php
echo '<figure>' . wp_get_attachment_image( (int) $attributes['id'], 'large' ) . '</figure>';
""", None),
    "fx-npm": ({"supports": {}}, "<?php\necho '<p></p>';\n", """import { make } from 'fakepkg';
make();
"""),
    "fx-unpinned": ({"supports": {}}, "<?php\necho '<p></p>';\n", """import other from 'otherpkg';
other();
"""),
    "fx-shapes": ({"supports": {}}, """<?php
_doing_it_wrong( __FUNCTION__, '<code>tag</code> is required', '7.1' );
echo '<' . 'section' . ' class="x"></section>';
""", """const HIDDEN = 'hidden';
el.setAttribute( HIDDEN, '' );
btn.toggleAttribute( 'aria-pressed' );
"""),
    "fx-woo": ({"supports": {}}, """<?php
ob_start();
\\WC_Shortcode_My_Account::output( array() );
$wc_output = ob_get_clean();
echo '<div class="x">' . $wc_output . '</div>';
""", None),
    "fx-hero": ({"supports": {}, "_edit": """const TEMPLATE = [ [ 'sgs/fx-head', { level: 1 } ] ];
export default function Edit() { return <div { ...useInnerBlocksProps( {}, { template: TEMPLATE } ) } />; }
"""}, "<?php\necho '<section class=\"x\">' . $content . '</section>';\n", None),
    "fx-head": ({"supports": {}}, "<?php\necho '<h1>' . esc_html( $attributes['text'] ) . '</h1>';\n", None),
    "fx-list": ({"supports": {}, "_edit": """export default function Edit() { return <ul><InnerBlocks allowedBlocks={ [ 'sgs/fx-item' ] } /></ul>; }
"""}, "<?php\necho '<ul>' . $content . '</ul>';\n", None),
    "fx-item": ({"supports": {}}, "<?php\necho '<li>' . esc_html( $attributes['text'] ) . '</li>';\n", None),
    "fx-box": ({"supports": {}, "_edit": """export default function Edit() { return <div><InnerBlocks /></div>; }
"""}, "<?php\necho '<div class=\"box\">' . $content . '</div>';\n", None),
    "fx-varattr": ({"supports": {}}, """<?php
foreach ( $node->attributes as $attr ) {
	$local = $attr->localName;
	$element->setAttribute( $local, (string) $attr->value );
}
echo '<span></span>';
""", None),
}

FAKE_PKG = """export function make() {
	const el = document.createElement( 'div' );
	el.setAttribute( 'aria-hidden', 'true' );
	el.appendChild( _create( 'span' ) );
	return el;
}
const _create = function _create( type ) {
	return document.createElement( type );
};
"""

CORE_SNAPSHOT = {
    "_meta": {"wordpress": "fixture"},
    "functions": {"wp_get_attachment_image": {"evidence": "WordPress fixture wp-includes/media.php::wp_get_attachment_image",
                                              "tags": ["img"], "roles": [], "aria": []}},
    "kses": {"post": {"tags": ["a", "br", "em", "p", "strong"], "aria": ["aria-label"], "role": True},
             "data": {"tags": ["a", "em", "strong"], "aria": [], "role": False}},
}


def _build(root: Path) -> Paths:
    plugin = root / "plugins" / "sgs-blocks"
    for rel, text in FIXTURE_PHP.items():
        (plugin / rel).parent.mkdir(parents=True, exist_ok=True)
        (plugin / rel).write_text(text, encoding="utf-8")
    for name, (meta, render, view) in BLOCKS.items():
        d = plugin / "src" / "blocks" / name
        d.mkdir(parents=True, exist_ok=True)
        edit = meta.get("_edit")
        bj = {"name": f"sgs/{name}", "attributes": {}, **{k: v for k, v in meta.items() if k != "_edit"}}
        if edit:
            (d / "edit.js").write_text(edit, encoding="utf-8")
        if view:
            bj["viewScriptModule"] = "file:./view.js"
            (d / "view.js").write_text(view, encoding="utf-8")
        (d / "block.json").write_text(json.dumps(bj), encoding="utf-8")
        (d / "render.php").write_text(render, encoding="utf-8")
    brands = root / "brand-registry.json"
    brands.write_text(json.dumps({"brands": [{"slug": "acme", "label": "Acme", "colour": "#123456"},
                                             {"slug": "phone", "label": "Phone", "colour": ""}]}), encoding="utf-8")
    pkg = plugin / "node_modules" / "fakepkg"
    pkg.mkdir(parents=True, exist_ok=True)
    (pkg / "package.json").write_text(json.dumps({"name": "fakepkg", "version": "1.0.0", "module": "index.js"}), encoding="utf-8")
    (pkg / "index.js").write_text(FAKE_PKG, encoding="utf-8")
    (plugin / "package-lock.json").write_text(json.dumps({"packages": {"node_modules/fakepkg": {"version": "1.0.0"}}}), encoding="utf-8")
    core = root / "core-markup-facts.json"
    core.write_text(json.dumps(CORE_SNAPSHOT), encoding="utf-8")
    extra = {k: v for k, v in {"core": core, "plugin": plugin}.items() if k in Paths.__dataclass_fields__}
    return Paths(repo=root, blocks=plugin / "src" / "blocks", php_roots=[plugin / "includes", plugin / "src"],
                 roster=root / "none.json", qualifying=root / "none.json", brands=brands, decisions=root / "none.json", **extra)


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
                      source_enums={"sgs/fx-plain": [("iconSource", ["lucide"])]}, fx={},
                      **({"allowed": {"sgs/fx-list": ["sgs/fx-item"], "sgs/fx-hero": None, "sgs/fx-box": None}}
                         if "allowed" in DbInputs.__dataclass_fields__ else {}))
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
            ("sgs/fx-wrapper", "renders-role", "dialog", "yes", "a role set by key assignment on the wrapper attribute array"),
            ("sgs/fx-wrapper", "renders-aria", "aria-modal", "yes", "an aria-* set by key assignment on the wrapper attribute array"),
            ("sgs/fx-fieldset", "renders-tag", "fieldset", "yes", "a raw-HTML tag opened before inline PHP"),
            ("sgs/fx-content", "renders-tag", "br", "yes", "a setting printed through wp_kses_post can hold a <br>"),
            ("sgs/fx-content", "renders-tag", "strong", "yes", "every tag the kses 'post' snapshot allows"),
            ("sgs/fx-content", "renders-role", "tablist", "unknown", "kses lets any role value through"),
            ("sgs/fx-content", "renders-tag", "mark", "yes", "a literal wp_kses allowlist's tags"),
            ("sgs/fx-content", "renders-aria", "aria-label", "yes", "a literal wp_kses allowlist's ARIA attribute"),
            ("sgs/fx-content", "renders-tag", "table", "no", "a tag no allowlist lets through"),
            ("sgs/fx-image", "renders-tag", "img", "yes", "core image output read from the pinned core snapshot"),
            ("sgs/fx-image", "renders-tag", "video", "no", "core image output is settled, so other tags are no"),
            ("sgs/fx-npm", "renders-tag", "div", "yes", "a pinned package's createElement"),
            ("sgs/fx-npm", "renders-tag", "span", "yes", "a package helper's parameter settled by its literal call"),
            ("sgs/fx-npm", "renders-aria", "aria-hidden", "yes", "a pinned package's setAttribute"),
            ("sgs/fx-npm", "renders-tag", "table", "no", "a pinned package read in full rules nothing in"),
            ("sgs/fx-unpinned", "renders-tag", "table", "unknown", "an unpinned package stays outside"),
            ("sgs/fx-shapes", "renders-tag", "section", "yes", "a tag built by literal concatenation"),
            ("sgs/fx-shapes", "renders-aria", "aria-pressed", "yes", "toggleAttribute writes"),
            ("sgs/fx-shapes", "renders-aria", "aria-busy", "no", "a constant-named attribute that is not ARIA"),
            ("sgs/fx-shapes", "renders-tag", "code", "no", "a _doing_it_wrong message is no page markup"),
            ("sgs/fx-varattr", "renders-aria", "aria-pressed", "unknown", "an attribute named by a parsed document"),
            ("sgs/fx-hero", "renders-tag", "h1", "yes", "an h1 its template's child block prints (the hero/h1 live finding)"),
            ("sgs/fx-hero", "renders-tag", "table", "unknown", "a block that accepts any inner block rules nothing out"),
            ("sgs/fx-list", "renders-tag", "li", "yes", "its one allowed child's li"),
            ("sgs/fx-list", "renders-tag", "table", "no", "a restricted parent whose only child cannot print it"),
            ("sgs/fx-box", "renders-tag", "table", "unknown", "an accept-any container with no template"),
            ("sgs/fx-box", "renders-tag", "div", "yes", "its own markup"),
            ("sgs/fx-woo", "renders-tag", "form", "unknown", "a WooCommerce class's own output (a static ::output call) stays unknown"),
        ]
        fails = [f"{slug} {fact}={value}: expected {want}, got {state.get((slug, fact, value), 'no row')} ({why})"
                 for slug, fact, value, want, why in expect if state.get((slug, fact, value)) != want]
        # The live import: a live yes lands only on a code unknown; beside a code no it is a conflict, never a row.
        live_file = tmp / "block-live-facts.json"
        live_file.write_text(json.dumps({"readOn": "2026-10-30", "blocks": {
            "sgs/fx-dyn": {"facts": {"renders-tag": {"table": {"state": "yes", "evidence": ["local-x / @375 .wp-block-sgs-fx-dyn[0] table"]}}}},
            "sgs/fx-plain": {"facts": {"renders-tag": {"table": {"state": "yes", "evidence": ["local-x / @375 .wp-block-sgs-fx-plain[0] table"]}},
                                       "renders-role": {"tablist": {"state": "unknown", "evidence": []}}}},
            # A seen value beside a code yes adds nothing.
            "sgs/fx-tabs": {"facts": {"renders-role": {"tablist": {"state": "yes", "evidence": ["local-x / @375 .wp-block-sgs-fx-tabs[0]"]}}}},
        },
            # A stored conflict list is stale data: never read (conflicts are computed against this seed's code rows).
            "conflicts": {"sgs/fx-tabs": {"renders-role=tablist": "stale"}}}), encoding="utf-8")
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
