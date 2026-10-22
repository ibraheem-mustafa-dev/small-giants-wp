<?php
/**
 * Server-side render for Form Review block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$heading            = $attributes['heading'] ?? __( 'Review your information', 'sgs-blocks' );
$intro              = trim( (string) ( $attributes['intro'] ?? __( 'Please check your details below before submitting.', 'sgs-blocks' ) ) );
$edit_label         = trim( (string) ( $attributes['editLabel'] ?? '' ) );
$edit_label         = '' !== $edit_label ? $edit_label : __( 'Edit', 'sgs-blocks' );
$show_edit          = ! isset( $attributes['showEditLinks'] ) || false !== $attributes['showEditLinks'];

// The cards are built client-side inside this block, so their look is painted by one scoped <style> under a
// content-hash class on the block root. An unset attribute prints nothing and the stylesheet default stands.
$sgs_fr_uid   = 'sgs-fr-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_fr_scope = '.' . $sgs_fr_uid;
$sgs_fr_css   = '';

$sgs_fr_card_sel   = $sgs_fr_scope . ' .sgs-form-review__card';
$sgs_fr_card_decls = array();
$sgs_fr_bg         = sgs_colour_value( (string) ( $attributes['cardBackgroundColour'] ?? '' ) );
if ( '' !== $sgs_fr_bg ) {
	$sgs_fr_card_decls[] = 'background-color:' . $sgs_fr_bg;
}
$sgs_fr_padding = sgs_css_length_value( $attributes['cardPadding'] ?? '' );
if ( '' !== $sgs_fr_padding ) {
	$sgs_fr_card_decls[] = 'padding:' . $sgs_fr_padding;
}
$sgs_fr_border     = sgs_border_element_decls(
	$attributes,
	'card',
	$sgs_fr_card_sel,
	array( 'colour' => array( 'base' => 'cardBorderColour' ) )
);
$sgs_fr_card_decls = array_merge( $sgs_fr_card_decls, $sgs_fr_border['base'] );
if ( $sgs_fr_card_decls ) {
	$sgs_fr_css .= $sgs_fr_card_sel . '{' . implode( ';', $sgs_fr_card_decls ) . ';}';
}
$sgs_fr_css .= implode( '', $sgs_fr_border['rules'] );
if ( $sgs_fr_border['tablet'] ) {
	$sgs_fr_css .= '@media(max-width:1023px){' . $sgs_fr_card_sel . '{' . implode( ';', $sgs_fr_border['tablet'] ) . ';}}';
}
if ( $sgs_fr_border['mobile'] ) {
	$sgs_fr_css .= '@media(max-width:767px){' . $sgs_fr_card_sel . '{' . implode( ';', $sgs_fr_border['mobile'] ) . ';}}';
}

$sgs_fr_css .= sgs_typography_css_rule( $attributes, 'cardTitle', $sgs_fr_scope . ' .sgs-form-review__card-title' );
foreach ( array(
	'termColour'  => '.sgs-form-review__term',
	'valueColour' => '.sgs-form-review__detail',
) as $sgs_fr_attr => $sgs_fr_target ) {
	$sgs_fr_colour = sgs_colour_value( (string) ( $attributes[ $sgs_fr_attr ] ?? '' ) );
	if ( '' !== $sgs_fr_colour ) {
		$sgs_fr_css .= $sgs_fr_scope . ' ' . $sgs_fr_target . '{color:' . $sgs_fr_colour . ';}';
	}
}

// view.js reads these to build one card per section: whether each card has an Edit button, and its wording.
$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'           => 'sgs-form-review ' . $sgs_fr_uid,
		'data-show-edit'  => $show_edit ? 'true' : 'false',
		'data-edit-label' => $edit_label,
	)
);

// Heading level — an out-of-enum stored value is otherwise silently coerced
// to the block.json default (blockjson-enum-coerces-invalid-to-default), so
// it is validated here too (mirrors sgs/icon-list).
$allowed_heading_levels = array( 'h2', 'h3', 'h4', 'h5', 'h6', 'p' );
$heading_level          = in_array( $attributes['headingLevel'] ?? '', $allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h3';

if ( '' !== $sgs_fr_css ) {
	echo '<style>' . wp_strip_all_tags( $sgs_fr_css ) . '</style>';
}
echo '<div ' . $wrapper_attributes . '>';
echo '<' . esc_attr( $heading_level ) . ' class="sgs-form-review__heading">' . esc_html( $heading ) . '</' . esc_attr( $heading_level ) . '>';
if ( '' !== $intro ) {
	echo '<p class="sgs-form-review__intro">' . esc_html( $intro ) . '</p>';
}
echo '<div class="sgs-form-review__cards"></div>';
echo '<noscript><p class="sgs-form-review__noscript">' . esc_html__( 'JavaScript is required to preview your form responses.', 'sgs-blocks' ) . '</p></noscript>';
echo '</div>';
