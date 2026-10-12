<?php
/**
 * Planted: the value is first assigned to a variable, then sanitised.
 */
function sgs_fx_first_element_duration( array $attributes ): int {
	$m = $attributes['sgsMotion']['elements'][0];
	return absint( $m['duration'] );
}
