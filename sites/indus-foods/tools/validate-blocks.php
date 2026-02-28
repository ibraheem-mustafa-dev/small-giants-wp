<?php
/**
 * SGS Block Validator
 *
 * Scans all pages, template parts, and templates for SGS custom blocks
 * that have non-empty stored innerHTML (indicating a save.js mismatch).
 *
 * Usage: wp eval-file validate-blocks.php
 * Returns: exit code 0 = PASS, exit code 1 = FAIL
 *
 * @package SGS\Tools
 */

/**
 * Recursively find all SGS blocks with stored innerHTML.
 *
 * @param array  $blocks Block list from parse_blocks().
 * @param string $parent_block Parent block name for context.
 * @return array List of ['block' => string, 'parent' => string].
 */
function sgs_find_invalid_blocks( $blocks, $parent_block = '' ) {
	$found = [];
	foreach ( $blocks as $b ) {
		$name     = $b['blockName'] ?? '';
		$has_html = trim( $b['innerHTML'] ) !== '';

		// Only flag SGS custom blocks — core blocks handle their own deprecations.
		if ( $has_html && strpos( $name, 'sgs/' ) === 0 ) {
			$found[] = [
				'block'  => $name,
				'parent' => $parent_block,
			];
		}

		if ( ! empty( $b['innerBlocks'] ) ) {
			$found = array_merge( $found, sgs_find_invalid_blocks( $b['innerBlocks'], $name ) );
		}
	}
	return $found;
}

$pass    = true;
$summary = [];

$post_types = [ 'page', 'post', 'wp_template', 'wp_template_part' ];
foreach ( $post_types as $type ) {
	$posts = get_posts(
		[
			'post_type'   => $type,
			'numberposts' => -1,
			'post_status' => [ 'publish', 'auto-draft', 'draft' ],
		]
	);
	foreach ( $posts as $p ) {
		$blocks  = parse_blocks( $p->post_content );
		$invalid = sgs_find_invalid_blocks( $blocks );
		if ( ! empty( $invalid ) ) {
			$pass = false;
			$key  = "[{$type}] ID {$p->ID} ({$p->post_title})";
			foreach ( $invalid as $i ) {
				$summary[] = "  {$key}: {$i['block']}" . ( $i['parent'] ? " (inside {$i['parent']})" : '' );
			}
		}
	}
}

if ( $pass ) {
	echo "\n✅ PASS — No SGS blocks with stored HTML found. All blocks are valid.\n\n";
	exit( 0 );
} else {
	echo "\n❌ FAIL — SGS blocks with stored innerHTML detected (save.js mismatch):\n";
	foreach ( $summary as $line ) {
		echo $line . "\n";
	}
	echo "\nFix: add deprecated.js v1 with save:()=>null to each affected block.\n\n";
	exit( 1 );
}
