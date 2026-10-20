<?php
/**
 * Standalone runner for sgs_nav_drawer_menu_has_real_destination() (includes/nav-drawer-menu-row-extras.php).
 *
 * Plain PHP, no PHPUnit and no WordPress: post types are the core shapes of page and post
 * (built-in, public, page not publicly queryable) and SGS's nav-only sgs_mega_menu, and
 * is_post_type_viewable() follows core's rule (a built-in type is viewable when public, any other
 * when publicly queryable). Covers a page and a post item keeping their links, a mega-panel item
 * becoming a disclosure, a custom link, an empty and a '#' URL. The negative control shows the
 * publicly_queryable test alone drops every page link. Exits non-zero on any failure.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-nav-drawer-real-destination-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code): global accumulators and direct echo are the established
// run-*-standalone.php idiom.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Generic.Files.OneObjectStructurePerFile.MultipleFound

namespace SGS\Blocks {

	final class SGS_Nav_Menu_Source {
		public static function is_destination_url( string $raw_url ): bool {
			$trimmed = trim( $raw_url );
			return '' !== $trimmed && '#' !== $trimmed;
		}
	}
}

namespace {

	use SGS\Blocks\SGS_Nav_Menu_Source;

	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	}
	class_alias( SGS_Nav_Menu_Source::class, 'SGS_Nav_Menu_Source' );

	$GLOBALS['sgs_test_types'] = array(
		'page'          => (object) array(
			'_builtin'           => true,
			'public'             => true,
			'publicly_queryable' => false,
		),
		'post'          => (object) array(
			'_builtin'           => true,
			'public'             => true,
			'publicly_queryable' => true,
		),
		'sgs_mega_menu' => (object) array(
			'_builtin'           => false,
			'public'             => false,
			'publicly_queryable' => false,
		),
	);
	$GLOBALS['sgs_test_posts'] = array(
		10 => 'page',
		11 => 'post',
		12 => 'sgs_mega_menu',
	);

	function get_post_type( $id ) {
		return $GLOBALS['sgs_test_posts'][ (int) $id ] ?? false;
	}

	function get_post_type_object( $type ) {
		return $GLOBALS['sgs_test_types'][ $type ] ?? null;
	}

	function is_post_type_viewable( $type ) {
		$o = get_post_type_object( $type );
		if ( ! $o ) {
			return false;
		}
		return $o->_builtin ? $o->public : $o->publicly_queryable;
	}

	require dirname( __DIR__, 2 ) . '/includes/nav-drawer-menu-row-extras.php';

	$fails = 0;
	$check = static function ( string $label, bool $got, bool $want ) use ( &$fails ): void {
		echo ( $got === $want ? 'PASS' : 'FAIL' ) . " {$label}\n";
		$fails += $got === $want ? 0 : 1;
	};

	$check( 'a page item keeps its link', sgs_nav_drawer_menu_has_real_destination( 'https://example.test/about/our-story/', 10 ), true );
	$check( 'a post item keeps its link', sgs_nav_drawer_menu_has_real_destination( 'https://example.test/news/', 11 ), true );
	$check( 'a mega-panel item is a disclosure', sgs_nav_drawer_menu_has_real_destination( 'https://example.test/?sgs_mega_menu=about', 12 ), false );
	$check( 'a custom link keeps its link', sgs_nav_drawer_menu_has_real_destination( 'https://example.test/x/', 0 ), true );
	$check( 'an empty URL is no destination', sgs_nav_drawer_menu_has_real_destination( '', 10 ), false );
	$check( 'a bare # is no destination', sgs_nav_drawer_menu_has_real_destination( '#', 0 ), false );

	// Negative control: the type test the function used before (publicly_queryable alone) drops the page.
	$check( 'negative control: publicly_queryable alone fails the page', (bool) get_post_type_object( 'page' )->publicly_queryable, false );

	echo 0 === $fails ? "all passed\n" : "{$fails} failed\n";
	exit( 0 === $fails ? 0 : 1 );
}
