<?php
/**
 * Standalone tests for the layered shadow composer (Wave 3C U-1 commit 4f-1):
 * includes/helpers-shadow-layers.php.
 *
 * Covers the grammar, the colour rules, the deliberate fixes to today's defects, the
 * forced-colours fallback and the security negative controls. Every assertion that guards
 * a defect is paired with a check that the OLD behaviour would have failed it.
 *
 *   php plugins/sgs-blocks/tests/php/run-shadow-layers-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';

$GLOBALS['sgs_t_fail'] = 0;
$GLOBALS['sgs_t_pass'] = 0;

function t_eq( $expected, $actual, string $label, bool $quiet = false ): void {
	if ( $expected === $actual ) {
		++$GLOBALS['sgs_t_pass'];
		return;
	}
	++$GLOBALS['sgs_t_fail'];
	if ( ! $quiet ) {
		fwrite( STDERR, "FAIL {$label}\n  expected: " . json_encode( $expected ) . "\n  actual:   " . json_encode( $actual ) . "\n" );
	}
}

function t_true( bool $cond, string $label ): void {
	t_eq( true, $cond, $label );
}

// ── Deliberate fixes to today's defects ─────────────────────────────────────────────
t_eq( '-2px 4px 8px 0px #000000', sgs_shadow_layers( '-2px 4px 8px 0px', '#000000' ), 'negative first offset composes (was mangled into a slug)' );
t_eq( '0px 4px 12px 0px #000000', sgs_shadow_layers( '0 4px 12px 0', '#000000' ), 'unitless zero keeps its colour (was dropped)' );
t_eq( 'none', sgs_shadow_layers( 'none', null ), '"none" is none (was var(--wp--preset--shadow--none))' );
t_eq( 'none', sgs_shadow_value( 'none' ), 'sgs_shadow_value: "none" is none' );
t_eq( '-2px 4px 8px #000000', sgs_shadow_value( '-2px 4px 8px #000000' ), 'sgs_shadow_value: leading minus is a raw shape, not a slug' );
t_eq(
	'0px 1px 2px 0px #00000033, 0px 8px 24px 0px #00000033',
	sgs_shadow_layers( '0px 1px 2px 0px, 0px 8px 24px 0px', '#00000033' ),
	'one colour applies to EVERY layer (was: last layer only)'
);
t_eq( '0px 2px 4px 0px #0000001A', sgs_shadow_layers( '0 2px 4px rgba(0,0,0,.1)', null ), 'draft-style embedded colour is canonicalised' );
t_eq(
	'0px 30px 80px -30px #00000047, 0px 2px 8px -2px #00000014',
	sgs_shadow_layers( '0 30px 80px -30px rgba(0,0,0,.28), 0 2px 8px -2px rgba(0,0,0,.08)', null ),
	'two-layer draft literal keeps both layers and both colours'
);

// ── Colour list rules ───────────────────────────────────────────────────────────────
$two = '0px 1px 2px 0px, 0px 8px 24px 0px';
t_eq( '0px 1px 2px 0px #FF0000, 0px 8px 24px 0px #00FF00', sgs_shadow_layers( $two, '#FF0000, #00FF00' ), 'colour list matches layers' );
t_eq( '0px 1px 2px 0px #FF0000, 0px 8px 24px 0px #FF0000', sgs_shadow_layers( $two, '#FF0000' ), 'a shorter list repeats its last entry' );
t_eq( '0px 1px 2px 0px #FF0000, 0px 8px 24px 0px #00FF00', sgs_shadow_layers( $two, '#FF0000, #00FF00, #0000FF' ), 'extra colour entries are ignored' );
t_eq( '0px 1px 2px 0px #0000001A, 0px 8px 24px 0px #00FF00', sgs_shadow_layers( $two, ', #00FF00' ), 'an empty first entry means the default colour' );
t_eq( '0px 1px 2px 0px #FF0000, 0px 8px 24px 0px #FF0000', sgs_shadow_layers( $two, '#FF0000, ' ), 'an empty later entry inherits the previous one' );
t_eq(
	'0px 1px 2px 0px #FF0000, 0px 8px 24px 0px red',
	sgs_shadow_layers( '0px 1px 2px 0px, 0px 8px 24px 0px red', '#FF0000, #00FF00' ),
	'a layer with its own colour keeps it over the list'
);
t_eq( '0px 4px 12px 0px var(--wp--custom--shadow-colour, #000000)', sgs_shadow_layers( '0px 4px 12px 0px', 'site' ), 'site colour' );
t_eq(
	'0px 4px 12px 0px color-mix(in srgb, var(--wp--custom--shadow-colour, #000000) 12%, transparent)',
	sgs_shadow_layers( '0px 4px 12px 0px', 'site 12%' ),
	'opacity builds a color-mix on the site colour'
);
t_eq(
	'0px 4px 12px 0px color-mix(in srgb, var(--wp--preset--color--primary, currentColor) 8%, transparent)',
	sgs_shadow_layers( '0px 4px 12px 0px', 'primary 8%' ),
	'opacity keeps the palette link (color-mix built here, never stored)'
);
t_eq( '0px 4px 12px 0px #FF0000', sgs_shadow_layers( '0px 4px 12px 0px', '#FF0000 100%' ), '100% opacity adds no color-mix' );

// ── Grammar ─────────────────────────────────────────────────────────────────────────
t_eq( 'inset 0px 2px 4px 0px #0000001A', sgs_shadow_layers( 'INSET 0 2px 4px', null ), 'inset is case-insensitive and first' );
t_eq( 'inset 0px 2px 4px 0px #0000001A', sgs_shadow_layers( '0 2px 4px inset', null ), 'inset may be last' );
t_eq( '', sgs_shadow_layers( '0 2px inset 4px', null ), 'inset in the middle is not a layer' );
t_eq( 'var(--wp--preset--shadow--raised)', sgs_shadow_layers( 'Raised', '#FF0000' ), 'a bare slug is a preset and ignores colour' );
t_eq( '', sgs_shadow_layers( 'inset', null ), 'the word inset alone is not a slug' );
t_eq( '0px 0px 100px 0px #0000001A', sgs_shadow_layers( '0px 0px 999px 0px', null ), 'blur is clamped to 100' );
t_eq( '200px -200px 0px 0px #0000001A', sgs_shadow_layers( '999px -999px 0px', null ), 'offsets are clamped to 200' );
t_eq( '', sgs_shadow_layers( '0px 0px -4px 0px', null ), 'negative blur is not a layer' );
t_eq( '0px 0.5px 1px 0px #0000001A', sgs_shadow_layers( '0 .5 1', null ), 'decimals and a bare number' );

// ── Limits are enforced here, not in the editor ─────────────────────────────────────
$eight = implode( ', ', array_fill( 0, 8, '0px 1px 2px 0px' ) );
$nine  = implode( ', ', array_fill( 0, 9, '0px 1px 2px 0px' ) );
t_true( '' !== sgs_shadow_layers( $eight, null ), 'eight layers is allowed' );
t_eq( '', sgs_shadow_layers( $nine, null ), 'nine layers is rejected, not truncated' );
t_eq( '', sgs_shadow_layers( implode( ', ', array_fill( 0, 5000, '0px 1px 2px 0px' ) ), null ), '5,000 layers rejected' );
t_eq( '', sgs_shadow_layers( str_repeat( ',', 1000000 ), null ), '1 MB of commas rejected' );

// ── Security negative controls: nothing that can break out of a rule reaches the page ──
$hostile = array(
	'breakout'            => array( '0px 0px 0px red;}body{display:none}.x{y:z', null ),
	'comment opener'      => array( '0px 0px 0px 0px /* #000', null ),
	'comment closer'      => array( '0px 0px 0px 0px */ #000', null ),
	'unclosed paren'      => array( '0px 0px 0px 0px', 'var(--x #000' ),
	'filter smuggle'      => array( '0px 0px 0px 0px red) blur(9999px', null ),
	'important'           => array( '0px 0px 0px 0px red!important', null ),
	'exponent'            => array( '0px 0px 1e9999px 0px', null ),
	'comment in colour'   => array( '0px 0px 0px 0px', 'var(--a/*)' ),
	'url in colour'       => array( '0px 0px 0px 0px', 'url(http://x)' ),
	'brace in colour'     => array( '0px 0px 0px 0px', '#000}body{x:y' ),
	'at rule'             => array( '0px 0px 0px 0px @import', null ),
	'newline'             => array( "0px 0px 0px 0px\n;}", null ),
	'quote'               => array( '0px 0px 0px 0px "x"', null ),
);
foreach ( $hostile as $name => $pair ) {
	$out = sgs_shadow_layers( $pair[0], $pair[1] );
	t_eq( 0, preg_match( '/[;{}<>"\'`\\\\@!]|\/\*|\*\/|url\s*\(/i', $out ), "hostile input '{$name}' leaves no breakout characters" );
	$depth = 0;
	$ok    = true;
	foreach ( str_split( $out ) as $ch ) {
		if ( '(' === $ch ) {
			++$depth;
		} elseif ( ')' === $ch && --$depth < 0 ) {
			$ok = false;
		}
	}
	t_true( $ok && 0 === $depth, "hostile input '{$name}' leaves balanced parentheses" );
}
t_eq( '', sgs_shadow_layers( '0px 0px 0px 0px red) blur(9999px', null ), 'filter smuggle is dropped entirely' );
t_eq( '', sgs_shadow_layers( '0px 0px 1e9999px 0px', null ), 'exponent length is dropped entirely' );

// ── Forced-colours fallback ─────────────────────────────────────────────────────────
t_eq( array(), sgs_shadow_box_decls( null, null ), 'no shadow, no declarations' );
t_eq( array( 'box-shadow:none' ), sgs_shadow_box_decls( 'none', null ), 'none has no fallback' );
$decls = sgs_shadow_box_decls( '0px 4px 12px 0px', '#000000' );
t_eq( 2, count( $decls ), 'a shadow carries its fallback' );
t_eq( 'box-shadow:0px 4px 12px 0px #000000', $decls[0], 'the declaration is unchanged' );
t_eq( '@media (forced-colors:active){&:not(:focus-visible){outline:1px solid CanvasText;outline-offset:-1px}}', $decls[1], 'the fallback: outline in forced colours, not while focused' );
t_eq( 2, count( sgs_shadow_box_decls( 'raised', null ) ), 'a preset slug carries the fallback too' );

// ── sgs_shadow_decls(): the seven blocks that use it carry the fallback on the resting state ──
require_once dirname( __DIR__, 2 ) . '/includes/helpers-colour-variants.php';
$decl_map   = sgs_shadow_attr_map( 'boxShadow', true, true );
$decl_attrs = array(
	'boxShadow'       => '0px 4px 12px 0px',
	'boxShadowColour' => '#000000',
	'boxShadowHover'  => '0px 8px 24px 0px',
);
$decl_state = sgs_shadow_decls( $decl_attrs, $decl_map );
t_eq( 2, count( $decl_state['normal'] ), 'sgs_shadow_decls: resting state carries its fallback' );
t_eq( sgs_shadow_forced_colours_decl(), $decl_state['normal'][1], 'sgs_shadow_decls: the fallback is the shared one' );
t_eq( 1, count( $decl_state['hover'] ), 'sgs_shadow_decls: hover state does not repeat the fallback' );
t_eq( array(), sgs_shadow_decls( array(), $decl_map )['normal'], 'sgs_shadow_decls: no shadow, no declarations and no fallback' );

// ── Negative control: the harness must be able to fail ─────────────────────────────
$before = $GLOBALS['sgs_t_fail'];
t_eq( 'x', 'y', 'deliberate mismatch', true );
$caught = $GLOBALS['sgs_t_fail'] - $before;
$GLOBALS['sgs_t_fail'] -= $caught;
t_eq( 1, $caught, 'negative control: the harness reports a failure when values differ' );

// The breakout detector used above must itself detect a real breakout, or every
// "leaves no breakout characters" check would pass against anything.
t_eq( 1, preg_match( '/[;{}<>"\'`\\\\@!]|\/\*|\*\/|url\s*\(/i', '0px 0px 0px red;}body{display:none}' ), 'negative control: the detector sees a real breakout' );

echo "Shadow layers: {$GLOBALS['sgs_t_pass']} passed, {$GLOBALS['sgs_t_fail']} failed\n";
exit( $GLOBALS['sgs_t_fail'] > 0 ? 1 : 0 );
