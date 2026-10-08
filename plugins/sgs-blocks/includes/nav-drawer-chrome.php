<?php
/**
 * Nav drawer chrome row (Spec 36 FR-36-6): the band at the top of the
 * `sgs/nav-drawer` dialog that carries the × close, an optional per-device
 * logo and ONE optional free slot (heading, label, text or button).
 *
 * The row is fixed dialog chrome rendered from attributes, never InnerBlocks,
 * so the × stays undeletable by construction and the logo and slot never
 * duplicate a block in the editable body. The × stays FIRST in the DOM (the
 * store's focus-into lands on it) and CSS `order` places it at the row's end.
 * The row's CSS lives in `nav-drawer-chrome-css.php`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/nav-drawer-chrome-css.php';

if ( ! function_exists( 'sgs_nav_drawer_chrome_logo_urls' ) ) {
	/**
	 * The logo URL per tier, art-directed like `sgs/responsive-logo`: an
	 * attachment ID wins over the stored URL, tablet falls back to desktop and
	 * mobile to tablet.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{desktop:string,tablet:string,mobile:string,id:int}
	 */
	function sgs_nav_drawer_chrome_logo_urls( array $attributes ): array {
		$own = array();
		$ids = array();
		foreach ( array(
			'desktop' => '',
			'tablet'  => 'Tablet',
			'mobile'  => 'Mobile',
		) as $tier => $suffix ) {
			$id           = absint( $attributes[ 'chromeLogoId' . $suffix ] ?? 0 );
			$url          = $id > 0 ? (string) wp_get_attachment_url( $id ) : '';
			$url          = '' !== $url ? $url : (string) ( $attributes[ 'chromeLogoUrl' . $suffix ] ?? '' );
			$own[ $tier ] = esc_url_raw( $url );
			$ids[ $tier ] = '' !== $own[ $tier ] ? $id : 0;
		}
		$tablet = '' !== $own['tablet'] ? $own['tablet'] : $own['desktop'];
		$mobile = '' !== $own['mobile'] ? $own['mobile'] : $tablet;
		$id     = $ids['desktop'] > 0 ? $ids['desktop'] : ( $ids['tablet'] > 0 ? $ids['tablet'] : $ids['mobile'] );
		return array(
			'desktop' => $own['desktop'],
			'tablet'  => $tablet,
			'mobile'  => $mobile,
			'id'      => $id,
		);
	}
}

if ( ! function_exists( 'sgs_nav_drawer_chrome_logo_html' ) ) {
	/**
	 * The logo: a `<picture>` whose sources swap the image per device, linked
	 * home unless the operator turned the link off.
	 *
	 * @param array $attributes Block attributes.
	 * @param array $urls       From sgs_nav_drawer_chrome_logo_urls().
	 * @return string Trusted markup, or '' when no tier has a logo.
	 */
	function sgs_nav_drawer_chrome_logo_html( array $attributes, array $urls ): string {
		$src = '' !== $urls['desktop'] ? $urls['desktop'] : ( '' !== $urls['tablet'] ? $urls['tablet'] : $urls['mobile'] );
		if ( '' === $src ) {
			return '';
		}

		$alt = trim( (string) ( $attributes['chromeLogoAlt'] ?? '' ) );
		if ( '' === $alt && $urls['id'] > 0 ) {
			$alt = trim( (string) get_post_meta( $urls['id'], '_wp_attachment_image_alt', true ) );
		}

		$dims = '';
		if ( $urls['id'] > 0 ) {
			$meta = wp_get_attachment_image_src( $urls['id'], 'full' );
			if ( is_array( $meta ) && ! empty( $meta[1] ) && ! empty( $meta[2] ) ) {
				$dims = sprintf( ' width="%d" height="%d"', (int) $meta[1], (int) $meta[2] );
			}
		}

		$sources = '';
		if ( $urls['mobile'] !== $urls['tablet'] && '' !== $urls['mobile'] ) {
			$sources .= sprintf( '<source media="(max-width: %dpx)" srcset="%s">', SGS_Breakpoints::MOBILE_MAX, esc_url( $urls['mobile'] ) );
		}
		if ( $urls['tablet'] !== $src && '' !== $urls['tablet'] ) {
			$sources .= sprintf( '<source media="(max-width: %dpx)" srcset="%s">', SGS_Breakpoints::TABLET_MAX, esc_url( $urls['tablet'] ) );
		}

		$linked  = ! array_key_exists( 'chromeLogoLink', $attributes ) || ! empty( $attributes['chromeLogoLink'] );
		$picture = sprintf(
			'<picture class="sgs-nav-drawer__chrome-logo-picture">%1$s<img class="sgs-nav-drawer__chrome-logo-image" src="%2$s" alt="%3$s"%4$s loading="lazy" decoding="async"></picture>',
			$sources, // Built from esc_url() values above.
			esc_url( $src ),
			esc_attr( $alt ),
			$dims
		);

		if ( ! $linked ) {
			return '<span class="sgs-nav-drawer__chrome-logo">' . $picture . '</span>';
		}

		// A linked logo needs a name: its alt text, else "<site name> home".
		$label = '' === $alt
			? sprintf(
				' aria-label="%s"',
				esc_attr(
					sprintf(
						/* translators: %s: the site name. */
						__( '%s home', 'sgs-blocks' ),
						get_bloginfo( 'name' )
					)
				)
			)
			: '';
		return sprintf(
			'<a class="sgs-nav-drawer__chrome-logo" href="%1$s"%2$s>%3$s</a>',
			esc_url( home_url( '/' ) ),
			$label,
			$picture
		);
	}
}

if ( ! function_exists( 'sgs_nav_drawer_chrome_slot_types' ) ) {
	/**
	 * Every `chromeSlotType` value; '' is "no slot". Mirrors block.json's enum.
	 *
	 * @return array<int,string>
	 */
	function sgs_nav_drawer_chrome_slot_types(): array {
		return array( '', 'heading', 'label', 'text', 'button' );
	}
}

if ( ! function_exists( 'sgs_nav_drawer_chrome_slot_html' ) ) {
	/**
	 * The free slot: one heading, label, text or button. A button with no
	 * link renders nothing (a button that goes nowhere is not a control).
	 *
	 * @param array $attributes Block attributes.
	 * @return string Trusted markup, or '' when the slot is off or empty.
	 */
	function sgs_nav_drawer_chrome_slot_html( array $attributes ): string {
		$type = (string) ( $attributes['chromeSlotType'] ?? '' );
		$text = trim( (string) ( $attributes['chromeSlotText'] ?? '' ) );
		if ( '' === $type || '' === $text || ! in_array( $type, sgs_nav_drawer_chrome_slot_types(), true ) ) {
			return '';
		}

		$placement = (string) ( $attributes['chromeSlotPlacement'] ?? 'after-logo' );
		$placement = in_array( $placement, array( 'after-logo', 'center', 'end' ), true ) ? $placement : 'after-logo';
		$class     = 'sgs-nav-drawer__chrome-slot sgs-nav-drawer__chrome-slot--' . $type . ' sgs-nav-drawer__chrome-slot--at-' . $placement;

		if ( 'button' === $type ) {
			$url = esc_url( (string) ( $attributes['chromeSlotUrl'] ?? '' ) );
			if ( '' === $url ) {
				return '';
			}
			$new_tab = ! empty( $attributes['chromeSlotNewTab'] );
			return sprintf(
				'<a class="%1$s" href="%2$s"%3$s>%4$s%5$s</a>',
				esc_attr( $class ),
				$url,
				$new_tab ? ' target="_blank" rel="noopener"' : '',
				esc_html( $text ),
				$new_tab ? '<span class="screen-reader-text"> ' . esc_html__( '(opens in a new tab)', 'sgs-blocks' ) . '</span>' : ''
			);
		}

		$tags = array(
			'label' => 'span',
			'text'  => 'p',
		);
		$tag  = $tags[ $type ] ?? 'h2';
		if ( 'heading' === $type ) {
			$level = (string) ( $attributes['chromeSlotHeadingLevel'] ?? 'h2' );
			$tag   = in_array( $level, array( 'h2', 'h3', 'h4', 'p' ), true ) ? $level : 'h2';
		}
		return sprintf( '<%1$s class="%2$s">%3$s</%1$s>', $tag, esc_attr( $class ), esc_html( $text ) );
	}
}

if ( ! function_exists( 'sgs_nav_drawer_chrome_rating_attrs' ) ) {
	/**
	 * The `sgs/google-rating-badge` attributes for the top-row rating: a compact
	 * pill with no frame (no border, transparent ground, no inline padding; the
	 * badge keeps its 44px minimum height), never switched to compact mode, with
	 * the review count only when the author asked for it. `chromeRatingColour`,
	 * when set, paints the score and caption. The rating, count and link are not
	 * passed, so the badge reads them from Site Info (or live Google data). The
	 * editor preview sends the same object.
	 *
	 * @param array $attributes Block attributes.
	 * @return array<string,mixed> The badge's attributes.
	 */
	function sgs_nav_drawer_chrome_rating_attrs( array $attributes ): array {
		$badge  = array(
			'badgeStyle'       => 'pill',
			'compactBelow'     => 0,
			'showCount'        => ! empty( $attributes['chromeRatingShowCount'] ),
			'borderStyle'      => 'none',
			'borderWidth'      => array(
				'top'    => '0',
				'right'  => '0',
				'bottom' => '0',
				'left'   => '0',
			),
			'backgroundColour' => 'transparent',
			'padding'          => array(
				'desktop' => array(
					'right' => '0',
					'left'  => '0',
				),
			),
		);
		$colour = trim( (string) ( $attributes['chromeRatingColour'] ?? '' ) );
		if ( '' !== $colour ) {
			$badge['scoreColour']   = $colour;
			$badge['captionColour'] = $colour;
		}
		return $badge;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_chrome_rating_html' ) ) {
	/**
	 * The top-row Google rating: the `sgs/google-rating-badge` block in its own
	 * wrapper, independent of the free slot so a heading and the rating share
	 * one row.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Trusted markup, or '' when the rating is off or there is no rating to show.
	 */
	function sgs_nav_drawer_chrome_rating_html( array $attributes ): string {
		if ( empty( $attributes['chromeRating'] ) ) {
			return '';
		}
		$placement = 'center' === ( $attributes['chromeRatingPlacement'] ?? 'end' ) ? 'center' : 'end';
		$badge     = trim(
			render_block(
				array(
					'blockName'    => 'sgs/google-rating-badge',
					'attrs'        => sgs_nav_drawer_chrome_rating_attrs( $attributes ),
					'innerBlocks'  => array(),
					'innerHTML'    => '',
					'innerContent' => array(),
				)
			)
		);
		if ( '' === $badge ) {
			return '';
		}
		return '<div class="sgs-nav-drawer__chrome-rating sgs-nav-drawer__chrome-rating--at-' . $placement . '">' . $badge . '</div>';
	}
}

if ( ! function_exists( 'sgs_nav_drawer_chrome' ) ) {
	/**
	 * Wrap the × in the chrome row, add the logo and slot, and append the
	 * row's scoped CSS to the drawer's own stylesheet string.
	 *
	 * A row holding only the × (no logo, slot or rating) carries `--close-only`, so the FR-36-6
	 * `trigger` predicate (render.php) can drop the whole row when the burger
	 * is the live close control: an empty row renders nothing and costs no space.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The drawer's scoped root selector.
	 * @param string $close_html The × button markup (trusted).
	 * @param string $css        The drawer's scoped CSS, appended to.
	 * @return string The row markup (trusted).
	 */
	function sgs_nav_drawer_chrome( array $attributes, string $root_sel, string $close_html, string &$css ): string {
		$urls = sgs_nav_drawer_chrome_logo_urls( $attributes );
		$logo = sgs_nav_drawer_chrome_logo_html( $attributes, $urls );
		$slot   = sgs_nav_drawer_chrome_slot_html( $attributes );
		$rating = sgs_nav_drawer_chrome_rating_html( $attributes );

		$css .= sgs_nav_drawer_chrome_css( $attributes, $root_sel, $urls, '' !== $logo, '' !== $slot, '' !== $rating );

		$class = 'sgs-nav-drawer__chrome' . ( '' === $logo && '' === $slot && '' === $rating ? ' sgs-nav-drawer__chrome--close-only' : '' );
		return '<div class="' . esc_attr( $class ) . '">' . $close_html . $logo . $slot . $rating . '</div>';
	}
}
