<?php
/**
 * Server render for sgs/commerce-note (Spec 27, FR-30-22).
 *
 * A line of text with an optional link. WooCommerce's Cart and Checkout blocks
 * keep markup they have no component for, so this needs no script. Nothing is
 * printed while both the text and the link are empty.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner content (none).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$sgs_note_text  = isset( $attributes['text'] ) ? (string) $attributes['text'] : '';
$sgs_note_label = isset( $attributes['linkLabel'] ) ? (string) $attributes['linkLabel'] : '';
$sgs_note_url   = isset( $attributes['linkUrl'] ) ? (string) $attributes['linkUrl'] : '';
$sgs_note_link  = '' !== $sgs_note_label && ( '' !== $sgs_note_url || ! empty( $attributes['linkUrlSource'] ) );

if ( '' === $sgs_note_text && ! $sgs_note_link ) {
	return;
}

$sgs_note_html = '';
if ( '' !== $sgs_note_text ) {
	$sgs_note_html .= '<span class="sgs-commerce-note__text">' . sgs_rich_text_kses( $sgs_note_text, false ) . '</span>';
}
$sgs_note_link_attrs = $sgs_note_link ? sgs_link_attributes(
	array(
		'url'           => $sgs_note_url,
		'opensInNewTab' => isset( $attributes['linkTarget'] ) && '_blank' === $attributes['linkTarget'],
		'rel'           => $attributes['linkRel'] ?? '',
		'source'        => $attributes['linkUrlSource'] ?? '',
	)
) : '';
if ( '' !== $sgs_note_link_attrs ) {
	$sgs_note_html = trim(
		$sgs_note_html . ' ' . sprintf(
			'<a class="sgs-commerce-note__link"%1$s>%2$s</a>',
			$sgs_note_link_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_link_attributes() escapes href, target and rel.
			esc_html( $sgs_note_label )
		)
	);
}

if ( '' === $sgs_note_html ) {
	return;
}

// Look settings: one scoped <style> and a scope class, only while a setting is in use.
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$sgs_note_class = 'sgs-commerce-note';
$sgs_note_css   = '';
$sgs_note_uid   = 'sgs-commerce-note-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_note_sel   = '.' . $sgs_note_uid . '.wp-block-sgs-commerce-note';
$sgs_note_css  .= sgs_typography_css_rule( $attributes, 'commerceNote', $sgs_note_sel, '', false, false, sgs_object_attr_keys( $block ) );
$sgs_note_css  .= sgs_text_states_css(
	$sgs_note_sel . ' .sgs-commerce-note__link',
	$attributes,
	array(
		'base'  => 'commerceNoteLinkColour',
		'hover' => 'commerceNoteLinkColourHover',
	)
);
$sgs_note_css  .= sgs_link_weight_css( $attributes, 'commerceNoteLinkFontWeight', $sgs_note_sel );
if ( '' !== $sgs_note_css ) {
	$sgs_note_class .= ' ' . $sgs_note_uid;
	echo '<style>' . wp_strip_all_tags( $sgs_note_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value is pre-sanitised by the shared helpers.
}

printf(
	'<p %1$s>%2$s</p>',
	get_block_wrapper_attributes( array( 'class' => $sgs_note_class ) ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes each value.
	$sgs_note_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from sgs_rich_text_kses(), esc_url() and esc_html() above.
);
