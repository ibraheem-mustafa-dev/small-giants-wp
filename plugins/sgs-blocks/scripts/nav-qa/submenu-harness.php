<?php
/**
 * Stubbed harness for SGS_Nav_Menu_Bar_Renderer — walker AND render_items.
 *
 * The previous harness sliced the class out by HARD-CODED line numbers
 * (`array_slice($lines, 50, 345-50)`), which silently went stale the moment the
 * class grew: it would have eval'd a truncated class and failed in a confusing
 * way rather than testing anything. This one locates the class by its own
 * delimiters, so it cannot drift.
 *
 * Run: php .claude/scratch/nav-submenu-harness-2026-07-31.php
 * Exits 1 on any failure so it can gate, rather than printing prose nobody reads.
 */

// ── WordPress stubs (only what the class touches) ──────────────────────────
function sanitize_key( $k ) { return strtolower( preg_replace( '/[^a-zA-Z0-9_\-]/', '', $k ) ); }
function home_url( $p = '' ) { return 'https://example.test' . $p; }
function __( $s, $d = null ) { return $s; }
function get_pages( $a = array() ) { return array(); }
function esc_url( $u ) { return $u; }
function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function sanitize_html_class( $c ) { return $c; }
function wp_parse_url( $u, $c = -1 ) { return parse_url( $u, $c ); }
function wp_json_encode( $d ) { return json_encode( $d ); }
function sgs_get_lucide_icon( $n ) { return '<svg data-icon="' . $n . '"></svg>'; }

$path = '' . __DIR__ . '/../../src/blocks/nav-menu/render.php';
$src  = file_get_contents( $path );

// Locate the class by its own text, never by line number.
$start = strpos( $src, 'class SGS_Nav_Menu_Bar_Renderer' );
if ( false === $start ) {
	fwrite( STDERR, "FAIL: class not found in render.php — harness is looking at the wrong file.\n" );
	exit( 1 );
}
// Walk braces from the class's opening { to its matching close.
$brace = strpos( $src, '{', $start );
$depth = 0;
$end   = null;
for ( $i = $brace, $n = strlen( $src ); $i < $n; $i++ ) {
	if ( '{' === $src[ $i ] ) { $depth++; }
	if ( '}' === $src[ $i ] ) {
		$depth--;
		if ( 0 === $depth ) { $end = $i; break; }
	}
}
if ( null === $end ) {
	fwrite( STDERR, "FAIL: could not find the end of the class.\n" );
	exit( 1 );
}
/*
 * eval() is deliberate and safe here: the input is a FIRST-PARTY class read
 * from this repo's own render.php, never user or network input. This is a
 * developer scratch harness whose whole purpose is to exercise that class
 * outside WordPress; render.php cannot simply be require()d because its
 * top-level body runs WordPress-only code. Nothing here ships.
 */
eval( substr( $src, $start, $end - $start + 1 ) );

function mklink( $label, $url = '', $id = null ) {
	$a = array( 'label' => $label );
	if ( '' !== $url ) { $a['url'] = $url; }
	if ( null !== $id ) { $a['id'] = $id; }
	return array( 'blockName' => 'core/navigation-link', 'attrs' => $a, 'innerBlocks' => array() );
}
function mksub( $label, $url, $kids ) {
	$a = array( 'label' => $label );
	if ( '' !== $url ) { $a['url'] = $url; }
	return array( 'blockName' => 'core/navigation-submenu', 'attrs' => $a, 'innerBlocks' => $kids );
}

$fails = 0;
function check( $name, $got, $want ) {
	global $fails;
	$ok = $got === $want;
	if ( ! $ok ) { $fails++; }
	printf( "  [%s] %-58s got=%s want=%s\n", $ok ? 'PASS' : 'FAIL', $name, var_export( $got, true ), var_export( $want, true ) );
}

$r = new SGS_Nav_Menu_Bar_Renderer( array(), 'uid1' );

echo "=== WALKER ===\n";
$out = $r->flatten( array( mksub( 'Services', '/services', array( mklink( 'Web', '/web' ), mklink( 'SEO', '/seo' ) ) ) ) );
check( 'top-level items', count( $out ), 1 );
check( 'children carried', count( $out[0]['children'] ), 2 );

$out2 = $r->flatten( array(
	mksub( 'Company', '/c', array( mklink( 'About', '/c/about' ) ) ),
	mksub( 'Brand', '/b', array( mklink( 'About', '/b/about' ) ) ),
) );
check( 'sibling "About" ids distinct',
	$out2[0]['children'][0]['identifier'] !== $out2[1]['children'][0]['identifier'], true );

$deep   = $r->flatten( array( mksub( 'L1', '/1', array( mksub( 'L2', '/2', array( mklink( 'L3', '/3' ) ) ) ) ) ) );
$labels = array();
$walk   = function ( $items ) use ( &$walk, &$labels ) {
	foreach ( $items as $it ) { $labels[] = $it['label']; $walk( $it['children'] ?? array() ); }
};
$walk( $deep );
check( 'depth-3 label survives (no silent data loss)', in_array( 'L3', $labels, true ), true );

echo "\n=== RENDER (the half that was never tested) ===\n";
$html = $r->render_items( $out );
check( 'child <li> present', substr_count( $html, 'sgs-nav-menu__subitem' ), 2 );
check( 'child <a> present', substr_count( $html, 'sgs-nav-menu__sublink' ), 2 );
check( 'interactive root emitted', substr_count( $html, 'data-wp-interactive="sgs/mega"' ), 1 );
check( 'trigger hook emitted', substr_count( $html, 'data-sgs-mega-trigger' ), 1 );
check( 'panel hook emitted', substr_count( $html, 'data-sgs-mega-panel' ), 1 );
check( 'dropdown kind marked for the JS', substr_count( $html, 'data-sgs-nav-disclosure="dropdown"' ), 1 );
check( 'aria-expanded starts false', substr_count( $html, 'aria-expanded="false"' ), 1 );

// The root must PHYSICALLY WRAP trigger and panel — the hover bridge is DOM
// containment, not geometry. A sibling panel would close on pointer-out.
$root_at    = strpos( $html, 'sgs-nav-menu__submenu-root' );
$trigger_at = strpos( $html, 'data-sgs-mega-trigger' );
$panel_at   = strpos( $html, 'data-sgs-mega-panel' );
$root_close = strpos( $html, '</div></li>', $root_at );
check( 'trigger inside root', $trigger_at > $root_at && $trigger_at < $root_close, true );
check( 'panel inside root', $panel_at > $root_at && $panel_at < $root_close, true );

// markCurrentPage() keys off data-sgs-nav-path — a child without it can never
// highlight as the current page.
check( 'child links carry data-sgs-nav-path', substr_count( $html, 'data-sgs-nav-path="/web"' ), 1 );

echo "\n=== has_url: parent WITHOUT its own URL renders a button, not href=# ===\n";
$nourl      = $r->flatten( array( mksub( 'Services', '', array( mklink( 'Web', '/web' ) ) ) ) );
$html_nourl = $r->render_items( $nourl );
check( 'has_url false', $nourl[0]['has_url'], false );
check( 'no href="#" trigger', strpos( $html_nourl, 'href="#"' ), false );
check( 'button trigger used', substr_count( $html_nourl, '<button type="button"' ), 1 );

echo "\n=== DEGRADE: children exist but every label is empty ===\n";
$empty      = $r->flatten( array( mksub( 'Services', '/s', array( mklink( '', '/x' ) ) ) ) );
$html_empty = $r->render_items( $empty );
check( 'no dropdown emitted', strpos( $html_empty, 'data-sgs-mega-trigger' ), false );
// NOTE: match the EXACT class attribute. 'sgs-nav-menu__link' is a substring of
// 'sgs-nav-menu__link-text', which sits inside every plain link, so the loose
// token double-counts and the assertion measures the grep, not the markup.
check( 'degrades to a plain link', substr_count( $html_empty, 'class="sgs-nav-menu__link"' ), 1 );

echo "\n=== FLAT MENU UNCHANGED (every existing nav on both live sites) ===\n";
$flat      = $r->flatten( array( mklink( 'Home', '/' ), mklink( 'Contact', '/contact' ) ) );
$html_flat = $r->render_items( $flat );
check( 'no submenu machinery', strpos( $html_flat, 'submenu-root' ), false );
check( 'plain links still render', substr_count( $html_flat, 'class="sgs-nav-menu__link"' ), 2 );
check( 'top-level identifier unchanged', $flat[0]['identifier'], 'label:Home' );

echo "\n=== ALIGNMENT reaches the markup ===\n";
$r_end = new SGS_Nav_Menu_Bar_Renderer( array(), 'uid2', array( 'align' => 'end', 'caret' => false ) );
$h_end = $r_end->render_items( $r_end->flatten( array( mksub( 'S', '/s', array( mklink( 'W', '/w' ) ) ) ) ) );
check( 'align=end emitted', substr_count( $h_end, 'data-sgs-nav-submenu-align="end"' ), 1 );
check( 'caret=false suppresses the icon', strpos( $h_end, 'data-icon="chevron-down"' ), false );
$r_bad = new SGS_Nav_Menu_Bar_Renderer( array(), 'uid3', array( 'align' => 'nonsense' ) );
$h_bad = $r_bad->render_items( $r_bad->flatten( array( mksub( 'S', '/s', array( mklink( 'W', '/w' ) ) ) ) ) );
check( 'invalid align falls back to start', substr_count( $h_bad, 'data-sgs-nav-submenu-align="start"' ), 1 );

echo "
=== FEATURED + CURRENT-PAGE states on CHILDREN ===
";
// A featured CHILD (the "Send to ward"-style priority item) must carry its own
// modifier class, using the SAME featuredItemIds roster the bar already uses.
$r_feat     = new SGS_Nav_Menu_Bar_Renderer( array( 'label:Services>label:SEO Audits' ), 'uid4' );
$items_feat = $r_feat->flatten( array( mksub( 'Services', '/s', array( mklink( 'Web Design', '/w' ), mklink( 'SEO Audits', '/seo' ) ) ) ) );
$h_feat     = $r_feat->render_items( $items_feat );
check( 'featured CHILD gets its modifier', substr_count( $h_feat, 'sgs-nav-menu__subitem--featured' ), 1 );
check( 'non-featured sibling does NOT', substr_count( $h_feat, 'class="sgs-nav-menu__subitem"' ), 1 );
// Negative control: with an EMPTY roster nothing may be marked featured.
$r_none = new SGS_Nav_Menu_Bar_Renderer( array(), 'uid5' );
$h_none = $r_none->render_items( $r_none->flatten( array( mksub( 'Services', '/s', array( mklink( 'SEO Audits', '/seo' ) ) ) ) ) );
check( 'NEG CONTROL: empty roster marks nothing', strpos( $h_none, '--featured' ), false );
// current-page is client-side (a page cache would serve a stale server value),
// so the SERVER contract is just: every child carries the path view.js reads.
// Counted on the SUBLINK specifically: a bare 'data-sgs-nav-path=' count returns
// 3 here because the PARENT link carries one too, which is correct and not what
// this assertion is about.
preg_match_all( '/class="sgs-nav-menu__sublink"[^>]*data-sgs-nav-path="/', $h_feat, $m_paths );
check( 'every CHILD link carries data-sgs-nav-path', count( $m_paths[0] ), 2 );

printf( "\n%s — %d failure(s)\n", $fails ? 'FAILED' : 'ALL PASSED', $fails );
exit( $fails ? 1 : 0 );
