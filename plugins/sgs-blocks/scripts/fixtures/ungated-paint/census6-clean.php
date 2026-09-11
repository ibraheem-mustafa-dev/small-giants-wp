<?php
/**
 * FIXTURE — the fixed form of census6-dirty.php: same rule, gated.
 */
$css  = '';
if ( '' !== $fx_submenu_link_bg_hover ) {
	$css .= sgs_hover_guarded_rule( $uid_sel . ' .fx-sublink:hover', 'background:var(--wp--preset--color--surface, rgba(0,0,0,.04))' );
}
