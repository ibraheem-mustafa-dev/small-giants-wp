<?php
/**
 * Standalone runner for the mega item Section page (Spec 36 FR-36-5 "Section page", FR-36-6 "A parent
 * with its own page").
 *
 * Loads the SHIPPED Sgs_Mega_Menu_CPT, SGS_Nav_Menu_Source, helpers-mega-render.php and
 * nav-menu-markup.php with minimal WordPress stubs (a fixture post table, a classic menu and a
 * wp_navigation post). Covers:
 * - section_url(): a published page gives its permalink; a draft, a deleted page, a non-viewable type
 *   and no meta give ''.
 * - the menu source: a classic mega item's url is its panel's section URL ('' without one) while a
 *   page item keeps its own; a block-menu mega link nested in a submenu gets the same.
 * - the bar: a mega item with a URL is a link plus a chevron button that keeps __mega-trigger and
 *   always shows its caret; without one it renders byte-identical to the pre-change markup
 *   (d003c37aa, run in a separate PHP process because the functions share names); the panel
 *   footer's "View all" prints once in the bar.
 * - the drawer: a split row adds no row of its own (a mega row's section starts with the panel, a
 *   megaDrawerFallbackIds row with its children, a dropdown with its own page has no "View all"); a
 *   panel with no button prints its own footer "View all" once, inside the panel, in both the
 *   accordion and drill-down models; a parent with no page stays a whole-row toggle.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-mega-section-links-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable WordPress.WP.AlternativeFunctions
// phpcs:disable Squiz.PHP.Eval.Discouraged

const PRE_CHANGE_SHA = 'd003c37aa';

$stubs = <<<'PHP'
if ( ! defined( 'ABSPATH' ) ) { define( 'ABSPATH', __DIR__ . '/' ); }
function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_url( $u ) { return (string) $u; }
function esc_attr__( $t, $d = '' ) { return esc_attr( $t ); }
function __( $t, $d = '' ) { return $t; }
function absint( $v ) { return abs( (int) $v ); }
function wp_parse_url( $u, $c = -1 ) { return parse_url( $u, $c ); }
function sgs_get_lucide_icon( $name ) { return '' === $name ? '' : '<svg data-icon="' . $name . '"></svg>'; }
function sanitize_key( $k ) { return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', (string) $k ) ); }
function wp_enqueue_style( $h ) {}
function wp_strip_all_tags( $s ) { return strip_tags( (string) $s ); }
function is_wp_error( $v ) { return false; }
function wp_interactivity_data_wp_context( $ctx ) { return "data-wp-context='" . json_encode( $ctx ) . "'"; }
$GLOBALS['sgs_test_filters'] = array();
function add_filter( $h, $cb, $p = 10, $a = 1 ) { $GLOBALS['sgs_test_filters'][ $h ][] = $cb; return true; }
function remove_filter( $h, $cb, $p = 10 ) { $GLOBALS['sgs_test_filters'][ $h ] = array_values( array_filter( $GLOBALS['sgs_test_filters'][ $h ] ?? array(), fn( $x ) => $x !== $cb ) ); return true; }
function apply_filters( $h, $v, ...$args ) { foreach ( $GLOBALS['sgs_test_filters'][ $h ] ?? array() as $cb ) { $v = $cb( $v, ...$args ); } return $v; }
class WP_Post { public $ID; public $post_content = ''; public $post_type = 'post'; public $post_status = 'publish'; }
// id => [type, status, content, section meta].
$GLOBALS['sgs_test_posts'] = array(
	10  => array( 'page', 'publish', '', null ),
	11  => array( 'page', 'draft', '', null ),
	12  => array( 'sgs_form', 'publish', '', null ),
	100 => array( 'sgs_mega_menu', 'publish', '<!-- wp:sgs/mega-panel /-->', 10 ),
	101 => array( 'sgs_mega_menu', 'publish', '<!-- wp:sgs/mega-panel /-->', null ),
	102 => array( 'sgs_mega_menu', 'publish', '<!-- wp:sgs/mega-panel /-->', 11 ),
	103 => array( 'sgs_mega_menu', 'publish', '<!-- wp:sgs/mega-panel /-->', 999 ),
	104 => array( 'sgs_mega_menu', 'publish', '<!-- wp:sgs/mega-panel /-->', 12 ),
	77  => array( 'wp_navigation', 'publish', 'BLOCK-MENU', null ),
);
function get_post( $id ) {
	$row = $GLOBALS['sgs_test_posts'][ (int) $id ] ?? null;
	if ( null === $row ) { return null; }
	$p = new WP_Post(); $p->ID = (int) $id; $p->post_type = $row[0]; $p->post_status = $row[1]; $p->post_content = $row[2];
	return $p;
}
function get_post_meta( $id, $key = '', $single = false ) { return '_sgs_mega_section_page' === $key ? ( $GLOBALS['sgs_test_posts'][ (int) $id ][3] ?? '' ) : ''; }
function is_post_type_viewable( $type ) { return in_array( $type, array( 'page', 'post' ), true ); }
function get_permalink( $p ) { return 'https://example.test/page-' . ( $p instanceof WP_Post ? $p->ID : (int) $p ) . '/'; }
$GLOBALS['sgs_test_seen_footer'] = array();
function do_blocks( $c ) {
	$GLOBALS['sgs_test_seen_footer'][] = apply_filters( 'sgs_mega_panel_footer_html', '', $GLOBALS['sgs_test_rendering_panel'] ?? 0 );
	return '<div class="stub-panel">PANEL' . apply_filters( 'sgs_mega_panel_footer_html', '', $GLOBALS['sgs_test_rendering_panel'] ?? 0 ) . '</div>';
}
function get_post_thumbnail_id( $id ) { return 0; }
function get_post_mime_type( $id ) { return 'image/jpeg'; }
function wp_get_registered_image_subsizes() { return array(); }
function wp_get_attachment_image( $id, $size, $icon = false, $attr = array() ) { return ''; }
PHP;

eval( $stubs );

// The panel id do_blocks() is rendering, so the footer filter (keyed on that id) can be read back.
$GLOBALS['sgs_test_rendering_panel'] = 0;

$inc = dirname( __DIR__, 2 ) . '/includes/';
require_once $inc . 'class-sgs-mega-menu-cpt.php';
require_once $inc . 'class-sgs-nav-menu-source.php';
foreach ( array( 'helpers-css-safety.php', 'helpers-tokens.php', 'helpers-hover-state.php', 'helpers-motion-easing.php', 'helpers-responsive.php', 'helpers-mega-render.php', 'nav-menu-markup.php' ) as $f ) {
	require_once $inc . $f;
}

use SGS\Blocks\Sgs_Mega_Menu_CPT;

$pass = 0;
$fail = 0;
function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  {$label}\n";
	} else {
		++$fail;
		echo "FAIL  {$label}\n";
	}
}

// ── 1. section_url(). ───────────────────────────────────────────────────────
ok( 'https://example.test/page-10/' === Sgs_Mega_Menu_CPT::section_url( 100 ), 'a published page is the section URL' );
ok( '' === Sgs_Mega_Menu_CPT::section_url( 101 ), 'no meta: no section URL' );
ok( '' === Sgs_Mega_Menu_CPT::section_url( 102 ), 'a draft page: no section URL' );
ok( '' === Sgs_Mega_Menu_CPT::section_url( 103 ), 'a deleted page: no section URL' );
ok( '' === Sgs_Mega_Menu_CPT::section_url( 104 ), 'a non-viewable post type: no section URL' );

// ── 2. The menu source. ─────────────────────────────────────────────────────
function wp_get_nav_menu_object( $id ) { return 5 === (int) $id ? (object) array( 'term_id' => 5 ) : false; }
function wp_get_nav_menu_items( $id, $args = array() ) {
	$item = static fn( int $item_id, string $title, string $object, int $object_id, string $url, int $parent = 0 ) => (object) array(
		'ID'               => $item_id,
		'title'            => $title,
		'object'           => $object,
		'object_id'        => $object_id,
		'url'              => $url,
		'type'             => 'post_type',
		'menu_item_parent' => $parent,
		'description'      => '',
		'attr_title'       => '',
		'target'           => '',
	);
	return array(
		$item( 1, 'About', 'sgs_mega_menu', 100, 'https://example.test/?sgs_mega_menu=about' ),
		$item( 2, 'Contact', 'page', 10, 'https://example.test/contact/' ),
		$item( 3, 'Brands', 'sgs_mega_menu', 101, 'https://example.test/?sgs_mega_menu=brands' ),
	);
}
function parse_blocks( $content ) {
	return array(
		array(
			'blockName'   => 'core/navigation-submenu',
			'attrs'       => array( 'label' => 'Shop', 'url' => 'https://example.test/shop/', 'type' => 'page', 'id' => 10 ),
			'innerBlocks' => array(
				array( 'blockName' => 'core/navigation-link', 'attrs' => array( 'label' => 'About', 'url' => 'https://example.test/?sgs_mega_menu=about', 'type' => 'sgs_mega_menu', 'id' => 100 ), 'innerBlocks' => array() ),
				array( 'blockName' => 'core/navigation-link', 'attrs' => array( 'label' => 'Brands', 'url' => 'https://example.test/?sgs_mega_menu=brands', 'type' => 'sgs_mega_menu', 'id' => 101 ), 'innerBlocks' => array() ),
			),
		),
	);
}
$classic = SGS_Nav_Menu_Source::blocks_from_classic_menu( 5 );
ok( 'https://example.test/page-10/' === ( $classic[0]['attrs']['url'] ?? null ), 'classic: a mega item links to its panel\'s section page' );
ok( 'https://example.test/contact/' === ( $classic[1]['attrs']['url'] ?? null ), 'classic: a page item keeps its own URL' );
ok( '' === ( $classic[2]['attrs']['url'] ?? null ), 'classic: a mega item whose panel has no section page has no URL (not the panel\'s 404 permalink)' );
$block = SGS_Nav_Menu_Source::blocks_from_ref( 77 );
ok( 'https://example.test/shop/' === ( $block[0]['attrs']['url'] ?? null ), 'block menu: a page parent keeps its own URL' );
ok( 'https://example.test/page-10/' === ( $block[0]['innerBlocks'][0]['attrs']['url'] ?? null ), 'block menu: a nested mega link links to its section page' );
ok( '' === ( $block[0]['innerBlocks'][1]['attrs']['url'] ?? null ), 'block menu: a nested mega link with no section page has no URL' );

// ── 3. The bar. ─────────────────────────────────────────────────────────────
$submenu = array(
	'caret'        => false,
	'intent_delay' => 300,
	'close_grace'  => 300,
	'open_on'      => 'hover',
	'align'        => 'start',
	'label_roll'   => '',
);
$mega_linked = array(
	'identifier' => 'id:100',
	'label'      => 'About',
	'url'        => 'https://example.test/page-10/',
	'has_url'    => true,
	'type'       => 'sgs_mega_menu',
	'object_id'  => 100,
);
$mega_plain  = array(
	'identifier' => 'id:101',
	'label'      => 'Brands',
	'url'        => '#',
	'has_url'    => false,
	'type'       => 'sgs_mega_menu',
	'object_id'  => 101,
);

$GLOBALS['sgs_test_rendering_panel'] = 100;
$bar = sgs_nav_bar_menu_render_items( array( $mega_linked ), array(), 'sgs-nav-bar-menu-u1', $submenu );
ok( false !== strpos( $bar, '<a class="sgs-nav-bar-menu__link" href="https://example.test/page-10/" data-sgs-nav-path="/page-10/" data-wp-on--keydown="actions.linkKeydown">' ), 'bar: the label is a link to the section page carrying data-sgs-nav-path and the Escape handler' );
ok( 1 === preg_match( '#<button type="button" class="sgs-nav-bar-menu__subtoggle sgs-nav-bar-menu__mega-trigger sgs-focus--inset" data-sgs-mega-trigger aria-expanded="false" aria-controls="sgs-nav-bar-menu-u1-mega-100"[^>]*><span class="screen-reader-text">Show submenu for About</span><span class="sgs-nav-bar-menu__caret" aria-hidden="true"><svg#', $bar ), 'bar: a separate chevron button keeps __mega-trigger, controls the panel, is named and shows its caret with submenuCaret off' );
ok( false !== strpos( $bar, 'class="sgs-nav-bar-menu__mega sgs-nav-bar-menu__mega--split"' ), 'bar: the mega root carries the split modifier' );
ok( 1 === substr_count( $bar, 'View all About' ), 'bar: the panel footer "View all" prints once' );

$GLOBALS['sgs_test_rendering_panel'] = 101;
$bar_plain = sgs_nav_bar_menu_render_items( array( $mega_plain ), array(), 'sgs-nav-bar-menu-u1', $submenu );
ok( false === strpos( $bar_plain, '<a ' ) && false !== strpos( $bar_plain, '<button type="button" class="sgs-nav-bar-menu__link sgs-nav-bar-menu__mega-trigger"' ), 'bar: with no section page the item is the button-only trigger' );

$dropdown_bar = sgs_nav_bar_menu_render_items(
	array(
		array(
			'identifier' => 'id:10',
			'label'      => 'Shop',
			'url'        => 'https://example.test/shop/',
			'has_url'    => true,
			'type'       => 'page',
			'object_id'  => 10,
			'children'   => array(
				array(
					'identifier' => 'c1',
					'label'      => 'Gifts',
					'url'        => 'https://example.test/gifts/',
				),
			),
		),
	),
	array(),
	'sgs-nav-bar-menu-u1',
	$submenu
);
ok( 1 === preg_match( '#data-wp-on--keydown="actions.linkKeydown">.*?</a><button type="button" class="sgs-nav-bar-menu__subtoggle sgs-focus--inset"[^>]*><span class="screen-reader-text">Show submenu for Shop</span><span class="sgs-nav-bar-menu__caret" aria-hidden="true"><svg#', $dropdown_bar ), 'bar: a dropdown parent with a page carries the Escape handler and its chevron shows the caret with submenuCaret off' );

// The same no-section item through the pre-change markup, in its own process: the whole
// includes/ folder of PRE_CHANGE_SHA is extracted (its files require each other).
$repo   = dirname( __DIR__, 4 );
$tmp    = sys_get_temp_dir() . '/sgs-mega-pre-' . getmypid();
$files  = array( 'helpers-css-safety.php', 'helpers-tokens.php', 'helpers-hover-state.php', 'helpers-motion-easing.php', 'helpers-responsive.php', 'helpers-mega-render.php', 'nav-menu-markup.php' );
$made   = @mkdir( $tmp, 0777, true );
$tar    = escapeshellarg( str_replace( '\\', '/', $tmp ) );
shell_exec( 'git -C ' . escapeshellarg( $repo ) . ' archive --format=tar ' . PRE_CHANGE_SHA . ' plugins/sgs-blocks/includes | tar -x -C ' . $tar );
$copied = is_file( $tmp . '/plugins/sgs-blocks/includes/nav-menu-markup.php' );
$script = $tmp . '/run.php';
file_put_contents(
	$script,
	"<?php\nnamespace SGS\\Blocks { class Sgs_Mega_Menu_CPT { public static function resolve_panel_for_menu_item( \$o ) { return \\get_post( (int) \$o->object_id ); } } }\nnamespace {\n" . $stubs . "\n"
	. '$GLOBALS[\'sgs_test_rendering_panel\'] = 101;'
	. "\nforeach ( " . var_export( $files, true ) . " as \$f ) { require_once __DIR__ . '/plugins/sgs-blocks/includes/' . \$f; }\n"
	. 'echo sgs_nav_bar_menu_render_items( array( ' . var_export( $mega_plain, true ) . ' ), array(), \'sgs-nav-bar-menu-u1\', ' . var_export( $submenu, true ) . " );\n}\n"
);
$pre = $copied ? (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) ) : '';
ok( '' !== $pre && $pre === $bar_plain, 'bar: a mega item with no section page renders byte-identical to ' . PRE_CHANGE_SHA );
ok( '' !== $pre && false !== strpos( $pre, '<button' ), 'NEGATIVE CONTROL: the pre-change render ran and produced the trigger (so the identity check above can fail)' );
$rm = static function ( string $dir ) use ( &$rm ): void {
	foreach ( (array) glob( $dir . '/{,.}[!.]*', GLOB_BRACE ) as $path ) {
		is_dir( $path ) ? $rm( $path ) : unlink( $path );
	}
	rmdir( $dir );
};
if ( is_dir( $tmp ) ) {
	$rm( $tmp );
}

// ── 4. The drawer. ──────────────────────────────────────────────────────────
// A split row adds no row of its own: its section holds the panel (or the
// dropdown's children) as authored; a panel with no button of its own prints
// its footer "View all" inside the panel, once.
$options  = sgs_nav_drawer_menu_row_options( array() );
$first_is = static fn( string $html, string $row ): bool => false !== strpos( $html, '<ul class="sgs-nav-drawer-menu__submenu" data-sgs-drill-panel>' . $row );

foreach ( array( 'accordion', 'drill-down' ) as $model ) {
	$GLOBALS['sgs_test_rendering_panel'] = 100;
	$drawer = sgs_nav_drawer_menu_render_items( array( $mega_linked ), $model, 'u1', array(), '', array(), true, $options );
	ok( $first_is( $drawer, '<li class="sgs-nav-drawer-menu__mega-body">' ), "drawer ({$model}): a mega row's section starts with the panel, no added row" );
	ok( false === strpos( $drawer, 'subitem--viewall' ) && 1 === substr_count( $drawer, 'View all About' ) && 1 === preg_match( '#__mega-body"><div class="stub-panel">PANEL<a [^>]*href="https://example.test/page-10/">View all About</a>#', $drawer ), "drawer ({$model}): the panel's own footer \"View all\" prints once, inside the panel, to the section page" );
	ok( false !== strpos( $drawer, '<a class="sgs-nav-drawer-menu__link" href="https://example.test/page-10/"' ), "drawer ({$model}): the parent label is a link" );
}

$fallback             = $mega_linked;
$fallback['children'] = array(
	array(
		'identifier' => 'c1',
		'label'      => 'Our story',
		'url'        => 'https://example.test/story/',
	),
);
$drawer_fb = sgs_nav_drawer_menu_render_items( array( $fallback ), 'accordion', 'u1', array(), '', array( 'id:100' ), true, $options );
ok( $first_is( $drawer_fb, '<li class="sgs-nav-drawer-menu__subitem"><a class="sgs-nav-drawer-menu__sublink sgs-focus--inset" href="https://example.test/story/"' ) && false === strpos( $drawer_fb, 'View all' ), 'drawer: a megaDrawerFallbackIds row starts with its children and adds no View all' );

$dropdown  = array(
	'identifier' => 'id:10',
	'label'      => 'About',
	'url'        => 'https://example.test/page-10/',
	'has_url'    => true,
	'type'       => 'page',
	'object_id'  => 10,
	'children'   => $fallback['children'],
);
$drawer_dd = sgs_nav_drawer_menu_render_items( array( $dropdown ), 'accordion', 'u1', array(), '', array(), true, $options );
ok( false === strpos( $drawer_dd, 'View all' ) && false !== strpos( $drawer_dd, '<a class="sgs-nav-drawer-menu__link" href="https://example.test/page-10/"' ), 'drawer: a dropdown parent with its own page is a split row with no View all row' );

$no_page            = $dropdown;
$no_page['has_url'] = false;
$no_page['url']     = '#';
$drawer_np          = sgs_nav_drawer_menu_render_items( array( $no_page ), 'accordion', 'u1', array(), '', array(), true, $options );
ok( false !== strpos( $drawer_np, 'sgs-nav-drawer-menu__accordion-summary--row' ), 'drawer: a parent with no page stays a whole-row toggle' );

echo "\n==== {$pass} passed, {$fail} failed ====\n";
exit( $fail > 0 ? 1 : 0 );
