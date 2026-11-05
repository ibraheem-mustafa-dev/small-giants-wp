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
			$icon_name   = trim( (string) ( $attributes['filterSearchIcon'] ?? '' ) );
			$icon_markup = '';
			if ( '' !== $icon_name ) {
				require_once __DIR__ . '/lucide-icons.php';
				$icon_markup = sgs_get_lucide_icon( $icon_name );
			}
			$out        .= '<div class="sgs-accordion__search' . ( '' !== $icon_markup ? ' sgs-accordion__search--has-icon' : '' ) . '" role="search">'
				. '<label class="sgs-accordion__sr-only" for="' . esc_attr( $search_id ) . '">' . esc_html( $label ) . '</label>'
				. ( '' !== $icon_markup ? '<span class="sgs-accordion__search-icon" aria-hidden="true">' . $icon_markup . '</span>' : '' ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_get_lucide_icon() returns pre-sanitised SVG markup.
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
	 * Scoped CSS for the chip, selected-chip, count, chip-row and search-box settings.
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
			'.sgs-accordion__search-input'              => array(
				'background-color' => $colour( 'filterSearchBackground' ),
			),
			'.sgs-accordion__search-icon'               => array(
				'color' => $colour( 'filterSearchIconColour' ),
			),
			'.sgs-accordion__search'                    => array(
				'--sgs-accordion-search-icon-size' => sgs_css_single_length_value( (string) ( $attributes['filterSearchIconSize'] ?? '' ) ),
			),
		);

		// Selector => ready "prop:value" declarations.
		$lists = array();
		foreach ( $rules as $selector => $decls ) {
			foreach ( $decls as $prop => $value ) {
				if ( '' !== $value ) {
					$lists[ $selector ][] = $prop . ':' . $value;
				}
			}
		}

		// The chips (resting and selected) and the search box take the shared layered shadow; the selected chip also takes an offset
		// through the individual `translate` property, so the chip's hover `transform` is untouched.
		$resting_sh = sgs_shadow_decls(
			$attributes,
			array(
				'base'   => 'filterChipShadow',
				'colour' => 'filterChipShadowColour',
			),
			'sgs/accordion'
		)['normal'];
		foreach ( $resting_sh as $decl ) {
			$lists['.sgs-accordion__chip'][] = $decl;
		}
		$selected = '.sgs-accordion__chip[aria-pressed="true"]';
		$chip_sh  = sgs_shadow_decls(
			$attributes,
			array(
				'base'   => 'filterChipSelectedShadow',
				'colour' => 'filterChipSelectedShadowColour',
			),
			'sgs/accordion'
		)['normal'];
		foreach ( $chip_sh as $decl ) {
			$lists[ $selected ][] = $decl;
		}
		$offset_x = sgs_css_length_value( (string) ( $attributes['filterChipSelectedOffsetX'] ?? '' ) );
		$offset_y = sgs_css_length_value( (string) ( $attributes['filterChipSelectedOffsetY'] ?? '' ) );
		if ( '' !== $offset_x || '' !== $offset_y ) {
			$lists[ $selected ][] = 'translate:' . ( '' !== $offset_x ? $offset_x : '0' ) . ' ' . ( '' !== $offset_y ? $offset_y : '0' );
		}
		$search_sh = sgs_shadow_decls(
			$attributes,
			array(
				'base'   => 'filterSearchShadow',
				'colour' => 'filterSearchShadowColour',
			),
			'sgs/accordion'
		)['normal'];
		foreach ( $search_sh as $decl ) {
			$lists['.sgs-accordion__search-input'][] = $decl;
		}

		$css = '';
		foreach ( $lists as $selector => $parts ) {
			$css .= $root_sel . ' ' . $selector . '{' . implode( ';', $parts ) . ';}';
		}
		return $css . sgs_accordion_filter_tier_css( $attributes, $root_sel );
	}

	/**
	 * Per-device CSS for the chip row, the chips' text size and the search box's height, padding and text size.
	 *
	 * Every setting is a `{desktop,tablet,mobile}` object read through sgs_emit_responsive_css; an unset one prints nothing.
	 * A "nowrap" tier is a one-row scrolling lane: the row scrolls sideways and each chip keeps its own width.
	 *
	 * @param array  $attributes Accordion attributes.
	 * @param string $root_sel   The accordion's scoped root selector.
	 * @return string CSS ('' when no setting is set).
	 */
	function sgs_accordion_filter_tier_css( array $attributes, string $root_sel ): string {
		$tier = static function ( string $key ) use ( $attributes ): array {
			return is_array( $attributes[ $key ] ?? null ) ? $attributes[ $key ] : array();
		};
		$pick = static function ( array $map ): callable {
			return static function ( $raw ) use ( $map ) {
				return ( is_string( $raw ) && isset( $map[ $raw ] ) ) ? $map[ $raw ] : '';
			};
		};
		$wrap = $tier( 'filterChipsWrap' );
		// Auto margins in the bar's flex column shrink a box to its content, so a box with a cap or an alignment also takes the full width up to the cap.
		$search_fill = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$capped = '' !== trim( (string) ( $tier( 'filterSearchMaxWidth' )[ $device ] ?? '' ) ) || '' !== trim( (string) ( $tier( 'filterSearchAlign' )[ $device ] ?? '' ) );
			if ( $capped ) {
				$search_fill[ $device ] = 'fill';
			}
		}

		$rules = array(
			'.sgs-accordion__chips'        => array(
				array(
					'value'     => $wrap,
					'css'       => 'flex-wrap',
					'transform' => $pick(
						array(
							'wrap'   => 'wrap',
							'nowrap' => 'nowrap',
						)
					),
				),
				array(
					'value'     => $wrap,
					'css'       => 'overflow-x',
					'transform' => $pick(
						array(
							'wrap'   => 'visible',
							'nowrap' => 'auto',
						)
					),
				),
				array(
					'value'     => $tier( 'filterChipsJustify' ),
					'css'       => 'justify-content',
					'transform' => $pick(
						array(
							'left'   => 'flex-start',
							'center' => 'center',
							'right'  => 'flex-end',
						)
					),
				),
				array(
					'value'        => $tier( 'filterChipsPadding' ),
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			),
			'.sgs-accordion__chip'         => array(
				array(
					'value'     => $wrap,
					'css'       => 'flex',
					'transform' => $pick(
						array(
							'wrap'   => '0 1 auto',
							'nowrap' => 'none',
						)
					),
				),
				array(
					'value'     => $wrap,
					'css'       => 'white-space',
					'transform' => $pick(
						array(
							'wrap'   => 'normal',
							'nowrap' => 'nowrap',
						)
					),
				),
				array(
					'value' => $tier( 'filterChipFontSize' ),
					'css'   => 'font-size',
				),
			),
			'.sgs-accordion__search'       => array(
				array(
					'value'     => $search_fill,
					'css'       => 'width',
					'transform' => $pick( array( 'fill' => '100%' ) ),
				),
				array(
					'value' => $tier( 'filterSearchMaxWidth' ),
					'css'   => 'max-width',
				),
				array(
					'value'     => $tier( 'filterSearchAlign' ),
					'css'       => 'margin-inline',
					'transform' => $pick(
						array(
							'left'   => '0 auto',
							'center' => 'auto',
							'right'  => 'auto 0',
						)
					),
				),
			),
			'.sgs-accordion__search-input' => array(
				array(
					'value' => $tier( 'filterSearchHeight' ),
					'css'   => 'min-height',
				),
				array(
					'value'        => $tier( 'filterSearchPadding' ),
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
				array(
					'value' => $tier( 'filterSearchFontSize' ),
					'css'   => 'font-size',
				),
			),
		);
		$css   = '';
		foreach ( $rules as $selector => $specs ) {
			$css .= sgs_emit_responsive_css( $root_sel . ' ' . $selector, $specs );
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
