<?php
/**
 * Render helper for sgs/notice-message.
 *
 * Kept out of render.php per the no-top-level-function-in-render.php rule
 * (a top-level function declaration fatals the page on the block's second
 * instance in one request — a rotating banner ships several).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_notice_message_bar_css' ) ) {
	/**
	 * Build the message's scoped colour CSS (U-15 design §3.1).
	 *
	 * Two rules, ONE `:has()` level:
	 *  - `.wp-block-sgs-notice-banner:has(.{uid}.is-active){background:…;color:…}`
	 *    paints the WHOLE bar while this message is the active/rotating one.
	 *  - `.{uid}{color:…}` keeps a stacked no-JS message's own text colour
	 *    (every message shows, stacked, when Interactivity never hydrates —
	 *    "degrade to more content, never less").
	 *
	 * A message with no colours set inherits the banner's own paint, so both
	 * rules are omitted entirely.
	 *
	 * @param string $uid              The message's own scoped uid class.
	 * @param string $bg_colour        Flat background colour (raw attribute value).
	 * @param string $bg_gradient      CSS gradient string for the background.
	 * @param string $text_colour      Flat text colour (raw attribute value).
	 * @param string $text_gradient    CSS gradient string for the text.
	 * @return string CSS to append to the message's own $scoped_css array.
	 */
	function sgs_notice_message_bar_css(
		string $uid,
		string $bg_colour,
		string $bg_gradient,
		string $text_colour,
		string $text_gradient
	): string {
		$css = '';

		$bg_decl = sgs_background_paint_decl( $bg_colour ?: null, $bg_gradient ?: null );

		$text_resolved = sgs_resolve_text_colour_or_gradient( $text_colour, $text_gradient );
		$text_decl     = sgs_text_colour_decl( $text_resolved );

		if ( '' !== $bg_decl || '' !== $text_decl ) {
			$decls = array_filter( array( $bg_decl, $text_decl ) );
			$css  .= '.wp-block-sgs-notice-banner:has(.' . $uid . '.is-active){' . implode( ';', $decls ) . ';}';
			// A gradient text value needs its @supports fallback companion —
			// scoped to the SAME :has() selector so the fallback only ever
			// applies while this message is the active one.
			$css .= sgs_text_colour_gradient_fallback_rule(
				'.wp-block-sgs-notice-banner:has(.' . $uid . '.is-active)',
				$text_resolved
			);
		}

		if ( '' !== $text_decl ) {
			$css .= '.' . $uid . '{' . $text_decl . ';}';
			$css .= sgs_text_colour_gradient_fallback_rule( '.' . $uid, $text_resolved );
		}

		return $css;
	}
}
