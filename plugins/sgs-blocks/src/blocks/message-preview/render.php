<?php
/**
 * Server render for sgs/message-preview (the fields).
 *
 * Text boxes whose typing appears live in the sgs/message-preview-line blocks of the same group. Each field
 * prints a real label and control. There is no form, no button and no submission. The settings print as one
 * scoped <style> rule, never inline. view.js (./mirror.js) does the mirroring.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner content (none).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Fields: clean every definition, keep only the usable ones.
// ---------------------------------------------------------------------------

$sgs_mp_fields = array();
$sgs_mp_seen   = array();
foreach ( (array) ( $attributes['fields'] ?? array() ) as $sgs_mp_index => $sgs_mp_raw ) {
	if ( ! is_array( $sgs_mp_raw ) ) {
		continue;
	}
	$sgs_mp_label = trim( wp_strip_all_tags( (string) ( $sgs_mp_raw['label'] ?? '' ) ) );
	$sgs_mp_key   = sanitize_key( (string) ( $sgs_mp_raw['key'] ?? '' ) );
	if ( '' === $sgs_mp_key ) {
		$sgs_mp_key = sanitize_key( $sgs_mp_label );
	}
	if ( '' === $sgs_mp_key ) {
		$sgs_mp_key = 'field-' . ( (int) $sgs_mp_index + 1 );
	}
	while ( isset( $sgs_mp_seen[ $sgs_mp_key ] ) ) {
		$sgs_mp_key .= '-' . ( (int) $sgs_mp_index + 1 );
	}
	$sgs_mp_seen[ $sgs_mp_key ] = true;

	$sgs_mp_max     = max( 0, (int) ( $sgs_mp_raw['maxLength'] ?? 0 ) );
	$sgs_mp_default = (string) ( $sgs_mp_raw['defaultValue'] ?? '' );
	if ( $sgs_mp_max > 0 ) {
		$sgs_mp_default = mb_substr( $sgs_mp_default, 0, $sgs_mp_max );
	}

	$sgs_mp_fields[] = array(
		'key'         => $sgs_mp_key,
		'label'       => $sgs_mp_label,
		'multiline'   => 'textarea' === ( $sgs_mp_raw['fieldType'] ?? 'text' ),
		'rows'        => min( 12, max( 2, (int) ( $sgs_mp_raw['rows'] ?? 3 ) ) ),
		'placeholder' => (string) ( $sgs_mp_raw['placeholder'] ?? '' ),
		'default'     => $sgs_mp_default,
		'max'         => $sgs_mp_max,
	);
}

if ( ! $sgs_mp_fields ) {
	return;
}

$sgs_mp_group = sanitize_key( (string) ( $attributes['group'] ?? '' ) );
if ( '' === $sgs_mp_group ) {
	$sgs_mp_group = 'note';
}

// ---------------------------------------------------------------------------
// 2. Scoped CSS.
// ---------------------------------------------------------------------------

$sgs_mp_uid  = 'sgs-message-preview-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_mp_root = '.sgs-message-preview.' . $sgs_mp_uid;
$sgs_mp_tier = sgs_object_attr_keys( $block );
$sgs_mp_css  = sgs_emit_responsive_css(
	$sgs_mp_root,
	array(
		array(
			'value'        => $attributes['gap'] ?? null,
			'css'          => 'gap',
			'unit_default' => 'px',
		),
	)
);

// Labels.
$sgs_mp_label_sel = $sgs_mp_root . ' .sgs-message-preview__label';
$sgs_mp_css      .= sgs_typography_css_rule( $attributes, 'label', $sgs_mp_label_sel, '', false, false, $sgs_mp_tier );
$sgs_mp_css      .= sgs_text_states_css( $sgs_mp_label_sel, $attributes, array( 'base' => 'labelColour' ) );

// The text boxes.
$sgs_mp_input_sel   = $sgs_mp_root . ' .sgs-message-preview__input';
$sgs_mp_css        .= sgs_typography_css_rule( $attributes, 'input', $sgs_mp_input_sel, '', false, false, $sgs_mp_tier );
$sgs_mp_input_text  = sgs_text_decls( $attributes, array( 'base' => 'inputTextColour' ) );
$sgs_mp_input_fill  = sgs_fill_decls( $attributes, array( 'base' => 'inputBackgroundColour' ) );
$sgs_mp_input_decls = array_merge( $sgs_mp_input_text['normal'], $sgs_mp_input_fill['normal'] );
$sgs_mp_input_border = sgs_border_element_decls(
	$attributes,
	'input',
	$sgs_mp_input_sel,
	array(
		'colour'         => array( 'base' => 'inputBorderColour' ),
		'colour_default' => 'currentColor',
	)
);
$sgs_mp_css         .= sgs_emit_tier_decls(
	$sgs_mp_input_sel,
	array(
		'desktop' => array_merge( $sgs_mp_input_decls, $sgs_mp_input_border['base'] ),
		'tablet'  => $sgs_mp_input_border['tablet'],
		'mobile'  => $sgs_mp_input_border['mobile'],
	)
) . implode( '', $sgs_mp_input_border['rules'] );
$sgs_mp_css         .= sgs_emit_responsive_css(
	$sgs_mp_input_sel,
	array(
		array(
			'value'        => $attributes['inputMinHeight'] ?? null,
			'css'          => 'min-height',
			'unit_default' => 'px',
		),
	)
);

// ---------------------------------------------------------------------------
// 3. Markup.
// ---------------------------------------------------------------------------

$sgs_mp_fields_html = '';
foreach ( $sgs_mp_fields as $sgs_mp_field ) {
	$sgs_mp_id   = $sgs_mp_uid . '-' . $sgs_mp_field['key'];
	$sgs_mp_atts = sprintf(
		' class="sgs-message-preview__input" id="%1$s" data-sgs-mp-input data-field="%2$s" autocomplete="off"%3$s%4$s',
		esc_attr( $sgs_mp_id ),
		esc_attr( $sgs_mp_field['key'] ),
		$sgs_mp_field['max'] > 0 ? ' maxlength="' . (int) $sgs_mp_field['max'] . '"' : '',
		'' !== $sgs_mp_field['placeholder'] ? ' placeholder="' . esc_attr( $sgs_mp_field['placeholder'] ) . '"' : ''
	);
	if ( $sgs_mp_field['multiline'] ) {
		$sgs_mp_control = sprintf( '<textarea rows="%1$d"%2$s>%3$s</textarea>', (int) $sgs_mp_field['rows'], $sgs_mp_atts, esc_html( $sgs_mp_field['default'] ) );
	} else {
		$sgs_mp_control = sprintf( '<input type="text"%1$s value="%2$s">', $sgs_mp_atts, esc_attr( $sgs_mp_field['default'] ) );
	}
	$sgs_mp_fields_html .= sprintf(
		'<div class="sgs-message-preview__field"><label class="sgs-message-preview__label" for="%1$s">%2$s</label>%3$s</div>',
		esc_attr( $sgs_mp_id ),
		esc_html( $sgs_mp_field['label'] ),
		$sgs_mp_control // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr(), esc_html() and (int) above.
	);
}

$sgs_mp_wrapper = array( 'class' => 'sgs-message-preview ' . $sgs_mp_uid );
if ( ! empty( $attributes['anchor'] ) ) {
	$sgs_mp_wrapper['id'] = (string) $attributes['anchor'];
}
$sgs_mp_data = sprintf( ' data-sgs-message-preview data-group="%s"', esc_attr( $sgs_mp_group ) );
if ( ! empty( $attributes['rememberNote'] ) ) {
	$sgs_mp_data .= ' data-remember="true"';
}

if ( '' !== $sgs_mp_css ) {
	echo '<style>' . wp_strip_all_tags( $sgs_mp_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value is pre-sanitised by the shared helpers.
}

printf(
	'<div %1$s%2$s>%3$s</div>',
	get_block_wrapper_attributes( $sgs_mp_wrapper ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes each value.
	$sgs_mp_data, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the only variable value is passed through esc_attr() above.
	$sgs_mp_fields_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built with esc_attr(), esc_html() and (int) above.
);
