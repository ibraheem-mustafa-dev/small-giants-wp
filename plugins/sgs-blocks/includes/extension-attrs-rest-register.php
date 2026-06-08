<?php
/**
 * Register the SGS editor-extension `sgs*` attributes server-side.
 *
 * The SGS editor extensions (animation, responsive-visibility, conditional-
 * visibility, hover-effects, parallax, custom-css, image-controls, block-link,
 * click-effect) add `sgs*` attributes to blocks CLIENT-SIDE via a
 * `blocks.registerBlockType` JS filter. Blocks that preview through
 * ServerSideRender send those attributes to the WP-core block-renderer REST
 * route, which validates them against the SERVER-registered attribute schema
 * with `additionalProperties => false`. If an attribute is not registered
 * server-side, the route rejects the whole request with
 * `rest_additional_properties_forbidden` ("Invalid parameter(s): attributes")
 * and the editor shows "Error loading block: Invalid parameter(s): attributes".
 *
 * This filter mirrors the JS-added attribute schema onto every block that
 * supports `className` (the same set the JS extensions target), so
 * `WP_Block_Type::get_attributes()` — the schema source the block-renderer
 * validates against — contains them.
 *
 * DRIFT-PROOFING: the attribute list is NOT hand-maintained here. It is read
 * from `includes/extension-attributes.generated.php`, which is regenerated from
 * the extension JS (the single source of truth) by
 * `scripts/generate-extension-attributes.js` on every `npm run build` (prebuild)
 * — so a build cannot ship a stale list. That script's `--check` mode (exit 1
 * on drift) is available for a pre-commit hook / CI but is not yet wired into
 * an automated step.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Load the generated `sgs*` attribute schema (cached for the request).
 *
 * @return array<string, array<string, string>> Map of attr name => schema.
 */
function sgs_extension_attribute_schema(): array {
	static $schema = null;
	if ( null !== $schema ) {
		return $schema;
	}

	$file = __DIR__ . '/extension-attributes.generated.php';
	$schema = is_readable( $file ) ? (array) require $file : array();
	return $schema;
}

/**
 * Merge the extension attribute schema into every block type that supports
 * `className` (mirrors the JS extensions' targeting). Existing block.json
 * attributes always win — only attributes the block does not already declare
 * are added.
 *
 * @param array  $args       register_block_type args (incl. 'attributes', 'supports').
 * @param string $block_name Block name.
 * @return array
 */
function sgs_register_extension_attrs_for_rest( array $args, string $block_name ): array {
	// Mirror the JS guard: skip blocks that explicitly opt out of className.
	if ( isset( $args['supports']['className'] ) && false === $args['supports']['className'] ) {
		return $args;
	}

	$schema = sgs_extension_attribute_schema();
	if ( empty( $schema ) ) {
		return $args;
	}

	$existing           = isset( $args['attributes'] ) && is_array( $args['attributes'] ) ? $args['attributes'] : array();
	$args['attributes'] = array_merge( $schema, $existing );
	return $args;
}
add_filter( 'register_block_type_args', __NAMESPACE__ . '\\sgs_register_extension_attrs_for_rest', 20, 2 );
