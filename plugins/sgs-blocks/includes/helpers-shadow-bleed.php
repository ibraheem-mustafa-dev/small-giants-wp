<?php
/**
 * Shadow-bleed band sizing (Spec 02 FR-2-18).
 *
 * A sideways-scrolling row clips all four edges, so its band rule (marked `--sgs-bleed-band: 1`) reserves room for its
 * items' shadows as padding cancelled by an equal negative margin. This `render_block` filter sizes that room per instance
 * and side as `--sgs-shadow-bleed-top|right|bottom|left` in the block's own scoped `<style>` (Spec 32, never inline); every
 * band rule falls back to the theme token `--sgs-shadow-bleed` (80px). A block takes part when its stylesheet, scoped CSS
 * or root effect stylesheet (`data-sgs-fx`) declares a band rule; no block is named here.
 *
 * A side is read from that CSS (stylesheet defaults plus the rendered scoped CSS, where attribute values such as
 * `shadowHover` and the motion emitter's values land resolved): the largest box-shadow reach (top = blur + spread - y,
 * bottom = blur + spread + y, left/right with x; inset and transparent layers reach nothing; `var()` resolves through the
 * CSS's own custom properties, the global shadow presets and custom tokens, then the fallback); px translation from
 * stylesheet transforms and the motion schema's hover and entrance channels (a percentage stylesheet translate centres a
 * control against itself and is not counted); rotation theta and scale s as a percentage of the row's containing block
 * (an item is never wider than the row: sin(theta) * 50% and (s - 1) * 50%, items assumed no taller than the row is wide);
 * the theme's focus ring and glow when a focusable element is not inset-ringed; 2px of room; capped at 80px. A value it
 * cannot read, script-driven motion, or another block nested inside (whose CSS is not read here) keeps the 80px fallback.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-global-settings.php';
require_once __DIR__ . '/helpers-scoped-instance-vars.php';
require_once __DIR__ . '/class-sgs-motion-registry.php';

const SGS_BLEED_FALLBACK_PX = 80;
const SGS_BLEED_ROOM_PX     = 2;
const SGS_BLEED_UNKNOWN     = '__unknown__';

/**
 * A length or angle literal in px or deg (rem/em at 16px, turn and rad converted); null when not a plain literal.
 *
 * @param string $text Literal.
 * @return array{0:float,1:string}|null [value, unit] with unit `px`, `deg`, `%` or ``.
 */
function sgs_bleed_number( string $text ): ?array {
	if ( 1 !== preg_match( '/^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em|deg|rad|turn|%)?$/i', trim( $text ), $m ) ) {
		return null;
	}
	$n    = (float) $m[1];
	$unit = strtolower( $m[2] ?? '' );
	$map  = array(
		'rem'  => array( 16, 'px' ),
		'em'   => array( 16, 'px' ),
		'rad'  => array( 180 / M_PI, 'deg' ),
		'turn' => array( 360, 'deg' ),
	);
	return isset( $map[ $unit ] ) ? array( $n * $map[ $unit ][0], $map[ $unit ][1] ) : array( $n, '' === $unit && 0.0 === $n ? 'px' : $unit );
}

/**
 * Replace every `var()` with its value from $vars, else its fallback, else SGS_BLEED_UNKNOWN (innermost first).
 *
 * @param string               $value Value.
 * @param array<string,string> $vars  Custom property => value.
 * @return string
 */
function sgs_bleed_resolve( string $value, array $vars ): string {
	for ( $i = 0; $i < 12; $i++ ) {
		$value = (string) preg_replace_callback(
			'/var\(\s*(--[\w-]+)\s*(?:,((?:[^()]|\([^()]*\))*))?\)/',
			static fn( $m ) => $vars[ $m[1] ] ?? ( isset( $m[2] ) ? trim( $m[2] ) : SGS_BLEED_UNKNOWN ),
			$value
		);
	}
	return $value; // a reference nested deeper than 12 stays a var() and reads as unknown.
}

/**
 * Per-side reach of a resolved box-shadow list, [top, right, bottom, left] px; null when a length cannot be read.
 *
 * @param string $value Box-shadow value, vars resolved.
 * @return float[]|null
 */
function sgs_bleed_shadow_reach( string $value ): ?array {
	$sides = array( 0.0, 0.0, 0.0, 0.0 );
	preg_match_all( '/(?:[^,()]|\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))+/', $value, $layers );
	foreach ( $layers[0] as $layer ) {
		preg_match_all( '/[a-z-]+\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)|\S+/i', trim( $layer ), $tok );
		$len     = array();
		$colours = array();
		$unknown = 0;
		$inset   = false;
		foreach ( $tok[0] as $t ) {
			if ( 'inset' === strtolower( $t ) ) {
				$inset = true;
			} elseif ( 1 === preg_match( '/^[-+]?[\d.]/', $t ) ) {
				$n = sgs_bleed_number( $t );
				if ( null === $n || 'px' !== $n[1] ) {
					return null; // a length in a unit this reader does not take (vw, ch, ...).
				}
				$len[] = $n[0];
			} elseif ( SGS_BLEED_UNKNOWN === $t || 1 === preg_match( '/^(?:calc|min|max|clamp)\(/i', $t ) ) {
				++$unknown;
			} elseif ( ! in_array( strtolower( $t ), array( 'none', 'initial', 'inherit', 'unset' ), true ) ) {
				$colours[] = strtolower( $t );
			}
		}
		if ( array() === $len && array() === $colours && 0 === $unknown ) {
			continue; // none.
		}
		// An unreadable token is accepted only as the colour: the lengths whole and no colour named.
		if ( count( $len ) < 2 || count( $len ) > 4 || ( $unknown > 0 && ( 1 !== $unknown || array() !== $colours ) ) ) {
			return null;
		}
		$clear = 1 === count( $colours ) && 1 === preg_match( '/^(?:transparent|#(?:[0-9a-f]{3}0|[0-9a-f]{6}00)|color-mix\(.*\b0%\s*,\s*transparent\))$/', $colours[0] );
		if ( $inset || $clear ) {
			continue;
		}
		$reach = max( 0.0, $len[2] ?? 0.0 ) + ( $len[3] ?? 0.0 );
		foreach ( array( $reach - $len[1], $reach + $len[0], $reach + $len[1], $reach - $len[0] ) as $i => $e ) {
			$sides[ $i ] = max( $sides[ $i ], $e );
		}
	}
	return $sides;
}

/**
 * The motion schema's channels a block's own CSS sets (owners `entrance` and `hoverState`): property => [group, axis],
 * and the effects a script drives (any other owner of a moving channel).
 *
 * @return array{props:array<string,array{0:string,1:string}>,runtime:string[]}
 */
function sgs_bleed_motion_channels(): array {
	static $out = null;
	if ( null !== $out ) {
		return $out;
	}
	$out    = array(
		'props'   => array(),
		'runtime' => array(),
	);
	$schema = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/schemas/motion.schema.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- plugin file.
	foreach ( (array) ( $schema['x-sgs-channels'] ?? array() ) as $row ) {
		$group = array( 'translate' => 'translate', 'rotate' => 'rotate', 'transform' => 'rotate', 'scale' => 'scale' )[ $row['channel'] ?? '' ] ?? null; // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing.AssociativeArrayFound
		foreach ( null === $group ? array() : (array) $row['owners'] as $owner ) {
			if ( ! in_array( $owner['owner'] ?? '', array( 'entrance', 'hoverState' ), true ) ) {
				$out['runtime'][] = strtolower( (string) preg_replace( '/([a-z])([A-Z])/', '$1-$2', (string) ( $owner['owner'] ?? '' ) ) );
				continue;
			}
			foreach ( (array) ( $owner['properties'] ?? array() ) as $p ) {
				$out['props'][ (string) $p['name'] ] = array( $group, (string) ( $p['axis'] ?? '' ) );
			}
		}
	}
	return $out;
}

/**
 * Compute a block instance's band from the CSS that styles it and its markup. Pure.
 *
 * @param string               $css   The block's stylesheets and rendered scoped CSS, joined.
 * @param string               $html  The block's rendered markup.
 * @param array<string,string> $vars  Global custom properties (shadow presets, custom tokens).
 * @param array<string,string> $focus Site focus tokens: `width`, `offset`, `bloom`, `ringOnly` (settings.custom.focus).
 * @param string               $own_block The block's own class stem (`sgs-gallery` for `wp-block-sgs-gallery`).
 * @return array{px:float[],pct:float,fallback:bool[]}|null Per side [top, right, bottom, left]; null when no band rule.
 */
function sgs_bleed_compute( string $css, string $html, array $vars = array(), array $focus = array(), string $own_block = '' ): ?array {
	$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
	if ( 1 !== preg_match( '/--sgs-bleed-band\s*:\s*1\b/', $css ) ) {
		return null;
	}
	preg_match_all( '/(?<![\w-])(--[\w-]+|box-shadow|transform|scale|rotate)\s*:\s*((?:[^;{}()]|\((?:[^()]|\([^()]*\))*\))+)/i', $css, $decls, PREG_SET_ORDER );
	foreach ( $decls as $d ) {
		if ( 0 === strpos( $d[1], '--' ) && ! isset( $vars[ $d[1] ] ) ) {
			$vars[ $d[1] ] = trim( $d[2] );
		}
	}
	$px       = array( 0.0, 0.0, 0.0, 0.0 );
	$fallback = array( false, false, false, false );
	$deg      = 0.0;
	$scale    = 1.0;
	$channels = sgs_bleed_motion_channels();
	$moves    = array(); // channel property => [largest value, smallest value].
	$lift     = array( 0.0, 0.0, 0.0, 0.0 ); // the largest stylesheet translation per side.
	foreach ( $decls as $d ) {
		$prop  = strtolower( $d[1] );
		$value = sgs_bleed_resolve( trim( $d[2] ), $vars );
		$chan  = (string) preg_replace( '/^(--sgs-[a-z]+)-(?:to|from)-/', '$1-', $prop );
		if ( 'box-shadow' === $prop || ( 0 === strpos( $prop, '--' ) && false !== strpos( $prop, 'shadow' ) && false === strpos( $prop, 'bleed' ) && 1 === preg_match( '/\d(?:px|rem|em)?\s+-?\d/', $value ) ) ) {
			$reach = sgs_bleed_shadow_reach( $value );
			foreach ( array( 0, 1, 2, 3 ) as $i ) {
				$px[ $i ]       = null === $reach ? $px[ $i ] : max( $px[ $i ], $reach[ $i ] );
				$fallback[ $i ] = $fallback[ $i ] || null === $reach;
			}
		} elseif ( isset( $channels['props'][ $chan ] ) ) {
			$n = sgs_bleed_number( $value );
			if ( null === $n ) {
				continue; // an expression (a hover rotation that cancels the resting tilt): its parts are read on their own.
			}
			if ( '%' === $n[1] && 'translate' === $channels['props'][ $chan ][0] ) {
				$axis = 'x' === $channels['props'][ $chan ][1] ? array( 1, 3 ) : array( 0, 2 );
				foreach ( $axis as $i ) {
					$fallback[ $i ] = true;
				}
				continue;
			}
			$moves[ $chan ] = array( max( $moves[ $chan ][0] ?? 0.0, $n[0] ), min( $moves[ $chan ][1] ?? 0.0, $n[0] ) );
		} elseif ( '--sgs-hover-scale' === $prop || 'scale' === $prop || 'transform' === $prop || 'rotate' === $prop ) {
			if ( 'transform' !== $prop ) {
				$value = $prop . '(' . $value . ')';
			}
			preg_match_all( '/(translate[xy3d]*|scale[xy3d]*|rotate[xyz]?|skew[xy]?|matrix(?:3d)?)\(([^()]*)\)/i', $value, $fns, PREG_SET_ORDER );
			$shift = array( 0.0, 0.0, 0.0, 0.0 ); // this declaration's translation; declarations are alternatives, so the largest counts.
			foreach ( $fns as $f ) {
				$fn = strtolower( $f[1] );
				foreach ( array_values( array_filter( (array) preg_split( '/[\s,]+/', trim( $f[2] ) ), 'strlen' ) ) as $k => $arg ) {
					$n = sgs_bleed_number( $arg );
					if ( 0 === strpos( $fn, 'matrix' ) || null === $n ) {
						$fallback = array( true, true, true, true );
					} elseif ( 0 === strpos( $fn, 'translate' ) && 'px' === $n[1] ) {
						$y               = 'translatey' === $fn || ( 'translatex' !== $fn && 1 === $k );
						$side            = $y ? ( $n[0] < 0 ? 0 : 2 ) : ( $n[0] < 0 ? 3 : 1 );
						$shift[ $side ] += abs( $n[0] );
					} elseif ( 0 === strpos( $fn, 'scale' ) ) {
						$scale = max( $scale, abs( $n[0] ) );
					} elseif ( 'deg' === $n[1] ) {
						$deg = max( $deg, abs( $n[0] ) );
					}
				}
			}
			$lift = array_map( 'max', $lift, $shift );
		}
	}
	$px = array_map( static fn( $a, $b ) => $a + $b, $px, $lift );
	// Motion channels add up across owners (the resting tilt plus the hover lift plus the entrance offset).
	$turn = 0.0;
	foreach ( $moves as $name => $range ) {
		list( $group, $axis ) = $channels['props'][ $name ];
		if ( 'translate' === $group ) {
			$px[ 'x' === $axis ? 1 : 2 ] += $range[0];
			$px[ 'x' === $axis ? 3 : 0 ] += -$range[1];
		} elseif ( 'rotate' === $group ) {
			$turn += max( $range[0], -$range[1] );
		} else {
			$scale *= max( 1.0, $range[0] );
		}
	}
	// Script-driven motion (magnet, parallax, ...) on the block, or another block nested inside it (a mega panel's
	// content): their reach is in no CSS read here.
	preg_match_all( '/\bwp-block-([\w-]+)/', $html, $nested );
	$foreign = array_filter( $nested[1], static fn( $c ) => '' === $own_block || 0 !== strpos( $c, $own_block ) );
	if ( array() !== $foreign || ( preg_match_all( '/data-sgs-fx=["\']([^"\']*)/', $html, $fx ) && array_intersect( array_filter( (array) preg_split( '/\s+/', implode( ' ', $fx[1] ) ) ), $channels['runtime'] ) ) ) {
		$fallback = array( true, true, true, true );
	}
	// The focus indicator, when a focusable element takes the outset ring (assets/css/focus.css in the theme).
	if ( preg_match_all( '/<(?:a\b[^>]*\bhref=|button\b|summary\b)[^>]*>/i', $html, $tags ) ) {
		foreach ( $tags[0] as $tag ) {
			if ( 1 !== preg_match( '/\bclass=["\'][^"\']*\bsgs-focus--inset\b/', $tag ) ) {
				$w    = (float) ( sgs_bleed_number( (string) ( $focus['width'] ?? '2px' ) )[0] ?? 2 );
				$o    = (float) ( sgs_bleed_number( (string) ( $focus['offset'] ?? $w . 'px' ) )[0] ?? $w );
				$glow = '1' !== (string) ( $focus['ringOnly'] ?? '0' ) && 0.0 !== (float) ( $focus['bloom'] ?? 1 );
				$ring = max( $w + $o, $glow ? 20 * $w : 0.0 ); // focus.css: the far glow is blur 15w + spread 5w.
				$px   = array_map( static fn( $v ) => $v + $ring, $px );
				break;
			}
		}
	}
	$deg += $turn;
	return array(
		'px'       => array_map( static fn( $v ) => $v * $scale, $px ),
		'pct'      => 50 * sin( deg2rad( min( 90.0, $deg ) ) ) + 50 * max( 0.0, $scale - 1 ),
		'fallback' => $fallback,
	);
}

/**
 * The four declarations a band sets: `<px>` or `min(80px, calc(<px> + <pct>%))`, the theme token for a fallen-back side.
 *
 * @param array{px:float[],pct:float,fallback:bool[]} $band From sgs_bleed_compute.
 * @return string[]
 */
function sgs_bleed_declarations( array $band ): array {
	$out = array();
	$pct = ceil( $band['pct'] * 100 ) / 100;
	foreach ( array( 'top', 'right', 'bottom', 'left' ) as $i => $side ) {
		$fixed = (int) ceil( max( 0.0, $band['px'][ $i ] ) + SGS_BLEED_ROOM_PX - 1e-9 );
		$value = $pct > 0 ? 'min(' . SGS_BLEED_FALLBACK_PX . 'px, calc(' . $fixed . 'px + ' . $pct . '%))' : min( $fixed, SGS_BLEED_FALLBACK_PX ) . 'px';
		$out[] = '--sgs-shadow-bleed-' . $side . ':' . ( $band['fallback'][ $i ] ? 'var(--sgs-shadow-bleed, ' . SGS_BLEED_FALLBACK_PX . 'px)' : $value );
	}
	return $out;
}

/**
 * Size the bleed band of a block that has one. `render_block` priority 90: after the motion renderer (20) and Additional
 * CSS (10) print their rules into the block, before the collector lifts them (99).
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Parsed block.
 * @return string
 */
function sgs_shadow_bleed_render( string $block_content, array $block ): string {
	$type = \WP_Block_Type_Registry::get_instance()->get_registered( (string) ( $block['blockName'] ?? '' ) );
	if ( null === $type || '' === $block_content ) {
		return $block_content;
	}
	$sheets = array();
	foreach ( (array) ( $type->style_handles ?? array() ) as $handle ) {
		$sheets[] = (string) \wp_styles()->get_data( $handle, 'path' );
	}
	$root = preg_match( '/^(?:\s*<(style|script)\b[^>]*>.*?<\/\1>)*\s*(<[a-zA-Z][^>]*>)/is', $block_content, $rm ) ? $rm[2] : '';
	if ( preg_match( '/\bdata-sgs-fx=["\']([^"\']*)/', $root, $fx ) ) {
		foreach ( array_filter( (array) preg_split( '/\s+/', trim( $fx[1] ) ) ) as $effect ) {
			$rel      = SGS_Motion_Registry::effect_stylesheet( $effect );
			$sheets[] = null === $rel ? '' : SGS_BLOCKS_PATH . $rel;
		}
	}
	static $read = array();
	$css         = '';
	foreach ( array_filter( array_unique( $sheets ) ) as $path ) {
		$read[ $path ] ??= is_readable( $path ) ? (string) file_get_contents( $path ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local stylesheet.
		$css            .= $read[ $path ];
	}
	preg_match_all( '#<style\b[^>]*>(.*?)</style>#is', $block_content, $styles );
	// Rules already in the collector for a scope class the block's own root carries (the motion renderer collects its
	// own). Only the root's: an ancestor must not take a nested row's band for its own.
	preg_match_all( '/(?<![\w-])sgs-[a-z0-9-]*?-[0-9a-f]{8,10}(?![\w-])/', $root, $uids );
	foreach ( (array) ( $GLOBALS['sgs_collected_css'] ?? array() ) as $chunk ) {
		foreach ( array_unique( $uids[0] ) as $uid ) {
			if ( false !== strpos( (string) $chunk, '.' . $uid ) ) {
				$css .= (string) $chunk;
				break;
			}
		}
	}
	$band = sgs_bleed_compute( $css . implode( '', $styles[1] ), $block_content, sgs_bleed_global_vars(), (array) sgs_global_custom_setting( 'focus' ), str_replace( '/', '-', (string) $block['blockName'] ) );
	if ( null === $band ) {
		return $block_content;
	}
	$decls = sgs_bleed_declarations( $band );
	$css   = static fn( string $scope ): string => '.' . $scope . '{' . implode( ';', $decls ) . '}';
	$scope = sgs_scope_class_for_root( $root, 'sgs-bleed', $css );
	// The block's own scope class takes the rule as it stands (its markup unchanged); a block without one gets a minted class.
	return false !== strpos( $root, $scope ) ? sgs_append_scoped_var_style( $block_content, $scope, $decls ) : sgs_inject_scoped_rules( $block_content, 'sgs-bleed', $css );
}
add_filter( 'render_block', __NAMESPACE__ . '\sgs_shadow_bleed_render', 90, 2 );

/**
 * The site's shadow presets (`--wp--preset--shadow--<slug>`) and custom tokens (`--wp--custom--<path>`), once per request.
 *
 * @return array<string,string>
 */
function sgs_bleed_global_vars(): array {
	static $vars = null;
	if ( null === $vars ) {
		$vars     = array();
		$kebab    = static fn( $key ) => strtolower( (string) preg_replace( '/([a-z0-9])([A-Z])/', '$1-$2', (string) $key ) );
		$settings = \wp_get_global_settings();
		foreach ( (array) ( $settings['shadow']['presets'] ?? array() ) as $origin ) {
			foreach ( (array) $origin as $p ) {
				$vars[ '--wp--preset--shadow--' . $kebab( $p['slug'] ?? '' ) ] = (string) ( $p['shadow'] ?? '' );
			}
		}
		$walk = static function ( $node, string $prefix ) use ( &$walk, &$vars, $kebab ): void {
			foreach ( (array) $node as $key => $value ) {
				if ( is_array( $value ) ) {
					$walk( $value, $prefix . '--' . $kebab( $key ) );
				} else {
					$vars[ $prefix . '--' . $kebab( $key ) ] = (string) $value;
				}
			}
		};
		$walk( $settings['custom'] ?? array(), '--wp--custom' );
	}
	return $vars;
}
