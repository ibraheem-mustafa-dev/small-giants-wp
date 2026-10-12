<?php
/**
 * Planted: a bespoke duration sanitiser on an sgsMotion value.
 */
function sgs_fx_sanitise_duration( array $attributes ): int {
	return max( 0, min( 5000, (int) $attributes['sgsMotion']['duration'] ) );
}
