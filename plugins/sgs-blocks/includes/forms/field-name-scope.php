<?php
/**
 * Submission-name uniqueness, scoped to one form render (Spec 04, Submission name).
 *
 * Every name field_submission_name() returns is claimed through field_names_claim(). Names are unique within the form being
 * rendered, never across the whole request: an `sgs/form` block opens a scope when WordPress is about to render it
 * (`render_block_data`, which core applies to top-level and inner blocks alike, before the inner blocks render) and
 * closes it once its markup is final (`render_block_sgs/form`). Opening the scope reserves every explicit fieldName
 * the form holds, at any depth, so a derived name never takes a name another field in the same form asked for, even
 * when that field renders later. A field rendered outside any form (an editor preview) claims from a base scope.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

/** The longest key Form_Rest_Submission::validate_fields() accepts. */
const FIELD_NAME_MAX = 64;

/** An address field's parts, in render order; each submits as <name>-<part>. */
const ADDRESS_FIELD_PARTS = array( 'line1', 'line2', 'city', 'county', 'postcode', 'country' );

/**
 * Characters a composite field appends to its submission name, so the base leaves room for them.
 *
 * @param string $block_name Block name, e.g. "sgs/form-field-address".
 * @return int Characters to reserve (0 for a field that submits under its own name).
 */
function field_name_suffix_reserve( string $block_name ): int {
	if ( 'sgs/form-field-address' === $block_name ) {
		return 1 + max( array_map( 'strlen', ADDRESS_FIELD_PARTS ) );
	}
	return 0;
}

/**
 * The scope stack: index 0 is the base scope, each open form pushes one.
 *
 * @return array<int, array{reserved: array<string, bool>, taken: array<string, bool>}> Scopes, by reference.
 */
function &field_name_scopes(): array {
	static $scopes = array(
		array(
			'reserved' => array(),
			'taken'    => array(),
		),
	);
	return $scopes;
}

/**
 * Every explicit submission name among a parsed block's field descendants.
 *
 * @param array<int, mixed>   $inner_blocks Parsed inner blocks.
 * @param array<string, bool> $names        Names found so far.
 * @return array<string, bool> Names found.
 */
function field_names_collect_explicit( array $inner_blocks, array $names = array() ): array {
	foreach ( $inner_blocks as $inner ) {
		if ( ! is_array( $inner ) ) {
			continue;
		}
		$block_name = (string) ( $inner['blockName'] ?? '' );
		if ( 0 === strpos( $block_name, 'sgs/form-field-' ) ) {
			$attrs    = is_array( $inner['attrs'] ?? null ) ? $inner['attrs'] : array();
			$explicit = field_explicit_name( $attrs, field_name_suffix_reserve( $block_name ) );
			if ( '' !== $explicit ) {
				$names[ $explicit ] = true;
			}
		}
		if ( ! empty( $inner['innerBlocks'] ) && is_array( $inner['innerBlocks'] ) ) {
			$names = field_names_collect_explicit( $inner['innerBlocks'], $names );
		}
	}
	return $names;
}

/**
 * Open a naming scope for one form render.
 *
 * @param array<string, mixed> $parsed_form The parsed `sgs/form` block.
 */
function field_names_open_form( array $parsed_form ): void {
	$scopes   = &field_name_scopes();
	$inner    = is_array( $parsed_form['innerBlocks'] ?? null ) ? $parsed_form['innerBlocks'] : array();
	$scopes[] = array(
		'reserved' => field_names_collect_explicit( $inner ),
		'taken'    => array(),
	);
}

/**
 * Close the innermost form's naming scope. The base scope is never closed.
 */
function field_names_close_form(): void {
	$scopes = &field_name_scopes();
	if ( count( $scopes ) > 1 ) {
		array_pop( $scopes );
	}
}

/**
 * Claim a submission name in the current scope.
 *
 * An explicit name is used as written. A derived name skips every name already taken in the scope and every
 * explicit name the form reserved, adding "-2", "-3" and so on.
 *
 * @param string $name     The explicit name, or the derived base.
 * @param bool   $explicit Whether the name came from fieldName.
 * @return string The claimed name.
 */
function field_names_claim( string $name, bool $explicit ): string {
	$scopes = &field_name_scopes();
	$top    = count( $scopes ) - 1;

	if ( ! $explicit ) {
		$base = $name;
		$n    = 2;
		while ( isset( $scopes[ $top ]['taken'][ $name ] ) || isset( $scopes[ $top ]['reserved'][ $name ] ) ) {
			$name = $base . '-' . $n;
			++$n;
		}
	}
	$scopes[ $top ]['taken'][ $name ] = true;

	return $name;
}

/**
 * `render_block_data` callback: opens a naming scope as an `sgs/form` block starts to render.
 *
 * @param mixed $parsed_block Parsed block.
 * @return mixed The parsed block, unchanged.
 */
function field_names_on_render_block_data( $parsed_block ) {
	if ( is_array( $parsed_block ) && 'sgs/form' === ( $parsed_block['blockName'] ?? '' ) ) {
		field_names_open_form( $parsed_block );
	}
	return $parsed_block;
}

/**
 * `render_block_sgs/form` callback: closes the form's naming scope once its markup is final.
 *
 * @param mixed $block_content Rendered form markup.
 * @return mixed The markup, unchanged.
 */
function field_names_on_render_form( $block_content ) {
	field_names_close_form();
	return $block_content;
}

add_filter( 'render_block_data', __NAMESPACE__ . '\\field_names_on_render_block_data' );
add_filter( 'render_block_sgs/form', __NAMESPACE__ . '\\field_names_on_render_form', PHP_INT_MAX );
