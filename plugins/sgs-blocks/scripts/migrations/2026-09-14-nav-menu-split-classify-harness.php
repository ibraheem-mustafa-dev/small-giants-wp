<?php
/**
 * Render harness for `2026-09-14-nav-menu-split-classify.py`. Runs INSIDE WordPress via
 * `wp eval-file -` (STDIN — nothing is uploaded) and prints one JSON document.
 *
 * QUESTION: for each of `sgs/nav-menu`'s OWN attributes, does changing it alter the BAR fork,
 * the DRAWER fork, or both? This side produces evidence; the Python side decides.
 *
 * WHY RENDER RATHER THAN READ: `render.php` forks the markup, but calls its CSS emitters for
 * BOTH forks — `sgs_nav_menu_trigger_css` runs for a drawer that renders no burger. Static
 * "which branch reads it" analysis would call every burger attribute "both".
 *
 * ⚠ EACH FORK RENDERS INSIDE ITS REAL ANCESTORS. v1 rendered nav-menu in isolation and
 * mis-scored 12 attributes: their CSS is scoped `.sgs-nav-drawer .sgs-nav-menu-UID …`, and an
 * isolated render has no `.sgs-nav-drawer` element, so live rules scored as dead. A real
 * `sgs/nav-drawer` dialog carries that bare class (verified 2026-09-14). So:
 *   bar    = sgs/site-header > sgs/site-header-row > sgs/nav-menu
 *   drawer = sgs/nav-drawer > sgs/nav-menu   (the drawer's providesContext supplies the fork)
 *
 * TWO CONFIGURATIONS. Many attributes only act once another is set — burger typography needs
 * a visible label (`triggerMode` with text), `featuredRadius` needs the pill form
 * (`featuredBg`), magnet radius needs the magnet on. Config A is the plain baseline; config B
 * switches those enablers on. The analyser takes the union: the ownership question is "can
 * this control ever affect this fork", and an enabler reveals an effect without moving it
 * between forks, because which fork renders which element is structural.
 *
 * ⛔ ZERO DATABASE WRITES. The test menu is a FAKE `wp_navigation` post held only in the
 * object cache, which `get_post()` reads before the database. The harness refuses outright if
 * the object cache is persistent, since the fake post would then leak into live requests.
 *
 * IN-PROCESS ONLY: detaches `SGS\Blocks\sgs_lift_block_css`, which RELOCATES each `<style>`
 * into a collected file without transforming it. Attached, every render reports zero CSS.
 */

defined( 'ABSPATH' ) || exit;

if ( wp_using_ext_object_cache() ) {
	echo wp_json_encode( array( 'error' => 'persistent object cache detected — refusing: the fake menu post would leak into live requests' ) );
	return;
}
remove_filter( 'render_block', 'SGS\\Blocks\\sgs_lift_block_css', 99 );

$type = WP_Block_Type_Registry::get_instance()->get_registered( 'sgs/nav-menu' );
$bj   = WP_PLUGIN_DIR . '/sgs-blocks/build/blocks/nav-menu/block.json';
if ( ! $type || ! is_readable( $bj ) ) {
	echo wp_json_encode( array( 'error' => 'sgs/nav-menu not registered, or its block.json is unreadable' ) );
	return;
}
$own_names = array_keys( (array) ( json_decode( (string) file_get_contents( $bj ), true )['attributes'] ?? array() ) );
$own_names = array_values( array_filter( $own_names, fn( $n ) => 0 !== strpos( $n, '_note' ) && 'ref' !== $n ) );
// `_note*` entries are prose annotations declared IN block.json — not injected. Counting them
// here once over-reported the injected total as 135 (true figure: 133).
$injected = array_values( array_filter( array_diff( array_keys( $type->attributes ), $own_names, array( 'ref' ) ), fn( $n ) => 0 !== strpos( $n, '_note' ) ) );

$mega    = get_posts( array( 'post_type' => 'sgs_mega_menu', 'numberposts' => 1, 'post_status' => 'any', 'fields' => 'ids' ) );
$mega_id = $mega ? (int) $mega[0] : 0;

// Fixture menu: featured page link, dropdown parent with children, URL-less item with a
// description, and a MEGA item WITH children (megaDrawerFallbackIds only acts on one).
$fake_id = 987654321;
$content = '<!-- wp:navigation-link {"label":"Home","url":"/","id":2742,"kind":"post-type","type":"page"} /-->'
	. '<!-- wp:navigation-submenu {"label":"Shop","url":"/shop/","kind":"custom"} -->'
	. '<!-- wp:navigation-link {"label":"Glasses","url":"/glasses/","kind":"custom"} /-->'
	. '<!-- wp:navigation-link {"label":"Lenses","url":"/lenses/","kind":"custom"} /-->'
	. '<!-- /wp:navigation-submenu -->'
	. '<!-- wp:navigation-link {"label":"Soon","kind":"custom","description":"SOON"} /-->';
if ( $mega_id ) {
	$content .= '<!-- wp:navigation-submenu {"label":"Brands","url":"/brands/","type":"sgs_mega_menu","id":' . $mega_id . ',"kind":"post-type"} -->'
		. '<!-- wp:navigation-link {"label":"Ray-Ban","url":"/ray-ban/","kind":"custom"} /-->'
		. '<!-- /wp:navigation-submenu -->';
}
if ( wp_get_nav_menu_object( $fake_id ) ) {
	echo wp_json_encode( array( 'error' => "fake id $fake_id collides with a real classic nav_menu term" ) );
	return;
}
wp_cache_set( $fake_id, new WP_Post( (object) array( 'ID' => $fake_id, 'post_type' => 'wp_navigation', 'post_status' => 'publish', 'post_content' => $content, 'post_title' => 'classifier-fixture', 'filter' => 'raw' ) ), 'posts' );

function sgs_probe_block( string $name, array $attrs, array $inner = array() ): array {
	return array( 'blockName' => $name, 'attrs' => $attrs, 'innerBlocks' => $inner, 'innerHTML' => '', 'innerContent' => array_fill( 0, count( $inner ), null ) );
}

function sgs_probe_render( string $fork, array $attrs ): string {
	$menu = sgs_probe_block( 'sgs/nav-menu', $attrs );
	$tree = 'drawer' === $fork
		? sgs_probe_block( 'sgs/nav-drawer', array(), array( $menu ) )
		: sgs_probe_block( 'sgs/site-header', array(), array( sgs_probe_block( 'sgs/site-header-row', array( 'rowSlot' => 'middle' ), array( $menu ) ) ) );
	// uid = md5( attributes ): it changes with EVERY perturbation. Normalise, or every rule differs.
	return (string) preg_replace( '/sgs-nav-menu-[0-9a-f]{8}/', 'sgs-nav-menu-UID', ( new WP_Block( $tree ) )->render() );
}

function sgs_probe_split( string $html ): array {
	preg_match_all( '#<style\b[^>]*>(.*?)</style>#is', $html, $m );
	return array( (string) preg_replace( '#<style\b[^>]*>.*?</style>#is', '', $html ), implode( "\n", $m[1] ) );
}

/** Flatten CSS into "media\x1fselector\x1fdeclarations" strings, @media/@supports unwrapped. */
function sgs_probe_rules( string $css, string $media = '' ): array {
	$rules = array();
	$depth = 0;
	$start = 0;
	$sel   = '';
	$body0 = 0;
	$len   = strlen( $css );
	for ( $i = 0; $i < $len; $i++ ) {
		if ( '{' === $css[ $i ] ) {
			if ( 0 === $depth ) {
				$sel   = trim( substr( $css, $start, $i - $start ) );
				$body0 = $i + 1;
			}
			$depth++;
		} elseif ( '}' === $css[ $i ] ) {
			$depth--;
			if ( 0 === $depth ) {
				$body = substr( $css, $body0, $i - $body0 );
				if ( preg_match( '/^@(media|supports|container)\b/i', $sel ) ) {
					$rules = array_merge( $rules, sgs_probe_rules( $body, trim( $media . ' ' . $sel ) ) );
				} else {
					// U+001F cannot occur in CSS; '|' can ([lang|="en"], svg|a) and would mis-split.
					$rules[] = $media . "\x1f" . $sel . "\x1f" . trim( $body );
				}
				$start = $i + 1;
			}
		}
	}
	return $rules;
}

/* sgs_probe_sentinel() lives in 2026-09-14-nav-menu-split-classify-sentinels.php. */

$base_a  = array( 'ref' => $fake_id, 'featuredItemIds' => array( 'id:2742' ) );
$configs = array(
	'A' => $base_a,
	'B' => array_merge( $base_a, array(
		'triggerMode'                 => 'icon-and-text', // burger label renders -> burger typography
		'triggerMagnetEnabled'        => true,            // magnet radius / strength
		'itemMagnetEnabled'           => true,
		'featuredBg'                  => 'primary',       // pill form -> featuredRadius
		'itemColourHover'             => 'accent',
		'itemBgHover'                 => 'surface-alt',
		'itemColourHoverTreatment'    => 'sweep',         // -> sweepAngle
		'itemBgHoverTreatment'        => 'highlight',
		'itemSeparatorColourHover'    => 'accent',
		'itemSeparatorHoverTreatment' => 'sweep',         // -> itemSeparatorSweepAngle
		'burgerBg'                    => 'surface',
		'burgerColourHover'           => 'accent',
		'submenuColourHover'          => 'accent',
		'submenuShadow'               => '0 4px 12px rgba(0,0,0,.3)', // -> submenuShadowColour
		'itemSmartContrast'           => true,
	) ),
);

$out = array( 'meta' => array( 'mega_id' => $mega_id, 'own_count' => count( $own_names ), 'injected' => $injected, 'lifter_detached' => false === has_filter( 'render_block', 'SGS\\Blocks\\sgs_lift_block_css' ) ), 'configs' => array() );

foreach ( $configs as $cfg => $baseline_attrs ) {
	$base = array();
	$det  = array();
	foreach ( array( 'bar', 'drawer' ) as $fork ) {
		list( $html, $css ) = sgs_probe_split( sgs_probe_render( $fork, $baseline_attrs ) );
		$base[ $fork ]      = array( 'html' => $html, 'rules' => sgs_probe_rules( $css ) );
		// NEGATIVE CONTROL: a second identical render must be byte-identical, or every attribute
		// shows a spurious change in both forks and the whole result silently becomes "both".
		list( $h2, $c2 ) = sgs_probe_split( sgs_probe_render( $fork, $baseline_attrs ) );
		$det[ $fork ]    = $h2 === $html && sgs_probe_rules( $c2 ) === $base[ $fork ]['rules'];
	}
	$attrs_out = array();
	foreach ( $own_names as $name ) {
		$schema   = (array) ( $type->attributes[ $name ] ?? array() );
		$sentinel = sgs_probe_sentinel( $name, $schema, $mega_id );
		$current  = array_key_exists( $name, $baseline_attrs ) ? $baseline_attrs[ $name ] : ( $schema['default'] ?? null );
		$row      = array( 'sentinel' => $sentinel, 'sentinel_equals_baseline' => $sentinel == $current ); // phpcs:ignore Universal.Operators.StrictComparisons -- loose on purpose: 7 vs 7.0, [] vs {}
		foreach ( array( 'bar', 'drawer' ) as $fork ) {
			list( $html, $css ) = sgs_probe_split( sgs_probe_render( $fork, array_merge( $baseline_attrs, array( $name => $sentinel ) ) ) );
			$rules              = sgs_probe_rules( $css );
			$changed            = array_values( array_unique( array_merge( array_diff( $rules, $base[ $fork ]['rules'] ), array_diff( $base[ $fork ]['rules'], $rules ) ) ) );
			$row[ $fork ]       = array( 'html_changed' => $html !== $base[ $fork ]['html'], 'changed_rules' => $changed, 'html' => $html !== $base[ $fork ]['html'] ? $html : null );
		}
		$attrs_out[ $name ] = $row;
	}
	$out['configs'][ $cfg ] = array(
		'baseline_attrs' => $baseline_attrs,
		'deterministic'  => $det,
		'baseline'       => array(
			'bar'    => array( 'html' => $base['bar']['html'], 'rule_count' => count( $base['bar']['rules'] ) ),
			'drawer' => array( 'html' => $base['drawer']['html'], 'rule_count' => count( $base['drawer']['rules'] ) ),
		),
		'attributes'     => $attrs_out,
	);
}

wp_cache_delete( $fake_id, 'posts' );
echo wp_json_encode( $out );
