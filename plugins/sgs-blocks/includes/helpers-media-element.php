<?php
/**
 * L1 (PHP half) — media attribute NAMING.
 *
 * The server twin of `src/components/MediaElementControls.js`. One helper, one
 * shape, every block — the same contract `helpers-typography.php` holds for
 * typography, and the shape `check-control-helper-parity.py` measures.
 *
 * ⛔ THE FUNCTION NAMES CARRY `media_element` ON PURPOSE. The parity gate derives
 * a slug from the JS component (`MediaElementControls` -> `media_element`) and
 * then looks for ANY `sgs_*` function under `includes/` whose name contains it.
 * Naming these `sgs_media_attr()` would read as ABSENT and Media would never
 * register as the fourth name-keyed family.
 *
 * ⛔ ZERO RENAMES. WordPress silently discards an attribute a block no longer
 * declares (D338), so a rename is a stored-`post_content` migration in which the
 * client's image vanishes with every gate green. These helpers DERIVE the names
 * a surface already stores; they never propose new ones.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'sgs_media_element_attr' ) ) {
	/**
	 * Build a prefixed media attribute name.
	 *
	 * Identical rule to `sgs_typography_attr()`, and to `mediaAttrName()` on the
	 * JS side — the three must agree or the editor writes one key while the
	 * renderer reads another.
	 *
	 *   sgs_media_element_attr( 'before', 'ImageUrl' ) => 'beforeImageUrl'
	 *   sgs_media_element_attr( '', 'ImageUrl' )       => 'imageUrl'
	 *   sgs_media_element_attr( 'split', 'Image' )     => 'splitImage'
	 *
	 * @param string $prefix Surface prefix ( '' for an unprefixed surface ).
	 * @param string $base   PascalCase base.
	 * @return string Attribute name.
	 */
	function sgs_media_element_attr( $prefix, $base ) {
		return '' !== $prefix ? $prefix . $base : lcfirst( $base );
	}
}

if ( ! function_exists( 'sgs_media_element_stored_attr' ) ) {
	/**
	 * Resolve the attribute name a SURFACE actually stores.
	 *
	 * Measured from the census: across 128 media attributes on six surfaces the
	 * convention reproduces every name except FOUR, in TWO distinct cases. Three
	 * are `sgs/before-after`'s shared autoplay — ONE toggle governing BOTH video
	 * slots per its sync contract, so it is block-level rather than per-slot.
	 * `sgs/decorative-image`'s `decorMedia` is a legacy composite with no
	 * prefix/base decomposition at all.
	 *
	 * Mirrors `mediaStoredAttrName()` in the JS half.
	 *
	 * @param string $block_slug e.g. 'sgs/before-after'.
	 * @param string $prefix     Surface prefix.
	 * @param string $base       PascalCase base.
	 * @return string The stored attribute name.
	 */
	function sgs_media_element_stored_attr( $block_slug, $prefix, $base ) {
		$generated = sgs_media_element_attr( $prefix, $base );

		$stored_as = array(
			'sgs/before-after'      => array(
				'videoAutoplay'       => 'videoAutoplay',
				'videoAutoplayTablet' => 'videoAutoplayTablet',
				'videoAutoplayMobile' => 'videoAutoplayMobile',
			),
			'sgs/decorative-image'  => array(
				'decorMedia' => 'decorMedia',
			),
			'sgs/brand-strip'       => array(
				// Mirrors STORED_AS in src/components/MediaElementControls.js —
				// this block's pre-existing logo-fit dropdown already stores
				// `logoFit`, kept as the only UI rather than renamed.
				'objectFit' => 'logoFit',
			),
		);

		if ( ! isset( $stored_as[ $block_slug ] ) ) {
			return $generated;
		}

		$overrides  = $stored_as[ $block_slug ];
		$unprefixed = lcfirst( $base );

		if ( isset( $overrides[ $unprefixed ] ) ) {
			return $overrides[ $unprefixed ];
		}
		if ( isset( $overrides[ $generated ] ) ) {
			return $overrides[ $generated ];
		}
		return $generated;
	}
}

if ( ! function_exists( 'sgs_media_element_value' ) ) {
	/**
	 * Read a media attribute's value, tolerating every storage SHAPE.
	 *
	 * The census measured TEN distinct storage shapes across the population for
	 * what is conceptually one thing. A helper that assumes a single shape can
	 * read only part of the tree, which is precisely why the architecture's
	 * name-only `storedAs` map was insufficient:
	 *
	 *   media-object          {id,url,alt}   hero splitImage, container bgVideo
	 *   attachment-id         integer        media imageId
	 *   attachment-id-union   int|string     before-after beforeImageId
	 *   url-string            string         media imageUrl, product-card image
	 *   tri-state-inherit     bool|null      per-tier booleans, null = inherit
	 *
	 * @param array  $attributes Block attributes, passed verbatim.
	 * @param string $name       Attribute name (from the resolvers above).
	 * @param string $want       'url' | 'id' | 'raw'.
	 * @return mixed Resolved value, or '' / null when absent.
	 */
	function sgs_media_element_value( array $attributes, $name, $want = 'raw' ) {
		if ( ! isset( $attributes[ $name ] ) ) {
			return 'raw' === $want ? null : '';
		}

		$value = $attributes[ $name ];

		// media-object shape: {id,url,alt}.
		if ( is_array( $value ) ) {
			if ( 'url' === $want ) {
				return isset( $value['url'] ) ? (string) $value['url'] : '';
			}
			if ( 'id' === $want ) {
				return isset( $value['id'] ) ? (int) $value['id'] : 0;
			}
			return $value;
		}

		if ( 'url' === $want ) {
			// An attachment ID stored in a string|int union still resolves.
			if ( is_numeric( $value ) && (int) $value > 0 ) {
				$url = wp_get_attachment_url( (int) $value );
				return $url ? (string) $url : '';
			}
			return (string) $value;
		}

		if ( 'id' === $want ) {
			return is_numeric( $value ) ? (int) $value : 0;
		}

		return $value;
	}
}

if ( ! function_exists( 'sgs_media_element_scope_class' ) ) {
	/**
	 * The per-ELEMENT scope class for one media element on a block.
	 *
	 * ⛔ PER ELEMENT, NOT PER BLOCK, and that distinction is the whole point.
	 *
	 * The atoms emit VALUES with fixed custom-property names -
	 * `--sgs-media-object-fit`, not `--sgs-media-before-object-fit` - because the
	 * shared stylesheet is static CSS and cannot know a surface's prefix. So a
	 * block with TWO media elements (`sgs/before-after`'s before/after slots)
	 * would set the same property twice on one scope and the second would win:
	 * the client sets before=contain and after=fill, and both render fill.
	 *
	 * Scoping per element is what makes the fixed names safe. Each element
	 * carries its own class, its own declarations sit on that class, and the
	 * shared rule on `.sgs-media-el` reads whichever value its own element
	 * inherited.
	 *
	 * This is the same answer `sgs/hero` already reached from the other
	 * direction - it scopes its object-fit selector to
	 * `.{uid} .sgs-hero__split-media--image` rather than to the block root.
	 *
	 * @param string $uid    The block instance's uid class.
	 * @param string $prefix Surface prefix ( '' for a single-element block ).
	 * @return string Scope class, with no leading dot.
	 */
	function sgs_media_element_scope_class( $uid, $prefix ) {
		$uid = preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) $uid );
		if ( '' === $uid ) {
			return '';
		}
		if ( '' === (string) $prefix ) {
			return $uid;
		}
		$safe_prefix = strtolower( preg_replace( '/[^a-zA-Z0-9]/', '', (string) $prefix ) );
		return '' === $safe_prefix ? $uid : $uid . '--' . $safe_prefix;
	}
}

if ( ! function_exists( 'sgs_media_element_style' ) ) {
	/**
	 * Every declared atom's custom-property VALUES for one media element, as one
	 * scoped CSS rule.
	 *
	 * The caller passes the atoms this element has adopted; each atom's
	 * `sgs_media_atom_<id>_css()` contributes its declarations and they are
	 * joined onto the element's own scope class.
	 *
	 * ⛔ Returns CSS TEXT, never a `<style>` tag and never an inline attribute.
	 * The caller decides where it goes, exactly as `sgs_typography_css_rule()`
	 * does - and Spec 32 forbids an inline `style` property declaration outright.
	 *
	 * ⛔ An atom with no PHP twin is SKIPPED SILENTLY ON PURPOSE, because the
	 * alternative is worse: a fatal on a page because a JS-only atom was named.
	 * The pairing is enforced at build time instead, where it belongs -
	 * `test-media-atom-parity.mjs` fails when an atom ships one half.
	 *
	 * @param array  $attributes  Block attributes, verbatim.
	 * @param string $prefix      Surface prefix.
	 * @param string $block_slug  e.g. 'sgs/media'.
	 * @param string $scope_class From sgs_media_element_scope_class().
	 * @param array  $atoms       Atom ids this element has adopted.
	 * @return string CSS text, or '' when nothing is set.
	 */
	function sgs_media_element_style( array $attributes, $prefix, $block_slug, $scope_class, array $atoms ) {
		if ( '' === (string) $scope_class || empty( $atoms ) ) {
			return '';
		}

		$decls = array();
		foreach ( $atoms as $atom_id ) {
			$fn = 'sgs_media_atom_' . str_replace( '-', '_', (string) $atom_id ) . '_css';
			if ( ! function_exists( $fn ) ) {
				continue;
			}
			$emitted = $fn( $attributes, $prefix, $block_slug );
			if ( is_array( $emitted ) && $emitted ) {
				$decls = array_merge( $decls, $emitted );
			}
		}

		if ( empty( $decls ) ) {
			return '';
		}

		// Atoms return declarations WITHOUT a trailing semicolon - the joiner owns
		// the separators. Five of the first ten atoms appended their own and one
		// did not, which produced `--a:1;;--b:2` the moment two were concatenated.
		return '.' . $scope_class . '{' . implode( ';', $decls ) . '}';
	}
}
