<?php
/**
 * WP-CLI probe for check-custom-colour-survives.py --live: renders each job's block through the
 * real render_block() on a live site and prints the output (HTML with its <style> tags) as JSON.
 *
 * Usage (on the server): wp eval-file live-colour-probe.php <payload.json>
 * Payload: [{"id": "...", "block": "sgs/x", "attrs": {...}, "content": "<p>...</p>"}, ...]
 * Output:  {"<id>": "<rendered html>", ...}
 *
 * The CSS collector (includes/class-sgs-css-registry.php::sgs_lift_block_css) lifts every block's
 * <style> into a head buffer on a front-end render; it is removed here so the CSS stays in the
 * returned output. Nothing is written to the database.
 *
 * @package SGS\Blocks\QA
 */

// phpcs:disable WordPress.WP.GlobalVariablesOverride.Prohibited, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

if ( ! defined( 'WP_CLI' ) ) {
	exit;
}

remove_filter( 'render_block', 'SGS\\Blocks\\sgs_lift_block_css', 99 );

$sgs_probe_path = $args[0] ?? '';
$sgs_probe_jobs = is_readable( $sgs_probe_path ) ? json_decode( (string) file_get_contents( $sgs_probe_path ), true ) : null;
if ( ! is_array( $sgs_probe_jobs ) ) {
	WP_CLI::error( 'payload missing or not JSON: ' . $sgs_probe_path );
}

$sgs_probe_out = array();
foreach ( $sgs_probe_jobs as $sgs_probe_job ) {
	$sgs_probe_content = (string) ( $sgs_probe_job['content'] ?? '' );
	try {
		$sgs_probe_out[ $sgs_probe_job['id'] ] = render_block(
			array(
				'blockName'    => $sgs_probe_job['block'],
				'attrs'        => $sgs_probe_job['attrs'],
				'innerBlocks'  => array(),
				'innerHTML'    => $sgs_probe_content,
				'innerContent' => array( $sgs_probe_content ),
			)
		);
	} catch ( \Throwable $e ) {
		$sgs_probe_out[ $sgs_probe_job['id'] ] = '';
	}
}

echo wp_json_encode( $sgs_probe_out );
