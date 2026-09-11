<?php
/**
 * FIXTURE — the fixed form of census4-dirty.php: the same hover rule, now
 * gated on an operator attribute. Structurally identical otherwise, so a
 * diff between the two fixtures isolates exactly the fix that closes the
 * defect: the `if`.
 */
$css  = '';
if ( '' !== $fx_item_bg_hover ) {
	$css .= sgs_hover_guarded_rule( $uid_sel . ' .fx-item:hover', 'background:color-mix(in srgb, currentColor 12%, transparent)' );
}
