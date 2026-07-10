<?php
/**
 * Server-side render for sgs/product-search.
 *
 * Renders an accessible combobox search form with a no-JS fallback.
 *
 * No-JS behaviour: the <form method="get"> submits to /?s={q}&post_type=product,
 * which the block theme's search template renders product-scoped.
 * With JS: view.js takes over, debounces keystrokes, calls the REST endpoint,
 * and populates the listbox with product suggestions.
 *
 * ARIA pattern: role=combobox on the input + aria-controls pointing at the
 * role=listbox <ul>. Live region (role=status aria-live=polite) announces
 * result counts and error messages.
 *
 * Security: all output is escaped. REST URL + i18n strings are carried on
 * data-attributes so view.js never touches raw PHP output.
 *
 * Display modes:
 *   inline — (default) always-visible search bar, unchanged from v1.0.0.
 *   icon   — collapsed icon button that expands the search panel via a
 *             native <details>/<summary> disclosure element. Works with
 *             JS disabled (native browser behaviour). JS enhances focus
 *             management only.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// ---------------------------------------------------------------------------
// NO-INLINE (per-block no-inline migration contract): a CSS-length sanitiser
// for hand-built box shorthand values (mirrors sgs/label + sgs/heading).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// -------------------------------------------------------------------------
// Attributes.
// -------------------------------------------------------------------------
$placeholder = ! empty( $attributes['placeholder'] )
	? $attributes['placeholder']
	: __( 'Search products…', 'sgs-blocks' );

$button_label = ! empty( $attributes['buttonLabel'] )
	? $attributes['buttonLabel']
	: __( 'Search', 'sgs-blocks' );

$max_results = isset( $attributes['maxResults'] ) ? max( 1, min( 20, (int) $attributes['maxResults'] ) ) : 10;

// Validate display mode — only 'inline' and 'icon' are accepted.
$display = in_array( $attributes['displayMode'] ?? 'inline', array( 'inline', 'icon' ), true )
	? ( $attributes['displayMode'] ?? 'inline' )
	: 'inline';

// -------------------------------------------------------------------------
// Unique IDs for ARIA wiring (stable per request — not per page-load).
// All echoed inline with esc_attr() at the echo site (WPCS requirement).
// -------------------------------------------------------------------------
$uid       = wp_unique_id( 'sgs-product-search-' );
$input_id  = $uid . '-input';
$list_id   = $uid . '-listbox';
$status_id = $uid . '-status';
$label_id  = $uid . '-label';

// -------------------------------------------------------------------------
// NO-INLINE scoped-styling uid (separate from the ARIA uid above — a CLASS,
// not an id, matching the sgs/label / sgs/heading / sgs/container pattern).
// Deterministic per attribute-set so repeat renders reuse the same class.
// -------------------------------------------------------------------------
$sgs_style_uid = 'sgs-ps-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_style_sel = '.' . $sgs_style_uid . '.wp-block-sgs-product-search';

$sgs_scoped_css = array();

// --- Base padding/margin — WP-native style.spacing objects (skip-serialised
// in block.json → not auto-inlined by get_block_wrapper_attributes()).
// Emitted scoped via the stable core style engine. ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$sgs_spacing_args = array();
	if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
		$sgs_spacing_args['padding'] = $attributes['style']['spacing']['padding'];
	}
	if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
		$sgs_spacing_args['margin'] = $attributes['style']['spacing']['margin'];
	}
	if ( ! empty( $sgs_spacing_args ) ) {
		$sgs_base_scoped = wp_style_engine_get_styles(
			array( 'spacing' => $sgs_spacing_args ),
			array( 'selector' => $sgs_style_sel )
		);
		if ( ! empty( $sgs_base_scoped['css'] ) ) {
			$sgs_scoped_css[] = $sgs_base_scoped['css'];
		}
	}
}

// --- Responsive padding/margin tiers — SGS custom object attrs, hand-built
// shorthand, scoped @media on the SAME selector (contract: tablet
// max-width:1023px, mobile max-width:767px). ---
$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

$sgs_padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$sgs_padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$sgs_margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$sgs_margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

$sgs_padding_tab_val = $sgs_box_shorthand( $sgs_padding_tablet_obj );
$sgs_padding_mob_val = $sgs_box_shorthand( $sgs_padding_mobile_obj );
$sgs_margin_tab_val  = $sgs_box_shorthand( $sgs_margin_tablet_obj );
$sgs_margin_mob_val  = $sgs_box_shorthand( $sgs_margin_mobile_obj );

$sgs_tablet_decls = array();
if ( null !== $sgs_padding_tab_val ) {
	$sgs_tablet_decls[] = "padding:{$sgs_padding_tab_val}";
}
if ( null !== $sgs_margin_tab_val ) {
	$sgs_tablet_decls[] = "margin:{$sgs_margin_tab_val}";
}
if ( $sgs_tablet_decls ) {
	$sgs_scoped_css[] = '@media(max-width:1023px){' . "{$sgs_style_sel}{" . implode( ';', $sgs_tablet_decls ) . ';}}';
}

$sgs_mobile_decls = array();
if ( null !== $sgs_padding_mob_val ) {
	$sgs_mobile_decls[] = "padding:{$sgs_padding_mob_val}";
}
if ( null !== $sgs_margin_mob_val ) {
	$sgs_mobile_decls[] = "margin:{$sgs_margin_mob_val}";
}
if ( $sgs_mobile_decls ) {
	$sgs_scoped_css[] = '@media(max-width:767px){' . "{$sgs_style_sel}{" . implode( ';', $sgs_mobile_decls ) . ';}}';
}

// -------------------------------------------------------------------------
// i18n strings carried as data-attributes for view.js.
// -------------------------------------------------------------------------
$i18n_no_results = esc_attr__( 'No products found', 'sgs-blocks' );
$i18n_busy       = esc_attr__( 'Search is busy — please try again in a moment', 'sgs-blocks' );
// translators: %d is replaced with the number of products found.
$i18n_count_template = esc_attr__( '%d products found', 'sgs-blocks' );

// -------------------------------------------------------------------------
// REST endpoint URL for view.js.
// -------------------------------------------------------------------------
$rest_url = esc_url( rest_url( 'sgs/v1/product-search' ) );

// -------------------------------------------------------------------------
// Wrapper attributes — varies by display mode.
// Inline: identical to v1.0.0 (class + data attrs only).
// Icon: adds sgs-product-search--icon class and data-display="icon".
// -------------------------------------------------------------------------
if ( 'icon' === $display ) {
	$wrapper_attrs = get_block_wrapper_attributes(
		array(
			'class'                   => 'sgs-product-search sgs-product-search--icon ' . $sgs_style_uid,
			'data-sgs-product-search' => '',
			'data-display'            => 'icon',
			'data-rest'               => $rest_url,
			'data-no-results'         => $i18n_no_results,
			'data-busy'               => $i18n_busy,
			'data-count-template'     => $i18n_count_template,
			'data-max-results'        => esc_attr( (string) $max_results ),
		)
	);
} else {
	// Inline mode — wrapper carries the same classes as v1.0.0 plus the
	// no-inline scoped-styling uid class.
	$wrapper_attrs = get_block_wrapper_attributes(
		array(
			'class'                   => 'sgs-product-search ' . $sgs_style_uid,
			'data-sgs-product-search' => '',
			'data-rest'               => $rest_url,
			'data-no-results'         => $i18n_no_results,
			'data-busy'               => $i18n_busy,
			'data-count-template'     => $i18n_count_template,
			'data-max-results'        => esc_attr( (string) $max_results ),
		)
	);
}

// -------------------------------------------------------------------------
// Inner form markup — built once, used in both display modes.
//
// The form is identical whether displayed inline or inside a <details> panel.
// Escaping matches the original: esc_attr() on IDs/attrs, esc_html_e() /
// esc_html() on visible text, esc_url() on URLs, esc_attr_e() on aria-label.
// -------------------------------------------------------------------------
ob_start();
?>
	<form
		role="search"
		method="get"
		action="<?php echo esc_url( home_url( '/' ) ); ?>"
		class="sgs-product-search__form"
	>
		<?php /* Visually hidden label — always present for assistive technology. */ ?>
		<label
			id="<?php echo esc_attr( $label_id ); ?>"
			for="<?php echo esc_attr( $input_id ); ?>"
			class="screen-reader-text"
		>
			<?php esc_html_e( 'Search products', 'sgs-blocks' ); ?>
		</label>

		<div class="sgs-product-search__field-wrap">
			<input
				type="search"
				id="<?php echo esc_attr( $input_id ); ?>"
				name="s"
				class="sgs-product-search__input"
				role="combobox"
				aria-expanded="false"
				aria-autocomplete="list"
				aria-controls="<?php echo esc_attr( $list_id ); ?>"
				aria-describedby="<?php echo esc_attr( $status_id ); ?>"
				aria-labelledby="<?php echo esc_attr( $label_id ); ?>"
				autocomplete="off"
				placeholder="<?php echo esc_attr( $placeholder ); ?>"
				value=""
			/>

			<?php /* Hidden field scopes the no-JS form submit to WooCommerce products. */ ?>
			<input type="hidden" name="post_type" value="product" />

			<button
				type="submit"
				class="sgs-product-search__submit"
				aria-label="<?php echo esc_attr( $button_label ); ?>"
			>
				<svg
					aria-hidden="true"
					focusable="false"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="11" cy="11" r="8"></circle>
					<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
				</svg>
				<span class="screen-reader-text"><?php echo esc_html( $button_label ); ?></span>
			</button>
		</div>

		<?php /* Listbox — hidden by default; view.js populates + reveals it. */ ?>
		<ul
			id="<?php echo esc_attr( $list_id ); ?>"
			class="sgs-product-search__results"
			role="listbox"
			aria-label="<?php esc_attr_e( 'Product suggestions', 'sgs-blocks' ); ?>"
			hidden
		></ul>

		<?php /* Live region — announces result count + error messages to screen readers. */ ?>
		<p
			id="<?php echo esc_attr( $status_id ); ?>"
			class="sgs-product-search__status screen-reader-text"
			role="status"
			aria-live="polite"
			aria-atomic="true"
		></p>
	</form>
<?php
$form_html = ob_get_clean();

// -------------------------------------------------------------------------
// Output — branch by display mode.
// -------------------------------------------------------------------------
?>
<?php if ( $sgs_scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $sgs_scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via $sgs_css_length / wp_style_engine_get_styles; wp_strip_all_tags guards </style> breakout. ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from get_block_wrapper_attributes() and esc_* functions. ?>>
<?php if ( 'icon' === $display ) : ?>
	<details class="sgs-product-search__disclosure">
		<summary
			class="sgs-product-search__icon-toggle"
			aria-label="<?php echo esc_attr( $button_label ); ?>"
		>
			<?php /* Search icon — aria-hidden so the aria-label on <summary> is the sole accessible name. */ ?>
			<svg
				aria-hidden="true"
				focusable="false"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="11" cy="11" r="8"></circle>
				<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
			</svg>
		</summary>
		<div class="sgs-product-search__panel">
			<?php echo $form_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $form_html is built entirely from esc_* calls above. ?>
		</div>
	</details>
<?php else : ?>
	<?php echo $form_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $form_html is built entirely from esc_* calls above. ?>
<?php endif; ?>
</div>
