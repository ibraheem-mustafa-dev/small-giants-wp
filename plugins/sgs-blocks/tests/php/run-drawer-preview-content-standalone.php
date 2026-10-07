<?php
/**
 * Standalone test: Sgs_Drawer_Render::get_drawer_post_content() serves a draft or
 * pending drawer only when it is the validated preview id.
 *
 * Run: php tests/php/run-drawer-preview-content-standalone.php
 * Exit 0 all pass, 1 any failure.
 */

namespace SGS\Blocks {
	class Sgs_Block_CPTs {
		public const DRAWER_CPT = 'sgs_drawer';
	}

	class Sgs_Active_Layout {
		public const AREA_DRAWER = 'drawer';

		public static function get_preview_id( string $area ): int {
			return (int) ( $GLOBALS['preview_id'] ?? 0 );
		}
	}
}

namespace {
	define( 'ABSPATH', __DIR__ . '/' );

	function get_post( $id ) {
		return $GLOBALS['posts'][ $id ] ?? null;
	}

	class WP_Post {
		public $post_type;
		public $post_status;
		public $post_content;
		public function __construct( string $type, string $status, string $content ) {
			$this->post_type    = $type;
			$this->post_status  = $status;
			$this->post_content = $content;
		}
	}

	require dirname( __DIR__, 2 ) . '/includes/class-sgs-drawer-render.php';

	$GLOBALS['posts'] = array(
		1 => new WP_Post( 'sgs_drawer', 'publish', 'published' ),
		2 => new WP_Post( 'sgs_drawer', 'draft', 'drafted' ),
		3 => new WP_Post( 'sgs_drawer', 'pending', 'pending' ),
		4 => new WP_Post( 'sgs_drawer', 'trash', 'trashed' ),
		5 => new WP_Post( 'page', 'publish', 'a page' ),
	);

	$cases = array(
		// label, post id, preview id, expected.
		array( 'published, no preview', 1, 0, 'published' ),
		array( 'draft, no preview', 2, 0, '' ),
		array( 'draft, a different post previewed', 2, 1, '' ),
		array( 'draft, previewed', 2, 2, 'drafted' ),
		array( 'pending, previewed', 3, 3, 'pending' ),
		array( 'trash, previewed', 4, 4, '' ),
		array( 'wrong post type, previewed', 5, 5, '' ),
		array( 'missing post', 99, 99, '' ),
		array( 'zero id', 0, 0, '' ),
	);

	$failed = 0;
	foreach ( $cases as $case ) {
		list( $label, $id, $preview, $expected ) = $case;
		$GLOBALS['preview_id']                   = $preview;
		$actual                                  = \SGS\Blocks\Sgs_Drawer_Render::get_drawer_post_content( $id );
		$ok                                      = $expected === $actual;
		echo ( $ok ? 'PASS' : 'FAIL' ) . ': ' . $label . ( $ok ? '' : " (expected '$expected', got '$actual')" ) . "\n";
		$failed += $ok ? 0 : 1;
	}
	exit( $failed ? 1 : 0 );
}
