<?php
/**
 * Standalone runner for Wave 3C U-6 + U-7 — new item markup (design
 * `.claude/reports/2026-09-25-u6-u7-design.md`): the mega panel inside the
 * drawer accordion, sibling dim, the two-copy label roll, the drawer row
 * ornament and expander, and per-item media.
 *
 * Loads the SHIPPED helper files (only guarded declarations) and the shipped
 * `nav-menu-markup.php`, with minimal WordPress stubs. Negative controls run
 * the PRE-CHANGE `nav-menu-markup.php` from commit acad7d5e0 (the commit this
 * pair was built on) in a separate PHP process, since the old and new
 * functions share names; each proves the matching test above can fail.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-u6-u7-item-markup-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable WordPress.WP.AlternativeFunctions

const PRE_CHANGE_SHA = 'acad7d5e0';

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
$GLOBALS['sgs_test_filters'] = array();
function add_filter( $h, $cb, $p = 10, $a = 1 ) { $GLOBALS['sgs_test_filters'][ $h ][] = $cb; return true; }
function remove_filter( $h, $cb, $p = 10 ) { $GLOBALS['sgs_test_filters'][ $h ] = array_values( array_filter( $GLOBALS['sgs_test_filters'][ $h ] ?? array(), fn( $x ) => $x !== $cb ) ); return true; }
class WP_Post { public $ID; public $post_content = ''; public $post_type = 'sgs_mega_menu'; }
function get_post( $id ) { $p = new WP_Post(); $p->ID = (int) $id; $p->post_content = '<!-- wp:sgs/mega-panel /-->'; return $p; }
$GLOBALS['sgs_test_ctx_seen'] = array();
function do_blocks( $c ) { $GLOBALS['sgs_test_ctx_seen'][] = function_exists( 'sgs_mega_render_context' ) ? sgs_mega_render_context() : 'n/a'; return '<div class="stub-panel">PANEL</div>'; }
function get_post_thumbnail_id( $id ) { return 900 === (int) $id ? 0 : 55; }
function get_post_mime_type( $id ) { return $GLOBALS['sgs_test_mime'] ?? 'image/jpeg'; }
function wp_get_registered_image_subsizes() { return array( 'thumbnail' => array( 'width' => 150 ), 'medium' => array( 'width' => 300 ), 'medium_large' => array( 'width' => 768 ) ); }
function wp_get_attachment_image( $id, $size, $icon = false, $attr = array() ) { return '<img data-size="' . $size . '" class="' . ( $attr['class'] ?? '' ) . '" alt="">'; }
PHP;

$cpt_stub = <<<'PHP'
namespace SGS\Blocks;
class Sgs_Mega_Menu_CPT { public static function resolve_panel_for_menu_item( $o ) { return \get_post( (int) $o->object_id ); } }
PHP;

eval( $stubs ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI stubs shared with the negative-control subprocess.
eval( $cpt_stub ); // phpcs:ignore Squiz.PHP.Eval.Discouraged

$inc = dirname( __DIR__, 2 ) . '/includes/';
foreach ( array( 'helpers-css-safety.php', 'helpers-tokens.php', 'helpers-hover-state.php', 'helpers-motion-easing.php', 'helpers-responsive.php', 'helpers-mega-render.php', 'nav-menu-markup.php' ) as $f ) {
	require_once $inc . $f;
}

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

$mega_item = array(
	'identifier' => 'id:77',
	'label'      => 'New arrivals',
	'url'        => 'https://example.test/new/',
	'has_url'    => true,
	'type'       => 'sgs_mega_menu',
	'object_id'  => 4242,
);
$page_item = array(
	'identifier' => 'id:page-12',
	'label'      => 'Work',
	'url'        => 'https://example.test/work/',
	'has_url'    => true,
	'type'       => 'page',
	'object_id'  => 12,
);
$custom_item = array(
	'identifier' => 'id:c1',
	'label'      => 'Blog',
	'url'        => 'https://example.test/blog/',
	'has_url'    => true,
	'type'       => 'custom',
	'object_id'  => 0,
);

// ── 1. The mega panel inside the drawer accordion (3a). ──────────────────────
$GLOBALS['sgs_test_ctx_seen'] = array();
$html = sgs_nav_drawer_menu_render_items( array( $mega_item ), 'accordion', 'u1', array(), '', array(), true, sgs_nav_drawer_menu_row_options( array() ) );
ok( false !== strpos( $html, '<details class="sgs-nav-drawer-menu__accordion"' ), 'mega item (default panel mode) renders an accordion row' );
ok( 1 === preg_match( '#<ul class="sgs-nav-drawer-menu__submenu" data-sgs-drill-panel><li class="sgs-nav-drawer-menu__mega-body"><div class="stub-panel">PANEL</div>#', $html ), 'its body is ul.sgs-nav-drawer-menu__submenu > li.__mega-body holding the panel (nav-drilldown.js contract)' );
ok( false !== strpos( $html, 'sgs-nav-drawer-menu__item--mega' ), 'the row carries the --mega modifier' );
ok( array( 'drawer' ) === $GLOBALS['sgs_test_ctx_seen'], 'the panel rendered in the drawer context (sgs_mega_render_context() inside do_blocks)' );
ok( '' === sgs_mega_render_context(), 'the context stack is empty again after the render' );
ok( false !== strpos( $html, 'href="https://example.test/new/"' ), 'the parent keeps its own link (split link / expander)' );

$link_html = sgs_nav_drawer_menu_render_items( array( $mega_item ), 'accordion', 'u1', array(), '', array(), true, sgs_nav_drawer_menu_row_options( array( 'megaDrawerMode' => 'link' ) ) );
ok( false === strpos( $link_html, '<details' ) && false !== strpos( $link_html, 'sgs-nav-drawer-menu__link' ), 'megaDrawerMode link gives a plain link' );

$fallback_item             = $mega_item;
$fallback_item['children'] = array(
	array(
		'identifier' => 'c',
		'label'      => 'Child',
		'url'        => 'https://example.test/c/',
	),
);
$fb_html = sgs_nav_drawer_menu_render_items( array( $fallback_item ), 'accordion', 'u1', array(), '', array( 'id:77' ), true, sgs_nav_drawer_menu_row_options( array() ) );
ok( false !== strpos( $fb_html, 'sgs-nav-drawer-menu__sublink' ) && false === strpos( $fb_html, '__mega-body' ), 'a megaDrawerFallbackIds item with children keeps its children accordion' );

// The bar copy renders in the bar context (unchanged uid path for mega-panel).
$GLOBALS['sgs_test_ctx_seen'] = array();
sgs_mega_render_item_panel( $mega_item, 'x' );
ok( array( '' ) === $GLOBALS['sgs_test_ctx_seen'], 'the bar fork renders its panel in the bar context' );

// ── 2. Sibling dim (3c). ────────────────────────────────────────────────────
ok( '' === sgs_sibling_dim_css( '.L', '.i', ' .p', array() ), 'sibling dim emits nothing when unset' );
$dim = sgs_sibling_dim_css( '.L', '.i', ' .p', array( 'siblingDimColour' => '#4c4c4c' ) );
ok( false !== strpos( $dim, ':where(:root:not(.sgs-touch-input)) .L:has(> .i:hover) > .i:not(:hover) .p{color:#4c4c4c;}' ), 'the hover rule is list-scoped and touch-guarded as ONE unsplit selector' );
ok( false !== strpos( $dim, '.L:has(> .i:has(:focus-visible)) > .i:not(:has(:focus-visible)) .p{color:#4c4c4c;}' ), 'the keyboard rule keys on :focus-visible' );
ok( false === strpos( $dim, 'focus-within' ), 'no :focus-within (a tap on a <summary> would hold the dim)' );
$dim_grad = sgs_sibling_dim_css( '.L', '.i', ' .p', array( 'siblingDimColourGradient' => 'linear-gradient(90deg,#111111,#222222)' ) );
ok( false !== strpos( $dim_grad, 'background-clip:text' ) && false !== strpos( $dim_grad, '@supports not' ), 'a gradient dim uses the text-gradient trio with its fallback' );
$dim_op = sgs_sibling_dim_css( '.L', '.i', ' .p', array( 'siblingDimOpacity' => 7 ) );
ok( false !== strpos( $dim_op, 'opacity:1' ), 'dim opacity clamps to 1' );

// ── 3. Label roll (3d). ─────────────────────────────────────────────────────
ok( 'A &amp; B' === sgs_label_roll_markup( 'A & B', '' ), 'roll off: the plain escaped label, no extra markup' );
$roll = sgs_label_roll_markup( 'Work', 'up' );
ok( 1 === substr_count( $roll, 'aria-hidden="true"' ) && 2 === substr_count( $roll, '>Work<' ), 'roll up: two copies, the copy aria-hidden' );
ok( '' === sgs_label_roll_value( 'sideways' ), 'an off-list roll value is refused' );
$trigger = sgs_label_roll_markup( 'Menu', 'up', '', 'Close', false, 'state.isOpen' );
ok( false !== strpos( $trigger, 'class="sgs-roll__a" data-wp-bind--aria-hidden="state.isOpen"' ), 'trigger: the resting word hides from the name while open' );
ok( false !== strpos( $trigger, 'data-wp-bind--aria-hidden="!state.isOpen">Close' ), 'trigger: the open word joins the name while open (WCAG 2.5.3)' );
ok( false === strpos( $trigger, 'sgs-roll__b' ), 'trigger with no hover word emits no hover copy' );
$roll_css = sgs_label_roll_css( '.s', ' .t', ' .t[aria-expanded="true"]', array( 'labelRoll' => 'up' ) );
$hover_at = strpos( $roll_css, ':hover .sgs-roll>.sgs-roll__b' );
$open_at  = strpos( $roll_css, '[aria-expanded="true"] .sgs-roll>.sgs-roll__c{transform:none;}' );
ok( false !== $hover_at && false !== $open_at && $open_at > $hover_at, 'open rules follow the hover rules (open beats hover at equal specificity)' );
ok( false !== strpos( $roll_css, 'prefers-reduced-motion: reduce' ), 'the roll honours reduced motion' );

// ── 4. Ornament, expander and media (3e, 3f). ───────────────────────────────
$opts = sgs_nav_drawer_menu_row_options(
	array(
		'itemOrnament'       => array(
			'desktop' => 'index',
			'tablet'  => 'none',
		),
		'itemExpanderIcon'   => array(
			'source' => 'lucide',
			'name'   => 'asterisk',
		),
		'itemMedia'          => 'featured-image',
		'itemMediaWidth'     => array( 'desktop' => '160px' ),
		'labelRoll'          => 'up',
	)
);
$rows = sgs_nav_drawer_menu_render_items( array( $page_item, $custom_item ), 'accordion', 'u2', array(), '', array(), true, $opts );
ok( 2 === substr_count( $rows, 'class="sgs-nav-drawer-menu__ornament" aria-hidden="true"' ), 'every primary row carries the decorative ornament span' );
ok( 1 === substr_count( $rows, 'class="sgs-nav-drawer-menu__media"' ) && false !== strpos( $rows, 'data-size="medium_large"' ), 'the page link shows its featured image (smallest size covering 2x the width); the custom link shows none' );
$GLOBALS['sgs_test_mime'] = 'image/gif';
$gif                      = sgs_nav_drawer_menu_media_html( $page_item, $opts );
$GLOBALS['sgs_test_mime'] = 'image/jpeg';
ok( false !== strpos( $gif, 'data-size="full"' ), 'an animated GIF is served full size (resized copies keep one frame)' );
$css = sgs_nav_drawer_menu_extras_css(
	array(
		'itemOrnament'       => array(
			'desktop' => 'index',
			'tablet'  => 'none',
		),
		'itemExpanderRotate' => 45,
	),
	'.sgs-nav-drawer-menu.u2'
);
ok( false !== strpos( $css, '--sgs-ndm-orn-content:counter(sgs-ndm-item, decimal-leading-zero)' ), 'index at desktop sets the counter' );
ok( 1 === preg_match( '#@media \(max-width:1023px\)\{[^}]*--sgs-ndm-orn-display:none#', $css ), 'index is dropped at the tablet tier (dogstudio 1440 only)' );
ok( false !== strpos( $css, '--sgs-ndm-expander-rotate:45deg' ), 'the expander open rotation is emitted' );
$acc = sgs_nav_drawer_menu_accordion_html( $mega_item, 'x', 'u3', true, '<li>b</li>', $opts );
ok( false !== strpos( $acc, 'data-icon="asterisk"' ), 'the accordion expander uses itemExpanderIcon' );

// ── 5. Negative controls against the PRE-CHANGE markup. ─────────────────────
$repo = dirname( __DIR__, 4 );
$old  = shell_exec( 'git -C ' . escapeshellarg( $repo ) . ' show ' . PRE_CHANGE_SHA . ':plugins/sgs-blocks/includes/nav-menu-markup.php 2>&1' );
ok( is_string( $old ) && false !== strpos( (string) $old, 'function sgs_nav_drawer_menu_render_items' ), 'negative control: the pre-change nav-menu-markup.php was read from ' . PRE_CHANGE_SHA );
$tmp_dir = sys_get_temp_dir() . '/sgs-u6u7-' . getmypid();
@mkdir( $tmp_dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp dir for the subprocess.
file_put_contents( $tmp_dir . '/old-markup.php', (string) $old );
$child = "<?php\n" . $stubs . "\n"
	. 'function sgs_nav_shared_badge_html( $b, $r ) { return ""; }' . "\n"
	. 'function sgs_mega_render_panel_content( $id ) { return "<div class=\"stub-panel\">PANEL</div>"; }' . "\n"
	. 'require ' . var_export( $tmp_dir . '/old-markup.php', true ) . ";\n"
	. '$m = ' . var_export( $mega_item, true ) . ";\n"
	. 'echo sgs_nav_drawer_menu_render_items( array( $m ), "accordion", "u1", array() );';
file_put_contents( $tmp_dir . '/child.php', $child );
$old_out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $tmp_dir . '/child.php' ) . ' 2>&1' );
ok( false === strpos( $old_out, '__mega-body' ) && false === strpos( $old_out, '<details' ), 'negative control: the pre-change drawer renders the mega item as a plain link (so the panel tests above can fail)' );
ok( false === strpos( $old_out, 'sgs-nav-drawer-menu__ornament' ), 'negative control: the pre-change drawer emits no ornament span (so the ornament test can fail)' );
@unlink( $tmp_dir . '/old-markup.php' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
@unlink( $tmp_dir . '/child.php' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
@rmdir( $tmp_dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged

echo "\n==== {$pass} passed, {$fail} failed ====\n";
exit( $fail > 0 ? 1 : 0 );
