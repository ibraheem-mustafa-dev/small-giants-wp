<?php
/**
 * The two button rules that read the same for every instance, printed once per page instead of once per button.
 *
 * A button used to print both under its own uid class (`.{uid}.sgs-button`): the pressed look (helpers-button-press.php)
 * and the reduced-motion reset. Neither names anything about the instance (the pressed look depends only on the
 * button's style and the site's tokens), so the root carries a marker class and the rule reads the marker. The rule
 * text is the same in every button's own `<style>` tag, and the collector
 * (`includes/class-sgs-css-registry.php::sgs_collect_css`) keeps one copy of identical text.
 *
 * Specificity is unchanged: the marker is doubled for the pressed look (0,4,0 with `:active`, as `.uid.uid.sgs-button`
 * was), and single for the reduced-motion reset (0,2,0, as `.uid.sgs-button` was).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-button-press.php';
require_once __DIR__ . '/helpers-shared-rules.php';

if ( ! function_exists( 'sgs_button_press_shared' ) ) {
	/**
	 * The pressed look for a button's style as a marker class and the rule that reads it.
	 *
	 * The class is minted by `sgs_shared_rules()` from the rule's declarations, so buttons with the same pressed look
	 * share one class and a changed token gives a new class, never a stale one. The rule comes back fenced for
	 * `sgs_style_tags()`.
	 *
	 * @param string $variant The button's style (`inheritStyle`).
	 * @return array{class:string,css:string} Both `''` when no preset sets a press role for the style.
	 */
	function sgs_button_press_shared( string $variant ): array {
		return sgs_shared_rules(
			'sgs-btn-press',
			static function ( string $class ) use ( $variant ): string {
				return sgs_button_press_rule_for( ".{$class}.{$class}.sgs-button", $variant );
			}
		);
	}
}

if ( ! function_exists( 'sgs_button_still_class' ) ) {
	/**
	 * The marker class of a button that holds still under reduced motion.
	 *
	 * @return string
	 */
	function sgs_button_still_class(): string {
		return 'sgs-button--still';
	}
}

if ( ! function_exists( 'sgs_button_still_rule' ) ) {
	/**
	 * Under `prefers-reduced-motion: reduce` a marked button takes no transition, transform or translate, whatever hover,
	 * press or motion rule would move it (`!important`, so it beats them at any order).
	 *
	 * @return string
	 */
	function sgs_button_still_rule(): string {
		return '@media(prefers-reduced-motion:reduce){.' . sgs_button_still_class() . '.sgs-button{transition:none !important;transform:none !important;translate:none !important;}}';
	}
}
