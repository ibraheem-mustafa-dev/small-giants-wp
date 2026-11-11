<?php
/**
 * `shape` atom: Shape, Corners and Border (Spec 49 §7.5), PHP twin of `src/components/media/atoms/shape.js`.
 *
 * Circle, ellipse and pill are `border-radius` on the surface and keep ordinary borders. Every other shape in
 * `includes/data/icon-shapes.json` is a mask on `.sgs-media-box__mask`; while a device has one, Corners is not printed
 * there, and a slot that has a mask at any device prints no border.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/media-values.php';

if ( ! function_exists( 'sgs_media_atom_shape_entries' ) ) {
	/**
	 * Every shape of the media Shape grid in registry order, read from `includes/data/icon-shapes.json` with the
	 * editor's validation (twin: `MEDIA_SHAPES` in `src/utils/icon-shapes.js`): entries whose `surfaces` include
	 * `media`, radius entries (circle, ellipse, pill) without a path and mask entries with one.
	 *
	 * @return array<int,array{slug:string,label:string,paint:string,d:string,proportions:string,ratio:string}>
	 */
	function sgs_media_atom_shape_entries(): array {
		static $entries = null;
		if ( null !== $entries ) {
			return $entries;
		}
		$entries = array();
		$file    = dirname( __DIR__, 2 ) . '/data/icon-shapes.json';
		$json    = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		foreach ( is_array( $json['shapes'] ?? null ) ? $json['shapes'] : array() as $entry ) {
			$slug = is_string( $entry['slug'] ?? null ) ? $entry['slug'] : '';
			if ( 1 !== preg_match( '/^[a-z][a-z0-9-]*$/', $slug ) || ! in_array( 'media', is_array( $entry['surfaces'] ?? null ) ? $entry['surfaces'] : array(), true ) ) {
				continue;
			}
			$paint = 'radius' === ( $entry['paint'] ?? '' ) ? 'radius' : 'mask';
			$path  = is_string( $entry['d'] ?? null ) ? trim( $entry['d'] ) : '';
			if ( 'mask' === $paint && 1 !== preg_match( '/^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]+$/', $path ) ) {
				continue;
			}
			$entries[] = array(
				'slug'        => $slug,
				'label'       => is_string( $entry['label'] ?? null ) ? $entry['label'] : $slug,
				'paint'       => $paint,
				'd'           => $path,
				'proportions' => 'keep' === ( $entry['proportions'] ?? '' ) ? 'keep' : 'stretch',
				'ratio'       => is_string( $entry['ratio'] ?? null ) ? $entry['ratio'] : '',
			);
		}
		return $entries;
	}
}

if ( ! function_exists( 'sgs_media_atom_shape_registry' ) ) {
	/**
	 * The mask shapes by slug: the media entries painted as a mask.
	 *
	 * @return array<string,array{d:string,proportions:string}>
	 */
	function sgs_media_atom_shape_registry(): array {
		static $registry = null;
		if ( null !== $registry ) {
			return $registry;
		}
		$registry = array();
		foreach ( sgs_media_atom_shape_entries() as $entry ) {
			if ( 'mask' === $entry['paint'] ) {
				$registry[ $entry['slug'] ] = array(
					'd'           => $entry['d'],
					'proportions' => $entry['proportions'],
				);
			}
		}
		return $registry;
	}
}

if ( ! function_exists( 'sgs_media_atom_shape_at' ) ) {
	/**
	 * The shape in force at a device.
	 *
	 * @param array  $attrs  Attributes.
	 * @param array  $slot   Slot.
	 * @param string $device Device.
	 * @return array{kind:string,slug:string,proportions:string} `kind` is `none`, `radius` or `mask`.
	 */
	function sgs_media_atom_shape_at( array $attrs, array $slot, string $device ): array {
		$raw   = sgs_media_resolved( $attrs, $slot, 'Shape', $device );
		$slug  = is_array( $raw ) ? ( is_string( $raw['shape'] ?? null ) ? $raw['shape'] : '' ) : ( is_string( $raw ) ? $raw : '' );
		$props = is_array( $raw ) && is_string( $raw['proportions'] ?? null ) ? $raw['proportions'] : '';
		if ( in_array( $slug, array( 'circle', 'ellipse', 'pill' ), true ) ) {
			return array(
				'kind'        => 'radius',
				'slug'        => $slug,
				'proportions' => 'stretch',
			);
		}
		$registry = sgs_media_atom_shape_registry();
		if ( isset( $registry[ $slug ] ) ) {
			return array(
				'kind'        => 'mask',
				'slug'        => $slug,
				'proportions' => in_array( $props, array( 'keep', 'stretch' ), true ) ? $props : $registry[ $slug ]['proportions'],
			);
		}
		return array(
			'kind'        => 'none',
			'slug'        => '',
			'proportions' => 'stretch',
		);
	}
}

if ( ! function_exists( 'sgs_media_shape_has_mask' ) ) {
	/**
	 * Whether any device of the slot has a mask shape (so the mask layer is printed).
	 *
	 * @param array $attrs Attributes.
	 * @param array $slot  Slot.
	 * @return bool
	 */
	function sgs_media_shape_has_mask( array $attrs, array $slot ): bool {
		foreach ( sgs_media_devices() as $device ) {
			if ( 'mask' === sgs_media_atom_shape_at( $attrs, $slot, $device )['kind'] ) {
				return true;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_media_atom_shape_mask_css' ) ) {
	/**
	 * The mask declarations of a shape, plain and `-webkit-` prefixed.
	 *
	 * @param array $shape Result of sgs_media_atom_shape_at().
	 * @return array<string,string>
	 */
	function sgs_media_atom_shape_mask_css( array $shape ): array {
		if ( 'mask' !== $shape['kind'] ) {
			return array(
				'mask-image'         => 'none',
				'-webkit-mask-image' => 'none',
			);
		}
		$d    = sgs_media_atom_shape_registry()[ $shape['slug'] ]['d'];
		$keep = 'keep' === $shape['proportions'];
		$svg  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"' . ( $keep ? '' : ' preserveAspectRatio="none"' ) . '><path d="' . $d . '"/></svg>';
		$url  = 'url("data:image/svg+xml,' . rawurlencode( $svg ) . '")';
		$size = $keep ? 'contain' : '100% 100%';
		return array(
			'mask-image'            => $url,
			'-webkit-mask-image'    => $url,
			'mask-repeat'           => 'no-repeat',
			'-webkit-mask-repeat'   => 'no-repeat',
			'mask-position'         => 'center',
			'-webkit-mask-position' => 'center',
			'mask-size'             => $size,
			'-webkit-mask-size'     => $size,
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_shape_emit' ) ) {
	/**
	 * C3 emitter: radius shapes and corners on the surface, the mask on the mask layer, the border on the surface.
	 *
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class, without the dot.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string
	 */
	function sgs_media_atom_shape_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		$has_mask  = sgs_media_shape_has_mask( $attrs, $slot );
		$nodes     = sgs_media_nodes( $slot, $uid, $helper, $has_mask );
		$radii     = array(
			'topLeft'     => 'border-top-left-radius',
			'topRight'    => 'border-top-right-radius',
			'bottomRight' => 'border-bottom-right-radius',
			'bottomLeft'  => 'border-bottom-left-radius',
		);
		$radius_of = array(
			'circle'  => '50%',
			'ellipse' => '50%',
			'pill'    => '9999px',
		);
		$rules     = array();
		$hover     = array();
		$prev      = '';
		$prev_radius = '';
		foreach ( sgs_media_devices() as $device ) {
			$shape = sgs_media_atom_shape_at( $attrs, $slot, $device );
			$now   = 'mask' === $shape['kind'] ? 'mask:' . $shape['slug'] . ':' . $shape['proportions'] : 'none';
			if ( $now !== $prev && ( 'none' !== $now || '' !== $prev ) ) {
				foreach ( sgs_media_atom_shape_mask_css( $shape ) as $prop => $value ) {
					sgs_media_add( $rules, $nodes['mask'], $device, $prop, $value );
				}
			}
			$prev = $now;
			$radius = 'radius' === $shape['kind'] ? $radius_of[ $shape['slug'] ] : '';
			if ( '' !== $radius ) {
				if ( $radius !== $prev_radius ) {
					sgs_media_add( $rules, $nodes['surface'], $device, 'border-radius', $radius );
				}
			} elseif ( 'none' === $shape['kind'] ) {
				$own = sgs_media_own( $attrs, $slot, 'Radius', $device );
				foreach ( ( is_array( $own ) || '' !== $prev_radius ) ? $radii : array() as $corner => $prop ) {
					$value = is_array( $own ) ? sgs_media_px( $own[ $corner ] ?? null ) : '';
					if ( '' !== $value ) {
						sgs_media_add( $rules, $nodes['surface'], $device, $prop, $value );
					} elseif ( '' !== $prev_radius ) {
						sgs_media_add( $rules, $nodes['surface'], $device, $prop, '0' );
					}
				}
			} elseif ( '' !== $prev_radius ) {
				sgs_media_add( $rules, $nodes['surface'], $device, 'border-radius', '0' );
			}
			$prev_radius = $radius;
		}
		if ( ! $has_mask ) {
			sgs_media_atom_shape_border( $rules, $hover, $attrs, $slot, $nodes['surface'] );
		}
		return sgs_media_rules_css( $rules, $hover );
	}
}

if ( ! function_exists( 'sgs_media_atom_shape_border' ) ) {
	/**
	 * Add the border: widths per side, a style (solid unless set) and a colour with its hover colour.
	 *
	 * @param array  $rules    Rule set, by reference.
	 * @param array  $hover    Hover list, by reference.
	 * @param array  $attrs    Attributes.
	 * @param array  $slot     Slot.
	 * @param string $selector Surface selector.
	 */
	function sgs_media_atom_shape_border( array &$rules, array &$hover, array $attrs, array $slot, string $selector ): void {
		$widths = sgs_media_scalar( $attrs, $slot, 'BorderWidth' );
		$set    = false;
		foreach ( is_array( $widths ) ? array( 'top', 'right', 'bottom', 'left' ) : array() as $side ) {
			$value = sgs_media_px( $widths[ $side ] ?? null, 40.0 );
			if ( '' !== $value ) {
				sgs_media_add( $rules, $selector, 'desktop', 'border-' . $side . '-width', $value );
				$set = $set || 0.0 !== (float) $value;
			}
		}
		if ( ! $set ) {
			return;
		}
		$style   = sgs_media_scalar( $attrs, $slot, 'BorderStyle' );
		$allowed = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
		sgs_media_add( $rules, $selector, 'desktop', 'border-style', in_array( $style, $allowed, true ) ? $style : 'solid' );
		$background    = sgs_media_colour( sgs_media_scalar( $attrs, $slot, 'Background' ) );
		$gradient      = sgs_media_gradient( sgs_media_scalar( $attrs, $slot, 'BorderColourGradient' ) );
		$gradient_over = sgs_media_gradient( sgs_media_scalar( $attrs, $slot, 'BorderColourHoverGradient' ) );
		$colour        = sgs_media_colour( sgs_media_scalar( $attrs, $slot, 'BorderColour' ) );
		$colour_hover  = sgs_media_colour( sgs_media_scalar( $attrs, $slot, 'BorderColourHover' ) );
		// A gradient cannot be a border colour: it paints as the surface's background across the border box, the
		// Background colour (if any) painted over it in the padding box, so corners and a circle or pill follow
		// `border-radius`. The border itself is transparent.
		$layers = static function ( string $paint ) use ( $background ): string {
			return '' !== $background ? 'linear-gradient(' . $background . ',' . $background . '),' . $paint : $paint;
		};
		if ( '' !== $gradient || '' !== $gradient_over ) {
			sgs_media_add( $rules, $selector, 'desktop', 'background-origin', 'border-box' );
			sgs_media_add( $rules, $selector, 'desktop', 'background-clip', '' !== $background ? 'padding-box,border-box' : 'border-box' );
		}
		if ( '' !== $gradient ) {
			sgs_media_add( $rules, $selector, 'desktop', 'border-color', 'transparent' );
			sgs_media_add( $rules, $selector, 'desktop', 'background-image', $layers( $gradient ) );
		} elseif ( '' !== $colour ) {
			sgs_media_add( $rules, $selector, 'desktop', 'border-color', $colour );
		}
		$decls = array();
		if ( '' !== $gradient_over ) {
			$decls = array(
				'background-image' => $layers( $gradient_over ),
				'border-color'     => 'transparent',
			);
		} elseif ( '' !== $colour_hover ) {
			$decls = array( 'border-color' => $colour_hover );
			if ( '' !== $gradient ) {
				$decls['background-image'] = '' !== $background ? $layers( 'linear-gradient(transparent,transparent)' ) : 'none';
			}
		}
		if ( array() !== $decls ) {
			ksort( $decls );
			$hover[] = array( $selector . ':hover', $selector, $decls );
		}
	}
}

if ( ! function_exists( 'sgs_media_atom_shape_disclosure' ) ) {
	/**
	 * C4 rule: Corners are omitted with a mask, circle, ellipse or pill; border settings are omitted with a mask, and
	 * style and colour wait for a width.
	 *
	 * @param array  $attrs  Attributes.
	 * @param string $device Device.
	 * @param string $prefix Slot prefix.
	 * @return array<string,array{state:string,hiddenReason:?string}> By base.
	 */
	function sgs_media_atom_shape_disclosure( array $attrs, string $device = 'desktop', string $prefix = '' ): array {
		$slot        = array( 'prefix' => $prefix );
		$shape       = sgs_media_atom_shape_at( $attrs, $slot, $device );
		$mask        = 'mask' === $shape['kind'];
		$shown       = array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
		$omit_border = array(
			'state'        => 'omitted',
			'hiddenReason' => __( 'Borders are not available on this shape. Choose Circle, Ellipse or Pill to keep a border.', 'sgs-blocks' ),
		);
		$widths      = sgs_media_scalar( $attrs, $slot, 'BorderWidth' );
		$has_width   = false;
		foreach ( is_array( $widths ) ? $widths : array() as $w ) {
			$has_width = $has_width || ( is_numeric( $w ) && (float) $w > 0 );
		}
		$wait  = array(
			'state'        => 'disabled',
			'hiddenReason' => __( 'Set a border width first.', 'sgs-blocks' ),
		);
		$after = $has_width ? $shown : $wait;
		return array(
			'Shape'        => $shown,
			'Radius'       => 'none' === $shape['kind'] ? $shown : array(
				'state'        => 'omitted',
				'hiddenReason' => __( 'Corners follow the shape.', 'sgs-blocks' ),
			),
			'BorderWidth'  => $mask ? $omit_border : $shown,
			'BorderStyle'  => $mask ? $omit_border : $after,
			'BorderColour' => $mask ? $omit_border : $after,
		);
	}
}
