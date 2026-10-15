<?php
/**
 * Token-list matching for the `data-sgs-fx` attribute.
 *
 * `data-sgs-fx` is a whitespace-separated token list: one element carrying several effect layers writes
 * `data-sgs-fx="particles grid-dots"` (Spec 38A FR-38A-23). Every reader therefore tests for a TOKEN, never
 * for the whole attribute value. The CSS and JS equivalent is the `~=` attribute selector. Presence-only
 * checks (`null !== get_attribute( 'data-sgs-fx' )`) stay as they are.
 *
 * `migrate-fx-list-match.py --check` fails the build when an exact-match reader of `data-sgs-fx` reappears.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

if ( ! \function_exists( __NAMESPACE__ . '\sgs_fx_has_effect' ) ) {
	/**
	 * Whether a `data-sgs-fx` attribute value lists the effect.
	 *
	 * Null-safe: `WP_HTML_Tag_Processor::get_attribute()` returns null (absent) or true (valueless), and
	 * neither lists an effect.
	 *
	 * @param mixed  $value  The attribute value as read.
	 * @param string $effect Effect name, for example `particles`.
	 * @return bool
	 */
	function sgs_fx_has_effect( $value, string $effect ): bool {
		if ( ! \is_string( $value ) || '' === $effect ) {
			return false;
		}
		$tokens = \preg_split( '/\s+/', \trim( $value ), -1, PREG_SPLIT_NO_EMPTY );
		return \is_array( $tokens ) && \in_array( $effect, $tokens, true );
	}
}

if ( ! \function_exists( __NAMESPACE__ . '\sgs_fx_markup_has_effect' ) ) {
	/**
	 * Whether any element in rendered markup lists the effect in its `data-sgs-fx` attribute.
	 *
	 * The cheap pre-filter the `render_block` fx filters run before building a tag processor.
	 *
	 * @param string $html   Rendered block HTML.
	 * @param string $effect Effect name, for example `particles`.
	 * @return bool
	 */
	function sgs_fx_markup_has_effect( string $html, string $effect ): bool {
		if ( false === \strpos( $html, 'data-sgs-fx=' ) ) {
			return false;
		}
		if ( ! \preg_match_all( '/(?<![\w-])data-sgs-fx="([^"]*)"/', $html, $matches ) ) {
			return false;
		}
		foreach ( $matches[1] as $value ) {
			if ( sgs_fx_has_effect( $value, $effect ) ) {
				return true;
			}
		}
		return false;
	}
}
