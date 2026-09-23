<?php
/**
 * Standalone tests for the surface-tone resolver: sgs_surface_tone(),
 * sgs_surface_tone_class(), sgs_gradient_tone() and sgs_colour_resolve_hex_alpha()
 * in includes/helpers-surface-tone.php.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-surface-tone-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// A small palette + one preset gradient, as wp_get_global_settings() returns them (keyed by
// origin) — same shape run-shadow-dark-standalone.php and run-colour-dark-standalone.php stub.
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		if ( array( 'color', 'gradients' ) === $path ) {
			return array(
				'theme' => array(
					array(
						'slug'     => 'brand-fade',
						'gradient' => 'linear-gradient(90deg, #075E80 0%, #0F4C4C 100%)',
					),
				),
			);
		}
		return array(
			'theme' => array(
				array(
					'slug'  => 'primary',
					'color' => '#075E80',
				),
			),
		);
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-colour-wcag.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-surface-tone.php';

$fail  = 0;
$total = 0;
function t_eq( $expected, $actual, string $label ): void {
	global $fail, $total;
	++$total;
	if ( $expected !== $actual ) {
		++$fail;
		fwrite( STDERR, "FAIL {$label}\n  expected: " . json_encode( $expected ) . "\n  actual:   " . json_encode( $actual ) . "\n" );
	}
}

// ---------------------------------------------------------------------------
// Every P1 colour from the design note is dark; the light controls are light.
// ---------------------------------------------------------------------------
$p1_dark_colours = array( '#075E80', '#2d6e5e', '#256050', '#1A5F6B', '#0F4C4C' );
foreach ( $p1_dark_colours as $hex ) {
	t_eq(
		'dark',
		sgs_surface_tone(
			array(
				array(
					'colour'  => $hex,
					'opacity' => 1.0,
				),
			)
		),
		'P1 colour ' . $hex . ' is dark'
	);
}
foreach ( array( '#777777', '#FFFFFF', '#F3F0E8' ) as $hex ) {
	t_eq(
		'light',
		sgs_surface_tone(
			array(
				array(
					'colour'  => $hex,
					'opacity' => 1.0,
				),
			)
		),
		$hex . ' is light'
	);
}
t_eq(
	'dark',
	sgs_surface_tone(
		array(
			array(
				'colour'  => '#121212',
				'opacity' => 1.0,
			),
		)
	),
	'#121212 is dark'
);

// ---------------------------------------------------------------------------
// Accumulated opacity: rgba(0,0,0,.9) only decides once it reaches 0.5.
// ---------------------------------------------------------------------------
t_eq(
	'dark',
	sgs_surface_tone(
		array(
			array(
				'colour'  => 'rgba(0,0,0,.9)',
				'opacity' => 1.0,
			),
		)
	),
	'rgba(0,0,0,.9) at full layer opacity (effective 0.9) reaches 0.5: dark'
);
t_eq(
	'',
	sgs_surface_tone(
		array(
			array(
				'colour'  => 'rgba(0,0,0,.9)',
				'opacity' => 0.3,
			),
		)
	),
	'rgba(0,0,0,.9) at layer opacity 0.3 (effective 0.27) never reaches 0.5: unknown'
);

// ---------------------------------------------------------------------------
// Gradients.
// ---------------------------------------------------------------------------
t_eq(
	'light',
	sgs_surface_tone(
		array(
			array(
				'gradient' => 'linear-gradient(#000 10%, #fff 90%)',
				'opacity'  => 1.0,
			),
		)
	),
	'linear-gradient(#000 10%, #fff 90%) is light'
);
t_eq(
	'dark',
	sgs_surface_tone(
		array(
			array(
				'gradient' => 'linear-gradient(#075E80, #0F4C4C)',
				'opacity'  => 1.0,
			),
		)
	),
	'linear-gradient(#075E80, #0F4C4C) is dark'
);
t_eq(
	'',
	sgs_surface_tone(
		array(
			array(
				'gradient' => 'linear-gradient(#000, notacolour, #fff)',
				'opacity'  => 1.0,
			),
		)
	),
	'an unresolvable gradient stop gives \'\''
);
t_eq(
	'dark',
	sgs_surface_tone(
		array(
			array(
				'gradient' => 'var(--wp--preset--gradient--brand-fade)',
				'opacity'  => 1.0,
			),
		)
	),
	'a preset gradient var() resolves and judges dark'
);

// ---------------------------------------------------------------------------
// Images.
// ---------------------------------------------------------------------------
t_eq( '', sgs_surface_tone( array( array( 'image' => true ) ) ), 'image with no overlay gives \'\'' );
t_eq(
	'dark',
	sgs_surface_tone(
		array(
			array(
				'colour'  => '#000',
				'opacity' => 0.6,
			),
			array( 'image' => true ),
		)
	),
	'image with a #000 overlay at 0.6 gives dark'
);

// ---------------------------------------------------------------------------
// Walking past an indecisive overlay to the colour underneath.
// ---------------------------------------------------------------------------
t_eq(
	'dark',
	sgs_surface_tone(
		array(
			array(
				'colour'  => '#000',
				'opacity' => 0.3,
			),
			array(
				'colour'  => '#075E80',
				'opacity' => 1.0,
			),
		)
	),
	'overlay at 0.3 over a dark colour, no image: walks down to the colour (dark)'
);

// ---------------------------------------------------------------------------
// transparent / empty / nothing decides.
// ---------------------------------------------------------------------------
t_eq(
	'',
	sgs_surface_tone(
		array(
			array(
				'colour'  => 'transparent',
				'opacity' => 1.0,
			),
		)
	),
	'transparent gives \'\''
);
t_eq(
	'dark',
	sgs_surface_tone(
		array(
			array(
				'colour'  => 'transparent',
				'opacity' => 1.0,
			),
			array(
				'colour'  => '#075E80',
				'opacity' => 1.0,
			),
		)
	),
	'a transparent layer is skipped (contributes 0), the colour below still decides'
);
t_eq(
	'',
	sgs_surface_tone(
		array(
			array(
				'colour'  => '#000',
				'opacity' => 0.2,
			),
		)
	),
	'nothing reaches 0.5: \'\''
);
t_eq( '', sgs_surface_tone( array() ), 'empty layers: \'\'' );

// ---------------------------------------------------------------------------
// Hostile strings give '' without warnings (checked with set_error_handler so a
// stray notice/warning fails the run instead of being silently swallowed).
// ---------------------------------------------------------------------------
$warned = false;
set_error_handler(
	static function () use ( &$warned ) {
		$warned = true;
		return true;
	}
);
$hostile_colour   = sgs_surface_tone(
	array(
		array(
			'colour'  => 'red;}body{',
			'opacity' => 1.0,
		),
	)
);
$hostile_gradient = sgs_surface_tone(
	array(
		array(
			'gradient' => 'url(x)',
			'opacity'  => 1.0,
		),
	)
);
$hostile_long     = sgs_surface_tone(
	array(
		array(
			'colour'  => str_repeat( 'x', 20000 ),
			'opacity' => 1.0,
		),
	)
);
restore_error_handler();
t_eq( '', $hostile_colour, "hostile string 'red;}body{' gives ''" );
t_eq( '', $hostile_gradient, "hostile string 'url(x)' gives ''" );
t_eq( '', $hostile_long, 'a very long hostile input gives \'\'' );
t_eq( false, $warned, 'hostile input triggers no PHP warning/notice' );

// ---------------------------------------------------------------------------
// sgs_surface_tone_class().
// ---------------------------------------------------------------------------
t_eq(
	'sgs-on-dark',
	sgs_surface_tone_class(
		array(
			array(
				'colour'  => '#075E80',
				'opacity' => 1.0,
			),
		)
	),
	'dark surface gets sgs-on-dark'
);
t_eq(
	'sgs-on-light',
	sgs_surface_tone_class(
		array(
			array(
				'colour'  => '#FFFFFF',
				'opacity' => 1.0,
			),
		)
	),
	'light surface gets sgs-on-light'
);
t_eq( '', sgs_surface_tone_class( array() ), 'no layers gets no class' );

// ---------------------------------------------------------------------------
// sgs_surface_tone_class() enqueues the dark stylesheet when (and only when) dark.
// ---------------------------------------------------------------------------
$sgs_test_dark_enqueue_calls = 0;
function sgs_shadow_dark_enqueue(): void {
	global $sgs_test_dark_enqueue_calls;
	++$sgs_test_dark_enqueue_calls;
}
sgs_surface_tone_class(
	array(
		array(
			'colour'  => '#FFFFFF',
			'opacity' => 1.0,
		),
	)
); // light: no enqueue.
t_eq( 0, $sgs_test_dark_enqueue_calls, 'a light surface does not enqueue the dark stylesheet' );
sgs_surface_tone_class(
	array(
		array(
			'colour'  => '#075E80',
			'opacity' => 1.0,
		),
	)
); // dark: enqueues.
t_eq( 1, $sgs_test_dark_enqueue_calls, 'a dark surface enqueues the dark stylesheet exactly once' );

// ---------------------------------------------------------------------------
// Negative control 1: the gradient weighting matters — a plain unweighted mean
// of the same stops misjudges a gradient where a tiny white sliver sits beside
// a mostly-black line. linear-gradient(#fff 0%, #000 3%, #000 100%): the white
// stop covers only the first ~1.5% of the line (its right boundary is the
// midpoint 0%-3%), so the position-weighted mean luminance is close to 0 (dark)
// even though the plain arithmetic mean of the three stops' luminances (white,
// black, black => (1+0+0)/3 = 0.333) reads as a LIGHT background.
// ---------------------------------------------------------------------------
$weighting_gradient = 'linear-gradient(#fff 0%, #000 3%, #000 100%)';
t_eq( 'dark', sgs_gradient_tone( $weighting_gradient ), 'a tiny white sliver on a mostly-black line is dark (weighted)' );

$plain_mean      = ( 1.0 + 0.0 + 0.0 ) / 3; // white, black, black — unweighted.
$plain_mean_tone = sgs_wcag_white_wins_for_luminance( $plain_mean ) ? 'dark' : 'light';
t_eq( 'light', $plain_mean_tone, 'negative control: a plain unweighted mean of the same 3 stops misjudges this gradient as light' );

// ---------------------------------------------------------------------------
// Negative control 2: the white-wins rule is live, not a stand-in for the old
// fixed luminance cut. A copy using `$l < 0.05` instead of
// sgs_wcag_white_wins_for_luminance() misjudges #075E80 (L 0.0961) as light.
// ---------------------------------------------------------------------------
$l_075e80          = sgs_wcag_relative_luminance( '#075E80' );
$naive_cutoff_tone = $l_075e80 < 0.05 ? 'dark' : 'light';
t_eq( 'light', $naive_cutoff_tone, 'negative control: a copy using $l < 0.05 misjudges #075E80 as light' );
t_eq(
	'dark',
	sgs_surface_tone(
		array(
			array(
				'colour'  => '#075E80',
				'opacity' => 1.0,
			),
		)
	),
	'the live white-wins rule correctly judges #075E80 dark'
);

echo ( $fail > 0 ? "FAILED: {$fail} of {$total}" : "OK: {$total} assertions passed" ) . '
';
exit( $fail > 0 ? 1 : 0 );
