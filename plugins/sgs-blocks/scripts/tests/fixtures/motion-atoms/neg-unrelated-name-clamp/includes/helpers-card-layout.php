<?php
/**
 * Planted: an unrelated function name that sanitises an sgsMotion path.
 */
function sgs_card_prepare_layout( array $attributes ): int {
	return absint( $attributes['sgsMotion']['elements']['root']['hover']['state']['values']['duration'] );
}
