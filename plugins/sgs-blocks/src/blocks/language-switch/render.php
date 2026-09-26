<?php
/**
 * Server-side render for sgs/language-switch.
 *
 * `languages` is a hand-set repeater ({code, url, customLabel}), edited in
 * the inspector — no automatic language detection. Names and BCP 47 tags
 * are resolved through PHP's `intl` extension when available
 * (`includes/language-switch-helpers.php`), falling back to the typed
 * `customLabel` then the upper-cased code.
 *
 * Display modes:
 *   - inline:       every item, joined with `separator`.
 *   - single-link:  only the FIRST non-current item (a single "switch to X"
 *                   link — the current language is never printed).
 *   - disclosure:   a <button aria-expanded aria-controls> showing the
 *                   current language, plus the full list below. Rendered
 *                   fully visible (no `hidden`) so a no-JS visitor still has
 *                   every language link; view.js hides the list and wires
 *                   the toggle, Escape-to-close and outside-click-to-close.
 *
 * Every item's `aria-current="true"` is set from `get_locale()`'s primary
 * subtag matching the item's own primary subtag — never from render context.
 *
 * NO-INLINE (Spec 32): every declaration goes into this instance's own
 * scoped `<style>` tag, built from a `$scoped_css` array, the same recipe as
 * sgs/collapsible-text.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused — this block has no InnerBlocks.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/language-switch-helpers.php';

$display        = in_array( $attributes['display'] ?? 'inline', array( 'inline', 'single-link', 'disclosure' ), true )
	? $attributes['display']
	: 'inline';
$prefix_label   = isset( $attributes['prefixLabel'] ) ? (string) $attributes['prefixLabel'] : '';
$label_style    = in_array( $attributes['labelStyle'] ?? 'autonym', array( 'autonym', 'code', 'custom' ), true )
	? $attributes['labelStyle']
	: 'autonym';
$separator_text = isset( $attributes['separator'] ) ? (string) $attributes['separator'] : '/';
$languages_raw  = is_array( $attributes['languages'] ?? null ) ? $attributes['languages'] : array();

// ---------------------------------------------------------------------------
// 1. Normalise the repeater and resolve which item, if any, is "current".
// ---------------------------------------------------------------------------

$current_locale = function_exists( 'get_locale' ) ? get_locale() : '';

$items = array();
foreach ( $languages_raw as $raw_item ) {
	if ( ! is_array( $raw_item ) || empty( $raw_item['code'] ) ) {
		continue;
	}
	$items[] = array(
		'code'        => (string) $raw_item['code'],
		'url'         => isset( $raw_item['url'] ) ? (string) $raw_item['url'] : '',
		'customLabel' => isset( $raw_item['customLabel'] ) ? (string) $raw_item['customLabel'] : '',
		'isCurrent'   => sgs_language_switch_is_current( (string) $raw_item['code'], $current_locale ),
	);
}

if ( empty( $items ) ) {
	return;
}

// ---------------------------------------------------------------------------
// 2. Scoped CSS (colours, typography, gap, panel padding).
// ---------------------------------------------------------------------------

$uid      = wp_unique_id( 'sgs-language-switch-' );
$root_sel = '.' . $uid . '.sgs-language-switch';
$link_sel = $root_sel . ' .sgs-language-switch__link';

$scoped_css = array();

// Link colour + hover (flat or gradient).
$link_colour            = isset( $attributes['linkColour'] ) ? (string) $attributes['linkColour'] : '';
$link_colour_gradient   = isset( $attributes['linkColourGradient'] ) ? (string) $attributes['linkColourGradient'] : '';
$link_colour_effective  = sgs_resolve_text_colour_or_gradient( $link_colour, $link_colour_gradient );
$link_colour_decl       = sgs_text_colour_decl( $link_colour_effective );
if ( '' !== $link_colour_decl ) {
	$scoped_css[] = "{$link_sel}{{$link_colour_decl};}";
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $link_sel, $link_colour_effective );
}

$link_hover           = isset( $attributes['linkColourHover'] ) ? (string) $attributes['linkColourHover'] : '';
$link_hover_gradient  = isset( $attributes['linkColourHoverGradient'] ) ? (string) $attributes['linkColourHoverGradient'] : '';
$link_hover_effective = sgs_resolve_text_colour_or_gradient( $link_hover, $link_hover_gradient );
$link_hover_decl      = sgs_text_colour_decl( $link_hover_effective );
if ( '' !== $link_hover_decl ) {
	$scoped_css[] = sgs_hover_state_rules( $link_sel, $link_hover_decl );
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $link_sel . ':hover', $link_hover_effective );
}

// Current-item colour — [aria-current="true"] is the ONLY signal; never a
// class, so it stays correct if this markup is cached and the visitor's
// locale differs from the request that generated the cache (unlikely for a
// server-rendered aria-current, but the selector itself is locale-agnostic).
$current_colour = isset( $attributes['currentColour'] ) ? (string) $attributes['currentColour'] : '';
if ( '' !== $current_colour ) {
	$current_value = sgs_colour_value( $current_colour );
	if ( '' !== $current_value ) {
		$scoped_css[] = $root_sel . ' .sgs-language-switch__link[aria-current="true"]{color:' . $current_value . ';}';
	}
}

// Separator colour.
$separator_colour = isset( $attributes['separatorColour'] ) ? (string) $attributes['separatorColour'] : '';
if ( '' !== $separator_colour ) {
	$separator_value = sgs_colour_value( $separator_colour );
	if ( '' !== $separator_value ) {
		$scoped_css[] = $root_sel . ' .sgs-language-switch__separator{color:' . $separator_value . ';}';
	}
}

// Disclosure panel background.
$panel_background = isset( $attributes['panelBackground'] ) ? (string) $attributes['panelBackground'] : '';
if ( '' !== $panel_background ) {
	$panel_bg_value = sgs_colour_value( $panel_background );
	if ( '' !== $panel_bg_value ) {
		$scoped_css[] = $root_sel . ' .sgs-language-switch__panel{background-color:' . $panel_bg_value . ';}';
	}
}

// Typography — scoped to the link element (the only text-bearing element).
$typography_css = sgs_typography_css_rule( $attributes, '', $link_sel );
if ( '' !== $typography_css ) {
	$scoped_css[] = $typography_css;
}

// Gap — scalar tier object {desktop,tablet,mobile}, each a CSS length.
$gap_tiers = sgs_responsive_normalise_object( $attributes['gap'] ?? null, false );
$gap_desktop = isset( $gap_tiers['desktop'] ) ? sgs_css_length_value( $gap_tiers['desktop'] ) : '';
$gap_tablet  = isset( $gap_tiers['tablet'] ) ? sgs_css_length_value( $gap_tiers['tablet'] ) : '';
$gap_mobile  = isset( $gap_tiers['mobile'] ) ? sgs_css_length_value( $gap_tiers['mobile'] ) : '';
if ( '' !== $gap_desktop ) {
	$scoped_css[] = $root_sel . ' .sgs-language-switch__list{gap:' . $gap_desktop . ';}';
}
if ( '' !== $gap_tablet ) {
	$scoped_css[] = '@media(max-width:1023px){' . $root_sel . ' .sgs-language-switch__list{gap:' . $gap_tablet . ';}}';
}
if ( '' !== $gap_mobile ) {
	$scoped_css[] = '@media(max-width:767px){' . $root_sel . ' .sgs-language-switch__list{gap:' . $gap_mobile . ';}}';
}

// Panel padding — box-object tier, disclosure panel only.
$panel_padding_tiers  = sgs_responsive_normalise_object( $attributes['panelPadding'] ?? null, true );
$panel_padding_desktop = is_array( $panel_padding_tiers['desktop'] ?? null ) ? $panel_padding_tiers['desktop'] : array();
$panel_padding_tablet   = is_array( $panel_padding_tiers['tablet'] ?? null ) ? $panel_padding_tiers['tablet'] : array();
$panel_padding_mobile   = is_array( $panel_padding_tiers['mobile'] ?? null ) ? $panel_padding_tiers['mobile'] : array();
$panel_padding_desktop_val = sgs_box_object_shorthand( $panel_padding_desktop );
$panel_padding_tablet_val  = sgs_box_object_shorthand( $panel_padding_tablet );
$panel_padding_mobile_val  = sgs_box_object_shorthand( $panel_padding_mobile );
if ( null !== $panel_padding_desktop_val ) {
	$scoped_css[] = $root_sel . ' .sgs-language-switch__panel{padding:' . $panel_padding_desktop_val . ';}';
}
if ( null !== $panel_padding_tablet_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . $root_sel . ' .sgs-language-switch__panel{padding:' . $panel_padding_tablet_val . ';}}';
}
if ( null !== $panel_padding_mobile_val ) {
	$scoped_css[] = '@media(max-width:767px){' . $root_sel . ' .sgs-language-switch__panel{padding:' . $panel_padding_mobile_val . ';}}';
}

// ---------------------------------------------------------------------------
// 3. Markup.
// ---------------------------------------------------------------------------

$wrapper_classes = array( 'sgs-language-switch', 'sgs-language-switch--' . $display, $uid );

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $wrapper_classes ),
	)
);

$prefix_html = '' !== $prefix_label
	? '<span class="sgs-language-switch__prefix">' . esc_html( $prefix_label ) . '</span>'
	: '';

// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving CSS
// combinators like `>` intact (contract §D — matches sgs/notice-banner + SGS_Container_Wrapper
// + sgs/quote + sgs/heading). Every value reaching $scoped_css is pre-sanitised
// (sgs_css_length_value() / sgs_colour_value() / allowlisted attribute enums), so no
// un-sanitised value survives to here.
$style_tag = ! empty( $scoped_css ) ? '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>' : '';

ob_start();

if ( 'single-link' === $display ) {

	$target = null;
	foreach ( $items as $item ) {
		if ( ! $item['isCurrent'] ) {
			$target = $item;
			break;
		}
	}

	if ( null === $target ) {
		// Nothing to switch to (every item is "current", or there is only
		// one item and it IS current) — render nothing.
		return;
	}

	echo $style_tag; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- self-built, already-escaped scoped CSS.
	?>
	<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php echo $prefix_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<?php echo sgs_language_switch_item_html( $target, $label_style, false, null ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</div>
	<?php

} elseif ( 'disclosure' === $display ) {

	$list_id = $uid . '-list';

	$current_item = null;
	foreach ( $items as $item ) {
		if ( $item['isCurrent'] ) {
			$current_item = $item;
			break;
		}
	}
	$trigger_label = null !== $current_item
		? sgs_language_switch_visible_label( $current_item['code'], $label_style, $current_item['customLabel'], null )
		: ( '' !== $prefix_label ? $prefix_label : sgs_language_switch_visible_label( $items[0]['code'], $label_style, $items[0]['customLabel'], null ) );

	echo $style_tag; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
	<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php echo $prefix_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<button
			type="button"
			class="sgs-language-switch__trigger"
			aria-expanded="true"
			aria-controls="<?php echo esc_attr( $list_id ); ?>"
		><?php echo esc_html( $trigger_label ); ?></button>
		<div class="sgs-language-switch__panel">
			<ul id="<?php echo esc_attr( $list_id ); ?>" class="sgs-language-switch__list">
				<?php foreach ( $items as $item ) : ?>
					<li class="sgs-language-switch__item">
						<?php echo sgs_language_switch_item_html( $item, $label_style, $item['isCurrent'], null ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>
	<?php

} else {

	// inline.
	echo $style_tag; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
	<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php echo $prefix_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<span class="sgs-language-switch__list">
			<?php
			$total = count( $items );
			foreach ( $items as $index => $item ) {
				echo sgs_language_switch_item_html( $item, $label_style, $item['isCurrent'], null ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				if ( $index < $total - 1 && '' !== $separator_text ) {
					echo '<span class="sgs-language-switch__separator" aria-hidden="true">' . esc_html( $separator_text ) . '</span>';
				}
			}
			?>
		</span>
	</div>
	<?php
}

echo ob_get_clean(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from esc_html()/esc_attr()/esc_url()-escaped fragments only.
