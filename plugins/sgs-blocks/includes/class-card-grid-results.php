<?php
/**
 * Card Grid results: the pagination and empty-state message a products-mode sgs/card-grid prints, shared by its page
 * render (`src/blocks/card-grid/render-delegated.php`) and the editor canvas's route (`Card_Grid_Items_Rest`), so the
 * editor shows what the page prints.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-grid-pagination.php';

/**
 * Pagination and empty-state markup inputs for a products-mode grid.
 */
final class Card_Grid_Results {

	/**
	 * The grid's pagination markup: collection mode only (wc-product never paginates), '' for a single page or none set.
	 *
	 * @param array<string,mixed> $attributes  The grid's attributes.
	 * @param string              $uid         The grid's instance class (its per-instance page query arg).
	 * @param int                 $total_pages Result pages.
	 * @param int                 $paged       The current page.
	 * @param string              $mode        Grid_Pagination::MODE_LINK on the page (real links); MODE_AJAX in the editor
	 *                                         (inert buttons, so the canvas never navigates away).
	 * @return string HTML, escaped by Grid_Pagination::render().
	 */
	public static function pagination( array $attributes, string $uid, int $total_pages, int $paged, string $mode ): string {
		if ( 'cpt-collection' !== ( $attributes['source'] ?? '' ) ) {
			return '';
		}
		return Grid_Pagination::render(
			array(
				'base_class'   => 'sgs-card-grid',
				'type'         => \sanitize_key( (string) ( $attributes['pagination'] ?? 'none' ) ),
				'total_pages'  => $total_pages,
				'current_page' => $paged,
				'mode'         => $mode,
				'page_var'     => Grid_Pagination::page_var( $uid ),
				'nav_label'    => \__( 'Collection pagination', 'sgs-blocks' ),
			)
		);
	}

	/**
	 * The message shown when nothing matches: the client's (collection mode `emptyMessage`, products mode
	 * `productEmptyMessage`); with none set, nothing on the page and a notice in the editor.
	 *
	 * @param array<string,mixed> $attributes The grid's attributes.
	 * @param bool                $frontend   The page (true) or the editor (false).
	 * @return string Plain text; the caller escapes it.
	 */
	public static function empty_message( array $attributes, bool $frontend ): string {
		$key     = 'cpt-collection' === ( $attributes['source'] ?? '' ) ? 'emptyMessage' : 'productEmptyMessage';
		$message = trim( \sanitize_text_field( (string) ( $attributes[ $key ] ?? '' ) ) );
		if ( '' === $message && ! $frontend ) {
			return \__( 'Nothing to show yet. Visitors see nothing here unless you set an empty-state message.', 'sgs-blocks' );
		}
		return $message;
	}
}
