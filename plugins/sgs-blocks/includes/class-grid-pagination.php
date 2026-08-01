<?php
/**
 * Grid Pagination — the ONE pagination renderer shared by every SGS grid block.
 *
 * Extracted 2026-08-01 from `sgs/post-grid`'s render.php (the proven, shipped
 * implementation) so that adding pagination to `sgs/card-grid` did not create a
 * second copy of the markup, the a11y attributes or the mode names.
 *
 * TWO NAVIGATION MODES — same markup vocabulary, different transport:
 *
 *   MODE_AJAX ('ajax')  — emits <button data-page="N"> elements. Used by
 *                         sgs/post-grid, whose view.js intercepts the click and
 *                         swaps the cards in via the sgs/v1 REST endpoint. The
 *                         markup here is byte-identical to what post-grid's
 *                         render.php emitted before the extraction.
 *
 *   MODE_LINK ('link')  — emits <a href> elements carrying a per-instance page
 *                         query arg. Used by sgs/card-grid, which has no view.js
 *                         and no REST endpoint: navigation is a real page load,
 *                         so it works with JavaScript disabled and is crawlable.
 *                         The query arg is namespaced per block instance
 *                         (sgs-page-{uid}) so several grids can paginate
 *                         independently on one page.
 *
 * A block that later gains AJAX simply switches its `mode` argument — no markup
 * is duplicated to make that change.
 *
 * @package SGS\Blocks
 * @since   1.16.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Grid_Pagination
 *
 * Pure static markup builder. Returns an HTML string; never echoes.
 */
final class Grid_Pagination {

	/** Button-based navigation, hydrated by a block's own view.js. */
	public const MODE_AJAX = 'ajax';

	/** Anchor-based navigation — full page load, no JavaScript required. */
	public const MODE_LINK = 'link';

	/**
	 * The recognised pagination types.
	 *
	 * Exposed so block.json enums and editors check ONE list.
	 *
	 * @var string[]
	 */
	public const TYPES = array( 'none', 'standard', 'load-more', 'infinite' );

	// ── Public API ───────────────────────────────────────────────────────────

	/**
	 * Build the pagination markup for a grid block.
	 *
	 * Returns an empty string when there is nothing to render (type 'none', or
	 * a single page) — callers can concatenate the result unconditionally.
	 *
	 * @param array $args {
	 *     Required unless noted.
	 *
	 *     @type string $base_class    Block BEM base, e.g. 'sgs-post-grid'. All emitted
	 *                                 classes are namespaced under it.
	 *     @type string $type          One of self::TYPES. Default 'none'.
	 *     @type int    $total_pages   Total number of pages.
	 *     @type int    $current_page  Current page (1-based). Default 1.
	 *     @type string $mode          self::MODE_AJAX or self::MODE_LINK. Default MODE_AJAX.
	 *     @type string $page_var      MODE_LINK only. Query arg carrying the page number.
	 *     @type string $nav_label     Optional. aria-label for the <nav>.
	 *     @type string $load_more_text Optional. Label for the load-more button.
	 * }
	 * @return string HTML, or '' when nothing should render.
	 */
	public static function render( array $args ): string {
		$base_class   = isset( $args['base_class'] ) ? \sanitize_html_class( $args['base_class'] ) : '';
		$type         = isset( $args['type'] ) ? \sanitize_key( $args['type'] ) : 'none';
		$total_pages  = isset( $args['total_pages'] ) ? \absint( $args['total_pages'] ) : 0;
		$current_page = isset( $args['current_page'] ) ? \max( 1, \absint( $args['current_page'] ) ) : 1;
		$mode         = isset( $args['mode'] ) ? \sanitize_key( $args['mode'] ) : self::MODE_AJAX;

		if ( '' === $base_class || 'none' === $type || ! \in_array( $type, self::TYPES, true ) ) {
			return '';
		}

		if ( $total_pages <= 1 ) {
			return '';
		}

		if ( 'standard' === $type ) {
			return self::render_standard( $base_class, $total_pages, $current_page, $mode, $args );
		}

		if ( 'load-more' === $type ) {
			return self::render_load_more( $base_class, $total_pages, $args );
		}

		if ( 'infinite' === $type ) {
			// A sentinel is inert without JavaScript to observe it — a MODE_LINK
			// caller gets working numbered navigation rather than an empty div.
			if ( self::MODE_LINK === $mode ) {
				return self::render_standard( $base_class, $total_pages, $current_page, self::MODE_LINK, $args );
			}

			return self::render_sentinel( $base_class, $total_pages );
		}

		return '';
	}

	/**
	 * Read the current page for a MODE_LINK grid instance from the request.
	 *
	 * Each instance uses its own query arg, so two grids on one page paginate
	 * independently and neither collides with WordPress's own `paged` var.
	 *
	 * @param string $page_var Query arg name (see self::page_var()).
	 * @return int Page number, minimum 1.
	 */
	public static function current_page_from_request( string $page_var ): int {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only public pagination; no state change, and the value is immediately absint()-ed.
		if ( empty( $_GET[ $page_var ] ) ) {
			return 1;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- see above.
		$page = \absint( \wp_unslash( $_GET[ $page_var ] ) );

		return \max( 1, $page );
	}

	/**
	 * Build the per-instance page query-arg name.
	 *
	 * @param string $uid Block instance uid (already a safe class token).
	 * @return string Query arg name, e.g. 'sgs-page-sgs-cg-1a2b3c4d'.
	 */
	public static function page_var( string $uid ): string {
		return 'sgs-page-' . \sanitize_key( $uid );
	}

	// ── Private renderers ────────────────────────────────────────────────────

	/**
	 * Numbered pagination.
	 *
	 * @param string $base_class   Block BEM base.
	 * @param int    $total_pages  Total pages.
	 * @param int    $current_page Current page.
	 * @param string $mode         MODE_AJAX or MODE_LINK.
	 * @param array  $args         Full argument array (for page_var / nav_label).
	 * @return string HTML.
	 */
	private static function render_standard( string $base_class, int $total_pages, int $current_page, string $mode, array $args ): string {
		$nav_label = isset( $args['nav_label'] ) && '' !== $args['nav_label']
			? (string) $args['nav_label']
			: \__( 'Pagination', 'sgs-blocks' );

		$page_var = isset( $args['page_var'] ) ? \sanitize_key( $args['page_var'] ) : '';

		$html = '<nav class="' . \esc_attr( $base_class . '__pagination' ) . '" aria-label="' . \esc_attr( $nav_label ) . '">';

		for ( $p = 1; $p <= $total_pages; $p++ ) {
			$is_current    = $p === $current_page;
			$current_class = $is_current ? ' ' . $base_class . '__page-btn--current' : '';
			$aria_current  = $is_current ? ' aria-current="page"' : '';
			$btn_class     = $base_class . '__page-btn' . $current_class;

			if ( self::MODE_LINK === $mode && '' !== $page_var ) {
				$href  = 1 === $p
					? \remove_query_arg( $page_var )
					: \add_query_arg( $page_var, $p );
				$html .= '<a class="' . \esc_attr( $btn_class ) . '" href="' . \esc_url( $href ) . '"' . $aria_current . '>' . \esc_html( (string) $p ) . '</a>';
				continue;
			}

			$html .= '<button type="button" class="' . \esc_attr( $btn_class ) . '" data-page="' . \esc_attr( (string) $p ) . '"' . $aria_current . '>' . \esc_html( (string) $p ) . '</button>';
		}

		$html .= '</nav>';

		return $html;
	}

	/**
	 * "Load more" button.
	 *
	 * Only meaningful in MODE_AJAX — appending without JavaScript is impossible,
	 * so a MODE_LINK caller is given the numbered navigation instead of a button
	 * that could not do anything.
	 *
	 * @param string $base_class  Block BEM base.
	 * @param int    $total_pages Total pages.
	 * @param array  $args        Full argument array.
	 * @return string HTML.
	 */
	private static function render_load_more( string $base_class, int $total_pages, array $args ): string {
		$mode = isset( $args['mode'] ) ? \sanitize_key( $args['mode'] ) : self::MODE_AJAX;

		if ( self::MODE_LINK === $mode ) {
			$fallback         = $args;
			$fallback['type'] = 'standard';

			return self::render_standard(
				$base_class,
				$total_pages,
				isset( $args['current_page'] ) ? \max( 1, \absint( $args['current_page'] ) ) : 1,
				self::MODE_LINK,
				$fallback
			);
		}

		$label = isset( $args['load_more_text'] ) && '' !== $args['load_more_text']
			? (string) $args['load_more_text']
			: \__( 'Load more', 'sgs-blocks' );

		return '<div class="' . \esc_attr( $base_class . '__load-more-wrap' ) . '">'
			. '<button type="button" class="' . \esc_attr( $base_class . '__load-more' ) . '" data-current-page="1" data-total-pages="' . \esc_attr( (string) $total_pages ) . '">'
			. \esc_html( $label )
			. '</button>'
			. '</div>';
	}

	/**
	 * Infinite-scroll sentinel.
	 *
	 * @param string $base_class  Block BEM base.
	 * @param int    $total_pages Total pages.
	 * @return string HTML.
	 */
	private static function render_sentinel( string $base_class, int $total_pages ): string {
		return '<div class="' . \esc_attr( $base_class . '__sentinel' ) . '" aria-hidden="true" data-current-page="1" data-total-pages="' . \esc_attr( (string) $total_pages ) . '"></div>';
	}
}
