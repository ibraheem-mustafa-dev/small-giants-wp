<?php
/**
 * The entrance clip reveal's edge and anchor (Spec 38A §10 clip-path row): one-edge clips over the four edge owners.
 *
 * The clip-path channel has one owner per edge, `--sgs-me-clip-t`, `-r`, `-b` and `-l`, composed as
 * `clip-path: inset(t r b l)` in `assets/css/motion.css`. A from or to value's `clip` is the amount; the emitter writes
 * it as the plain uniform input `--sgs-me-<end>-clip`, which every edge reads as its fallback, so `clipEdge` all (the
 * default) renders exactly as the single uniform inset did and emits the same bytes.
 *
 * When any device tier of an end chooses a single edge (`clipEdge` top, right, bottom or left) this class replaces that
 * end's uniform holder, in every tier that sets a clip value, with the four edge holders `--sgs-me-<end>-clip-<t|r|b|l>`:
 * the amount on the chosen edge and 0% on the other three (a tier left on `all` gets the amount on all four, so a wider
 * tier's single edge never leaks into it through the cascade). A tier inherits the wider tier's amount, edge and anchor
 * for whatever it leaves blank.
 *
 * `clipFromAnchor` names a row of the schema's `x-sgs-clip-anchors` (data, so a new anchor is one schema row): a custom
 * property holding a length measured from one side of the element (`measuredFrom`). The clipped edge on that side starts
 * at `var(<property>, <amount>)`; on the opposite side at `calc(100% - var(<property>, <100 - amount>%))`, so the visible
 * part ends at the anchor. With the property unset either form is the stored amount. An anchor on an edge that is
 * neither side (or on `all`) is not written, and `sgs_motion_layer_dropped` reports it (`clip-anchor-edge`).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Clip_Edge
 */
final class Sgs_Motion_Clip_Edge {

	/** The clip edges in `inset()` order, as the owner suffixes. */
	const EDGES = array(
		'top'    => 't',
		'right'  => 'r',
		'bottom' => 'b',
		'left'   => 'l',
	);

	/** The side opposite each edge. */
	const OPPOSITE = array(
		'top'    => 'bottom',
		'right'  => 'left',
		'bottom' => 'top',
		'left'   => 'right',
	);

	/** The uniform clip holder's suffix (the field's owner property `--sgs-me-clip`). */
	const UNIFORM = 'clip';

	/**
	 * Rewrite each end's clip holders for a single edge or an anchor.
	 *
	 * @param array<string,array<string,mixed>>  $tiers   Per-tier entrance values (desktop `values`, then the device overrides).
	 * @param array<string,array<string,string>> $decls   Per-tier declarations (by reference).
	 * @param array<string,mixed>                $context Render context (`block`, `target`), for drop reports.
	 * @return void
	 */
	public static function apply( array $tiers, array &$decls, array $context = array() ): void {
		foreach ( array(
			'from' => 'EntranceFrom',
			'to'   => 'EntranceTo',
		) as $end => $def ) {
			$resolved = self::resolve( $tiers, $end, $def, $context );
			if ( null === $resolved ) {
				continue;
			}
			$uniform = Sgs_Motion_Emitter::ME_PREFIX . $end . '-' . self::UNIFORM;
			foreach ( $resolved as $tier => $edges ) {
				unset( $decls[ $tier ][ $uniform ] );
				foreach ( $edges as $suffix => $css ) {
					$decls[ $tier ][ $uniform . '-' . $suffix ] = $css;
				}
			}
		}
	}

	/**
	 * One end's per-tier edge values, or null when no tier asks for anything but the uniform inset.
	 *
	 * @param array<string,array<string,mixed>> $tiers   Per-tier entrance values.
	 * @param string                            $end     `from` or `to`.
	 * @param string                            $def     The end's values def.
	 * @param array<string,mixed>               $context Render context.
	 * @return array<string,array<string,string>>|null Tier => edge suffix => CSS, for the tiers that set a clip value.
	 */
	private static function resolve( array $tiers, string $end, string $def, array $context ): ?array {
		$amount   = null;
		$edge     = 'all';
		$anchor   = 'none';
		$single   = false;
		$settings = array();
		foreach ( Sgs_Motion_Emitter::TIERS as $tier ) {
			$values = is_array( $tiers[ $tier ][ $end ] ?? null ) ? $tiers[ $tier ][ $end ] : array();
			$set    = false;
			if ( array_key_exists( 'clip', $values ) && null !== Sgs_Motion_Emitter::value_css( $def, 'clip', $values['clip'] ) ) {
				$amount = $values['clip'];
				$set    = true;
			}
			foreach ( array( 'clipEdge', 'clipFromAnchor' ) as $key ) {
				if ( array_key_exists( $key, $values ) && null !== Sgs_Motion_Emitter::value_css( $def, $key, $values[ $key ] ) ) {
					$set = true;
					if ( 'clipEdge' === $key ) {
						$edge = (string) $values[ $key ];
					} else {
						$anchor = (string) $values[ $key ];
					}
				}
			}
			if ( $set && null !== $amount ) {
				$settings[ $tier ] = array( $amount, $edge, $anchor );
				$single            = $single || 'all' !== $edge || 'none' !== $anchor;
			}
		}
		if ( ! $single ) {
			return null;
		}
		$out = array();
		foreach ( $settings as $tier => $setting ) {
			$out[ $tier ] = self::edges( $def, $setting[0], $setting[1], $setting[2], $end, $tier, $context );
		}
		return $out;
	}

	/**
	 * The four edge values of one tier.
	 *
	 * @param string              $def     The end's values def.
	 * @param mixed               $amount  The stored clip amount (a percentage number).
	 * @param string              $edge    `all`, `top`, `right`, `bottom` or `left`.
	 * @param string              $anchor  An `x-sgs-clip-anchors` name, or `none`.
	 * @param string              $end     `from` or `to`, for drop reports.
	 * @param string              $tier    Device tier, for drop reports.
	 * @param array<string,mixed> $context Render context.
	 * @return array<string,string> Edge suffix => CSS.
	 */
	private static function edges( string $def, $amount, string $edge, string $anchor, string $end, string $tier, array $context ): array {
		$css = (string) Sgs_Motion_Emitter::value_css( $def, 'clip', $amount );
		$out = array();
		foreach ( self::EDGES as $name => $suffix ) {
			$out[ $suffix ] = 'all' === $edge || $name === $edge ? $css : '0%';
		}
		if ( 'none' === $anchor ) {
			return $out;
		}
		$row  = self::anchors()[ $anchor ] ?? null;
		$side = is_array( $row ) ? (string) ( $row['measuredFrom'] ?? '' ) : '';
		$prop = is_array( $row ) ? (string) ( $row['property'] ?? '' ) : '';
		if ( ! isset( self::EDGES[ $side ] ) || 1 !== preg_match( '/^--[a-z0-9-]+$/', $prop ) || ( $edge !== $side && self::OPPOSITE[ $side ] !== $edge ) ) {
			self::report( $context, $anchor, $edge, $end, $tier );
			return $out;
		}
		$out[ self::EDGES[ $edge ] ] = $edge === $side
			? 'var(' . $prop . ', ' . $css . ')'
			: 'calc(100% - var(' . $prop . ', ' . self::complement( $amount ) . '))';
		return $out;
	}

	/**
	 * 100% minus a stored percentage amount, as CSS.
	 *
	 * @param mixed $amount A percentage number.
	 * @return string
	 */
	private static function complement( $amount ): string {
		$rest = 100 - (float) $amount;
		return ( floor( $rest ) === $rest ? (string) (int) $rest : rtrim( rtrim( sprintf( '%.4F', $rest ), '0' ), '.' ) ) . '%';
	}

	/**
	 * The schema's anchor rows.
	 *
	 * @return array<string,mixed>
	 */
	public static function anchors(): array {
		$rows = Sgs_Motion_Field_Types::schema()['x-sgs-clip-anchors'] ?? array();
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Report an anchor that cannot apply to the chosen edge.
	 *
	 * @param array<string,mixed> $context Render context.
	 * @param string              $anchor  The anchor name.
	 * @param string              $edge    The chosen edge.
	 * @param string              $end     `from` or `to`.
	 * @param string              $tier    Device tier.
	 * @return void
	 */
	private static function report( array $context, string $anchor, string $edge, string $end, string $tier ): void {
		do_action(
			'sgs_motion_layer_dropped',
			(string) ( $context['block'] ?? '' ),
			(string) ( $context['target'] ?? '' ),
			array(
				'id'    => 'clip-anchor-edge',
				'layer' => 'entrance.base',
				'text'  => 'The clip anchor ' . $anchor . ' measures from one side, so it needs a clip edge on that side or its opposite; the ' . $end . ' clip on ' . $tier . ' uses ' . $edge . ', so the anchor is not written.',
			)
		);
	}
}
