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
		 * Does this set of atoms need a container to attach to?
		 *
		 * @param array $atoms Declared atom ids.
		 * @return bool True when at least one atom keys on the box marker.
		 */
		public static function requires_box( array $atoms ) {
			return (bool) array_intersect( $atoms, self::$box_atoms );
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
		 * Classes for the container, when the declared atoms need one.
		 *
		 * Returns an EMPTY array when no atom keys on the box, so a renderer
		 * never adds a marker nothing reads. An unused marker is harmless but
		 * misleading — it suggests a capability the element does not have.
		 *
		 * @param string $scope_class The per-element scope class.
		 * @param array  $atoms       Declared atom ids.
		 * @return string[] Class names, possibly empty.
		 */
		public static function box_classes( $scope_class, array $atoms ) {
			if ( ! self::requires_box( $atoms ) ) {
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
