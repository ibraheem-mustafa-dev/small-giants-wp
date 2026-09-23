<?php
/**
 * Shared slider navigation: the arrows, the progress indicator and where they sit.
 *
 * One layer for every SGS slider (design 2026-09-23 §3.6). A block renders its own rail of cards
 * and hands it to sgs_slider_nav_render(), which draws the previous/next buttons, the dots (when the
 * block uses dots), an optional leading slot (a footnote) and wraps the lot in one element whose
 * modifier classes pick the placement. Every rule lives in `assets/css/slider-nav.css`, written
 * against the generic `.sgs-slider-nav*` classes, so any slider block can adopt it; a block keeps
 * its own BEM element classes beside the generic ones for its own styling.
 *
 * Placements (`navPosition`), each proven to keep the arrows off the cards:
 *   below-end      arrows in a row under the rail, at the end; the leading slot at the start.
 *   below-center   arrows centred under the rail.
 *   below-split    previous under the start edge, next under the end edge.
 *   sides          [previous] [rail] [next] in one row: the rail shrinks, the arrows sit beside it.
 *                  Below 768px the arrows move under the rail (the below-end layout).
 *   overlay-inset  the arrows sit over the rail's own cell edges and the rail is inset by the arrow
 *                  size plus the gap, so a card never passes under an arrow, even mid-scroll.
 *
 * Progress (`pagination`): scrollbar (the rail's own scrollbar, no markup), dots, none.
 *
 * The stylesheet is enqueued on demand when a slider renders (sgs_slider_nav_enqueue_style()),
 * so a page with no slider ships none of it, and always in the block editor, where the canvas
 * preview is a server render that never runs the page's enqueue.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_slider_nav_placements' ) ) {
	/**
	 * The arrow placements, the first being the default.
	 *
	 * @return string[]
	 */
	function sgs_slider_nav_placements(): array {
		return array( 'below-end', 'below-center', 'below-split', 'sides', 'overlay-inset' );
	}
}

if ( ! function_exists( 'sgs_slider_nav_paginations' ) ) {
	/**
	 * The progress indicators, the first being the default.
	 *
	 * @return string[]
	 */
	function sgs_slider_nav_paginations(): array {
		return array( 'scrollbar', 'dots', 'none' );
	}
}

if ( ! function_exists( 'sgs_slider_nav_normalise' ) ) {
	/**
	 * A stored value when it is one of the allowed ones, otherwise the default (the first).
	 *
	 * @param mixed    $value   The stored value.
	 * @param string[] $allowed Allowed values, default first.
	 * @return string
	 */
	function sgs_slider_nav_normalise( $value, array $allowed ): string {
		return ( is_string( $value ) && in_array( $value, $allowed, true ) ) ? $value : $allowed[0];
	}
}

if ( ! function_exists( 'sgs_slider_nav_classes' ) ) {
	/**
	 * The generic wrapper classes for a placement and a progress indicator.
	 *
	 * @param string $placement  One of sgs_slider_nav_placements().
	 * @param string $pagination One of sgs_slider_nav_paginations().
	 * @return string[]
	 */
	function sgs_slider_nav_classes( string $placement, string $pagination ): array {
		return array(
			'sgs-slider-nav',
			'sgs-slider-nav--' . sgs_slider_nav_normalise( $placement, sgs_slider_nav_placements() ),
			'sgs-slider-nav--pagination-' . sgs_slider_nav_normalise( $pagination, sgs_slider_nav_paginations() ),
		);
	}
}

if ( ! function_exists( 'sgs_slider_nav_directives' ) ) {
	/**
	 * Interactivity directives as attribute markup. Only `data-wp-*` names pass; values are escaped.
	 *
	 * @param array<string, string> $directives Attribute name => value.
	 * @return string Leading-space attribute string, '' when none.
	 */
	function sgs_slider_nav_directives( array $directives ): string {
		$out = '';
		foreach ( $directives as $name => $value ) {
			if ( is_string( $name ) && 1 === preg_match( '/^data-wp-[a-z0-9-]+$/', $name ) ) {
				$out .= ' ' . $name . '="' . esc_attr( (string) $value ) . '"';
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_slider_nav_arrow_html' ) ) {
	/**
	 * One arrow button: the block's own element classes beside the generic ones.
	 *
	 * @param string                $direction  'prev' or 'next'.
	 * @param string                $block      The block's root class, e.g. 'sgs-google-reviews'.
	 * @param string                $label      Accessible name.
	 * @param array<string, string> $directives Interactivity directives.
	 * @return string
	 */
	function sgs_slider_nav_arrow_html( string $direction, string $block, string $label, array $directives ): string {
		$direction = 'next' === $direction ? 'next' : 'prev';
		$path      = 'next' === $direction
			? 'M8.6 7.4 10 6l6 6-6 6-1.4-1.4 4.6-4.6z'
			: 'M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z';
		$classes   = array(
			$block . '__arrow',
			$block . '__arrow--' . $direction,
			'sgs-slider-nav__arrow',
			'sgs-slider-nav__arrow--' . $direction,
		);
		return '<button class="' . esc_attr( implode( ' ', $classes ) ) . '" type="button"'
			. sgs_slider_nav_directives( $directives )
			. ' aria-label="' . esc_attr( $label ) . '">'
			. '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="' . $path . '"/></svg>'
			. '</button>';
	}
}

if ( ! function_exists( 'sgs_slider_nav_dots_html' ) ) {
	/**
	 * The dots: one button per item, the first marked current.
	 *
	 * @param int                   $count      Number of items.
	 * @param string                $block      The block's root class.
	 * @param string                $label      Accessible name of the group.
	 * @param string                $dot_label  Accessible name of one dot, with %d for its 1-based number.
	 * @param array<string, string> $directives Interactivity directives on every dot.
	 * @return string
	 */
	function sgs_slider_nav_dots_html( int $count, string $block, string $label, string $dot_label, array $directives ): string {
		$out = '<div class="' . esc_attr( $block . '__dots sgs-slider-nav__dots' ) . '" role="tablist" aria-label="' . esc_attr( $label ) . '">';
		for ( $i = 0; $i < $count; $i++ ) {
			$current = 0 === $i;
			$out    .= '<button class="' . esc_attr( $block . '__dot sgs-slider-nav__dot' . ( $current ? ' is-active' : '' ) ) . '" type="button" role="tab"'
				. ( $current ? ' aria-current="true"' : '' )
				. ' aria-selected="' . ( $current ? 'true' : 'false' ) . '"'
				. ' data-sgs-index="' . esc_attr( (string) $i ) . '"'
				. sgs_slider_nav_directives( $directives )
				. ' aria-label="' . esc_attr( sprintf( $dot_label, $i + 1 ) ) . '"></button>';
		}
		return $out . '</div>';
	}
}

if ( ! function_exists( 'sgs_slider_nav_render' ) ) {
	/**
	 * The whole navigation: rail, arrows, leading slot and dots, in reading order for the placement.
	 *
	 * The DOM order follows what is seen: beside-the-rail placements put the previous button first,
	 * under-the-rail placements put the rail first, so keyboard order matches the visual order.
	 *
	 * @param array<string, mixed> $args {
	 *     The navigation's settings and parts.
	 *
	 *     @type string   $placement      One of sgs_slider_nav_placements().
	 *     @type string   $pagination     One of sgs_slider_nav_paginations().
	 *     @type bool     $show_arrows    Draw the previous/next buttons.
	 *     @type string   $block          The block's root class (BEM block name).
	 *     @type string   $rail_html      The rail, already rendered and escaped by the block. It must carry
	 *                                    the class sgs-slider-nav__rail.
	 *     @type string   $lead_html      Optional leading slot (a footnote), already escaped.
	 *     @type int      $count          Number of items (for the dots).
	 *     @type string[] $labels         prev, next, dots, dot (dot has %d).
	 *     @type array    $prev_directives Interactivity directives on the previous button.
	 *     @type array    $next_directives Interactivity directives on the next button.
	 *     @type array    $dot_directives  Interactivity directives on every dot.
	 * }
	 * @return string
	 */
	function sgs_slider_nav_render( array $args ): string {
		$block      = sanitize_html_class( (string) ( $args['block'] ?? 'sgs-slider' ) );
		$placement  = sgs_slider_nav_normalise( $args['placement'] ?? '', sgs_slider_nav_placements() );
		$pagination = sgs_slider_nav_normalise( $args['pagination'] ?? '', sgs_slider_nav_paginations() );
		$labels     = (array) ( $args['labels'] ?? array() );
		$arrows     = ! empty( $args['show_arrows'] );

		$prev = $arrows ? sgs_slider_nav_arrow_html( 'prev', $block, (string) ( $labels['prev'] ?? __( 'Previous', 'sgs-blocks' ) ), (array) ( $args['prev_directives'] ?? array() ) ) : '';
		$next = $arrows ? sgs_slider_nav_arrow_html( 'next', $block, (string) ( $labels['next'] ?? __( 'Next', 'sgs-blocks' ) ), (array) ( $args['next_directives'] ?? array() ) ) : '';
		$dots = 'dots' === $pagination
			? sgs_slider_nav_dots_html(
				max( 0, (int) ( $args['count'] ?? 0 ) ),
				$block,
				(string) ( $labels['dots'] ?? __( 'Slide pagination', 'sgs-blocks' ) ),
				/* translators: %d: slide number, starting at 1. */
				(string) ( $labels['dot'] ?? __( 'Go to slide %d', 'sgs-blocks' ) ),
				(array) ( $args['dot_directives'] ?? array() )
			)
			: '';
		$rail = (string) ( $args['rail_html'] ?? '' );
		$lead = (string) ( $args['lead_html'] ?? '' );

		if ( in_array( $placement, array( 'sides', 'overlay-inset' ), true ) ) {
			$inner = $prev . $rail . $next . $lead;
		} elseif ( 'below-split' === $placement ) {
			$inner = $rail . $prev . $lead . $next;
		} else {
			$inner = $rail . $lead . $prev . $next;
		}

		$classes = array_merge( array( $block . '__slider' ), sgs_slider_nav_classes( $placement, $pagination ) );
		if ( ! $arrows ) {
			$classes[] = 'sgs-slider-nav--no-arrows';
		}
		return '<div class="' . esc_attr( implode( ' ', $classes ) ) . '">' . $inner . $dots . '</div>';
	}
}

if ( ! function_exists( 'sgs_slider_nav_enqueue_style' ) ) {
	/**
	 * Enqueue the shared stylesheet. Called by a slider block's render when its navigation renders.
	 *
	 * A block theme renders the content before the head assets print, so enqueueing from render
	 * still lands in the head. The handle is registered here on first use.
	 *
	 * @return void
	 */
	function sgs_slider_nav_enqueue_style(): void {
		wp_enqueue_style(
			'sgs-slider-nav',
			plugins_url( 'assets/css/slider-nav.css', SGS_BLOCKS_PATH . 'sgs-blocks.php' ),
			array(),
			defined( 'SGS_BLOCKS_VERSION' ) ? SGS_BLOCKS_VERSION : false
		);
	}
}

if ( ! function_exists( 'sgs_slider_nav_editor_assets' ) ) {
	/**
	 * Editor: the canvas preview is a server render, which never runs the page's enqueue, so the
	 * stylesheet is always loaded into the editor canvas.
	 *
	 * @return void
	 */
	function sgs_slider_nav_editor_assets(): void {
		if ( is_admin() ) {
			sgs_slider_nav_enqueue_style();
		}
	}
	add_action( 'enqueue_block_assets', 'sgs_slider_nav_editor_assets' );
}
