<?php
/**
 * SGS WhatsApp CTA — "card" + "floating" variant render helpers.
 *
 * Extracted out of render.php (already over the 300-line PHP budget — see
 * that file's own note) so this task's new variant logic doesn't grow it
 * further. Required via require_once from render.php, so — unlike render.php
 * itself, which WordPress `include`s fresh per block instance — declaring
 * top-level functions here is safe (mirrors includes/render-helpers.php).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Scoped CSS for the card variant: title/sub-line colour + typography, and
 * the border-colour override (the CSS default border in style.css applies
 * when this attribute is unset).
 *
 * @param array  $attributes Block attributes.
 * @param string $uid        Content-addressed scope id.
 * @param string $root_sel   The block's own scoped root selector.
 * @return string[] Non-empty CSS fragments to append to the block's scoped <style>.
 */
function sgs_whatsapp_cta_card_css( array $attributes, string $uid, string $root_sel ): array {
	$css = array(
		sgs_text_states_css(
			'.' . $uid . ' .sgs-whatsapp-cta__card-title',
			$attributes,
			array( 'base' => 'cardTitleColour' )
		),
		sgs_text_states_css(
			'.' . $uid . ' .sgs-whatsapp-cta__card-subline',
			$attributes,
			array( 'base' => 'cardSublineColour' )
		),
		sgs_typography_css_rule( $attributes, 'cardTitle', '.' . $uid . ' .sgs-whatsapp-cta__card-title' ),
		sgs_typography_css_rule( $attributes, 'cardSubline', '.' . $uid . ' .sgs-whatsapp-cta__card-subline' ),
	);

	$border_colour = sgs_colour_value( $attributes['cardBorderColour'] ?? '' );
	if ( '' !== $border_colour ) {
		$css[] = "{$root_sel}{border-color:{$border_colour};}";
	}

	// Border width — box object, base only (Spec 35 §14, no per-device width).
	// The CSS default (1px, style.css) applies when unset.
	$border_width_box = is_array( $attributes['cardBorderWidth'] ?? null ) ? $attributes['cardBorderWidth'] : array();
	$border_width_val = sgs_box_object_shorthand( $border_width_box );
	if ( null !== $border_width_val ) {
		$css[] = "{$root_sel}{border-width:{$border_width_val};}";
	}

	// Border style — allow-listed against the block.json enum; a free-text
	// value never reaches CSS unfiltered (S5).
	$border_style_raw = sanitize_key( (string) ( $attributes['cardBorderStyle'] ?? '' ) );
	if ( in_array( $border_style_raw, array( 'solid', 'dashed', 'dotted' ), true ) ) {
		$css[] = "{$root_sel}{border-style:{$border_style_raw};}";
	}

	return array_filter(
		$css,
		static function ( $rule ) {
			return '' !== $rule;
		}
	);
}

/**
 * Card variant markup — icon badge + editable title/sub-line, rendered
 * INSIDE the block root (contract §B3: the <a> IS the root, no wrapper div).
 * Title/subline are RichText content, sanitised with wp_kses_post() (the
 * established convention for stored RichText — see e.g.
 * blocks/collapsible-text/render.php).
 *
 * @param array  $attributes   Block attributes.
 * @param string $whatsapp_svg Pre-built icon SVG markup (hardcoded constant, no user input).
 * @return string Markup.
 */
function sgs_whatsapp_cta_card_markup( array $attributes, string $whatsapp_svg ): string {
	$title   = $attributes['cardTitle'] ?? '';
	$subline = $attributes['cardSubline'] ?? '';

	$out  = '<span class="sgs-whatsapp-cta__icon-badge">' . $whatsapp_svg . '</span>';
	$out .= '<span class="sgs-whatsapp-cta__card-text">';
	if ( $title ) {
		$out .= '<span class="sgs-whatsapp-cta__card-title">' . wp_kses_post( $title ) . '</span>';
	}
	if ( $subline ) {
		$out .= '<span class="sgs-whatsapp-cta__card-subline">' . wp_kses_post( $subline ) . '</span>';
	}
	$out .= '</span>';

	return $out;
}

/**
 * Floating variant's "hide label below" scoped @media rule — collapses the
 * visible-label pill back to an icon-only circle below the given viewport
 * width. Emitted only when a visible label exists AND a threshold > 0 is
 * set (0 = never hide — the default, matching the block's off-by-default
 * contract: an existing floating button with no label renders unchanged).
 *
 * @param string $root_sel          The block's own scoped root selector.
 * @param int    $hide_below        Viewport width in px; 0 = never.
 * @param bool   $has_visible_label Whether this instance has a visible floating label.
 * @return string CSS, or '' when nothing to emit.
 */
function sgs_whatsapp_cta_floating_hide_label_css( string $root_sel, int $hide_below, bool $has_visible_label ): string {
	if ( $hide_below <= 0 || ! $has_visible_label ) {
		return '';
	}

	return '@media(max-width:' . $hide_below . 'px){'
		. "{$root_sel} .sgs-whatsapp-cta__label--floating{display:none}"
		. "{$root_sel}.sgs-whatsapp-cta--floating.sgs-whatsapp-cta__btn{width:56px;height:56px;border-radius:50%;padding:0;justify-content:center}"
		. '}';
}
