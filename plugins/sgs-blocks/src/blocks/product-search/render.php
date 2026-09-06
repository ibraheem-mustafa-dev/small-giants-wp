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
 * Display modes (FR-36-20 — ONE shared combobox implementation, $form_html,
 * reused unmodified across all three; only the wrapping chrome differs):
 *   inline-bar          — (default) always-visible search bar.
 *   icon-expand         — collapsed icon button that expands the search
 *                          panel via a native <details>/<summary> DISCLOSURE
 *                          element (FR-36-10). Works with JS disabled.
 *   full-screen-overlay — icon trigger that opens a native <dialog> DIALOG
 *                          (FR-36-10) via the shared store('sgs/nav')
 *                          open/close/focus/inert plumbing (FR-36-7); dimmed
 *                          ::backdrop while open. No-JS fallback: the dialog
 *                          renders with the `open` attribute (non-modal,
 *                          inline, no backdrop) so the GET form still works.
 *   command-palette      — D638 §6 addition. Same <dialog> DIALOG + shared
 *                          store('sgs/nav') plumbing as full-screen-overlay
 *                          (deliberately NOT a second containment mechanism —
 *                          only the wrapper/dialog modifier class differs, so
 *                          CSS can render it as a smaller centred ~600px
 *                          modal with a blurred backdrop rather than a true
 *                          full-screen panel). Also opens on Ctrl/Cmd+K
 *                          (view.js) by dispatching a real click on the same
 *                          trigger button the shared store already binds.
 * Legacy aliases 'inline'/'icon' (pre-FR-36-20 stored values) map onto
 * 'inline-bar'/'icon-expand' below — no version bump, no deprecated.js.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// NO-INLINE (per-block no-inline migration contract): a CSS-length sanitiser
// for hand-built box shorthand values (mirrors sgs/label + sgs/heading).
// ---------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Attributes.
// -------------------------------------------------------------------------
$placeholder = ! empty( $attributes['placeholder'] )
	? $attributes['placeholder']
	: __( 'Search products…', 'sgs-blocks' );

$button_label = ! empty( $attributes['buttonLabel'] )
	? $attributes['buttonLabel']
	: __( 'Search', 'sgs-blocks' );

// FR-36-20 MUST: ≤10 desktop / 4–8 mobile — both caps are clamped server-side
// so a stored value can never widen past the spec ceiling regardless of what
// the editor sent. `maxResults` is a TIER OBJECT (Spec 35 pass 2) — ONE attr
// holding {desktop,tablet,mobile}; `maxResultsMobile` no longer exists as a
// sibling attr. Tablet has no design-distinct cap (Baymard's mobile-only
// finding — see edit.js), so it inherits the desktop cap/value, matching the
// pre-migration behaviour where no tablet attr ever existed.
$max_results_tiers  = sgs_responsive_normalise_object( $attributes['maxResults'] ?? null );
$max_results        = isset( $max_results_tiers['desktop'] ) && '' !== $max_results_tiers['desktop'] && null !== $max_results_tiers['desktop'] ? max( 1, min( 10, (int) $max_results_tiers['desktop'] ) ) : 10;
$max_results_mobile = isset( $max_results_tiers['mobile'] ) && '' !== $max_results_tiers['mobile'] && null !== $max_results_tiers['mobile'] ? max( 4, min( 8, (int) $max_results_tiers['mobile'] ) ) : 6;

// Validate display mode. FR-36-20 + D638 §6: inline-bar | icon-expand |
// full-screen-overlay | command-palette.
// Legacy alias map keeps pre-existing 'inline'/'icon' instances rendering
// identically to their old shape (no version bump / no deprecated.js, D270 —
// this is the cheap forward-compat translation instead).
$sgs_ps_display_aliases = array(
	'inline' => 'inline-bar',
	'icon'   => 'icon-expand',
);
$display_raw            = (string) ( $attributes['displayMode'] ?? 'inline-bar' );
$display_raw            = $sgs_ps_display_aliases[ $display_raw ] ?? $display_raw;
$display                = in_array( $display_raw, array( 'inline-bar', 'icon-expand', 'full-screen-overlay', 'command-palette' ), true )
	? $display_raw
	: 'inline-bar';

// full-screen-overlay AND command-palette both open a <dialog> DIALOG through
// the SAME shared store('sgs/nav') plumbing — command-palette is deliberately
// NOT a second containment mechanism, only a CSS modifier class differs.
$sgs_ps_is_dialog_mode = in_array( $display, array( 'full-screen-overlay', 'command-palette' ), true );

// -------------------------------------------------------------------------
// Colour overrides (D638 §6 gap close) — 5 client-controllable custom
// properties, each falling back to the existing token default already baked
// into style.css (var(--sgs-ps-*, token)) when unset. Mirrors sgs/button's
// --sgs-btn-* pattern (sgs_colour_value() resolves either a token slug or a
// raw CSS colour, and is breakout-guarded — helpers-tokens.php).
// -------------------------------------------------------------------------
$sgs_ps_colour_attrs = array(
	'--sgs-ps-input-border'    => $attributes['inputBorderColour'] ?? '',
	'--sgs-ps-focus-ring'      => $attributes['focusRingColour'] ?? '',
	'--sgs-ps-listbox-bg'      => $attributes['listboxBackgroundColour'] ?? '',
	'--sgs-ps-result-hover-bg' => $attributes['resultHoverBackgroundColour'] ?? '',
	'--sgs-ps-mark-bg'         => $attributes['matchHighlightColour'] ?? '',
);
$sgs_ps_colour_decls = array();
foreach ( $sgs_ps_colour_attrs as $sgs_ps_custom_prop => $sgs_ps_colour_val ) {
	if ( '' === $sgs_ps_colour_val || null === $sgs_ps_colour_val ) {
		continue;
	}
	$sgs_ps_colour_decls[] = $sgs_ps_custom_prop . ':' . sgs_colour_value( $sgs_ps_colour_val );
}

// -------------------------------------------------------------------------
// Unique IDs for ARIA wiring (stable per request — not per page-load).
// All echoed inline with esc_attr() at the echo site (WPCS requirement).
// -------------------------------------------------------------------------
$uid       = wp_unique_id( 'sgs-product-search-' );
$input_id  = $uid . '-input';
$list_id   = $uid . '-listbox';
$status_id = $uid . '-status';
$label_id  = $uid . '-label';
// full-screen-overlay only — the <dialog> id doubles as the shared sgs/nav
// store's drawerRef (FR-36-20: reuse store('sgs/nav'), never a second utility).
$dialog_id = $uid . '-dialog';

// -------------------------------------------------------------------------
// NO-INLINE scoped-styling uid (separate from the ARIA uid above — a CLASS,
// not an id, matching the sgs/label / sgs/heading / sgs/container pattern).
// Deterministic per attribute-set so repeat renders reuse the same class.
// -------------------------------------------------------------------------
$sgs_style_uid = 'sgs-ps-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_style_sel = '.' . $sgs_style_uid . '.wp-block-sgs-product-search';

$sgs_scoped_css = array();

// --- Border (Block Customisation Standard — wrapper-level border control).
// Keyed on the BARE uid class (not $sgs_style_sel's wrapper-qualified form),
// for the SAME reason as the colour overrides below: view.js reparents the
// <dialog> in overlay/command-palette display modes out of the wrapper, and
// the dialog carries this uid class directly so the rule keeps matching it.
// Box-object interface contract §1/§2: borderWidth is an SGS custom OBJECT
// attr { top, right, bottom, left }, no tiers. Colour resolution (flat vs
// gradient, base + hover) is delegated to sgs_border_states_css(). ---
$sgs_ps_border_sel       = '.' . $sgs_style_uid;
$sgs_ps_border_style_raw = isset( $attributes['borderStyle'] ) ? sgs_css_keyword_sanitise( $attributes['borderStyle'] ) : 'solid';
$sgs_ps_border_width_obj = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$sgs_ps_border_width_top = sgs_css_length_value( $sgs_ps_border_width_obj['top'] ?? '' );
$sgs_ps_border_width_rgt = sgs_css_length_value( $sgs_ps_border_width_obj['right'] ?? '' );
$sgs_ps_border_width_bot = sgs_css_length_value( $sgs_ps_border_width_obj['bottom'] ?? '' );
$sgs_ps_border_width_lft = sgs_css_length_value( $sgs_ps_border_width_obj['left'] ?? '' );
$sgs_ps_has_border_width = ( '' !== $sgs_ps_border_width_top || '' !== $sgs_ps_border_width_rgt || '' !== $sgs_ps_border_width_bot || '' !== $sgs_ps_border_width_lft );

$sgs_ps_border_base_decls = array();
if ( $sgs_ps_has_border_width ) {
	$sgs_ps_bwt                 = '' !== $sgs_ps_border_width_top ? $sgs_ps_border_width_top : '0';
	$sgs_ps_bwr                 = '' !== $sgs_ps_border_width_rgt ? $sgs_ps_border_width_rgt : '0';
	$sgs_ps_bwb                 = '' !== $sgs_ps_border_width_bot ? $sgs_ps_border_width_bot : '0';
	$sgs_ps_bwl                 = '' !== $sgs_ps_border_width_lft ? $sgs_ps_border_width_lft : '0';
	$sgs_ps_border_base_decls[] = "border-width:{$sgs_ps_bwt} {$sgs_ps_bwr} {$sgs_ps_bwb} {$sgs_ps_bwl}";
	if ( $sgs_ps_border_style_raw && 'solid' !== $sgs_ps_border_style_raw ) {
		$sgs_ps_border_base_decls[] = 'border-style:' . $sgs_ps_border_style_raw;
	}
}
if ( $sgs_ps_border_base_decls ) {
	$sgs_scoped_css[] = "{$sgs_ps_border_sel}{" . implode( ';', $sgs_ps_border_base_decls ) . ';}';
}

$sgs_ps_border_colour_css = sgs_border_states_css(
	$sgs_ps_border_sel,
	$attributes,
	array(
		'base'           => 'borderColour',
		'hover'          => 'borderColourHover',
		'gradient'       => 'borderColourGradient',
		'hover_gradient' => 'borderColourHoverGradient',
		'width'          => $sgs_ps_has_border_width && '' !== $sgs_ps_border_width_top ? $sgs_ps_border_width_top : '1px',
	)
);
if ( '' !== $sgs_ps_border_colour_css ) {
	$sgs_scoped_css[] = $sgs_ps_border_colour_css;
}

$sgs_ps_border_radius_tiers      = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$sgs_ps_border_radius_base       = $sgs_ps_border_radius_tiers['base'];
$sgs_ps_border_radius_tablet_obj = $sgs_ps_border_radius_tiers['tablet'];
$sgs_ps_border_radius_mobile_obj = $sgs_ps_border_radius_tiers['mobile'];
if ( null !== $sgs_ps_border_radius_base ) {
	$sgs_ps_border_radius_scoped = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $sgs_ps_border_radius_base ) ),
		array( 'selector' => $sgs_ps_border_sel )
	);
	if ( ! empty( $sgs_ps_border_radius_scoped['css'] ) ) {
		$sgs_scoped_css[] = $sgs_ps_border_radius_scoped['css'];
	}
}
$sgs_ps_border_radius_tab_val = sgs_corner_object_shorthand( $sgs_ps_border_radius_tablet_obj );
$sgs_ps_border_radius_mob_val = sgs_corner_object_shorthand( $sgs_ps_border_radius_mobile_obj );
if ( null !== $sgs_ps_border_radius_tab_val ) {
	$sgs_scoped_css[] = '@media(max-width:1023px){' . "{$sgs_ps_border_sel}{border-radius:{$sgs_ps_border_radius_tab_val};}}";
}
if ( null !== $sgs_ps_border_radius_mob_val ) {
	$sgs_scoped_css[] = '@media(max-width:767px){' . "{$sgs_ps_border_sel}{border-radius:{$sgs_ps_border_radius_mob_val};}}";
}

// --- Colour overrides — scoped custom-property VALUES (no-inline contract:
// this is a <style> rule, not an inline style="" attribute), only emitted
// when at least one of the 5 rows has a client-set value. style.css consumes
// each via var(--sgs-ps-*, existing-token-default). ---
if ( $sgs_ps_colour_decls ) {
	// Keyed on the uid class ALONE (not $sgs_style_sel's wrapper-qualified
	// form) so the rule also matches the <dialog> once view.js reparents it
	// out of the wrapper — see the dialog markup below for why it carries
	// this same class.
	$sgs_scoped_css[] = '.' . $sgs_style_uid . '{' . implode( ';', $sgs_ps_colour_decls ) . ';}';
}

// --- Result thumbnail object-fit (37-media-no-handroll remediation,
// 2026-09-03) — the shared media-atom system computes the custom-property
// VALUE server-side, keyed on $sgs_style_uid (the same no-inline
// scoped-styling uid class already on the wrapper for every display mode).
// view.js adds the matching `sgs-media-el` + $sgs_style_uid marker classes
// to each thumbnail <img> it builds at fetch time (there is no
// server-rendered <img> here to attach classes to directly — the results
// list is JS-built from a live REST response). style.css no longer
// hardcodes object-fit:cover on the result-row thumbnail. ---
if ( class_exists( 'SGS_Media_Element' ) ) {
	$sgs_ps_fit_css = SGS_Media_Element::style( $attributes, '', 'sgs/product-search', $sgs_style_uid, array( 'object-fit' ) );
	if ( '' !== $sgs_ps_fit_css ) {
		$sgs_scoped_css[] = $sgs_ps_fit_css;
	}
}

// --- Base padding/margin — WP-native style.spacing objects (skip-serialised
// in block.json → not auto-inlined by get_block_wrapper_attributes()).
// Emitted scoped via the stable core style engine. ---

$sgs_spacing_args = array();
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	$sgs_spacing_args['padding'] = $sgs_tor_padding_desktop;
}
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	$sgs_spacing_args['margin'] = $sgs_tor_margin_desktop;
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

// --- Responsive padding/margin tiers — SGS custom object attrs, hand-built
// shorthand, scoped @media on the SAME selector (contract: tablet
// max-width:1023px, mobile max-width:767px). ---
$sgs_padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$sgs_padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$sgs_margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$sgs_margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

$sgs_padding_tab_val = sgs_box_object_shorthand( $sgs_padding_tablet_obj );
$sgs_padding_mob_val = sgs_box_object_shorthand( $sgs_padding_mobile_obj );
$sgs_margin_tab_val  = sgs_box_object_shorthand( $sgs_margin_tablet_obj );
$sgs_margin_mob_val  = sgs_box_object_shorthand( $sgs_margin_mobile_obj );

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
$i18n_no_results   = esc_attr__( 'No products found', 'sgs-blocks' );
$i18n_busy         = esc_attr__( 'Search is busy — please try again in a moment', 'sgs-blocks' );
$i18n_out_of_stock = esc_attr__( 'Out of stock', 'sgs-blocks' );

// The result count is only known client-side (view.js populates the listbox
// after a REST fetch), so both plural forms are resolved here and handed to
// view.js — it selects the correct form by count rather than doing English-
// only string surgery on a single template (WCAG 4.1.3: this text is read
// aloud by the aria-live status region).
// translators: %d is replaced with the number of products found.
$i18n_count_nooop = _n_noop( '%d product found', '%d products found', 'sgs-blocks' );

$i18n_count_template_one   = esc_attr( translate_nooped_plural( $i18n_count_nooop, 1, 'sgs-blocks' ) );
$i18n_count_template_other = esc_attr( translate_nooped_plural( $i18n_count_nooop, 2, 'sgs-blocks' ) );

// -------------------------------------------------------------------------
// REST endpoint URL for view.js.
// -------------------------------------------------------------------------
$rest_url = esc_url( rest_url( 'sgs/v1/product-search' ) );

// -------------------------------------------------------------------------
// Wrapper attributes — varies by display mode.
// inline-bar: identical to v1.0.0 (class + data attrs only).
// icon-expand: adds sgs-product-search--icon class + data-display="icon"
// (the <details>/<summary> DISCLOSURE — FR-36-10).
// full-screen-overlay: adds sgs-product-search--overlay class +
// data-display="full-screen-overlay" (the <dialog> DIALOG — FR-36-10).
// -------------------------------------------------------------------------
$sgs_ps_common_data = array(
	'data-sgs-product-search'   => '',
	'data-rest'                 => $rest_url,
	'data-no-results'           => $i18n_no_results,
	'data-busy'                 => $i18n_busy,
	'data-out-of-stock'         => $i18n_out_of_stock,
	'data-count-template-one'   => $i18n_count_template_one,
	'data-count-template-other' => $i18n_count_template_other,
	'data-max-results'          => esc_attr( (string) $max_results ),
	'data-max-results-mobile'   => esc_attr( (string) $max_results_mobile ),
);

if ( 'icon-expand' === $display ) {
	$wrapper_attrs = get_block_wrapper_attributes(
		array_merge(
			array(
				'class'        => 'sgs-product-search sgs-product-search--icon ' . $sgs_style_uid,
				'data-display' => 'icon',
			),
			$sgs_ps_common_data
		)
	);
} elseif ( 'full-screen-overlay' === $display ) {
	$wrapper_attrs = get_block_wrapper_attributes(
		array_merge(
			array(
				'class'        => 'sgs-product-search sgs-product-search--overlay ' . $sgs_style_uid,
				'data-display' => 'full-screen-overlay',
			),
			$sgs_ps_common_data
		)
	);
} elseif ( 'command-palette' === $display ) {
	// D638 §6: same dialog mechanism as full-screen-overlay, distinguished
	// only by the --cmdk modifier class (style.css renders it as a smaller
	// centred ~600px modal with a blurred backdrop, not a full-screen panel).
	$wrapper_attrs = get_block_wrapper_attributes(
		array_merge(
			array(
				'class'        => 'sgs-product-search sgs-product-search--cmdk ' . $sgs_style_uid,
				'data-display' => 'command-palette',
			),
			$sgs_ps_common_data
		)
	);
} else {
	// inline-bar mode — wrapper carries the same classes as v1.0.0 plus the
	// no-inline scoped-styling uid class.
	$wrapper_attrs = get_block_wrapper_attributes(
		array_merge(
			array( 'class' => 'sgs-product-search ' . $sgs_style_uid ),
			$sgs_ps_common_data
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
// Dialog-mode chrome — trigger button + <dialog>, wired through the shared
// store('sgs/nav') (FR-36-20: reuse the ONE nav open/close/focus/inert
// utility rather than hand-rolling a second one, R-31-9). The dialog is the
// DIALOG half of FR-36-10's disclosure-vs-dialog swap; icon-expand below is
// the DISCLOSURE half — one attribute (displayMode) selects which pattern
// wraps the SAME $form_html combobox (the spec's "ONE shared combobox
// implementation reused across all display modes" differentiator).
//
// D638 §6: command-palette shares this EXACT block with full-screen-overlay
// — same trigger markup, same <dialog>, same store('sgs/nav') plumbing.
// Only a dialog modifier class differs (style.css renders --cmdk as a
// smaller centred ~600px modal with a blurred backdrop). Ctrl/Cmd+K
// (view.js) opens it by dispatching a real click on this SAME trigger
// button — no second open/close mechanism is introduced.
// -------------------------------------------------------------------------
$overlay_trigger_html = '';
$overlay_dialog_html  = '';

if ( $sgs_ps_is_dialog_mode ) {
	$overlay_context = array(
		'isOpen'    => false,
		'drawerRef' => $dialog_id,
	);

	$overlay_context_attr = wp_interactivity_data_wp_context( $overlay_context );

	// command-palette's trigger carries the same aria-label as full-screen-
	// overlay's, plus a spoken keyboard-shortcut hint (Ctrl/Cmd+K), since it
	// is the only mode that ALSO opens via a global keyboard shortcut.
	$trigger_label = 'command-palette' === $display
		? sprintf(
			/* translators: %s: the button's accessible label, e.g. "Search". */
			__( '%s (Ctrl+K)', 'sgs-blocks' ),
			$button_label
		)
		: $button_label;

	$overlay_trigger_html = sprintf(
		'<div class="sgs-product-search__overlay-trigger-wrap" data-wp-interactive="sgs/nav" %1$s>' .
			'<button type="button" class="sgs-product-search__icon-toggle" data-wp-on--click="actions.toggleDrawer" data-wp-bind--aria-expanded="state.isOpen" aria-controls="%2$s" aria-label="%3$s">' .
				'<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' .
			'</button>' .
		'</div>',
		$overlay_context_attr,
		esc_attr( $dialog_id ),
		esc_attr( $trigger_label )
	);

	// Close chrome — data-sgs-nav-close is wired imperatively by the shared
	// store on open, exactly like sgs/nav-drawer's × (FR-36-6 pattern reuse).
	$close_icon = function_exists( 'sgs_get_lucide_icon' ) ? sgs_get_lucide_icon( 'x' ) : '&times;';
	$close_html = sprintf(
		'<button type="button" class="sgs-product-search__close" data-sgs-nav-close aria-label="%s">%s</button>',
		esc_attr__( 'Close search', 'sgs-blocks' ),
		$close_icon
	);

	// Dialog modifier class — 'command-palette' 'sgs-product-search__dialog--cmdk'.
	$dialog_modifier_class = 'command-palette' === $display ? ' sgs-product-search__dialog--cmdk' : '';

	// No-JS fallback: the `open` attribute renders the dialog inline
	// (non-modal, no ::backdrop, no showModal semantics) so the form's real
	// GET submit works with zero JS — mirrors icon-expand's native <details>
	// no-JS story. view.js closes it on load, then the shared store re-opens
	// it as a true showModal() on trigger click.
	// The colour custom properties (--sgs-ps-*) are declared in a scoped rule
	// keyed on $sgs_style_uid (see below). view.js REPARENTS this <dialog> to
	// <body> on open (isInsideComponent() containment), which removes it from
	// being a DOM descendant of the block wrapper the properties are declared
	// on — custom properties only inherit through current DOM ancestry, so a
	// reparented dialog would silently lose every colour override. Carrying
	// the uid class directly on the dialog keeps it addressable by the same
	// selector regardless of where in the tree it currently sits.
	$overlay_dialog_html = sprintf(
		'<dialog id="%1$s" class="sgs-product-search__dialog %6$s%5$s" data-sgs-nav-drawer open aria-label="%2$s">%3$s<div class="sgs-product-search__dialog-body">%4$s</div></dialog>',
		esc_attr( $dialog_id ),
		esc_attr__( 'Search', 'sgs-blocks' ),
		$close_html,
		$form_html,
		esc_attr( $dialog_modifier_class ),
		esc_attr( $sgs_style_uid )
	);
}

// -------------------------------------------------------------------------
// Output — branch by display mode.
// -------------------------------------------------------------------------
?>
<?php if ( $sgs_scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $sgs_scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via sgs_css_length_value() / wp_style_engine_get_styles; wp_strip_all_tags guards </style> breakout. ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from get_block_wrapper_attributes() and esc_* functions. ?>>
<?php if ( 'icon-expand' === $display ) : ?>
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
<?php elseif ( $sgs_ps_is_dialog_mode ) : ?>
	<?php
	echo $overlay_trigger_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from wp_interactivity_data_wp_context() (self-escaping) + esc_* calls above.
	echo $overlay_dialog_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_* calls + the pre-escaped $form_html/$close_html fragments above.
	?>
<?php else : ?>
	<?php echo $form_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $form_html is built entirely from esc_* calls above. ?>
<?php endif; ?>
</div>
