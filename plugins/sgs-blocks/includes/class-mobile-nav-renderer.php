<?php
/**
 * Mobile Navigation Renderer.
 *
 * Parses the header template part to extract navigation items from the
 * wp:navigation block, then renders mobile-optimised accordion HTML.
 * Handles core/navigation-link, core/navigation-submenu, and sgs/mega-menu
 * inner blocks.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/lucide-icons.php';
require_once __DIR__ . '/render-helpers.php';

/**
 * Class Mobile_Nav_Renderer
 */
class SGS_Mobile_Nav_Renderer {

	/**
	 * Running index for stagger animation CSS custom property.
	 *
	 * @var int
	 */
	private int $stagger_index = 0;

	/**
	 * Block attributes from the sgs/mobile-nav block.
	 *
	 * @var array
	 */
	private array $attributes = [];

	/**
	 * Constructor.
	 *
	 * @param array $attributes Block attributes.
	 */
	public function __construct( array $attributes = [] ) {
		$this->attributes = $attributes;
	}

	/**
	 * Get navigation inner blocks from the header template part.
	 *
	 * Loads the header template part, parses it, and recursively searches
	 * for the core/navigation block. If the navigation uses a ref attribute
	 * (pointing to a wp_navigation post), loads that post's content instead.
	 *
	 * @return array Array of parsed inner blocks from the navigation.
	 */
	public function get_nav_blocks(): array {
		$template = get_block_template(
			get_stylesheet() . '//header',
			'wp_template_part'
		);

		if ( ! $template || empty( $template->content ) ) {
			return $this->get_fallback_nav_blocks();
		}

		$blocks    = parse_blocks( $template->content );
		$nav_block = $this->find_block_recursive( $blocks, 'core/navigation' );

		if ( ! $nav_block ) {
			return $this->get_fallback_nav_blocks();
		}

		// If navigation uses a ref (saved wp_navigation post), load that.
		if ( ! empty( $nav_block['attrs']['ref'] ) ) {
			$nav_post = get_post( (int) $nav_block['attrs']['ref'] );
			if ( $nav_post && 'wp_navigation' === $nav_post->post_type ) {
				return parse_blocks( $nav_post->post_content );
			}
		}

		// If the block has inline inner blocks, use those.
		if ( ! empty( $nav_block['innerBlocks'] ) ) {
			return $nav_block['innerBlocks'];
		}

		// Self-closing wp:navigation with no ref and no innerBlocks — WordPress
		// resolves this at render time from the most recent wp_navigation post.
		// Mirror that behaviour here.
		return $this->get_fallback_nav_blocks();
	}

	/**
	 * Get navigation blocks from the most recent wp_navigation post.
	 *
	 * When wp:navigation has no ref and no inner blocks, WordPress uses the
	 * most recently published wp_navigation post. This mirrors that fallback.
	 *
	 * @return array Parsed inner blocks from the navigation post.
	 */
	private function get_fallback_nav_blocks(): array {
		$nav_posts = get_posts( [
			'post_type'      => 'wp_navigation',
			'posts_per_page' => 1,
			'orderby'        => 'date',
			'order'          => 'DESC',
			'post_status'    => 'publish',
			'no_found_rows'  => true,
		] );

		if ( empty( $nav_posts ) || empty( $nav_posts[0]->post_content ) ) {
			return [];
		}

		return parse_blocks( $nav_posts[0]->post_content );
	}

	/**
	 * Recursively find a block by name in a parsed blocks array.
	 *
	 * parse_blocks() is shallow — this walks innerBlocks at every level.
	 *
	 * @param array  $blocks     Parsed blocks array.
	 * @param string $block_name Block name to find (e.g. 'core/navigation').
	 * @return array|null The found block or null.
	 */
	private function find_block_recursive( array $blocks, string $block_name ): ?array {
		foreach ( $blocks as $block ) {
			if ( ( $block['blockName'] ?? '' ) === $block_name ) {
				return $block;
			}
			if ( ! empty( $block['innerBlocks'] ) ) {
				$found = $this->find_block_recursive( $block['innerBlocks'], $block_name );
				if ( $found ) {
					return $found;
				}
			}
		}
		return null;
	}

	/**
	 * Render all navigation inner blocks as mobile menu HTML.
	 *
	 * @param array $nav_blocks Inner blocks from the navigation.
	 * @return string HTML for the menu items list.
	 */
	public function render_menu_items( array $nav_blocks ): string {
		$this->stagger_index = 0;
		$items               = '';

		foreach ( $nav_blocks as $block ) {
			$name = $block['blockName'] ?? '';

			switch ( $name ) {
				case 'core/navigation-link':
					$items .= $this->render_nav_link( $block );
					break;

				case 'core/navigation-submenu':
					$items .= $this->render_nav_submenu( $block );
					break;

				case 'sgs/mega-menu':
					$items .= $this->render_mega_menu_item( $block );
					break;

				case 'core/home-link':
					$items .= $this->render_home_link( $block );
					break;

				default:
					// Skip unknown block types (spacers, separators, etc.).
					break;
			}
		}

		return $items;
	}

	/**
	 * Render a simple navigation link.
	 *
	 * @param array $block Parsed block data.
	 * @return string HTML.
	 */
	private function render_nav_link( array $block ): string {
		$label = $block['attrs']['label'] ?? '';
		$url   = $block['attrs']['url'] ?? '#';
		$index = $this->stagger_index++;

		$is_current = $this->is_current_url( $url );
		$classes    = 'sgs-mobile-nav__item';
		if ( $is_current ) {
			$classes .= ' sgs-mobile-nav__item--current';
		}

		return sprintf(
			'<li class="%s" style="--i:%d"><a href="%s" class="sgs-mobile-nav__link"%s>%s</a></li>',
			esc_attr( $classes ),
			$index,
			esc_url( $url ),
			$is_current ? ' aria-current="page"' : '',
			wp_kses_post( $label )
		);
	}

	/**
	 * Render a navigation submenu with accordion toggle.
	 *
	 * @param array $block Parsed block data.
	 * @return string HTML.
	 */
	private function render_nav_submenu( array $block ): string {
		$label = $block['attrs']['label'] ?? '';
		$url   = $block['attrs']['url'] ?? '#';
		$index = $this->stagger_index++;
		$id    = wp_unique_id( 'sgs-mn-sub-' );

		// Build child links.
		$children = '';
		foreach ( ( $block['innerBlocks'] ?? [] ) as $child ) {
			$child_name = $child['blockName'] ?? '';
			if ( 'core/navigation-link' === $child_name ) {
				$child_label = $child['attrs']['label'] ?? '';
				$child_url   = $child['attrs']['url'] ?? '#';
				$children   .= sprintf(
					'<li class="sgs-mobile-nav__subitem"><a href="%s" class="sgs-mobile-nav__sublink">%s</a></li>',
					esc_url( $child_url ),
					wp_kses_post( $child_label )
				);
			}
		}

		// "View All" link at top of submenu (Baymard: missing on 76% of sites).
		$view_all = '';
		if ( '#' !== $url && $url ) {
			$view_all = sprintf(
				'<li class="sgs-mobile-nav__subitem sgs-mobile-nav__subitem--view-all"><a href="%s" class="sgs-mobile-nav__sublink">%s</a></li>',
				esc_url( $url ),
				esc_html__( 'View All', 'sgs-blocks' )
			);
		}

		$chevron_svg = sgs_get_lucide_icon( 'chevron-down' );

		return sprintf(
			'<li class="sgs-mobile-nav__item sgs-mobile-nav__item--has-children" style="--i:%d">' .
				'<div class="sgs-mobile-nav__row">' .
					'<a href="%s" class="sgs-mobile-nav__link">%s</a>' .
					'<button class="sgs-mobile-nav__toggle" type="button" aria-expanded="false" aria-controls="%s" aria-label="%s">' .
						'<span class="sgs-mobile-nav__chevron" aria-hidden="true">%s</span>' .
					'</button>' .
				'</div>' .
				'<ul id="%s" class="sgs-mobile-nav__submenu" role="group" hidden>%s%s</ul>' .
			'</li>',
			$index,
			esc_url( $url ),
			wp_kses_post( $label ),
			esc_attr( $id ),
			/* translators: %s: parent menu item label */
			esc_attr( sprintf( __( 'Expand %s', 'sgs-blocks' ), wp_strip_all_tags( $label ) ) ),
			$chevron_svg,
			esc_attr( $id ),
			$view_all,
			$children
		);
	}

	/**
	 * Render a mega-menu item as an accordion section.
	 *
	 * Extracts links from the mega-menu's template part content and renders
	 * them as a flat list of accordion children. The full mega-menu panel
	 * (images, columns) is not shown on mobile — just the navigable links.
	 *
	 * @param array $block Parsed block data.
	 * @return string HTML.
	 */
	private function render_mega_menu_item( array $block ): string {
		$label         = $block['attrs']['label'] ?? '';
		$url           = $block['attrs']['url'] ?? '#';
		$template_slug = $block['attrs']['menuTemplatePart'] ?? '';
		$index         = $this->stagger_index++;
		$id            = wp_unique_id( 'sgs-mn-mega-' );

		// Extract links from the template part.
		$children = '';
		if ( $template_slug ) {
			$links = $this->extract_links_from_template_part( $template_slug );
			foreach ( $links as $link ) {
				$children .= sprintf(
					'<li class="sgs-mobile-nav__subitem"><a href="%s" class="sgs-mobile-nav__sublink">%s</a></li>',
					esc_url( $link['url'] ),
					esc_html( $link['text'] )
				);
			}
		}

		// "View All" link.
		$view_all = '';
		if ( '#' !== $url && $url ) {
			$view_all = sprintf(
				'<li class="sgs-mobile-nav__subitem sgs-mobile-nav__subitem--view-all"><a href="%s" class="sgs-mobile-nav__sublink">%s</a></li>',
				esc_url( $url ),
				esc_html__( 'View All', 'sgs-blocks' )
			);
		}

		$chevron_svg = sgs_get_lucide_icon( 'chevron-down' );

		// If no children found, render as a simple link.
		if ( ! $children && ! $view_all ) {
			return sprintf(
				'<li class="sgs-mobile-nav__item" style="--i:%d"><a href="%s" class="sgs-mobile-nav__link">%s</a></li>',
				$index,
				esc_url( $url ),
				wp_kses_post( $label )
			);
		}

		return sprintf(
			'<li class="sgs-mobile-nav__item sgs-mobile-nav__item--has-children" style="--i:%d">' .
				'<div class="sgs-mobile-nav__row">' .
					'<a href="%s" class="sgs-mobile-nav__link">%s</a>' .
					'<button class="sgs-mobile-nav__toggle" type="button" aria-expanded="false" aria-controls="%s" aria-label="%s">' .
						'<span class="sgs-mobile-nav__chevron" aria-hidden="true">%s</span>' .
					'</button>' .
				'</div>' .
				'<ul id="%s" class="sgs-mobile-nav__submenu" role="group" hidden>%s%s</ul>' .
			'</li>',
			$index,
			esc_url( $url ),
			wp_kses_post( $label ),
			esc_attr( $id ),
			esc_attr( sprintf( __( 'Expand %s', 'sgs-blocks' ), wp_strip_all_tags( $label ) ) ),
			$chevron_svg,
			esc_attr( $id ),
			$view_all,
			$children
		);
	}

	/**
	 * Render a home link.
	 *
	 * @param array $block Parsed block data.
	 * @return string HTML.
	 */
	private function render_home_link( array $block ): string {
		$label = $block['attrs']['label'] ?? __( 'Home', 'sgs-blocks' );
		$index = $this->stagger_index++;

		$is_front = is_front_page();

		return sprintf(
			'<li class="sgs-mobile-nav__item%s" style="--i:%d"><a href="%s" class="sgs-mobile-nav__link"%s>%s</a></li>',
			$is_front ? ' sgs-mobile-nav__item--current' : '',
			$index,
			esc_url( home_url( '/' ) ),
			$is_front ? ' aria-current="page"' : '',
			esc_html( $label )
		);
	}

	/**
	 * Extract navigable links from a mega-menu template part.
	 *
	 * Renders the template part to HTML, then uses DOMDocument to extract
	 * all <a> elements with href attributes. Returns a flat array of
	 * [ 'url' => ..., 'text' => ... ] entries.
	 *
	 * @param string $slug Template part slug (e.g. 'mega-menu-sectors').
	 * @return array Array of [ 'url' => string, 'text' => string ].
	 */
	private function extract_links_from_template_part( string $slug ): array {
		$template = get_block_template(
			get_stylesheet() . '//' . $slug,
			'wp_template_part'
		);

		if ( ! $template || empty( $template->content ) ) {
			return [];
		}

		$html = do_blocks( $template->content );

		if ( ! $html ) {
			return [];
		}

		$links = [];

		// Use DOMDocument for safe HTML parsing.
		$doc = new \DOMDocument();
		// Suppress HTML5 warnings, load as UTF-8.
		@$doc->loadHTML(
			'<html><head><meta charset="UTF-8"></head><body>' . $html . '</body></html>',
			LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NOERROR
		);

		$anchors = $doc->getElementsByTagName( 'a' );

		foreach ( $anchors as $anchor ) {
			$href = $anchor->getAttribute( 'href' );
			$text = trim( $anchor->textContent );

			// Skip empty or anchor-only links.
			if ( ! $href || '#' === $href || ! $text ) {
				continue;
			}

			// Deduplicate by URL.
			$already_added = false;
			foreach ( $links as $existing ) {
				if ( $existing['url'] === $href ) {
					$already_added = true;
					break;
				}
			}

			if ( ! $already_added ) {
				$links[] = [
					'url'  => $href,
					'text' => $text,
				];
			}
		}

		return $links;
	}

	/**
	 * Check if a URL matches the current page.
	 *
	 * @param string $url URL to check.
	 * @return bool True if the URL matches the current page.
	 */
	private function is_current_url( string $url ): bool {
		if ( ! $url || '#' === $url ) {
			return false;
		}

		$current = untrailingslashit( get_pagenum_link( 1, false ) );
		$target  = untrailingslashit( $url );

		return $current === $target;
	}

	/**
	 * Render the CTA zone (Zone 1: Quick Actions).
	 *
	 * Pulls CTA text/URL from block attributes with fallbacks,
	 * and phone/email from Business Details settings.
	 *
	 * @return string HTML for the CTA section.
	 */
	public function render_cta_zone(): string {
		if ( empty( $this->attributes['showCta'] ) ) {
			return '';
		}

		$cta_text = $this->attributes['ctaText'] ?? '';
		$cta_url  = $this->attributes['ctaUrl'] ?? '';

		// Fallback to generic text if not set.
		if ( ! $cta_text ) {
			$cta_text = __( 'Apply Now', 'sgs-blocks' );
		}
		if ( ! $cta_url ) {
			$cta_url = '/apply-for-trade-account/';
		}

		$arrow_svg = sgs_get_lucide_icon( 'arrow-right' );

		$cta_btn = sprintf(
			'<a href="%s" class="sgs-mobile-nav__cta-btn">%s %s</a>',
			esc_url( $cta_url ),
			esc_html( $cta_text ),
			$arrow_svg
		);

		// Contact icons from Business Details.
		$contact_icons = '';
		if ( ! empty( $this->attributes['showContactIcons'] ) ) {
			$phone = get_option( 'sgs_business_phone', '' );
			$email = get_option( 'sgs_business_email', '' );

			if ( $email ) {
				$contact_icons .= sprintf(
					'<a href="mailto:%s" class="sgs-mobile-nav__icon-btn" aria-label="%s">%s</a>',
					esc_attr( $email ),
					esc_attr( sprintf( __( 'Email us at %s', 'sgs-blocks' ), $email ) ),
					sgs_get_lucide_icon( 'mail' )
				);
			}
			if ( $phone ) {
				$contact_icons .= sprintf(
					'<a href="tel:%s" class="sgs-mobile-nav__icon-btn" aria-label="%s">%s</a>',
					esc_attr( preg_replace( '/[^+0-9]/', '', $phone ) ),
					esc_attr( sprintf( __( 'Call us on %s', 'sgs-blocks' ), $phone ) ),
					sgs_get_lucide_icon( 'phone' )
				);
			}
		}

		return sprintf(
			'<div class="sgs-mobile-nav__cta">%s%s</div>',
			$cta_btn,
			$contact_icons
		);
	}

	/**
	 * Render the social icons zone (Zone 3: Trust).
	 *
	 * Pulls social URLs from Business Details settings.
	 *
	 * @return string HTML for the social icons section.
	 */
	public function render_socials_zone(): string {
		if ( empty( $this->attributes['showSocials'] ) ) {
			return '';
		}

		$social_map = [
			'sgs_social_linkedin'  => [ 'icon' => 'linkedin',  'label' => 'LinkedIn'  ],
			'sgs_social_facebook'  => [ 'icon' => 'facebook',  'label' => 'Facebook'  ],
			'sgs_social_instagram' => [ 'icon' => 'instagram', 'label' => 'Instagram' ],
			'sgs_social_google'    => [ 'icon' => 'star',      'label' => 'Google'    ],
			'sgs_social_twitter'   => [ 'icon' => 'twitter',   'label' => 'X/Twitter' ],
		];

		$style = $this->attributes['socialStyle'] ?? 'coloured';
		$items = '';

		foreach ( $social_map as $option_key => $meta ) {
			$url = get_option( $option_key, '' );
			if ( ! $url ) {
				continue;
			}

			$platform_class = sanitize_html_class( $meta['icon'] );

			$items .= sprintf(
				'<a href="%s" class="sgs-mobile-nav__social-link sgs-mobile-nav__social-link--%s" target="_blank" rel="noopener noreferrer" aria-label="%s">%s</a>',
				esc_url( $url ),
				$platform_class,
				/* translators: %s: social platform name */
				esc_attr( sprintf( __( 'Follow us on %s', 'sgs-blocks' ), $meta['label'] ) ),
				sgs_get_lucide_icon( $meta['icon'] )
			);
		}

		if ( ! $items ) {
			return '';
		}

		return sprintf(
			'<div class="sgs-mobile-nav__socials sgs-mobile-nav__socials--%s">%s</div>',
			esc_attr( $style ),
			$items
		);
	}

	/**
	 * Render the search bar (optional).
	 *
	 * @return string HTML for the search input.
	 */
	public function render_search(): string {
		if ( empty( $this->attributes['showSearch'] ) ) {
			return '';
		}

		return sprintf(
			'<div class="sgs-mobile-nav__search">' .
				'<form role="search" method="get" action="%s">' .
					'<label class="sgs-mobile-nav__search-label screen-reader-text" for="sgs-mn-search">%s</label>' .
					'<input id="sgs-mn-search" class="sgs-mobile-nav__search-input" type="search" name="s" placeholder="%s" autocomplete="off" />' .
					'<button type="submit" class="sgs-mobile-nav__search-btn" aria-label="%s">%s</button>' .
				'</form>' .
			'</div>',
			esc_url( home_url( '/' ) ),
			esc_html__( 'Search', 'sgs-blocks' ),
			esc_attr__( 'Search\u2026', 'sgs-blocks' ),
			esc_attr__( 'Search', 'sgs-blocks' ),
			sgs_get_lucide_icon( 'search' )
		);
	}

	/**
	 * Render the account tray for logged-in users (optional, B2B feature).
	 *
	 * @return string HTML for the account tray.
	 */
	public function render_account_tray(): string {
		if ( empty( $this->attributes['showAccountTray'] ) || ! is_user_logged_in() ) {
			return '';
		}

		$user       = wp_get_current_user();
		$first_name = $user->first_name ?: $user->display_name;

		return sprintf(
			'<div class="sgs-mobile-nav__account">' .
				'<span class="sgs-mobile-nav__account-greeting">%s %s</span>' .
				'<a href="%s" class="sgs-mobile-nav__account-link">%s</a>' .
			'</div>',
			esc_html__( 'Hi,', 'sgs-blocks' ),
			esc_html( $first_name ),
			esc_url( admin_url( 'profile.php' ) ),
			esc_html__( 'My Account', 'sgs-blocks' )
		);
	}
}
