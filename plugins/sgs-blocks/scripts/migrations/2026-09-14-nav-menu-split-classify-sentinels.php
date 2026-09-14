<?php
/**
 * Test-value generator for `2026-09-14-nav-menu-split-classify-harness.php`.
 *
 * Split out of the harness to keep both under the 300-line PHP cap. The harness runs via
 * `wp eval-file -` (STDIN), so it cannot `require` a sibling file on disk; the Python driver
 * concatenates this file after the harness into ONE stream instead (stripping this opening
 * tag), which is why this file declares only functions and has no side effects.
 *
 * WHY A BAD VALUE IS SAFE BUT MUST STILL BE VISIBLE: a value WordPress or render.php rejects
 * produces no change in EITHER fork, because validation is per-attribute and identical in
 * both. So it can never produce a wrong bar/drawer verdict — only a false "no effect". The
 * harness reports `sentinel_equals_baseline`, and the analyser reports those attributes as
 * UNTESTED rather than NO-EFFECT, so a generator bug cannot hide inside the no-effect bucket.
 *
 * FOUR BUGS FOUND IN THE FIRST VERSION, each now pinned by the rule order below:
 *   1. `padding` defaults to `{"desktop":{}}`; PHP decodes the inner `{}` as `[]`, and
 *      recursively perturbing an empty array returns the same empty array. The generator
 *      now falls through to a name-based shape whenever perturbing changes nothing.
 *   2. `/Style$/` was checked BEFORE `/FontStyle$/`, so `itemFontStyle` got `"dashed"` — a
 *      border style — and was rejected. Specific names are now matched before generic ones.
 *   3. Enum-less `submenuText*` / `*Hover` typography attributes (their `item*` twins HAVE
 *      enums) fell through to a nonsense string. They now get real CSS values by name.
 *   4. The first-run report counted these as NO-EFFECT, which is indistinguishable from a
 *      genuinely dead control. Hence `sentinel_equals_baseline` above.
 */

defined( 'ABSPATH' ) || exit;

function sgs_probe_leaf( $v ) {
	if ( is_bool( $v ) ) {
		return ! $v;
	}
	if ( is_int( $v ) || is_float( $v ) ) {
		return $v + 7;
	}
	if ( is_string( $v ) && preg_match( '/^(-?[\d.]+)([a-z%]*)$/i', $v, $m ) ) {
		return ( (float) $m[1] + 7 ) . ( '' !== $m[2] ? $m[2] : 'px' );
	}
	return '13px';
}

function sgs_probe_perturb( $v ) {
	if ( is_array( $v ) ) {
		$out = array();
		foreach ( $v as $k => $x ) {
			$out[ $k ] = sgs_probe_perturb( $x );
		}
		return $out;
	}
	return sgs_probe_leaf( $v );
}

/** Name-based object shapes, used when there is no non-empty default to perturb. */
function sgs_probe_object_shape( string $name ) {
	$box = array( 'top' => '13px', 'right' => '13px', 'bottom' => '13px', 'left' => '13px' );
	if ( preg_match( '/(Padding|Margin)$|^(padding|margin)$/', $name ) ) {
		return array( 'desktop' => $box );
	}
	if ( preg_match( '/BorderRadius$/', $name ) ) {
		return array( 'topLeft' => '13px', 'topRight' => '13px', 'bottomRight' => '13px', 'bottomLeft' => '13px' );
	}
	if ( preg_match( '/BorderWidth$/', $name ) ) {
		return array( 'top' => '3px', 'right' => '3px', 'bottom' => '3px', 'left' => '3px' );
	}
	if ( 'listColumns' === $name ) {
		return array( 'desktop' => 3 );
	}
	return array( 'desktop' => '37px' );
}

function sgs_probe_sentinel( string $name, array $schema, int $mega_id ) {
	$default = $schema['default'] ?? null;

	if ( ! empty( $schema['enum'] ) ) {
		foreach ( $schema['enum'] as $e ) {
			if ( $e !== $default && '' !== $e ) {
				return $e;
			}
		}
	}

	// ── Attributes whose valid values are enforced in PHP, not by a JSON enum ──
	$php_enforced = array(
		'featuredItemIds'       => array(),                       // baseline features Home; this un-features it
		'megaDrawerFallbackIds' => array( 'id:' . $mega_id ),
		'triggerMode'           => 'icon-and-text',               // icon|text|icon-and-text
		'submenuAnimation'      => 'slide-down',                  // none|fade|slide-down
		'triggerIcon'           => array( 'source' => 'lucide', 'name' => 'star' ),
		'sublinkMarkerIcon'     => array( 'source' => 'lucide', 'name' => 'star' ),
		'submenuShadow'         => '0 4px 12px rgba(0,0,0,.3)',
		'sgsCustomCss'          => '.sgs-probe-custom{outline:3px solid red}',
	);
	if ( array_key_exists( $name, $php_enforced ) ) {
		return $php_enforced[ $name ];
	}
	if ( preg_match( '/HoverTreatment$/', $name ) ) {
		return 'none'; // allowed set is none|swap|sweep|highlight; the default is swap
	}

	$type = $schema['type'] ?? null;
	if ( is_array( $type ) ) {
		$type = $type[0];
	}

	if ( 'boolean' === $type ) {
		return ! $default;
	}
	if ( 'number' === $type || 'integer' === $type ) {
		return is_numeric( $default ) ? $default + 7 : 7;
	}
	if ( 'object' === $type ) {
		if ( is_array( $default ) && ! empty( $default ) ) {
			$p = sgs_probe_perturb( $default );
			if ( $p !== $default ) {
				return $p;
			}
			// bug 1: perturbing nested empties returned the default unchanged — fall through
		}
		return sgs_probe_object_shape( $name );
	}
	if ( 'array' === $type ) {
		return array( 'sentinel' );
	}

	// ── Strings. SPECIFIC names before GENERIC suffixes (bug 2). ──
	$by_name = array(
		'/Gradient$/'                => 'linear-gradient(90deg,#123456,#654321)',
		'/FontStyle$/'               => 'italic',
		'/FontFamily$/'              => 'Georgia, serif',
		'/FontWeight(Hover|Current)?$/' => '300',
		'/TextAlign$/'               => 'center',
		'/TextWrap$/'                => 'balance',
		'/WritingMode$/'             => 'vertical-rl',
		'/TextDecoration(Hover)?$/'  => 'underline',
		'/TextTransform(Hover)?$/'   => 'uppercase',
		'/(Border|Separator)Style$/' => 'dashed',
		'/Unit$/'                    => ( 'rem' === $default ? 'px' : 'rem' ),
		'/(Colour|Bg|Color)(Hover|Current)?$/' => ( 'primary' === $default ? 'accent' : 'primary' ),
	);
	foreach ( $by_name as $pattern => $value ) {
		if ( preg_match( $pattern, $name ) ) {
			return $value;
		}
	}
	if ( is_string( $default ) && preg_match( '/^-?[\d.]+[a-z%]*$/i', $default ) ) {
		return sgs_probe_leaf( $default );
	}
	if ( preg_match( '/(Size|Gap|Offset|Width|Indent|gap)$/', $name ) ) {
		return '37px';
	}
	return 'sgs-probe-' . strtolower( $name );
}
