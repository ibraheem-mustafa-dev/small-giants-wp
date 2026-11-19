<?php
/**
 * The container's shrink-to-fit backstop (Spec 35): a grid, flex or stack container's direct items may shrink below
 * their content's intrinsic size, so a long word or a wide image cannot push the track wider than the viewport.
 *
 * Every instance used to print `:where(.{uid}>.sgs-container__inner>*){min-width:0;min-height:0}` under its own uid class:
 * the same declarations once per container (87 times on one page). The reset is the same for every instance, so the
 * root now carries a marker class and the one rule that reads it is the same text in every instance's `<style>`; the
 * collector (`includes/class-sgs-css-registry.php::sgs_collect_css`) keeps one copy of identical text.
 *
 * - `sgs-container--fit-band`: the items sit in the content band (`.sgs-container__inner`), the old `.{uid}>.sgs-container__inner>*`.
 * - `sgs-container--fit`: the items are the root's own children, the old `.{uid}>*`.
 *
 * `:where()` keeps the rule at zero specificity, exactly as before: it only replaces the user-agent `auto`, so any
 * `min-width` or `min-height` a child sets (a nested container's min height, a button's floor, a theme rule) wins.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_container_fit_class' ) ) {
	/**
	 * The marker class for a container whose items may shrink.
	 *
	 * @param bool $on_band True when the grid or flex row is the content band, false when it is the root.
	 * @return string
	 */
	function sgs_container_fit_class( bool $on_band ): string {
		return $on_band ? 'sgs-container--fit-band' : 'sgs-container--fit';
	}
}

if ( ! function_exists( 'sgs_container_fit_rule' ) ) {
	/**
	 * The one rule every marked container shares (the same text for every instance, so the collector prints it once).
	 *
	 * @return string
	 */
	function sgs_container_fit_rule(): string {
		return ':where(.sgs-container--fit>*,.sgs-container--fit-band>.sgs-container__inner>*){min-width:0;min-height:0}';
	}
}
