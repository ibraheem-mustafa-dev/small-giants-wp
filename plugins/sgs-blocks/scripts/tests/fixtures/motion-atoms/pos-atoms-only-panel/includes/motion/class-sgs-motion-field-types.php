<?php
/**
 * The field-type helper: the one place that sanitises an sgsMotion value.
 */
class Sgs_Motion_Field_Types {
	public static function duration( array $attributes ): int {
		return max( 0, min( 5000, absint( $attributes['sgsMotion']['duration'] ) ) );
	}
}
