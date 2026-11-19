<?php
/**
 * Stage C survey probe (must-use plugin, local mirrors only; never deployed).
 *
 * `stage_c.py --install <mirror>` copies this file into a local mirror's `wp-content/mu-plugins/`. It does nothing
 * unless the site's environment type is `local` and the request carries `?sgs_stagec_survey=<token>` (letters,
 * digits and hyphens). On such a request it records, for every block that renders, which `<style>` tags appear in
 * its HTML after each `render_block` priority up to the collector's lift (priority 99), so each per-instance CSS
 * chunk is traced to its block and to the stage that added it: `render` (the block's own render.php or wrapper) or
 * the `render_block` callbacks registered at the priority where it first appeared. At `shutdown` it writes
 * `uploads/sgs-stagec/<token>.json`: the records in render order and the collector's final buffer
 * (`$GLOBALS['sgs_collected_css']`, deduped, in print order).
 *
 * The probe only reads: it adds no markup, changes no block output and leaves the collector's lift untouched.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'wp_get_environment_type' ) || 'local' !== wp_get_environment_type() ) {
	return;
}
// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only diagnostic flag on a local mirror.
$sgs_stagec_token = isset( $_GET['sgs_stagec_survey'] ) ? (string) wp_unslash( $_GET['sgs_stagec_survey'] ) : '';
if ( '' === $sgs_stagec_token || ! preg_match( '/^[a-z0-9-]{1,64}$/', $sgs_stagec_token ) ) {
	return;
}

$GLOBALS['sgs_stagec'] = array(
	'token'   => $sgs_stagec_token,
	'records' => array(),
	'stack'   => array(),
	'stages'  => array(),
);

/**
 * The `<style>` bodies in a block's HTML, in document order.
 *
 * @param string $html Block HTML.
 * @return string[]
 */
function sgs_stagec_styles( string $html ): array {
	if ( false === strpos( $html, '<style' ) ) {
		return array();
	}
	preg_match_all( '#<style\b[^>]*>(.*?)</style>#is', $html, $m );
	return array_map( 'trim', $m[1] );
}

/**
 * Names of the callbacks hooked to `render_block` at one priority.
 *
 * @param int $priority Priority.
 * @return string[]
 */
function sgs_stagec_callbacks_at( int $priority ): array {
	global $wp_filter;
	$names = array();
	if ( empty( $wp_filter['render_block']->callbacks[ $priority ] ) ) {
		return $names;
	}
	foreach ( $wp_filter['render_block']->callbacks[ $priority ] as $cb ) {
		$fn = $cb['function'];
		if ( is_string( $fn ) ) {
			if ( 0 === strpos( $fn, 'sgs_stagec_' ) ) {
				continue;
			}
			$names[] = $fn;
		} elseif ( is_array( $fn ) ) {
			$names[] = ( is_object( $fn[0] ) ? get_class( $fn[0] ) : (string) $fn[0] ) . '::' . $fn[1];
		} else {
			$names[] = 'closure';
		}
	}
	return $names;
}

/**
 * Hook one snapshot after every `render_block` priority below the collector's lift. Runs once the plugins have
 * registered their filters.
 *
 * @return void
 */
function sgs_stagec_wire(): void {
	global $wp_filter;
	$priorities = isset( $wp_filter['render_block'] ) ? array_keys( $wp_filter['render_block']->callbacks ) : array();
	$priorities = array_values( array_filter( $priorities, static fn( $p ) => $p < 99 ) );
	sort( $priorities );
	add_filter( 'render_block', 'sgs_stagec_start', PHP_INT_MIN, 2 );
	foreach ( $priorities as $p ) {
		$GLOBALS['sgs_stagec']['stages'][ $p ] = sgs_stagec_callbacks_at( (int) $p );
		add_filter(
			'render_block',
			static function ( $content, $block ) use ( $p ) {
				return sgs_stagec_snapshot( (string) $content, (int) $p );
			},
			$p,
			2
		);
	}
	add_filter( 'render_block', 'sgs_stagec_finish', 98, 2 );
}
add_action( 'wp', 'sgs_stagec_wire', PHP_INT_MAX );

/**
 * Open a record for the block whose filters are about to run. A block's `render_block` filters run back to back after
 * its whole subtree has rendered; a filter that itself renders blocks (a pattern, a synced block) opens and closes
 * inner records meanwhile, so the records form a stack and the outer one resumes when the inner one closes.
 *
 * @param string $content Block HTML.
 * @param array  $block   Parsed block.
 * @return string Unchanged HTML.
 */
function sgs_stagec_start( $content, $block ) {
	$content = (string) $content;
	$styles  = sgs_stagec_styles( $content );
	$GLOBALS['sgs_stagec']['stack'][] = array(
		'block'  => (string) ( $block['blockName'] ?? '' ),
		'chunks' => array(),
		'seen'   => array(),
	);
	foreach ( $styles as $css ) {
		sgs_stagec_add( $css, 'render' );
	}
	return $content;
}

/**
 * Attribute every `<style>` new since the last snapshot to the stage that just ran.
 *
 * @param string $css   CSS text.
 * @param string $stage Stage label.
 * @return void
 */
function sgs_stagec_add( string $css, string $stage ): void {
	$top = count( $GLOBALS['sgs_stagec']['stack'] ) - 1;
	if ( $top < 0 || '' === $css ) {
		return;
	}
	$cur = &$GLOBALS['sgs_stagec']['stack'][ $top ];
	$key = md5( $css );
	$n   = ( $cur['seen'][ $key ] ?? 0 );
	$cur['seen'][ $key ] = $n + 1;
	$cur['chunks'][]     = array(
		'stage' => $stage,
		'css'   => $css,
		'key'   => $key,
		'nth'   => $n,
	);
}

/**
 * Snapshot after one priority: chunks present now but not before came from that priority's callbacks.
 *
 * @param string $content  Block HTML.
 * @param int    $priority Priority just run.
 * @return string Unchanged HTML.
 */
function sgs_stagec_snapshot( string $content, int $priority ): string {
	$stack = $GLOBALS['sgs_stagec']['stack'];
	if ( empty( $stack ) ) {
		return $content;
	}
	$cur   = end( $stack );
	$count = array();
	foreach ( sgs_stagec_styles( $content ) as $css ) {
		$key           = md5( $css );
		$count[ $key ] = ( $count[ $key ] ?? 0 ) + 1;
		if ( $count[ $key ] > ( $cur['seen'][ $key ] ?? 0 ) ) {
			sgs_stagec_add( $css, 'p' . $priority );
			$stack = $GLOBALS['sgs_stagec']['stack'];
			$cur   = end( $stack );
		}
	}
	return $content;
}

/**
 * Close the record just before the collector lifts the block's `<style>` tags.
 *
 * @param string $content Block HTML.
 * @param array  $block   Parsed block.
 * @return string Unchanged HTML.
 */
function sgs_stagec_finish( $content, $block ) {
	$content = sgs_stagec_snapshot( (string) $content, 98 );
	$cur     = array_pop( $GLOBALS['sgs_stagec']['stack'] );
	if ( null !== $cur && ! empty( $cur['chunks'] ) ) {
		$GLOBALS['sgs_stagec']['records'][] = array(
			'block'  => $cur['block'],
			'chunks' => array_map(
				static fn( $c ) => array(
					'stage' => $c['stage'],
					'css'   => $c['css'],
				),
				$cur['chunks']
			),
		);
	}
	return $content;
}

/**
 * Write the survey file once the page has been sent.
 *
 * @return void
 */
function sgs_stagec_write(): void {
	$state = $GLOBALS['sgs_stagec'];
	$dir   = trailingslashit( wp_upload_dir()['basedir'] ) . 'sgs-stagec';
	wp_mkdir_p( $dir );
	$out = array(
		'token'     => $state['token'],
		'url'       => home_url( add_query_arg( array() ) ),
		'stages'    => $state['stages'],
		'records'   => $state['records'],
		'collected' => array_values( (array) ( $GLOBALS['sgs_collected_css'] ?? array() ) ),
	);
	// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- local diagnostic output.
	file_put_contents( $dir . '/' . $state['token'] . '.json', wp_json_encode( $out ) );
}
add_action( 'shutdown', 'sgs_stagec_write', PHP_INT_MAX );
