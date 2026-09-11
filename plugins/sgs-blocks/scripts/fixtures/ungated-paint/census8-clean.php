<?php
/**
 * FIXTURE — the fixed form of census8-dirty.php: `--fx-featured-bg-hover`
 * now has a REAL, empty-guarded writer, so the read is genuinely
 * attribute-driven and the exemption legitimately applies.
 */
$fx_featured_bg_hover_value = '' !== $fx_featured_bg_hover ? sgs_colour_value( $fx_featured_bg_hover ) : '';
if ( '' !== $fx_featured_bg_hover_value ) {
	$css .= '--fx-featured-bg-hover:' . $fx_featured_bg_hover_value . ';';
}
$css .= sgs_hover_guarded_rule( $uid_sel . ' .fx-featured:hover', 'background:var(--fx-featured-bg-hover, var(--wp--preset--color--primary-dark, transparent))' );
