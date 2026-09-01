<?php
/**
 * L3 — the media element's server-side DISPATCH layer.
 *
 * The PHP twin of `src/components/MediaElementPanel.js`. The editor composes an
 * atom's control rows; this composes the same atoms' custom-property VALUES and
 * tells the renderer which marker classes the markup needs.
 *
 * ⛔ It emits VALUES ONLY. Every rule lives in `assets/css/media-element.css`,
 * loaded in both realms. This class never writes a property declaration, never
 * an inline `style` attribute, and never a `<style>` tag — the caller appends
 * the returned text to the scoped `<style>` it already prints.
 *
 * ── The two markers ──────────────────────────────────────────────────────────
 *
 *   sgs-media-el   the replaced element itself (img/video)
 *   sgs-media-box  the container around it
 *
 * An atom declares which it needs via `attachesTo` in registry.js, because a
 * replaced element generates no pseudo-element (so `overlay`'s ::after paints
 * nothing on an img) while `object-fit` does nothing on a container. Both
 * failures are silent: the rule is present, the cascade resolves, nothing
 * paints.
 *
 * `requires_box()` exists so a renderer can ask the question BEFORE choosing its
 * markup. `sgs/media` renders a bare img as the block root when it has no
 * caption, link or tiers — in that shape there is no container, so a box atom
 * has nowhere to attach.
 *
 * ⛔ `requires_box()` is VALUE-aware, not declaration-aware. A box atom
 * appearing in a block's declared atom list does not by itself mean it needs
 * a wrapper — `overlay` produces no box-scope CSS until an operator sets a
 * colour/gradient, and `source` only ever produces box-scope CSS when its
 * output is consumed as a CSS `background-image` (container/hero-style
 * surfaces), never for a block like `sgs/media` that paints real `<img>`/
 * `<video>` markup. Forcing a wrapper on DECLARATION ALONE gives every such
 * block a permanently-unnecessary `<figure>` the moment it declares an atom
 * it happens not to be using for that purpose. `requires_box()` therefore
 * computes each declared box atom's real CSS output for the CURRENT
 * attribute values (the same `sgs_media_atom_<id>_css()` functions
 * `sgs_media_element_style()` already calls) and answers based on OUTPUT.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-media-element.php';

if ( ! class_exists( 'SGS_Media_Element' ) ) {

	/**
	 * Server-side composer for one media element.
	 */
	class SGS_Media_Element {

		/** Marker class for the replaced element. */
		const CLASS_ELEMENT = 'sgs-media-el';

		/** Marker class for its container. */
		const CLASS_BOX = 'sgs-media-box';

		/**
		 * Atoms whose CSS keys on the BOX marker.
		 *
		 * Mirrors `attachesTo` in `src/components/media/atoms/registry.js`.
		 * `check-media-atom-purity.js` fails the build if a CSS partial keys on
		 * the marker its atom did not declare, so the two cannot drift apart
		 * without the build going red.
		 *
		 * @var string[]
		 */
		private static $box_atoms = array( 'source', 'overlay' );

		/**
		 * The per-element scope class the custom properties are set on.
		 *
		 * @param string $uid    Per-instance uid, already sanitised by the caller.
		 * @param string $prefix Surface prefix ('' when unprefixed).
		 * @return string Class name, no leading dot.
		 */
		public static function scope_class( $uid, $prefix = '' ) {
			return sgs_media_element_scope_class( $uid, $prefix );
		}

		/**
		 * Does this element's CURRENT attribute values need a container to
		 * attach to?
		 *
		 * Value-aware, not declaration-aware: a box atom appearing in $atoms
		 * only counts when it actually produces a non-empty CSS declaration
		 * for these specific attribute values — computed by calling that
		 * atom's `sgs_media_atom_<id>_css()` PHP twin, the same function
		 * `sgs_media_element_style()` already calls to build the element's
		 * scoped `<style>` rule. An atom that is declared but emits nothing
		 * for this instance (`overlay` with no colour/gradient set, or
		 * `source` on a block that never paints it as a background) must not
		 * force a wrapper nothing will use.
		 *
		 * @param array  $attributes Block attributes.
		 * @param string $prefix     Surface prefix ('' when unprefixed).
		 * @param string $block_slug Block slug, for stored-name resolution.
		 * @param array  $atoms      Declared atom ids.
		 * @return bool True when at least one box atom emits real CSS for these values.
		 */
		public static function requires_box( array $attributes, $prefix, $block_slug, array $atoms ) {
			foreach ( array_intersect( $atoms, self::$box_atoms ) as $atom_id ) {
				$fn = 'sgs_media_atom_' . str_replace( '-', '_', (string) $atom_id ) . '_css';
				if ( ! function_exists( $fn ) ) {
					continue;
				}
				$emitted = $fn( $attributes, $prefix, $block_slug );
				if ( is_array( $emitted ) && $emitted ) {
					return true;
				}
			}
			return false;
		}

		/**
		 * Classes for the replaced element itself.
		 *
		 * @param string $scope_class The per-element scope class.
		 * @return string[] Class names.
		 */
		public static function element_classes( $scope_class ) {
			$classes = array( self::CLASS_ELEMENT );
			if ( '' !== $scope_class ) {
				$classes[] = $scope_class;
			}
			return $classes;
		}

		/**
		 * Classes for the container, when the CURRENT attribute values need one.
		 *
		 * Returns an EMPTY array when no atom's actual output keys on the box
		 * for these values, so a renderer never adds a marker nothing paints.
		 * An unused marker is harmless but misleading — it suggests a
		 * capability the element does not have.
		 *
		 * @param string $scope_class The per-element scope class.
		 * @param array  $attributes  Block attributes.
		 * @param string $prefix      Surface prefix ('' when unprefixed).
		 * @param string $block_slug  Block slug, for stored-name resolution.
		 * @param array  $atoms       Declared atom ids.
		 * @return string[] Class names, possibly empty.
		 */
		public static function box_classes( $scope_class, array $attributes, $prefix, $block_slug, array $atoms ) {
			if ( ! self::requires_box( $attributes, $prefix, $block_slug, $atoms ) ) {
				return array();
			}
			$classes = array( self::CLASS_BOX );
			if ( '' !== $scope_class ) {
				$classes[] = $scope_class;
			}
			return $classes;
		}

		/**
		 * The provenance attribute, so "which atom produced this rule?" is
		 * answerable from the page rather than by tracing descriptor to filter
		 * to schema to renderer.
		 *
		 * @param array  $atoms  Declared atom ids.
		 * @param string $prefix Surface prefix.
		 * @return string A ready-to-print attribute, or '' when there is nothing to say.
		 */
		public static function debug_attr( array $atoms, $prefix = '' ) {
			if ( empty( $atoms ) ) {
				return '';
			}
			return ' data-sgs-media-src="' . esc_attr( implode( ',', $atoms ) . '@' . $prefix ) . '"';
		}

		/**
		 * Every declared atom's custom-property values, as one scoped CSS rule.
		 *
		 * @param array  $attributes Block attributes.
		 * @param string $prefix     Surface prefix.
		 * @param string $block_slug Block slug, for stored-name resolution.
		 * @param string $uid        Per-instance uid.
		 * @param array  $atoms      Declared atom ids.
		 * @return string CSS text, or '' when no atom emitted anything.
		 */
		public static function style( array $attributes, $prefix, $block_slug, $uid, array $atoms ) {
			$scope_class = self::scope_class( $uid, $prefix );
			if ( '' === $scope_class || empty( $atoms ) ) {
				return '';
			}
			return sgs_media_element_style( $attributes, $prefix, $block_slug, $scope_class, $atoms );
		}
	}
}
