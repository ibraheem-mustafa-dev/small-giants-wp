<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- class name is intentionally un-prefixed; prefix lives in the block namespace.
/**
 * Server-side renderer for the SGS Mobile Navigation block.
 *
 * Handles menu parsing and all seven drawer zone HTML generation.
 * Called from the block's render.php; never instantiated elsewhere.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Renders all zones of the sgs/mobile-nav drawer.
 */
class SGS_Mobile_Nav_Renderer {

	/**
	 * Block attribute values.
	 *
	 * @var array
	 */
	private array $attrs;

	/**
	 * Stagger index for CSS --i counter on menu items.
	 *
	 * @var int
	 */
	private int $stagger_index = 0;

	/**
	 * Constructor — store attributes and reset stagger counter.
	 *
	 * @param array $attributes Block attributes from render.php.
	 */
	public function __construct( array $attributes ) {
		$this->attrs         = $attributes;
		$this->stagger_index = 0;
	}

	// ── Menu parsing ─────────────────────────────────────────────────────────

	/**
	 * Load the header template part, parse blocks, find core/navigation,
	 * resolve ref to wp_navigation post or inline innerBlocks.
	 *
	 * Falls back to get_fallback_nav_blocks() when no navigation is found.
	 *
	 * @return array Array of parsed block arrays (nav inner blocks).
	 */
	public function get_nav_blocks(): array {
		$header_content = '';

		// Attempt to load the active header template part.
		$header_post = get_posts(
			array(
				'post_type'      => 'wp_template_part',
				'name'           => 'header',
				'posts_per_page' => 1,
				'post_status'    => 'publish',
			)
		);

		if ( ! empty( $header_post ) ) {
			$header_content = $header_post[0]->post_content;
		} else {
			// Fall back to the file-based template part.
			$file = get_theme_file_path( 'parts/header.html' );
			if ( file_exists( $file ) ) {
				$header_content = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			}
		}

		if ( ! $header_content ) {
			return $this->get_fallback_nav_blocks();
		}

		$parsed = parse_blocks( $header_content );
		$nav    = $this->find_block_recursive( $parsed, 'core/navigation' );

		if ( ! $nav ) {
			return $this->get_fallback_nav_blocks();
		}

		// Resolve a ref to a saved wp_navigation post.
		if ( ! empty( $nav['attrs']['ref'] ) ) {
			$ref_post = get_post( absint( $nav['attrs']['ref'] ) );
			if ( $ref_post && 'wp_navigation' === $ref_post->post_type ) {
				return parse_blocks( $ref_post->post_content );
			}
		}

		// Use inline innerBlocks when available.
		if ( ! empty( $nav['innerBlocks'] ) ) {
			return $nav['innerBlocks'];
		}

		return $this->get_fallback_nav_blocks();
	}

	/**
	 * Query the most recent published wp_navigation post as a fallback.
	 *
	 * @return array Parsed inner blocks, or empty array if none found.
	 */
	public function get_fallback_nav_blocks(): array {
		$posts = get_posts(
			array(
				'post_type'      => 'wp_navigation',
				'posts_per_page' => 1,
				'post_status'    => 'publish',
				'orderby'        => 'date',
				'order'          => 'DESC',
			)
		);

		if ( empty( $posts ) ) {
			return array();
		}

		return parse_blocks( $posts[0]->post_content );
	}

	/**
	 * Depth-first search through a parsed block tree for a named block.
	 *
	 * @param array  $blocks     Parsed blocks array.
	 * @param string $block_name Fully-qualified block name, e.g. 'core/navigation'.
	 * @return array|null The found block array, or null.
	 */
	public function find_block_recursive( array $blocks, string $block_name ): ?array {
		foreach ( $blocks as $block ) {
			if ( isset( $block['blockName'] ) && $block_name === $block['blockName'] ) {
				return $block;
			}
			if ( ! empty( $block['innerBlocks'] ) ) {
				$found = $this->find_block_recursive( $block['innerBlocks'], $block_name );
				if ( null !== $found ) {
					return $found;
				}
			}
		}
		return null;
	}

	// ── Menu item rendering ───────────────────────────────────────────────────

	/**
	 * Iterate nav blocks and dispatch each to the appropriate render method.
	 *
	 * @param array $nav_blocks Top-level navigation inner blocks.
	 * @return string HTML string of <li> elements.
	 */
	public function render_menu_items( array $nav_blocks ): string {
		$html = '';
		foreach ( $nav_blocks as $block ) {
			$name = $block['blockName'] ?? '';
			switch ( $name ) {
				case 'core/navigation-link':
					$html .= $this->render_nav_link( $block );
					break;
				case 'core/navigation-submenu':
					$html .= $this->render_nav_submenu( $block );
					break;
				case 'core/home-link':
					$html .= $this->render_home_link( $block );
					break;
				case 'sgs/mega-menu-item':
					$html .= $this->render_mega_menu_item( $block );
					break;
				default:
					// Skip unrecognised block types (whitespace-only blocks, etc.).
					break;
			}
		}
		return $html;
	}

	/**
	 * Render a core/navigation-link as a simple <li><a> pair.
	 *
	 * Sets CSS --i for stagger animation and marks the current page.
	 *
	 * @param array $block Parsed block array.
	 * @return string HTML <li> element.
	 */
	public function render_nav_link( array $block ): string {
		$attrs   = $block['attrs'] ?? array();
		$label   = $attrs['label'] ?? '';
		$url     = $attrs['url'] ?? '#';
		$index   = $this->stagger_index++;
		$current = $this->is_current_url( $url ) ? ' aria-current="page" class="is-current"' : '';

		return sprintf(
			'<li class="sgs-mobile-nav__item" style="--i:%d"><a href="%s" class="sgs-mobile-nav__link"%s>%s</a></li>',
			absint( $index ),
			esc_url( $url ),
			$current,
			esc_html( $label )
		);
	}

	/**
	 * Render a core/navigation-submenu as an accordion <li>.
	 *
	 * Produces: parent link + toggle button + hidden <ul> child list
	 * + optional "View All" link pointing to the parent URL.
	 *
	 * @param array $block Parsed block array.
	 * @return string HTML <li> element.
	 */
	public function render_nav_submenu( array $block ): string {
		$attrs   = $block['attrs'] ?? array();
		$label   = $attrs['label'] ?? '';
		$url     = $attrs['url'] ?? '';
		$index   = $this->stagger_index++;
		$item_id = 'sgs-mn-sub-' . $index;

		// Build child items.
		$children = '';
		if ( ! empty( $block['innerBlocks'] ) ) {
			foreach ( $block['innerBlocks'] as $child ) {
				$child_name = $child['blockName'] ?? '';
				if ( 'core/navigation-link' === $child_name ) {
					$children .= $this->render_nav_link( $child );
				}
			}
		}

		// "View All" link when the parent itself has a URL.
		$view_all = '';
		if ( $url ) {
			$view_all = sprintf(
				'<li class="sgs-mobile-nav__item sgs-mobile-nav__item--view-all"><a href="%s" class="sgs-mobile-nav__link sgs-mobile-nav__link--view-all">%s &rarr;</a></li>',
				esc_url( $url ),
				sprintf(
					/* translators: %s: parent menu item label */
					esc_html__( 'View all %s', 'sgs-blocks' ),
					esc_html( $label )
				)
			);
		}

		return sprintf(
			'<li class="sgs-mobile-nav__item sgs-mobile-nav__item--has-children" style="--i:%d">
				<div class="sgs-mobile-nav__item-row">
					%s
					<button class="sgs-mobile-nav__toggle" aria-expanded="false" aria-controls="%s" aria-label="%s">
						%s
					</button>
				</div>
				<ul id="%s" class="sgs-mobile-nav__submenu" hidden>
					%s%s
				</ul>
			</li>',
			absint( $index ),
			$url
				? sprintf( '<a href="%s" class="sgs-mobile-nav__link">%s</a>', esc_url( $url ), esc_html( $label ) )
				: sprintf( '<span class="sgs-mobile-nav__link sgs-mobile-nav__link--no-href">%s</span>', esc_html( $label ) ),
			esc_attr( $item_id ),
			/* translators: %s: menu item label */
			sprintf( esc_attr__( 'Toggle %s submenu', 'sgs-blocks' ), $label ),
			sgs_get_lucide_icon( 'chevron-down' ),
			esc_attr( $item_id ),
			$children,
			$view_all
		);
	}

	/**
	 * Render a sgs/mega-menu-item as an accordion using extracted template part links.
	 *
	 * @param array $block Parsed block array.
	 * @return string HTML <li> element.
	 */
	public function render_mega_menu_item( array $block ): string {
		$attrs    = $block['attrs'] ?? array();
		$label    = $attrs['label'] ?? '';
		$url      = $attrs['url'] ?? '';
		$slug     = $attrs['templatePartSlug'] ?? '';
		$index    = $this->stagger_index++;
		$item_id  = 'sgs-mn-mega-' . $index;
		$children = '';

		if ( $slug ) {
			$links = $this->extract_links_from_template_part( $slug );
			foreach ( $links as $link ) {
				$children .= sprintf(
					'<li class="sgs-mobile-nav__item"><a href="%s" class="sgs-mobile-nav__link">%s</a></li>',
					esc_url( $link['href'] ),
					esc_html( $link['text'] )
				);
			}
		}

		// Fallback to innerBlocks when no template part slug is set.
		if ( ! $children && ! empty( $block['innerBlocks'] ) ) {
			foreach ( $block['innerBlocks'] as $child ) {
				if ( 'core/navigation-link' === ( $child['blockName'] ?? '' ) ) {
					$children .= $this->render_nav_link( $child );
				}
			}
		}

		$view_all = '';
		if ( $url ) {
			$view_all = sprintf(
				'<li class="sgs-mobile-nav__item sgs-mobile-nav__item--view-all"><a href="%s" class="sgs-mobile-nav__link sgs-mobile-nav__link--view-all">%s &rarr;</a></li>',
				esc_url( $url ),
				sprintf(
					/* translators: %s: mega menu item label */
					esc_html__( 'View all %s', 'sgs-blocks' ),
					esc_html( $label )
				)
			);
		}

		return sprintf(
			'<li class="sgs-mobile-nav__item sgs-mobile-nav__item--has-children" style="--i:%d">
				<div class="sgs-mobile-nav__item-row">
					%s
					<button class="sgs-mobile-nav__toggle" aria-expanded="false" aria-controls="%s" aria-label="%s">
						%s
					</button>
				</div>
				<ul id="%s" class="sgs-mobile-nav__submenu" hidden>
					%s%s
				</ul>
			</li>',
			absint( $index ),
			$url
				? sprintf( '<a href="%s" class="sgs-mobile-nav__link">%s</a>', esc_url( $url ), esc_html( $label ) )
				: sprintf( '<span class="sgs-mobile-nav__link sgs-mobile-nav__link--no-href">%s</span>', esc_html( $label ) ),
			esc_attr( $item_id ),
			/* translators: %s: mega menu item label */
			sprintf( esc_attr__( 'Toggle %s submenu', 'sgs-blocks' ), $label ),
			sgs_get_lucide_icon( 'chevron-down' ),
			esc_attr( $item_id ),
			$children,
			$view_all
		);
	}

	/**
	 * Render a core/home-link as a simple <li><a> pointing to the site root.
	 *
	 * @param array $block Parsed block array (attrs not used — URL is always '/').
	 * @return string HTML <li> element.
	 */
	public function render_home_link( array $block ): string { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter
		$index   = $this->stagger_index++;
		$home    = home_url( '/' );
		$current = $this->is_current_url( $home ) ? ' aria-current="page" class="is-current"' : '';

		return sprintf(
			'<li class="sgs-mobile-nav__item" style="--i:%d"><a href="%s" class="sgs-mobile-nav__link"%s>%s</a></li>',
			absint( $index ),
			esc_url( $home ),
			$current,
			esc_html__( 'Home', 'sgs-blocks' )
		);
	}

	// ── Template part link extraction ─────────────────────────────────────────

	/**
	 * Render a template part by slug and extract all <a> elements from the HTML.
	 *
	 * Uses DOMDocument so we get href + text without a regex.
	 *
	 * @param string $slug Template part slug (e.g. 'mega-menu-sectors').
	 * @return array Array of ['href' => string, 'text' => string] items.
	 */
	public function extract_links_from_template_part( string $slug ): array {
		$rendered = do_blocks( '<!-- wp:template-part {"slug":"' . esc_js( $slug ) . '"} /-->' );

		if ( ! $rendered ) {
			return array();
		}

		$links = array();

		// Suppress libxml errors from messy HTML.
		$prev = libxml_use_internal_errors( true );
		$dom  = new DOMDocument();
		$dom->loadHTML( '<html><body>' . $rendered . '</body></html>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
		libxml_use_internal_errors( $prev );

		$anchors = $dom->getElementsByTagName( 'a' );
		foreach ( $anchors as $anchor ) {
			$href = trim( $anchor->getAttribute( 'href' ) );
			$text = trim( $anchor->textContent ); // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- DOMNode::textContent is a PHP DOM API property, not our code.
			if ( $href && $text && '#' !== $href ) {
				$links[] = array(
					'href' => $href,
					'text' => $text,
				);
			}
		}

		return $links;
	}

	// ── URL helpers ───────────────────────────────────────────────────────────

	/**
	 * Compare a URL against the current page URL.
	 *
	 * Strips trailing slashes and scheme/host for reliable comparison.
	 *
	 * @param string $url The URL to test.
	 * @return bool True when the URL matches the current page.
	 */
	public function is_current_url( string $url ): bool {
		if ( ! $url || '#' === $url ) {
			return false;
		}

		$current = rtrim( get_pagenum_link(), '/' );
		$compare = rtrim( $url, '/' );

		return $compare === $current;
	}

	// ── Zone rendering ────────────────────────────────────────────────────────

	/**
	 * Render Zone 1: logo + close button.
	 *
	 * Logo comes from get_custom_logo(); falls back to the site name.
	 * Close button style (circle / square / plain) is attribute-controlled.
	 *
	 * @return string HTML string.
	 */
	public function render_header(): string {
		$show_logo   = $this->attrs['showLogo'] ?? true;
		$close_style = $this->attrs['closeButtonStyle'] ?? 'circle';

		$logo_html = '';
		if ( $show_logo ) {
			$logo = get_custom_logo();
			if ( $logo ) {
				$logo_html = '<a href="' . esc_url( home_url( '/' ) ) . '" class="sgs-mobile-nav__logo-link">'
					. wp_kses_post( $logo )
					. '</a>';
			} else {
				$logo_html = '<a href="' . esc_url( home_url( '/' ) ) . '" class="sgs-mobile-nav__logo-link sgs-mobile-nav__logo-link--text">'
					. esc_html( get_bloginfo( 'name' ) )
					. '</a>';
			}
		}

		$close_class = 'sgs-mobile-nav__close';
		if ( 'plain' !== $close_style ) {
			$close_class .= ' sgs-mobile-nav__close--' . sanitize_html_class( $close_style );
		}

		$close_btn = sprintf(
			'<button type="button" class="%s" aria-label="%s" popovertarget="sgs-mobile-nav" popovertargetaction="hide">%s</button>',
			esc_attr( $close_class ),
			esc_attr__( 'Close menu', 'sgs-blocks' ),
			sgs_get_lucide_icon( 'x' )
		);

		return sprintf(
			'<div class="sgs-mobile-nav__header">%s%s</div>',
			$logo_html,
			$close_btn
		);
	}

	/**
	 * Render Zone 2: B2B logged-in account greeting.
	 *
	 * Returns empty string when showAccountTray is false or user is not logged in.
	 *
	 * @return string HTML string or empty string.
	 */
	public function render_account_tray(): string {
		$show = $this->attrs['showAccountTray'] ?? false;

		if ( ! $show || ! is_user_logged_in() ) {
			return '';
		}

		$user = wp_get_current_user();
		$name = $user->display_name ? $user->display_name : $user->user_login;

		return sprintf(
			'<div class="sgs-mobile-nav__account-tray">%s %s</div>',
			sgs_get_lucide_icon( 'user' ),
			sprintf(
				/* translators: %s: user's display name */
				'<span>' . esc_html__( 'Hello, %s', 'sgs-blocks' ) . '</span>',
				esc_html( $name )
			)
		);
	}

	/**
	 * Render Zone 3: search form.
	 *
	 * Returns empty string when showSearch is false.
	 *
	 * @return string HTML string or empty string.
	 */
	public function render_search(): string {
		$show = $this->attrs['showSearch'] ?? false;

		if ( ! $show ) {
			return '';
		}

		return sprintf(
			'<div class="sgs-mobile-nav__search">%s</div>',
			get_search_form( array( 'echo' => false ) )
		);
	}

	/**
	 * Render Zone 4: primary CTA, secondary CTA, contact shortcuts, WhatsApp.
	 *
	 * Returns empty string when showCta is false and no shortcuts/WhatsApp are shown.
	 *
	 * @return string HTML string or empty string.
	 */
	public function render_cta_zone(): string {
		$show_cta = $this->attrs['showCta'] ?? true;

		$primary   = '';
		$secondary = '';
		$shortcuts = '';
		$whatsapp  = '';

		if ( $show_cta ) {
			$cta_text  = $this->attrs['ctaText'] ?? '';
			$cta_url   = $this->attrs['ctaUrl'] ?? '';
			$cta_icon  = $this->attrs['ctaIcon'] ?? 'arrow-right';
			$cta_style = $this->attrs['ctaStyle'] ?? 'filled';

			if ( $cta_text && $cta_url ) {
				$icon_html = $cta_icon ? sgs_get_lucide_icon( $cta_icon ) : '';
				$primary   = sprintf(
					'<a href="%s" class="%s">%s%s</a>',
					esc_url( $cta_url ),
					esc_attr( $this->build_cta_classes( $cta_style ) ),
					esc_html( $cta_text ),
					$icon_html
				);
			}

			$secondary = $this->render_secondary_cta();
		}

		$shortcuts = $this->render_contact_shortcuts();
		$whatsapp  = $this->render_whatsapp();

		if ( ! $primary && ! $secondary && ! $shortcuts && ! $whatsapp ) {
			return '';
		}

		return sprintf(
			'<div class="sgs-mobile-nav__cta-zone">%s%s%s%s</div>',
			$primary,
			$secondary,
			$shortcuts,
			$whatsapp
		);
	}

	/**
	 * Render the secondary CTA button.
	 *
	 * @return string HTML <a> element or empty string.
	 */
	public function render_secondary_cta(): string {
		$show = $this->attrs['showSecondaryCta'] ?? false;

		if ( ! $show ) {
			return '';
		}

		$text  = $this->attrs['secondaryCtaText'] ?? '';
		$url   = $this->attrs['secondaryCtaUrl'] ?? '';
		$icon  = $this->attrs['secondaryCtaIcon'] ?? 'phone';
		$style = $this->attrs['secondaryCtaStyle'] ?? 'outline';

		if ( ! $text || ! $url ) {
			return '';
		}

		$icon_html = $icon ? sgs_get_lucide_icon( $icon ) : '';

		return sprintf(
			'<a href="%s" class="%s">%s%s</a>',
			esc_url( $url ),
			esc_attr( $this->build_cta_classes( $style ) ),
			esc_html( $text ),
			$icon_html
		);
	}

	/**
	 * Render contact shortcut buttons (phone + email) from Business Details.
	 *
	 * Display mode (icon-only / icon-text / hidden) is attribute-controlled.
	 *
	 * @return string HTML string or empty string.
	 */
	public function render_contact_shortcuts(): string {
		$show = $this->attrs['showContactShortcuts'] ?? true;
		$mode = $this->attrs['contactDisplayMode'] ?? 'icon-only';

		if ( ! $show || 'hidden' === $mode ) {
			return '';
		}

		$phone = get_option( 'sgs_phone', '' );
		$email = get_option( 'sgs_email', '' );

		if ( ! $phone && ! $email ) {
			return '';
		}

		$items = '';

		if ( $phone ) {
			$label     = esc_html( $phone );
			$icon_html = sgs_get_lucide_icon( 'phone' );
			$content   = 'icon-text' === $mode ? $icon_html . '<span>' . $label . '</span>' : $icon_html;
			$items    .= sprintf(
				'<a href="tel:%s" class="sgs-mobile-nav__shortcut" aria-label="%s">%s</a>',
				esc_attr( preg_replace( '/[^\d+]/', '', $phone ) ),
				esc_attr__( 'Call us', 'sgs-blocks' ),
				$content
			);
		}

		if ( $email ) {
			$icon_html = sgs_get_lucide_icon( 'mail' );
			$content   = 'icon-text' === $mode ? $icon_html . '<span>' . esc_html( $email ) . '</span>' : $icon_html;
			$items    .= sprintf(
				'<a href="mailto:%s" class="sgs-mobile-nav__shortcut" aria-label="%s">%s</a>',
				esc_attr( $email ),
				esc_attr__( 'Email us', 'sgs-blocks' ),
				$content
			);
		}

		return sprintf( '<div class="sgs-mobile-nav__shortcuts">%s</div>', $items );
	}

	/**
	 * Render the WhatsApp button using the sgs_social_whatsapp option.
	 *
	 * Returns empty string when showWhatsApp is false or no number is set.
	 *
	 * @return string HTML <a> element or empty string.
	 */
	public function render_whatsapp(): string {
		$show = $this->attrs['showWhatsApp'] ?? false;

		if ( ! $show ) {
			return '';
		}

		$wa = get_option( 'sgs_social_whatsapp', '' );
		if ( ! $wa ) {
			return '';
		}

		// Build WhatsApp URL — if it's already a full URL, use it; otherwise
		// treat it as a phone number and build wa.me link.
		if ( 0 === strpos( $wa, 'http' ) ) {
			$wa_url = $wa;
		} else {
			$wa_url = 'https://wa.me/' . preg_replace( '/[^\d]/', '', $wa );
		}

		return sprintf(
			'<a href="%s" class="sgs-mobile-nav__whatsapp" target="_blank" rel="noopener noreferrer" aria-label="%s">%s<span>%s</span></a>',
			esc_url( $wa_url ),
			esc_attr__( 'Chat on WhatsApp', 'sgs-blocks' ),
			sgs_get_lucide_icon( 'message-circle' ),
			esc_html__( 'WhatsApp', 'sgs-blocks' )
		);
	}

	/**
	 * Render Zone 7 (social row): social icon links from Business Details.
	 *
	 * Uses the same option keys as sgs/business-info for consistency.
	 *
	 * @return string HTML string or empty string.
	 */
	public function render_socials_zone(): string {
		$show  = $this->attrs['showSocials'] ?? true;
		$style = $this->attrs['socialStyle'] ?? 'coloured';

		if ( ! $show ) {
			return '';
		}

		$social_map = array(
			'sgs_social_linkedin'  => array(
				'icon'  => 'linkedin',
				'label' => 'LinkedIn',
			),
			'sgs_social_facebook'  => array(
				'icon'  => 'facebook',
				'label' => 'Facebook',
			),
			'sgs_social_instagram' => array(
				'icon'  => 'instagram',
				'label' => 'Instagram',
			),
			'sgs_social_google'    => array(
				'icon'  => 'star',
				'label' => 'Google',
			),
		);

		$items = '';
		foreach ( $social_map as $option_key => $meta ) {
			$url = get_option( $option_key, '' );
			if ( ! $url ) {
				continue;
			}
			$items .= sprintf(
				'<li class="sgs-mobile-nav__social-item"><a href="%s" target="_blank" rel="noopener noreferrer" aria-label="%s" class="sgs-mobile-nav__social-link sgs-mobile-nav__social-link--%s sgs-mobile-nav__social-link--%s">%s</a></li>',
				esc_url( $url ),
				esc_attr( $meta['label'] ),
				sanitize_html_class( $meta['icon'] ),
				sanitize_html_class( $style ),
				sgs_get_lucide_icon( $meta['icon'] )
			);
		}

		if ( ! $items ) {
			return '';
		}

		return sprintf(
			'<ul class="sgs-mobile-nav__socials">%s</ul>',
			$items
		);
	}

	/**
	 * Render the trust tagline (Zone 7 footer row).
	 *
	 * Uses the taglineText attribute, falling back to the WP site tagline.
	 *
	 * @return string HTML <p> element or empty string.
	 */
	public function render_tagline(): string {
		$show = $this->attrs['showTagline'] ?? false;

		if ( ! $show ) {
			return '';
		}

		$text = $this->attrs['taglineText'] ?? '';
		if ( ! $text ) {
			$text = get_bloginfo( 'description' );
		}

		if ( ! $text ) {
			return '';
		}

		return sprintf(
			'<p class="sgs-mobile-nav__tagline">%s</p>',
			esc_html( $text )
		);
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	/**
	 * Build the CSS class string for a CTA button based on its style variant.
	 *
	 * @param string $style One of: filled, outline, ghost.
	 * @return string Class string.
	 */
	private function build_cta_classes( string $style ): string {
		$base = 'sgs-mobile-nav__cta wp-block-button__link';
		switch ( $style ) {
			case 'outline':
				return $base . ' sgs-mobile-nav__cta--outline';
			case 'ghost':
				return $base . ' sgs-mobile-nav__cta--ghost';
			default:
				return $base;
		}
	}
}
