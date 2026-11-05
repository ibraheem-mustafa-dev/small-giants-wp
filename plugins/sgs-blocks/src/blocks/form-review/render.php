<?php
/**
 * Server-side render for Form Review block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$heading           = $attributes['heading'] ?? __( 'Review your information', 'sgs-blocks' );
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
$sgs_fr_fill       = sgs_fill_decls(
	$attributes,
	array(
		'base'     => 'cardBackgroundColour',
		'gradient' => 'cardBackgroundColourGradient',
	)
);
$sgs_fr_card_decls = array_merge( $sgs_fr_card_decls, $sgs_fr_fill['normal'] );
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
	$sgs_fr_css .= sgs_emit_tier_decls( $sgs_fr_card_sel, array( 'tablet' => $sgs_fr_border['tablet'] ) );
}
if ( $sgs_fr_border['mobile'] ) {
	$sgs_fr_css .= sgs_emit_tier_decls( $sgs_fr_card_sel, array( 'mobile' => $sgs_fr_border['mobile'] ) );
}

$sgs_fr_css .= sgs_typography_css_rule( $attributes, 'cardTitle', $sgs_fr_scope . ' .sgs-form-review__card-title' );

// The cards mount, the list inside each card and each row: how many rows sit side by side, the gaps between
// them, and whether an answer sits beside or under its label. An unset attribute prints nothing.
$sgs_fr_columns = static function ( $count ): string {
	$count = (int) $count;
	return $count > 0 ? 'repeat(' . min( $count, 6 ) . ',minmax(0,1fr))' : '';
};
$sgs_fr_css .= sgs_emit_responsive_css(
	$sgs_fr_scope . ' .sgs-form-review__cards',
	array(
		array(
			'value'        => sgs_responsive_normalise_object( $attributes['cardsGap'] ?? null ),
			'css'          => 'gap',
			'unit_default' => 'px',
		),
		array(
			'value'        => sgs_responsive_normalise_object( $attributes['cardsMarginTop'] ?? null ),
			'css'          => 'margin-top',
			'unit_default' => 'px',
		),
	)
);
$sgs_fr_css .= sgs_emit_responsive_css(
	$sgs_fr_scope . ' .sgs-form-review__list',
	array(
		array(
			'value'     => sgs_responsive_normalise_object( $attributes['listColumns'] ?? null ),
			'css'       => 'grid-template-columns',
			'cast'      => 'int',
			'transform' => $sgs_fr_columns,
		),
		array(
			'value'        => sgs_responsive_normalise_object( $attributes['listRowGap'] ?? null ),
			'css'          => 'row-gap',
			'unit_default' => 'px',
		),
		array(
			'value'        => sgs_responsive_normalise_object( $attributes['listColumnGap'] ?? null ),
			'css'          => 'column-gap',
			'unit_default' => 'px',
		),
	)
);
if ( 'stacked' === ( $attributes['rowLayout'] ?? 'side' ) ) {
	$sgs_fr_css .= $sgs_fr_scope . ' .sgs-form-review__row{grid-template-columns:minmax(0,1fr);}';
}

// The Edit button: colours, border, radius, padding and typography, each with its own control.
$sgs_fr_edit_sel   = $sgs_fr_scope . ' .sgs-form-review__edit';
$sgs_fr_edit_decls = array();
$sgs_fr_edit_text  = sgs_colour_value( (string) ( $attributes['editButtonColour'] ?? '' ) );
if ( '' !== $sgs_fr_edit_text ) {
	$sgs_fr_edit_decls[] = 'color:' . $sgs_fr_edit_text;
}
$sgs_fr_edit_bg = sgs_colour_value( (string) ( $attributes['editButtonBackgroundColour'] ?? '' ) );
if ( '' !== $sgs_fr_edit_bg ) {
	$sgs_fr_edit_decls[] = 'background-color:' . $sgs_fr_edit_bg;
}
$sgs_fr_edit_border = sgs_border_element_decls(
	$attributes,
	'editButton',
	$sgs_fr_edit_sel,
	array(
		'colour' => array(
			'base'  => 'editButtonBorderColour',
			'hover' => 'editButtonBorderColourHover',
		),
	)
);
$sgs_fr_edit_decls = array_merge( $sgs_fr_edit_decls, $sgs_fr_edit_border['base'] );
if ( $sgs_fr_edit_decls ) {
	$sgs_fr_css .= $sgs_fr_edit_sel . '{' . implode( ';', $sgs_fr_edit_decls ) . ';}';
}
$sgs_fr_css .= implode( '', $sgs_fr_edit_border['rules'] );
foreach ( array( 'tablet', 'mobile' ) as $sgs_fr_tier ) {
	if ( $sgs_fr_edit_border[ $sgs_fr_tier ] ) {
		$sgs_fr_css .= sgs_emit_tier_decls( $sgs_fr_edit_sel, array( $sgs_fr_tier => $sgs_fr_edit_border[ $sgs_fr_tier ] ) );
	}
}
$sgs_fr_edit_hover = $sgs_fr_edit_border['hover'];
$sgs_fr_hover_text = sgs_colour_value( (string) ( $attributes['editButtonColourHover'] ?? '' ) );
if ( '' !== $sgs_fr_hover_text ) {
	$sgs_fr_edit_hover[] = 'color:' . $sgs_fr_hover_text;
}
$sgs_fr_hover_bg = sgs_colour_value( (string) ( $attributes['editButtonBackgroundColourHover'] ?? '' ) );
if ( '' !== $sgs_fr_hover_bg ) {
	$sgs_fr_edit_hover[] = 'background-color:' . $sgs_fr_hover_bg;
}
$sgs_fr_css .= sgs_hover_state_rules( $sgs_fr_edit_sel, implode( ';', $sgs_fr_edit_hover ) );
$sgs_fr_css .= sgs_emit_responsive_css(
	$sgs_fr_edit_sel,
	array(
		array(
			'value'        => sgs_responsive_normalise_object( $attributes['editButtonPadding'] ?? null, true ),
			'css'          => 'padding',
			'box'          => true,
			'unit_default' => 'px',
		),
		array(
			'value'        => sgs_responsive_normalise_object( $attributes['editButtonMinHeight'] ?? null ),
			'css'          => 'min-height',
			'unit_default' => 'px',
		),
		// The stylesheet's 44px tap floor reads this, so a set height replaces the floor (check-tap-floors).
		array(
			'value'        => sgs_responsive_normalise_object( $attributes['editButtonMinHeight'] ?? null ),
			'css'          => '--sgs-form-review-edit-min-height',
			'unit_default' => 'px',
		),
	)
);
$sgs_fr_css .= sgs_typography_css_rule( $attributes, 'editButton', $sgs_fr_edit_sel, '', false, false, sgs_object_attr_keys( $block ) );
foreach ( array(
	'termColour'  => '.sgs-form-review__term',
	'valueColour' => '.sgs-form-review__detail',
) as $sgs_fr_attr => $sgs_fr_target ) {
	$sgs_fr_text = sgs_resolve_text_colour_or_gradient(
		sgs_colour_value( (string) ( $attributes[ $sgs_fr_attr ] ?? '' ) ),
		(string) ( $attributes[ $sgs_fr_attr . 'Gradient' ] ?? '' )
	);
	$sgs_fr_sel  = $sgs_fr_scope . ' ' . $sgs_fr_target;
	if ( '' !== $sgs_fr_text ) {
		$sgs_fr_css .= $sgs_fr_sel . '{' . sgs_text_colour_decl( $sgs_fr_text ) . ';}';
		$sgs_fr_css .= sgs_text_colour_gradient_fallback_rule( $sgs_fr_sel, $sgs_fr_text );
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
echo '<' . esc_attr( $heading_level ) . ' class="sgs-form-review__heading">' . sgs_rich_text_kses( $heading ) . '</' . esc_attr( $heading_level ) . '>';
if ( '' !== $intro ) {
	echo '<p class="sgs-form-review__intro">' . sgs_rich_text_kses( $intro ) . '</p>';
}
echo '<div class="sgs-form-review__cards"></div>';
echo '<noscript><p class="sgs-form-review__noscript">' . esc_html__( 'JavaScript is required to preview your form responses.', 'sgs-blocks' ) . '</p></noscript>';
echo '</div>';
