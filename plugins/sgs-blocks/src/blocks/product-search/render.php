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
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

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
// Wrapper attributes — carries the data-sgs-product-search hook + REST data.
// -------------------------------------------------------------------------
$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'                   => 'sgs-product-search',
		'data-sgs-product-search' => '',
		'data-rest'               => $rest_url,
		'data-no-results'         => $i18n_no_results,
		'data-busy'               => $i18n_busy,
		'data-count-template'     => $i18n_count_template,
		'data-max-results'        => esc_attr( (string) $max_results ),
	)
);
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from get_block_wrapper_attributes() and esc_* functions. ?>>
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
</div>
