<?php
/**
 * The device-tier media queries the shared helpers print.
 *
 * The expected output (tests/php/fixtures/breakpoint-query-output.json) was captured from the helpers while they still
 * assembled their queries by hand; the helpers now build them through SGS_Breakpoints, and the printed CSS must stay the
 * same. Only the space after `@media` / `@container` is normalised.
 *
 * Run with: vendor/bin/phpunit --filter BreakpointQueryOutputTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $value ) {
		return abs( (int) $value );
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $value ) {
		return (string) $value;
	}
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $value ) {
		return (string) $value;
	}
}
if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $value ) {
		return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', (string) $value ) );
	}
}
if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( $value ) {
		return strip_tags( (string) $value );
	}
}
if ( ! function_exists( 'apply_filters' ) ) {
	function apply_filters( $tag, $value ) {
		return $value;
	}
}

$sgs_bqo_inc = __DIR__ . '/../../includes/';
foreach ( array( 'class-sgs-breakpoints.php', 'helpers-responsive.php', 'helpers-tier-queries.php', 'helpers-tokens.php', 'sgs-header-ink-helpers.php', 'helpers-nav-drawer-motion-model.php', 'sgs-header-fluid-scale.php', 'sgs-header-pass-through.php', 'sgs-header-ink-css.php', 'sgs-header-scroll-trigger.php' ) as $sgs_bqo_file ) {
	require_once $sgs_bqo_inc . $sgs_bqo_file;
}

final class BreakpointQueryOutputTest extends TestCase {

	/** Strip the optional space after the at-rule keyword. */
	private static function norm( $value ) {
		if ( is_array( $value ) ) {
			return array_map( array( self::class, 'norm' ), $value );
		}
		return is_string( $value ) ? preg_replace( '/@(media|container) \(/', '@$1(', $value ) : $value;
	}

	private static function actual() {
		$transparent = array( 'desktop' => 'on', 'tablet' => 'off', 'mobile' => 'on' );
		$out         = array( 'query' => array() );
		foreach ( array( 'tablet', 'mobile', 'tablet-up', 'desktop', 'tablet-only' ) as $range ) {
			$out['query'][ $range ] = SGS_Breakpoints::query( $range ) . ' | ' . SGS_Breakpoints::media( $range );
		}
		$out['tier_at_rules']   = array_merge( SGS_Breakpoints::tier_at_rules( 767, true ), SGS_Breakpoints::tier_at_rules( 1023, true ), SGS_Breakpoints::tier_at_rules( 900, true ) );
		$out['emit_tier_decls'] = sgs_emit_tier_decls( '.a', array( 'desktop' => array( 'x:1' ), 'tablet' => array( 'x:2' ), 'mobile' => array( 'x:3' ) ) );
		$out['tier_exact']      = array(
			sgs_tier_exact_media_css( array( 'tablet' ), '.a{x:1}' ),
			sgs_tier_exact_media_css( array( 'desktop', 'mobile' ), '.a{x:1}', '(max-width:1059px)' ),
		);
		$spec                   = array( array( 'css' => 'width', 'value' => array( 'desktop' => 10, 'tablet' => 20, 'mobile' => 30 ), 'unit_default' => 'px' ) );
		$out['responsive_css']  = array(
			sgs_emit_responsive_css( '.a', $spec ),
			sgs_emit_responsive_css( '.a', $spec, array( 'container' => true ) ),
		);
		$out['origin_css']      = sgs_nav_drawer_motion_origin_css(
			'.nd',
			array( 'desktop' => 'header', 'tablet' => 'trigger', 'mobile' => 'container' ),
			array( 'header', 'container', 'trigger', 'full-screen' )
		);
		$out['fluid']           = sgs_header_fluid_scale_css( '.h', array( 'fluidScale' => array( 'enabled' => true, 'breakpoint' => 1500 ) ) );
		$out['collapse']        = sgs_header_collapse_visibility_css( '.h', array( 'innerBlocks' => array( array( 'blockName' => 'sgs/nav-bar-menu', 'attrs' => array( 'collapsePoint' => 900 ), 'innerBlocks' => array() ) ) ) );
		$out['ink']             = sgs_header_ink_css(
			'.h',
			'u1',
			array( 'inkOnLight' => '#111111', 'inkOnDark' => '#ffffff', 'sectionInk' => array( 'desktop' => 'adapt', 'tablet' => 'adapt', 'mobile' => 'blend' ) ),
			$transparent,
			false,
			'#fff',
			''
		);
		$out['fade']            = sgs_header_scroll_fade_css( '.h', 'direction', true, $transparent, '#fff', '' );
		$out['scrolled']        = sgs_header_scrolled_colour_css( '.h', array( 'textColourScrolled' => '#ffffff' ), $transparent );
		return $out;
	}

	public function test_helpers_print_the_same_queries_as_before_the_migration(): void {
		$expected = json_decode( (string) file_get_contents( __DIR__ . '/fixtures/breakpoint-query-output.json' ), true );
		$this->assertIsArray( $expected );
		$this->assertSame( $expected, self::norm( self::actual() ) );
	}

	public function test_width_helpers_build_the_query_from_the_edge_and_width(): void {
		$this->assertSame( '@media(max-width:899px)', SGS_Breakpoints::media_width( 'max', 899 ) );
		$this->assertSame( '@media(min-width:900px)', SGS_Breakpoints::media_width( 'min', '900' ) );
		$this->assertSame( '@media(max-width:767.98px)', SGS_Breakpoints::media_width( 'max', '767.98px' ) );
		$this->assertSame( '(max-width:1059px)', SGS_Breakpoints::query_width( 'max', 1059 ) );
		$this->assertSame( '@container (max-width:479px)', SGS_Breakpoints::container_width( SGS_Breakpoints::CONTAINER_MOBILE_MAX ) );
		// Negative control: an unknown edge or an empty width prints nothing.
		$this->assertSame( '', SGS_Breakpoints::media_width( 'between', 899 ) );
		$this->assertSame( '', SGS_Breakpoints::media_width( 'max', '' ) );
	}
}
