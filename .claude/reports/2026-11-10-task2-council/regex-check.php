<?php
// Baseline for the type-scale range test in theme/sgs-theme/inc/type-scale-ranges.php::type_scale_ranges_css.
$re = '/^clamp\([0-9a-z.,+\-*\/%() ]+\)$/i';
foreach ( array( 'clamp(1px,/*,2px)', 'clamp(2rem, 4vw, 3rem)', '5vw', 'min(5vw, 3rem)', 'calc(1rem + 2vw)' ) as $s ) {
	echo str_pad( $s, 24 ), ' => ', preg_match( $re, $s ) ? 'exempt' : 'stepped down', "\n";
}
