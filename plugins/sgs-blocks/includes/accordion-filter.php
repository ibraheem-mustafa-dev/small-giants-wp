<?php
/**
 * Accordion filter: the search box, topic chips, live count and empty message above an sgs/accordion's items.
 *
 * Printed only when the accordion's `filterEnabled` is on; with it off nothing here runs and the accordion's HTML
 * is unchanged. The bar prints `hidden` and the frontend module (src/blocks/accordion/filter.js) reveals it, so with
 * no JavaScript every item shows and no dead control appears.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_accordion_filter_categories' ) ) {

	/**
	 * The distinct non-empty item categories, in first-seen order.
	 *
	 * @param iterable $inner_blocks The accordion's inner blocks.
	 * @return string[] Category labels.
	 */
	function sgs_accordion_filter_categories( $inner_blocks ): array {
		$seen = array();
		foreach ( $inner_blocks as $inner ) {
			if ( ! is_object( $inner ) || 'sgs/accordion-item' !== ( $inner->name ?? '' ) ) {
				continue;
			}
			$category = trim( (string) ( $inner->attributes['category'] ?? '' ) );
			if ( '' !== $category && ! in_array( $category, $seen, true ) ) {
				$seen[] = $category;
			}
		}
		return $seen;
	}

	/**
	 * A count template with its {count} token replaced.
	 *
	 * @param string $template Template such as "{count} answers".
	 * @param int    $count    The number to print.
	 * @return string Plain text (escape on output).
	 */
	function sgs_accordion_filter_count_text( string $template, int $count ): string {
		return str_replace( '{count}', (string) $count, $template );
	}

	/**
	 * The count line the attributes select for a number (singular for one, plural otherwise).
	 *
	 * @param array $attributes Accordion attributes.
	 * @param int   $count      The number to print.
	 * @return string Plain text (escape on output).
	 */
	function sgs_accordion_filter_count_for( array $attributes, int $count ): string {
		$plural   = (string) ( $attributes['filterCountTemplate'] ?? '' );
		$singular = (string) ( $attributes['filterCountSingular'] ?? '' );
		$plural   = '' !== trim( $plural ) ? $plural : '{count}';
		$singular = '' !== trim( $singular ) ? $singular : $plural;
		return sgs_accordion_filter_count_text( 1 === $count ? $singular : $plural, $count );
	}

	/**
	 * The filter bar HTML (search, chips, count).
	 *
	 * @param array    $attributes Accordion attributes.
	 * @param string[] $categories Distinct categories, first-seen order.
	 * @param int      $total      Number of items in the accordion.
	 * @param string   $uid        The accordion's scope class, used to make the search input id unique.
	 * @return string HTML.
	 */
	function sgs_accordion_filter_bar_html( array $attributes, array $categories, int $total, string $uid ): string {
		$show_search = ! array_key_exists( 'filterSearch', $attributes ) || ! empty( $attributes['filterSearch'] );
		$show_chips  = ( ! array_key_exists( 'filterChips', $attributes ) || ! empty( $attributes['filterChips'] ) ) && $categories;
		$search_id   = $uid . '-search';

		$out = '<div class="sgs-accordion__filter" data-sgs-accordion-filter hidden>';

		if ( $show_search ) {
			$label       = (string) ( $attributes['filterSearchLabel'] ?? '' );
			$label       = '' !== trim( $label ) ? $label : __( 'Search', 'sgs-blocks' );
			$placeholder = (string) ( $attributes['filterSearchPlaceholder'] ?? '' );
			$out        .= '<div class="sgs-accordion__search" role="search">'
				. '<label class="sgs-accordion__sr-only" for="' . esc_attr( $search_id ) . '">' . esc_html( $label ) . '</label>'
				. '<input class="sgs-accordion__search-input" type="search" id="' . esc_attr( $search_id ) . '" autocomplete="off" placeholder="' . esc_attr( $placeholder ) . '">'
				. '</div>';
		}

		if ( $show_chips ) {
			$group_label = (string) ( $attributes['filterChipsLabel'] ?? '' );
			$group_label = '' !== trim( $group_label ) ? $group_label : __( 'Filter by topic', 'sgs-blocks' );
			$all_label   = (string) ( $attributes['filterAllLabel'] ?? '' );
			$all_label   = '' !== trim( $all_label ) ? $all_label : __( 'All', 'sgs-blocks' );
			$out        .= '<div class="sgs-accordion__chips" role="group" aria-label="' . esc_attr( $group_label ) . '">'
				. '<button type="button" class="sgs-accordion__chip" aria-pressed="true" data-category="">' . esc_html( $all_label ) . '</button>';
			foreach ( $categories as $category ) {
				$out .= '<button type="button" class="sgs-accordion__chip" aria-pressed="false" data-category="' . esc_attr( $category ) . '">' . esc_html( $category ) . '</button>';
			}
			$out .= '</div>';
		}

		// The painted count is aria-hidden; the visually hidden status node speaks one settled count after a visitor's input and is empty until then.
		$plural   = (string) ( $attributes['filterCountTemplate'] ?? '' );
		$singular = (string) ( $attributes['filterCountSingular'] ?? '' );
		$out     .= '<p class="sgs-accordion__count" data-template="' . esc_attr( $plural ) . '" data-singular="' . esc_attr( $singular ) . '">'
			. '<span class="sgs-accordion__count-text" aria-hidden="true">' . esc_html( sgs_accordion_filter_count_for( $attributes, $total ) ) . '</span>'
			. '<span class="sgs-accordion__sr-only" role="status" aria-live="polite" data-sgs-accordion-live></span>'
			. '</p>';

		return $out . '</div>';
	}

	/**
	 * The empty-result node: the configured message (or a neutral one) and an optional link. Prints `hidden`.
	 *
	 * @param array $attributes Accordion attributes.
	 * @return string HTML.
	 */
	function sgs_accordion_filter_empty_html( array $attributes ): string {
		$message = trim( (string) ( $attributes['filterEmptyMessage'] ?? '' ) );
		$body    = '' !== $message ? wp_kses_post( $message ) : esc_html__( 'Nothing matches that yet.', 'sgs-blocks' );
		$link    = is_array( $attributes['filterEmptyLink'] ?? null ) ? $attributes['filterEmptyLink'] : array();
		$source  = (string) ( $link['source'] ?? '' );
		$typed   = (string) ( $link['url'] ?? '' );
		if ( '' !== $source && 'url' !== $source ) {
			require_once __DIR__ . '/helpers-link-source.php';
			$typed = sgs_resolve_link_source( $source, $typed )['url'];
		}
		$url     = esc_url( $typed );
		$text    = trim( (string) ( $link['label'] ?? '' ) );
		$anchor  = '' !== $url && '' !== $text ? ' <a class="sgs-accordion__empty-link" href="' . $url . '">' . esc_html( $text ) . '</a>' : '';
		return '<div class="sgs-accordion__empty" data-sgs-accordion-empty hidden>' . $body . $anchor . '</div>';
	}

	/**
	 * Scoped CSS for the chip, pressed-chip and count settings.
	 *
	 * @param array  $attributes Accordion attributes.
	 * @param string $root_sel   The accordion's scoped root selector.
	 * @return string CSS ('' when no setting is set).
	 */
	function sgs_accordion_filter_css( array $attributes, string $root_sel ): string {
		$colour = static function ( string $key ) use ( $attributes ): string {
			return sgs_colour_value( (string) ( $attributes[ $key ] ?? '' ) );
		};
		$rules  = array(
			'.sgs-accordion__chip'                      => array(
				'color'            => $colour( 'filterChipColour' ),
				'background-color' => $colour( 'filterChipBackground' ),
				'border-color'     => $colour( 'filterChipBorderColour' ),
				'border-radius'    => sgs_css_length_value( $attributes['filterChipRadius'] ?? '' ),
			),
			'.sgs-accordion__chip[aria-pressed="true"]' => array(
				'color'            => $colour( 'filterChipColourPressed' ),
				'background-color' => $colour( 'filterChipBackgroundPressed' ),
			),
			'.sgs-accordion__count'                     => array(
				'color' => $colour( 'filterCountColour' ),
			),
		);
		$css    = '';
		foreach ( $rules as $selector => $decls ) {
			$parts = array();
			foreach ( $decls as $prop => $value ) {
				if ( '' !== $value ) {
					$parts[] = $prop . ':' . $value;
				}
			}
			if ( $parts ) {
				$css .= $root_sel . ' ' . $selector . '{' . implode( ';', $parts ) . ';}';
			}
		}
		return $css;
	}

	/**
	 * Load the filter's script module and stylesheet; called only by an accordion with the filter on.
	 *
	 * @return void
	 */
	function sgs_accordion_filter_enqueue(): void {
		$base = defined( 'SGS_BLOCKS_PATH' ) ? SGS_BLOCKS_PATH : dirname( __DIR__ ) . '/';
		$url  = defined( 'SGS_BLOCKS_URL' ) ? SGS_BLOCKS_URL : '';

		$css = 'assets/css/accordion-filter.css';
		if ( is_file( $base . $css ) ) {
			wp_enqueue_style( 'sgs-accordion-filter', $url . $css, array(), (string) filemtime( $base . $css ) );
		}

		$js = 'build/accordion-filter/index.js';
		if ( is_file( $base . $js ) ) {
			wp_enqueue_script_module( '@sgs/accordion-filter', $url . $js, array(), (string) filemtime( $base . $js ) );
		}
	}
}
