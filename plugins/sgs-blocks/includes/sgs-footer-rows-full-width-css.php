<?php
/**
 * N46: footer rows full width — scoped CSS emission for sgs/site-footer.
 *
 * The footer shell is always a vertical flex stack of its rows: block.json fixes
 * `layout` to 'flex', which SGS_Container_Wrapper renders through its
 * `elseif ( 'flex' === $layout )` branch. Its rows (sgs/site-footer-row
 * children) are therefore flex items, not block boxes.
 *
 * A row given a width cap carries centring auto margins —
 * class-sgs-container-wrapper.php emits `max-width:<v>;margin-inline:auto` on
 * the row's own uid — and in a flex column auto margins cancel the stretch, so
 * the row shrinks to its content. `container-type: inline-size`, which
 * site-footer-row/style.css sets on `.sgs-site-footer-row`, then makes that
 * content width zero and every column in the row squeezes.
 *
 * Giving each row an explicit full width restores the stretch. The header rows
 * had the identical fault and the identical fix; see
 * sgs-header-rows-align-css.php, whose closing rule this mirrors. The footer
 * needs only that one rule, not the header's rowsAlign tier machinery: the
 * footer has no rowsAlign setting.
 *
 * TWO SHAPES, because the rows are not always direct children. The shared
 * wrapper renders a `.sgs-container__inner` content band only when
 * $has_band_props holds (a content width, band padding/margin or band
 * background), and when it does the band is the flex column and the rows are
 * ITS children — the footer's own outer element then computes `display:block`.
 * Measured live on the canary: `FOOTER.sgs-site-footer > DIV.sgs-container__inner
 * > DIV.sgs-site-footer-row`, where a `> *` rule on the root reaches the band
 * and never the rows. Both levels are therefore covered.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_footer_rows_full_width_css' ) ) {
	/**
	 * Emit the full-width rows rule for one footer instance.
	 *
	 * Zero specificity (`:where()`), so a row's own width setting still wins and
	 * its own max-width still caps it — this only stops the cap collapsing the
	 * row to nothing.
	 *
	 * @param string $root_sel The footer's uid-scoped selector.
	 * @return string CSS text, no <style> wrapper.
	 */
	function sgs_footer_rows_full_width_css( string $root_sel ): string {
		return ':where(' . $root_sel . ' > *,'
			. $root_sel . ' > .sgs-container__inner > *){width:100%;}';
	}
}
