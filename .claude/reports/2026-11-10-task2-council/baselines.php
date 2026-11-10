<?php
// Task 2 council baselines, run inside local-sandybrown's WordPress with `wp eval-file`. Read-only.
$out = array();
$out['resolved_unterminated_quote'] = sgs_resolved_css_value( "var(--a, ')" );
$out['font_size_unterminated_quote'] = function_exists( 'sgs_font_size_value' ) ? sgs_font_size_value( "var(--a, ')" ) : 'n/a';
$out['colour_upper_VAR'] = function_exists( 'sgs_colour_value' ) ? sgs_colour_value( 'VAR(--x)' ) : 'n/a';
$out['colour_lower_var'] = function_exists( 'sgs_colour_value' ) ? sgs_colour_value( 'var(--x)' ) : 'n/a';
$fn = function_exists( 'SGS\\Theme\\type_scale_ranges_css' ) ? 'SGS\\Theme\\type_scale_ranges_css' : ( function_exists( 'type_scale_ranges_css' ) ? 'type_scale_ranges_css' : '' );
$out['type_scale_fn'] = $fn ?: 'not found';
echo wp_json_encode( $out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ), "\n";
