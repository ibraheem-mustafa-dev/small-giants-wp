<?php
/**
 * Reads an sgsMotion value, hands it to the field-type helper and does arithmetic on the result.
 */
function sgs_fx_render_delay( array $attributes ): int {
	$m      = $attributes['sgsMotion']['elements'][0];
	$clean  = Sgs_Motion_Field_Types::duration( $m );
	$other  = absint( $attributes['columns'] );
	// absint( $attributes['sgsMotion'] ) is only a comment here.
	return $clean * 2 + $other;
}
