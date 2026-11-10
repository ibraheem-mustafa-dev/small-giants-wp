<?php
/**
 * `sizing` atom: Ratio, Width, Height and the four limits (Spec 49 §7.2), PHP twin of
 * `src/components/media/atoms/sizing.js`.
 *
 * Each setting prints its own property; the browser combines them. The width default is resolved per device from the
 * resolved values, a helper keeps the file's own ratio when it has a Height and no Ratio, and a narrower device cancels
 * an inherited value with a keyword. Width and the width limits paint the layout box; Ratio, Height and the height
 * limits paint the surface.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/media-values.php';

if ( ! function_exists( 'sgs_media_atom_sizing_cancel' ) ) {
	/**
	 * What a narrower device prints to cancel an inherited value, by property.
	 *
	 * @return array<string,string>
	 */
	function sgs_media_atom_sizing_cancel(): array {
		return array(
			'aspect-ratio' => 'auto',
			'height'       => 'auto',
			'width'        => 'auto',
			'min-width'    => '0',
			'max-width'    => 'none',
			'min-height'   => '0',
			'max-height'   => 'none',
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_sizing_resolve' ) ) {
	/**
	 * The checked sizing values in force at a device; null for a base that is unset, `auto` or `natural`.
	 *
	 * @param array  $attrs  Attributes.
	 * @param array  $slot   Slot.
	 * @param string $device Device.
	 * @return array<string,?string>
	 */
	function sgs_media_atom_sizing_resolve( array $attrs, array $slot, string $device ): array {
		$get = static function ( string $base ) use ( $attrs, $slot, $device ) {
			$raw = sgs_media_resolved( $attrs, $slot, $base, $device );
			return is_string( $raw ) ? trim( $raw ) : '';
		};
		$limit = static function ( string $raw ): ?string {
			return 'none' === $raw ? null : ( '' !== sgs_media_length( $raw ) ? sgs_media_length( $raw ) : null );
		};
		$ratio  = $get( 'Ratio' );
		$height = $get( 'Height' );
		$width  = sgs_media_length( $get( 'Width' ), array( 'auto' ) );
		return array(
			'Ratio'     => 'natural' === $ratio ? null : ( '' !== sgs_media_ratio( $ratio ) ? sgs_media_ratio( $ratio ) : null ),
			'Height'    => 'fill' === $height ? 'fill' : ( 'auto' === $height ? null : $limit( $height ) ),
			'Width'     => '' !== $width ? $width : null,
			'MinWidth'  => $limit( $get( 'MinWidth' ) ),
			'MaxWidth'  => $limit( $get( 'MaxWidth' ) ),
			'MinHeight' => $limit( $get( 'MinHeight' ) ),
			'MaxHeight' => $limit( $get( 'MaxHeight' ) ),
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_sizing_file_ratio' ) ) {
	/**
	 * The file's own ratio at a device, from its Source width and height; '' when unknown.
	 *
	 * @param array  $attrs  Attributes.
	 * @param array  $slot   Slot.
	 * @param string $device Device.
	 * @return string
	 */
	function sgs_media_atom_sizing_file_ratio( array $attrs, array $slot, string $device ): string {
		$source = sgs_media_resolved( $attrs, $slot, 'Source', $device );
		$w      = is_array( $source ) ? (int) ( $source['width'] ?? 0 ) : 0;
		$h      = is_array( $source ) ? (int) ( $source['height'] ?? 0 ) : 0;
		return ( $w > 0 && $h > 0 ) ? $w . ' / ' . $h : '';
	}
}

if ( ! function_exists( 'sgs_media_atom_sizing_emit' ) ) {
	/**
	 * C3 emitter: the sizing rules of one slot.
	 *
	 * @param array  $slot   Slot `{prefix, kinds, context, wrapper}`.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class, without the dot.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string CSS, '' when nothing is set.
	 */
	function sgs_media_atom_sizing_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		$nodes  = sgs_media_nodes( $slot, $uid, $helper );
		$layout = array( 'width', 'min-width', 'max-width' );
		$rules  = array();
		$prev   = array();
		foreach ( sgs_media_devices() as $device ) {
			$r      = sgs_media_atom_sizing_resolve( $attrs, $slot, $device );
			$fill   = 'fill' === $r['Height'];
			$height = $fill ? null : $r['Height'];
			$ratio  = $fill ? null : $r['Ratio'];
			$any    = false;
			foreach ( $r as $v ) {
				$any = $any || null !== $v;
			}
			if ( null !== $r['Width'] ) {
				$width = $r['Width'];
			} elseif ( ! $any ) {
				$width = $helper ? 'fit-content' : null;
			} elseif ( null !== $ratio && null !== $height ) {
				$width = 'auto';
			} else {
				$width = '100%';
			}
			$cur = array(
				'aspect-ratio' => $ratio,
				'height'       => $fill ? '__fill' : $height,
				'width'        => $width,
				'min-width'    => $r['MinWidth'],
				'max-width'    => $r['MaxWidth'],
				'min-height'   => $r['MinHeight'],
				'max-height'   => $r['MaxHeight'],
			);
			if ( $helper && null === $ratio && null !== $height && 'auto' === $width ) {
				$file = sgs_media_atom_sizing_file_ratio( $attrs, $slot, $device );
				if ( '' !== $file ) {
					$cur['aspect-ratio'] = $file;
				}
			}
			foreach ( sgs_media_atom_sizing_cancel() as $prop => $cancel ) {
				$was = $prev[ $prop ] ?? null;
				$now = $cur[ $prop ];
				if ( $now === $was || '__fill' === $now ) {
					continue;
				}
				$node = in_array( $prop, $layout, true ) ? $nodes['layout'] : $nodes['surface'];
				if ( null === $now ) {
					if ( null === $was || ( 'width' === $prop && 'auto' === $was ) || '__fill' === $was ) {
						continue;
					}
					sgs_media_add( $rules, $node, $device, $prop, $cancel );
				} else {
					sgs_media_add( $rules, $node, $device, $prop, $now );
				}
			}
			$prev = $cur;
		}
		return sgs_media_rules_css( $rules );
	}
}

if ( ! function_exists( 'sgs_media_atom_sizing_disclosure' ) ) {
	/**
	 * C4 rule: Ratio is omitted while Height is Match its space; everything else is shown.
	 *
	 * @param array  $attrs  Attributes.
	 * @param string $device Device the editor is showing.
	 * @param string $prefix Slot prefix.
	 * @return array<string,array{state:string,hiddenReason:?string}> By base.
	 */
	function sgs_media_atom_sizing_disclosure( array $attrs, string $device = 'desktop', string $prefix = '' ): array {
		$slot   = array( 'prefix' => $prefix );
		$fill   = 'fill' === sgs_media_resolved( $attrs, $slot, 'Height', $device );
		$shown  = array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
		$out    = array();
		foreach ( array( 'Width', 'Height', 'MinWidth', 'MaxWidth', 'MinHeight', 'MaxHeight' ) as $base ) {
			$out[ $base ] = $shown;
		}
		$out['Ratio'] = $fill
			? array(
				'state'        => 'omitted',
				'hiddenReason' => __( 'A ratio does not apply while the height matches its space.', 'sgs-blocks' ),
			)
			: $shown;
		return $out;
	}
}
