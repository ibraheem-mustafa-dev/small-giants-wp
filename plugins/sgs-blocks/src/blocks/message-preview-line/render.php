<?php
/**
 * Server render for sgs/message-preview-line.
 *
 * One line of text that a sgs/message-preview fields block of the same group fills as the visitor types.
 * It prints its starting text, so the page reads the same without script; the prefix, suffix and fallback ride
 * along as data attributes for view.js (message-preview/mirror.js). The settings print as one scoped <style>
 * rule, never inline.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner content (none).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$sgs_mpl_group = sanitize_key( (string) ( $attributes['group'] ?? '' ) );
if ( '' === $sgs_mpl_group ) {
	$sgs_mpl_group = 'note';
}
$sgs_mpl_field = sanitize_key( (string) ( $attributes['field'] ?? '' ) );

$sgs_mpl_uid   = 'sgs-message-preview-line-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_mpl_scope = '.sgs-message-preview-line.' . $sgs_mpl_uid;
$sgs_mpl_css   = sgs_typography_css_rule( $attributes, '', $sgs_mpl_scope, '', false, false, sgs_object_attr_keys( $block ) );
$sgs_mpl_css .= sgs_text_states_css( $sgs_mpl_scope, $attributes, array( 'base' => 'textColour' ) );
$sgs_mpl_padding = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_mpl_tiers   = array();
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sgs_mpl_tier ) {
	$sgs_mpl_box = is_array( $sgs_mpl_padding[ $sgs_mpl_tier ] ?? null ) ? sgs_box_object_longhands( $sgs_mpl_padding[ $sgs_mpl_tier ], 'padding' ) : null;
	if ( null !== $sgs_mpl_box ) {
		$sgs_mpl_tiers[ $sgs_mpl_tier ] = array( $sgs_mpl_box );
	}
}
$sgs_mpl_css .= sgs_emit_tier_decls( $sgs_mpl_scope, $sgs_mpl_tiers );

$sgs_mpl_wrapper = array( 'class' => 'sgs-message-preview-line ' . $sgs_mpl_uid );
if ( ! empty( $attributes['anchor'] ) ) {
	$sgs_mpl_wrapper['id'] = (string) $attributes['anchor'];
}

if ( '' !== $sgs_mpl_css ) {
	echo '<style>' . wp_strip_all_tags( $sgs_mpl_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value is pre-sanitised by the shared helpers.
}

printf(
	'<p %1$s data-sgs-mp-line data-group="%2$s" data-field="%3$s" data-prefix="%4$s" data-suffix="%5$s" data-fallback="%6$s">%7$s</p>',
	get_block_wrapper_attributes( $sgs_mpl_wrapper ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes each value.
	esc_attr( $sgs_mpl_group ),
	esc_attr( $sgs_mpl_field ),
	esc_attr( (string) ( $attributes['prefix'] ?? '' ) ),
	esc_attr( (string) ( $attributes['suffix'] ?? '' ) ),
	esc_attr( (string) ( $attributes['fallback'] ?? '' ) ),
	esc_html( (string) ( $attributes['startingText'] ?? '' ) )
);
