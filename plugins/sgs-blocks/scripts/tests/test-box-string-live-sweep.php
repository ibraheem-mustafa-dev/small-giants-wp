<?php
/**
 * Standalone check of the box-string part of scripts/migrate-scalar-tier-live.php (no WordPress): WP_CLI, $wpdb and the
 * few WordPress functions it calls are stubbed, the script runs against canned post rows, and the written content and
 * the printed counts are asserted.
 *
 *   php plugins/sgs-blocks/scripts/tests/test-box-string-live-sweep.php
 *
 * @package SGS\Blocks
 */

define( 'WP_CLI', true );

class WP_CLI {
	public static $log = array();
	public static function log( $m ) {
		self::$log[] = $m;
	}
	public static function success( $m ) {
		self::$log[] = 'OK ' . $m;
	}
	public static function error( $m ) {
		throw new RuntimeException( $m );
	}
}
function wp_json_encode( $v, $f = 0 ) {
	return json_encode( $v, $f );
}
function get_post_types() {
	return array( 'page' );
}
function clean_post_cache( $id ) {}

class FakeDb {
	public $posts = 'wp_posts';
	public $rows  = array();
	public function get_results( $sql ) {
		return array_map( static fn( $r ) => (object) $r, $this->rows );
	}
	public function update( $t, $data, $where ) {
		foreach ( $this->rows as &$r ) {
			if ( $r['ID'] === $where['ID'] ) {
				$r['post_content'] = $data['post_content'];
			}
		}
		return 1;
	}
}

function run_sweep( array $rows, array $expansions, string $mode ): array {
	global $wpdb, $args, $spec_file;
	WP_CLI::$log   = array();
	$wpdb          = new FakeDb();
	$wpdb->rows    = $rows;
	$spec          = array(
		'rules' => array( 'sgs/x' => array( 'textAlign' ) ),
		'box'   => array(
			'attrs'      => array(
				'sgs/container' => array( 'padding' => 'tiered' ),
				'sgs/text'      => array( 'borderWidth' => 'box' ),
			),
			'expansions' => $expansions,
		),
	);
	$spec_file     = sys_get_temp_dir() . '/b5-live-rules.json';
	file_put_contents( $spec_file, json_encode( $spec ) );
	$args = array( $mode, $spec_file );
	$err  = '';
	try {
		include __DIR__ . '/../migrate-scalar-tier-live.php';
	} catch ( RuntimeException $e ) {
		$err = $e->getMessage();
	}
	return array( $wpdb->rows, WP_CLI::$log, $err );
}

$box40 = array( 'top' => '40px', 'right' => '40px', 'bottom' => '40px', 'left' => '40px' );
$rows  = array(
	array( 'ID' => 1, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => '<!-- wp:sgs/container {"padding":{"desktop":"40px"},"gap":{"desktop":"1rem"}} /-->' ),
	array( 'ID' => 2, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => '<!-- wp:sgs/container {"padding":{"desktop":{"top":"1px"}}} /-->' ),
	array( 'ID' => 3, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => '<!-- wp:sgs/container {"padding":{"desktop":"calc(1rem + 2px)"}} /-->' ),
	array( 'ID' => 4, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => '<!-- wp:sgs/text {"borderWidth":"2px"} /-->' ),
	array( 'ID' => 5, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => '<!-- wp:sgs/other {"padding":{"desktop":"9px"}} /-->' ),
);
$exp   = array(
	'40px'             => $box40,
	'2px'              => array( 'top' => '2px', 'right' => '2px', 'bottom' => '2px', 'left' => '2px' ),
	'calc(1rem + 2px)' => null,
);
$ok    = true;
function check( string $label, bool $cond ): void {
	global $ok;
	echo ( $cond ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	$ok = $ok && $cond;
}

list( $after, $log, $err ) = run_sweep( $rows, $exp, 'dry-run' );
check( 'dry run writes nothing', $after === $rows );
check( 'dry run counts 3 box values (refused one included)', in_array( 'BOX_STRING: refused=1 unexpanded=0 distinct_values=3', $log, true ) );

list( $after, $log, $err ) = run_sweep( $rows, $exp, 'apply' );
check( 'apply: no error', '' === $err );
check( 'apply: one length becomes four sides under desktop', '<!-- wp:sgs/container {"padding":{"desktop":{"top":"40px","right":"40px","bottom":"40px","left":"40px"}},"gap":{"desktop":"1rem"}} /-->' === $after[0]['post_content'] );
check( 'negative control: a correct box is untouched', $after[1]['post_content'] === $rows[1]['post_content'] );
check( 'refused value kept as stored', $after[2]['post_content'] === $rows[2]['post_content'] );
check( 'box-only attribute: whole string becomes one box', '<!-- wp:sgs/text {"borderWidth":{"top":"2px","right":"2px","bottom":"2px","left":"2px"}} /-->' === $after[3]['post_content'] );
check( 'negative control: a block with no rule is untouched', $after[4]['post_content'] === $rows[4]['post_content'] );

list( $after, $log, $err ) = run_sweep( $rows, array(), 'apply' );
check( 'apply with no expansions errors (unexpanded values remain)', false !== strpos( $err, 'no expansion' ) );

exit( $ok ? 0 : 1 );
