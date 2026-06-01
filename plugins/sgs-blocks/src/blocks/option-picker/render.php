<?php
/**
 * Server-side render for the SGS Option Picker block.
 *
 * Renders a fully accessible radio-group of pill options.
 * The default selection is baked into the HTML so the picker is
 * fully meaningful with no JavaScript (no-JS safe).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

/* ── Attribute extraction ────────────────────────────────────────────────── */

$label                = $attributes['label'] ?? __( 'Choose an option', 'sgs-blocks' );
$show_label           = $attributes['showLabel'] ?? true;
$option_items         = $attributes['optionItems'] ?? array();
$default_selected     = $attributes['defaultSelected'] ?? '';
$content_impact       = $attributes['contentImpact'] ?? array();
$type_key             = $attributes['typeKey'] ?? '';
$pill_style           = $attributes['pillStyle'] ?? 'outlined';
$pill_size            = $attributes['pillSize'] ?? 'medium';
$pill_bg_colour       = $attributes['pillBgColour'] ?? '';
$pill_text_colour     = $attributes['pillTextColour'] ?? '';
$pill_border_colour   = $attributes['pillBorderColour'] ?? '';
$pill_sel_bg_colour   = $attributes['pillSelectedBgColour'] ?? '';
$pill_sel_text_colour = $attributes['pillSelectedTextColour'] ?? '';

/* ── Guard: render nothing if no options ─────────────────────────────────── */

if ( empty( $option_items ) ) {
	return;
}

/* ── Validate option items (ensure key + label are set) ─────────────────── */

$valid_items = array();
$seen_keys   = array();

foreach ( $option_items as $item ) {
	$key        = isset( $item['key'] ) ? sanitize_html_class( trim( (string) $item['key'] ) ) : '';
	$label_text = isset( $item['label'] ) ? sanitize_text_field( trim( (string) $item['label'] ) ) : '';

	if ( '' === $key ) {
		continue; // Skip items with no key.
	}
	if ( in_array( $key, $seen_keys, true ) ) {
		continue; // Skip duplicate keys — first occurrence wins.
	}

	$seen_keys[]   = $key;
	$valid_items[] = array(
		'key'   => $key,
		'label' => '' !== $label_text ? $label_text : $key,
	);
}

/* After deduplication, bail if nothing remains. */
if ( empty( $valid_items ) ) {
	return;
}

/* ── Resolve default selection: explicit > first option ─────────────────── */

$sanitised_default = sanitize_html_class( trim( (string) $default_selected ) );
$resolved_default  = '';

if ( $sanitised_default ) {
	foreach ( $valid_items as $item ) {
		if ( $item['key'] === $sanitised_default ) {
			$resolved_default = $sanitised_default;
			break;
		}
	}
}

// Fall back to the first option if no valid default was found.
if ( '' === $resolved_default ) {
	$resolved_default = $valid_items[0]['key'];
}

/* ── Unique IDs for this block instance ─────────────────────────────────── */

$uid        = 'sgs-op-' . wp_unique_id();
$legend_id  = $uid . '-legend';
$radio_name = $uid . '-choice';

/* ── Wrapper classes ─────────────────────────────────────────────────────── */

$allowed_styles = array( 'outlined', 'filled', 'ghost' );
$allowed_sizes  = array( 'small', 'medium', 'large' );

$safe_style = in_array( $pill_style, $allowed_styles, true ) ? $pill_style : 'outlined';
$safe_size  = in_array( $pill_size, $allowed_sizes, true ) ? $pill_size : 'medium';

$wrapper_classes = array(
	'sgs-option-picker',
	'sgs-option-picker--' . $safe_style,
	'sgs-option-picker--' . $safe_size,
);

$wrapper_attributes = get_block_wrapper_attributes(
	array( 'class' => implode( ' ', $wrapper_classes ) )
);

/* ── CSS custom properties for token-aware colour overrides ─────────────── */

$css_vars = array();

if ( $pill_bg_colour ) {
	$css_vars[] = '--sgs-op-bg:' . sgs_colour_value( $pill_bg_colour );
}
if ( $pill_text_colour ) {
	$css_vars[] = '--sgs-op-text:' . sgs_colour_value( $pill_text_colour );
}
if ( $pill_border_colour ) {
	$css_vars[] = '--sgs-op-border:' . sgs_colour_value( $pill_border_colour );
}
if ( $pill_sel_bg_colour ) {
	$css_vars[] = '--sgs-op-sel-bg:' . sgs_colour_value( $pill_sel_bg_colour );
}
if ( $pill_sel_text_colour ) {
	$css_vars[] = '--sgs-op-sel-text:' . sgs_colour_value( $pill_sel_text_colour );
}

$inline_style = '';
if ( ! empty( $css_vars ) ) {
	$inline_style = ' style="' . esc_attr( implode( ';', $css_vars ) ) . '"';
}

/* ── Data attributes for the view.js event dispatcher ───────────────────── */

$data_type_key = $type_key
	? ' data-type-key="' . esc_attr( sanitize_html_class( $type_key ) ) . '"'
	: '';

$data_content_impact = '';
if ( ! empty( $content_impact ) && is_array( $content_impact ) ) {
	$safe_impacts        = array_map( 'sanitize_html_class', array_filter( $content_impact ) );
	$data_content_impact = ' data-content-impact="' . esc_attr( implode( ',', $safe_impacts ) ) . '"';
}

?>
<fieldset <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped markup. ?><?php echo $inline_style; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr(). ?>>
	<?php if ( $show_label ) : ?>
		<legend id="<?php echo esc_attr( $legend_id ); ?>" class="sgs-option-picker__label">
			<?php echo esc_html( $label ); ?>
		</legend>
	<?php else : ?>
		<legend id="<?php echo esc_attr( $legend_id ); ?>" class="sgs-sr-only">
			<?php echo esc_html( $label ); ?>
		</legend>
	<?php endif; ?>

	<div
		class="sgs-option-picker__options"
		role="radiogroup"
		aria-labelledby="<?php echo esc_attr( $legend_id ); ?>"
		<?php echo $data_type_key; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr(). ?>
		<?php echo $data_content_impact; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr(). ?>
	>
		<?php foreach ( $valid_items as $item ) : ?>
			<?php
			$is_checked  = $item['key'] === $resolved_default;
			$input_id    = $uid . '-' . $item['key'];
			$checked_str = $is_checked ? ' checked' : '';
			?>
			<label class="sgs-option-picker__option" for="<?php echo esc_attr( $input_id ); ?>">
				<input
					type="radio"
					id="<?php echo esc_attr( $input_id ); ?>"
					name="<?php echo esc_attr( $radio_name ); ?>"
					value="<?php echo esc_attr( $item['key'] ); ?>"
					<?php echo $checked_str; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- 'checked' or empty. ?>
				>
				<span class="sgs-option-picker__pill"><?php echo esc_html( $item['label'] ); ?></span>
			</label>
		<?php endforeach; ?>
	</div>
</fieldset>
