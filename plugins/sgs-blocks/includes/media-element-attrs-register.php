<?php
/**
 * Server-side registration for declared media elements.
 *
 * WHY THIS FILE EXISTS RATHER THAN RIDING THE EXISTING GENERATOR
 * --------------------------------------------------------------
 * The architecture proposed adding media attributes to
 * `generate-extension-attributes.js`, "rather than creating a second one". That
 * is not possible, and the reason is measured: that generator's collector is
 *
 *     ATTR_RE = /\b((?:sgs|fx)[A-Za-z0-9]*)\s*:\s*\{([^}]*)\}/g
 *
 * It matches only `sgs*` / `fx*` prefixed keys. Media attributes keep their
 * EXISTING names (`imageUrl`, `beforeImageUrl`, `splitImage`, `bgVideo`) because
 * v1 renames nothing - measured against 11 representative names, ZERO match.
 * "Keep the names" and "ride that generator" cannot both hold.
 *
 * Bean's ruling (2026-08-30): register server-side from the SAME
 * `supports.sgs.mediaElements` declaration the JS filter reads. There is still
 * exactly one source of truth - the block's own block.json - and no existing
 * extension's generator is touched.
 *
 * WHY REGISTRATION IS NEEDED AT ALL
 * ---------------------------------
 * `WP_Block_Type::get_attributes()` is the schema `ServerSideRender` validates
 * against, and 12 blocks use it. An attribute absent from that schema is
 * rejected as an invalid parameter, which kills the editor preview while the
 * front end renders perfectly - a confusing, one-sided failure.
 *
 * ⛔ THE BLOCK'S OWN DECLARATION ALWAYS WINS, exactly as
 * `extension-attrs-rest-register.php` states for the `sgs*` family. Every v1
 * surface already declares its media keys with real defaults; overwriting them
 * would silently replace the client's stored defaults with ours.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/helpers-media-element.php';

/**
 * Load the generated base -> type map (cached for the request).
 *
 * Generated from `src/components/MediaElementControls.js` by
 * `scripts/generate-media-attributes.mjs`, so the server schema cannot drift
 * from the client's. Never hand-edit the generated file.
 *
 * @return array<string,mixed> Base name => declared type.
 */
function sgs_media_element_type_map() {
	static $map = null;
	if ( null !== $map ) {
		return $map;
	}
	$file = __DIR__ . '/media-element-attributes.generated.php';
	$map  = is_readable( $file ) ? (array) require $file : array();
	return $map;
}

/**
 * Merge the declared media key sets into a block's registered attributes.
 *
 * @param array  $args register_block_type args (incl. 'attributes', 'supports').
 * @param string $name Block slug.
 * @return array Modified args.
 */
function sgs_register_media_element_attrs( $args, $name ) {
	$declared = isset( $args['supports']['sgs']['mediaElements'] )
		? $args['supports']['sgs']['mediaElements']
		: null;

	if ( ! is_array( $declared ) || empty( $declared ) ) {
		return $args;
	}

	$types = sgs_media_element_type_map();
	if ( empty( $types['bases'] ) || empty( $types['groups'] ) ) {
		// Fail QUIET but do not invent a schema: without the generated map we
		// cannot know the declared types, and guessing them would let WP coerce
		// a mismatched value back to its default, deleting the client's media.
		return $args;
	}

	$existing = isset( $args['attributes'] ) && is_array( $args['attributes'] )
		? $args['attributes']
		: array();

	// Tiering is DATA, not derived from group membership. Presentation is only
	// partly tiered, so a group-derived rule would either miss ObjectPosition or
	// invent tiers for OverlayBlendMode. Both sides read this same list.
	$tiered = isset( $types['tiered'] ) && is_array( $types['tiered'] )
		? $types['tiered']
		: array();
	$atom_map = isset( $types['atoms'] ) && is_array( $types['atoms'] )
		? $types['atoms']
		: array();
	$tiers = array( '', 'Tablet', 'Mobile' );

	$injected = array();

	foreach ( $declared as $element ) {
		$prefix = isset( $element['prefix'] ) ? (string) $element['prefix'] : '';

		// SELECTIVE INJECTION. An entry names the ATOMS it wants and receives
		// the union of their bases. Omitting `atoms` means all of them - the
		// honest default for a layer whose premise is that a missing control is
		// a gap, so a surface that has not thought about it gets the full set.
		//
		// ⛔ Without this a single prefix injects all 60 bases (109 keys with
		// tiers). A surface with three real media attributes would gain a
		// hundred nothing reads, which is exactly what check-dead-controls.js
		// exists to stop.
		$wanted = isset( $element['atoms'] ) && is_array( $element['atoms'] ) && $element['atoms']
			? $element['atoms']
			: array_keys( $atom_map );

		$bases = array();
		foreach ( $wanted as $atom_id ) {
			if ( ! isset( $atom_map[ $atom_id ] ) ) {
				// An unknown atom is an authoring error, not a reason to inject
				// less silently. Skipping it would look identical to the block
				// simply lacking those controls.
				_doing_it_wrong(
					__FUNCTION__,
					sprintf(
						/* translators: 1: atom id, 2: block name. */
						esc_html__( 'Unknown media atom "%1$s" declared by %2$s.', 'sgs-blocks' ),
						esc_html( (string) $atom_id ),
						esc_html( (string) $name )
					),
					'1.0.0'
				);
				continue;
			}
			foreach ( $atom_map[ $atom_id ] as $atom_base ) {
				$bases[ $atom_base ] = true;
			}
		}

		foreach ( array_keys( $bases ) as $base ) {
				foreach ( $tiers as $tier ) {
					if ( '' !== $tier && ! in_array( $base, $tiered, true ) ) {
						continue;
					}

					$attr_name = sgs_media_element_stored_attr( $name, $prefix, $base . $tier );
					if ( isset( $existing[ $attr_name ] ) || isset( $injected[ $attr_name ] ) ) {
						continue; // The block's own declaration wins.
					}

					$type = isset( $types['bases'][ $base ] ) ? $types['bases'][ $base ] : 'string';
					$def  = array();

					if ( '' !== $tier && 'boolean' === $type ) {
						// null is the inherit-from-the-tier-above sentinel.
						$def['type']    = array( 'boolean', 'null' );
						$def['default'] = null;
					} else {
						$def['type'] = $type;
					}

					$injected[ $attr_name ] = $def;
				}
		}
	}

	if ( empty( $injected ) ) {
		return $args;
	}

	// Existing attributes are merged LAST so a block's own declaration wins.
	$args['attributes'] = array_merge( $injected, $existing );

	return $args;
}

add_filter( 'register_block_type_args', __NAMESPACE__ . '\\sgs_register_media_element_attrs', 20, 2 );
