<?php
/**
 * The devices an effect layer is off on because the media slot behind its part shows a kind the effect does not fit
 * there (Spec 49 §10.1, FR-49-40).
 *
 * A part that declares `availableWhen: { slot, kinds }` sits on a slot whose Source resolves to a kind per device (a
 * photo on Desktop, a video on Mobile). An effect fits a kind when `x-part-kinds` in the motion schema allows it
 * (`svg` effects fit only an SVG, `text` effects no media) and `fx_effects.media_kinds` (carried by
 * `generated-fx-effects.php`) lists the kind, or lists none. This class returns the devices where the effect does not
 * fit, from the block's saved attributes at render time, so a layer saved before the kinds changed still stops where
 * it cannot run. `Sgs_Motion_Fx_Emitter` writes them as the effect's slug in `data-sgs-fx-off-<device>`, which the
 * runtimes (`src/shared/effects/off-switch.js`, `gsap/provider.js`) and the effect stylesheets read. Desktop has no
 * `off` tier on a stored layer, so this is the only route by which an effect is off on Desktop.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Device_Scope
 */
final class Sgs_Motion_Device_Scope {

	/** The devices, widest first, as `sgs_media_devices()` lists them. */
	const DEVICES = array( 'desktop', 'tablet', 'mobile' );

	/**
	 * The devices on which an effect does not run for this part, or none when the part has no media slot.
	 *
	 * @param string              $block      Block name.
	 * @param string              $target     Part key (`root` or a declared part).
	 * @param string              $effect     Effect slug.
	 * @param array<string,mixed> $attributes The block's saved attributes.
	 * @return string[] Devices (`desktop`, `tablet`, `mobile`).
	 */
	public static function off_devices( string $block, string $target, string $effect, array $attributes ): array {
		$slot = self::slot( $block, $target );
		if ( null === $slot || ! function_exists( 'sgs_media_resolve_sources' ) ) {
			return array();
		}
		$sources = sgs_media_resolve_sources( $slot, $attributes );
		$off     = array();
		foreach ( self::DEVICES as $device ) {
			$kind = is_array( $sources[ $device ] ?? null ) ? (string) ( $sources[ $device ]['kind'] ?? '' ) : '';
			if ( '' === $kind || ! self::fits( $effect, $kind ) ) {
				$off[] = $device;
			}
		}
		return $off;
	}

	/**
	 * Whether an effect fits one media kind (the PHP twin of `src/components/motion/kind-fit.js::effectFitsKind`).
	 *
	 * @param string $effect Effect slug.
	 * @param string $kind   `image`, `video`, `embed` or `svg`.
	 * @return bool
	 */
	public static function fits( string $effect, string $kind ): bool {
		$kind       = 'embed' === $kind ? 'video' : $kind;
		$part_kinds = Sgs_Motion_Field_Types::schema()['x-sgs-effects'][ $effect ]['x-part-kinds'] ?? null;
		if ( is_array( $part_kinds ) && ( ! in_array( 'svg', $part_kinds, true ) || 'svg' !== $kind ) ) {
			return false;
		}
		if ( ! function_exists( 'sgs_get_motion_fx_effects' ) && defined( 'SGS_BLOCKS_PATH' ) ) {
			require_once SGS_BLOCKS_PATH . 'includes/generated-fx-effects.php';
		}
		$registry = function_exists( 'sgs_get_motion_fx_effects' ) ? (array) sgs_get_motion_fx_effects() : array();
		$needs    = $registry[ $effect ]['media_kinds'] ?? array();
		return ! is_array( $needs ) || array() === $needs || in_array( $kind, $needs, true );
	}

	/**
	 * The `mediaElements` entry the part's `availableWhen.slot` names, or null.
	 *
	 * @param string $block  Block name.
	 * @param string $target Part key.
	 * @return array<string,mixed>|null
	 */
	private static function slot( string $block, string $target ): ?array {
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block );
		$sgs  = is_object( $type ) && isset( $type->supports['sgs'] ) && is_array( $type->supports['sgs'] ) ? $type->supports['sgs'] : array();
		$slot = $sgs['elements'][ $target ]['availableWhen']['slot'] ?? null;
		if ( ! is_string( $slot ) ) {
			return null;
		}
		foreach ( (array) ( $sgs['mediaElements'] ?? array() ) as $entry ) {
			if ( is_array( $entry ) && (string) ( $entry['prefix'] ?? '' ) === $slot && is_array( $entry['kinds'] ?? null ) ) {
				return $entry;
			}
		}
		return null;
	}
}
