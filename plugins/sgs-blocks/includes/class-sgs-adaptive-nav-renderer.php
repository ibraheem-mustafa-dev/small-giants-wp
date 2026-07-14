<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- class name is intentionally un-prefixed; prefix lives in the block namespace.
/**
 * Server-side renderer for the sgs/adaptive-nav desktop bar.
 *
 * Turns the resolved menu (SGS_Nav_Menu_Source) into the desktop navigation bar:
 * a single <ul> of <li> items where a plain link renders as <a> and a submenu
 * renders as a CSS-hidden mega-panel using the ARIA APG **Disclosure** pattern
 * (a <button aria-expanded aria-controls> revealing a nav panel) — NOT role=menu,
 * which would imply arrow-key application-menu semantics site nav does not have.
 *
 * SEO / GEO / a11y (all satisfied by one rule): EVERY link is emitted as a real
 * <a href> in the server HTML and the panel is hidden with CSS only, so AI
 * crawlers (which do not run JS) and Googlebot (which "doesn't hover") both see
 * the whole link tree. No AJAX lazy-load. The panel opens on hover/focus (CSS,
 * no-JS fallback) and on click (view.js sets .is-open + aria-expanded, for touch
 * and keyboard).
 *
 * Drill-down at the mobile tier is the drawer's job (sgs/mobile-nav), which
 * resolves the SAME menu — this renderer only produces the desktop bar.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/lucide-icons.php';

// This file is intentionally in the GLOBAL namespace (no `namespace` statement
// above) — Sgs_Site_Info lives in SGS\Blocks, so it MUST be imported via `use`
// or every call below resolves to the (non-existent) global \Sgs_Site_Info and
// fatals. A missing `use` here took both live client sites down 2026-07-14
// (D336) — do not remove this import.
use SGS\Blocks\Sgs_Site_Info;

/**
 * Renders the sgs/adaptive-nav desktop bar + off-canvas drawer from resolved
 * menu blocks. The drawer absorbs the FR-S9-5 a11y contract that previously
 * lived in sgs/mobile-nav (Task 1 build, D336 design).
 */
class SGS_Adaptive_Nav_Renderer {

	/**
	 * Per-render counter guaranteeing unique panel ids for aria-controls
	 * (desktop bar mega-panels).
	 *
	 * @var int
	 */
	private int $panel_index = 0;

	/**
	 * Per-render counter guaranteeing unique panel ids for the drawer's
	 * accordion submenus (separate namespace from $panel_index so the desktop
	 * bar and the drawer never collide on the same id when both render the
	 * same submenu).
	 *
	 * @var int
	 */
	private int $drawer_panel_index = 0;

	/**
	 * Unique-ish prefix so multiple navs on one page don't collide on panel ids.
	 *
	 * @var string
	 */
	private string $id_prefix;

	/**
	 * Constructor.
	 *
	 * @param string $id_prefix Instance uid used to namespace panel ids.
	 */
	public function __construct( string $id_prefix = 'sgs-nav' ) {
		$this->id_prefix   = sanitize_html_class( $id_prefix );
		$this->panel_index = 0;
	}

	/**
	 * Render the full desktop bar <ul> from resolved menu blocks.
	 *
	 * @param array $blocks Parsed nav blocks (from SGS_Nav_Menu_Source).
	 * @return string HTML <ul> element, or empty string when no items resolve.
	 */
	public function render_bar( array $blocks ): string {
		$items = $this->render_items( $blocks );
		if ( '' === $items ) {
			return '';
		}
		return '<ul class="sgs-adaptive-nav__list">' . $items . '</ul>';
	}

	/**
	 * Dispatch each resolved block to the matching item renderer.
	 *
	 * @param array $blocks Parsed nav blocks.
	 * @return string HTML <li> elements.
	 */
	public function render_items( array $blocks ): string {
		$html = '';
		foreach ( $blocks as $block ) {
			switch ( $block['blockName'] ?? '' ) {
				case 'core/navigation-link':
					$html .= $this->render_link( $block['attrs']['url'] ?? '', $block['attrs']['label'] ?? '' );
					break;
				case 'core/navigation-submenu':
					$html .= $this->render_panel_item(
						$block['attrs']['label'] ?? '',
						$block['attrs']['url'] ?? '',
						$this->collect_child_links( $block['innerBlocks'] ?? array() )
					);
					break;
				case 'core/home-link':
					$html .= $this->render_link( home_url( '/' ), __( 'Home', 'sgs-blocks' ) );
					break;
				case 'core/page-list':
					$html .= $this->render_page_list( $block['attrs']['parentPageID'] ?? 0 );
					break;
				default:
					// Unknown block (whitespace, sgs/mega-menu is handled as InnerBlocks
					// in render.php, not here) — skip.
					break;
			}
		}
		return $html;
	}

	/**
	 * Render a top-level link as <li><a>.
	 *
	 * @param string $url   Link URL.
	 * @param string $label Link text.
	 * @return string HTML <li> element.
	 */
	private function render_link( string $url, string $label ): string {
		if ( '' === $label ) {
			return '';
		}
		$url     = '' !== $url ? $url : '#';
		$current = $this->is_current_url( $url ) ? ' aria-current="page"' : '';

		return sprintf(
			'<li class="sgs-adaptive-nav__item"><a class="sgs-adaptive-nav__link" href="%s"%s>%s</a></li>',
			esc_url( $url ),
			$current,
			esc_html( $label )
		);
	}

	/**
	 * Render a submenu as a top-level item + CSS-hidden mega-panel (APG disclosure).
	 *
	 * Hybrid pattern (APG "disclosure with top-level links"): when the parent has
	 * its own URL, the label is a link AND a separate small disclosure button
	 * controls the panel; when it has no URL, the label itself is the button.
	 *
	 * @param string $label     Parent label.
	 * @param string $url       Parent URL (may be empty).
	 * @param string $panel_lis Pre-rendered child <li><a> elements.
	 * @return string HTML <li> element.
	 */
	private function render_panel_item( string $label, string $url, string $panel_lis ): string {
		if ( '' === $label ) {
			return '';
		}

		// A submenu with no resolvable children degrades to a plain link.
		if ( '' === $panel_lis ) {
			return '' !== $url ? $this->render_link( $url, $label ) : '';
		}

		$panel_id = $this->id_prefix . '-panel-' . $this->panel_index++;
		$chevron  = sgs_get_lucide_icon( 'chevron-down' );

		if ( '' !== $url ) {
			// Link + separate disclosure button.
			$trigger = sprintf(
				'<a class="sgs-adaptive-nav__link" href="%s">%s</a>' .
				'<button type="button" class="sgs-adaptive-nav__disclosure" aria-expanded="false" aria-controls="%s" aria-label="%s">%s</button>',
				esc_url( $url ),
				esc_html( $label ),
				esc_attr( $panel_id ),
				/* translators: %s: menu item label */
				esc_attr( sprintf( __( 'Show %s submenu', 'sgs-blocks' ), $label ) ),
				$chevron
			);
		} else {
			// Label is the disclosure button.
			$trigger = sprintf(
				'<button type="button" class="sgs-adaptive-nav__link sgs-adaptive-nav__disclosure" aria-expanded="false" aria-controls="%s">%s%s</button>',
				esc_attr( $panel_id ),
				esc_html( $label ),
				$chevron
			);
		}

		return sprintf(
			'<li class="sgs-adaptive-nav__item sgs-adaptive-nav__item--has-panel">%s<div id="%s" class="sgs-adaptive-nav__panel"><ul class="sgs-adaptive-nav__panel-list">%s</ul></div></li>',
			$trigger,
			esc_attr( $panel_id ),
			$panel_lis
		);
	}

	/**
	 * Build the child <li><a> list for a submenu panel.
	 *
	 * Flattens one level (nested navigation-submenus contribute their own link).
	 *
	 * @param array $children Parsed innerBlocks of a core/navigation-submenu.
	 * @return string HTML <li> elements.
	 */
	private function collect_child_links( array $children ): string {
		$html = '';
		foreach ( $children as $child ) {
			$name  = $child['blockName'] ?? '';
			$attrs = $child['attrs'] ?? array();
			if ( 'core/navigation-link' === $name || 'core/navigation-submenu' === $name ) {
				$url   = $attrs['url'] ?? '';
				$label = $attrs['label'] ?? '';
				if ( '' !== $label ) {
					$html .= sprintf(
						'<li class="sgs-adaptive-nav__panel-item"><a class="sgs-adaptive-nav__panel-link" href="%s">%s</a></li>',
						esc_url( '' !== $url ? $url : '#' ),
						esc_html( $label )
					);
				}
			}
		}
		return $html;
	}

	/**
	 * Render the published top-level page hierarchy as bar items.
	 *
	 * Used by render.php when no menu resolves and menuFallback is 'page-list',
	 * so an unconfigured nav still shows a crawlable, server-rendered menu.
	 *
	 * @return string HTML <li> elements, or empty string when no pages exist.
	 */
	public function render_fallback_pages(): string {
		return $this->render_page_list( 0 );
	}

	/**
	 * Expand a core/page-list into top-level bar items (no-ref fallback).
	 *
	 * Pages with published children render as a mega-panel; leaf pages as links.
	 * Mirrors the drawer's page-list expansion so an unconfigured nav still shows
	 * the published page hierarchy (crawlable, server-rendered).
	 *
	 * @param int $parent_id Root page id (0 = top level).
	 * @return string HTML <li> elements.
	 */
	private function render_page_list( int $parent_id ): string {
		$pages = get_pages(
			array(
				'parent'      => $parent_id,
				'sort_column' => 'menu_order,post_title',
				'post_status' => 'publish',
			)
		);
		if ( empty( $pages ) ) {
			return '';
		}

		$html = '';
		foreach ( $pages as $page ) {
			$url      = (string) get_permalink( $page->ID );
			$children = get_pages(
				array(
					'parent'      => $page->ID,
					'sort_column' => 'menu_order,post_title',
					'post_status' => 'publish',
				)
			);

			if ( ! empty( $children ) ) {
				$child_lis = '';
				foreach ( $children as $child ) {
					$child_lis .= sprintf(
						'<li class="sgs-adaptive-nav__panel-item"><a class="sgs-adaptive-nav__panel-link" href="%s">%s</a></li>',
						esc_url( (string) get_permalink( $child->ID ) ),
						esc_html( $child->post_title )
					);
				}
				$html .= $this->render_panel_item( $page->post_title, $url, $child_lis );
			} else {
				$html .= $this->render_link( $url, $page->post_title );
			}
		}
		return $html;
	}

	/**
	 * Compare a URL against the current page URL (scheme/trailing-slash agnostic).
	 *
	 * @param string $url The URL to test.
	 * @return bool True when the URL matches the current page.
	 */
	private function is_current_url( string $url ): bool {
		if ( '' === $url || '#' === $url ) {
			return false;
		}
		return rtrim( $url, '/' ) === rtrim( get_pagenum_link(), '/' );
	}

	// ── Drawer menu (accordion) ──────────────────────────────────────────────

	/**
	 * Render the full drawer accordion <ul> from resolved menu blocks (the
	 * SAME resolved blocks as the desktop bar — one menu source, R-31-9).
	 *
	 * @param array $blocks Parsed nav blocks (from SGS_Nav_Menu_Source).
	 * @return string HTML <ul> element, or empty string when no items resolve.
	 */
	public function render_drawer_menu( array $blocks ): string {
		$items = $this->render_drawer_items( $blocks );
		if ( '' === $items ) {
			return '';
		}
		return '<ul class="sgs-adaptive-nav__drawer-menu">' . $items . '</ul>';
	}

	/**
	 * Dispatch each resolved block to the matching drawer item renderer.
	 *
	 * @param array $blocks Parsed nav blocks.
	 * @return string HTML <li> elements.
	 */
	private function render_drawer_items( array $blocks ): string {
		$html = '';
		foreach ( $blocks as $block ) {
			switch ( $block['blockName'] ?? '' ) {
				case 'core/navigation-link':
					$html .= $this->render_drawer_link( $block['attrs']['url'] ?? '', $block['attrs']['label'] ?? '' );
					break;
				case 'core/navigation-submenu':
					$html .= $this->render_drawer_submenu(
						$block['attrs']['label'] ?? '',
						$block['attrs']['url'] ?? '',
						$block['innerBlocks'] ?? array()
					);
					break;
				case 'core/home-link':
					$html .= $this->render_drawer_link( home_url( '/' ), __( 'Home', 'sgs-blocks' ) );
					break;
				case 'core/page-list':
					$html .= $this->render_drawer_page_list( $block['attrs']['parentPageID'] ?? 0 );
					break;
				default:
					// Rich sgs/mega-menu items are routed to the drawer CONTENT zone
					// (InnerBlocks) by render.php, not the accordion menu — skip.
					break;
			}
		}
		return $html;
	}

	/**
	 * Render a top-level drawer link as <li><a>, 44px target.
	 *
	 * @param string $url   Link URL.
	 * @param string $label Link text.
	 * @return string HTML <li> element.
	 */
	private function render_drawer_link( string $url, string $label ): string {
		if ( '' === $label ) {
			return '';
		}
		$url     = '' !== $url ? $url : '#';
		$current = $this->is_current_url( $url ) ? ' aria-current="page"' : '';

		return sprintf(
			'<li class="sgs-adaptive-nav__drawer-item"><a class="sgs-adaptive-nav__drawer-link" href="%s"%s>%s</a></li>',
			esc_url( $url ),
			$current,
			esc_html( $label )
		);
	}

	/**
	 * Render a submenu as a drawer accordion item: parent link/label + a
	 * disclosure toggle (aria-expanded/aria-controls, APG accordion pattern)
	 * revealing a hidden <ul> of child links.
	 *
	 * @param string $label    Parent label.
	 * @param string $url      Parent URL (may be empty).
	 * @param array  $children Parsed innerBlocks of the core/navigation-submenu.
	 * @return string HTML <li> element.
	 */
	private function render_drawer_submenu( string $label, string $url, array $children ): string {
		if ( '' === $label ) {
			return '';
		}

		$child_html = '';
		foreach ( $children as $child ) {
			if ( 'core/navigation-link' !== ( $child['blockName'] ?? '' ) ) {
				continue;
			}
			$c_label = $child['attrs']['label'] ?? '';
			if ( '' === $c_label ) {
				continue;
			}
			$c_url     = $child['attrs']['url'] ?? '';
			$c_url     = '' !== $c_url ? $c_url : '#';
			$c_current = $this->is_current_url( $c_url ) ? ' aria-current="page"' : '';
			$child_html .= sprintf(
				'<li class="sgs-adaptive-nav__drawer-subitem"><a class="sgs-adaptive-nav__drawer-sublink" href="%s"%s>%s</a></li>',
				esc_url( $c_url ),
				$c_current,
				esc_html( $c_label )
			);
		}

		// A submenu with no resolvable children degrades to a plain link.
		if ( '' === $child_html ) {
			return '' !== $url ? $this->render_drawer_link( $url, $label ) : '';
		}

		$panel_id = $this->id_prefix . '-drawer-sub-' . $this->drawer_panel_index++;
		$chevron  = sgs_get_lucide_icon( 'chevron-down' );

		$trigger_link = '' !== $url
			? sprintf( '<a href="%s" class="sgs-adaptive-nav__drawer-link">%s</a>', esc_url( $url ), esc_html( $label ) )
			: sprintf( '<span class="sgs-adaptive-nav__drawer-link sgs-adaptive-nav__drawer-link--no-href">%s</span>', esc_html( $label ) );

		return sprintf(
			'<li class="sgs-adaptive-nav__drawer-item sgs-adaptive-nav__drawer-item--has-children">' .
			'<div class="sgs-adaptive-nav__drawer-item-row">%s' .
			'<button type="button" class="sgs-adaptive-nav__drawer-toggle" aria-expanded="false" aria-controls="%s" aria-label="%s"><span class="sgs-adaptive-nav__drawer-chevron">%s</span></button>' .
			'</div>' .
			'<ul id="%s" class="sgs-adaptive-nav__drawer-submenu" hidden>%s</ul>' .
			'</li>',
			$trigger_link,
			esc_attr( $panel_id ),
			/* translators: %s: menu item label */
			esc_attr( sprintf( __( 'Toggle %s submenu', 'sgs-blocks' ), $label ) ),
			$chevron,
			esc_attr( $panel_id ),
			$child_html
		);
	}

	/**
	 * Expand a core/page-list into drawer accordion items (no-ref fallback).
	 * Mirrors render_page_list() but emits the drawer's own markup/classes.
	 *
	 * @param int $parent_id Root page id (0 = top level).
	 * @return string HTML <li> elements.
	 */
	private function render_drawer_page_list( int $parent_id ): string {
		$pages = get_pages(
			array(
				'parent'      => $parent_id,
				'sort_column' => 'menu_order,post_title',
				'post_status' => 'publish',
			)
		);
		if ( empty( $pages ) ) {
			return '';
		}

		$html = '';
		foreach ( $pages as $page ) {
			$url      = (string) get_permalink( $page->ID );
			$children = get_pages(
				array(
					'parent'      => $page->ID,
					'sort_column' => 'menu_order,post_title',
					'post_status' => 'publish',
				)
			);

			if ( ! empty( $children ) ) {
				$pseudo_children = array();
				foreach ( $children as $child ) {
					$pseudo_children[] = array(
						'blockName' => 'core/navigation-link',
						'attrs'     => array(
							'url'   => (string) get_permalink( $child->ID ),
							'label' => $child->post_title,
						),
					);
				}
				$html .= $this->render_drawer_submenu( $page->post_title, $url, $pseudo_children );
			} else {
				$html .= $this->render_drawer_link( $url, $page->post_title );
			}
		}
		return $html;
	}

	// ── Drawer socials (Site Info only, R-31-1 — no legacy option reads) ────

	/**
	 * Render the drawer's social-icon row from Sgs_Site_Info ONLY — the
	 * canonical 7 networks. Mirrors src/blocks/social-icons/render.php's
	 * read+escape pattern exactly. Empty store → renders nothing (never a
	 * hardcoded fallback; the legacy sgs_social_* / sgs_phone / sgs_email
	 * option reads die with sgs/mobile-nav, they are NOT carried forward here).
	 *
	 * @return string HTML <ul> element, or empty string when no socials are set.
	 */
	public function render_drawer_socials(): string {
		$networks = array(
			'facebook'  => __( 'Facebook', 'sgs-blocks' ),
			'instagram' => __( 'Instagram', 'sgs-blocks' ),
			'twitter'   => __( 'X (Twitter)', 'sgs-blocks' ),
			'linkedin'  => __( 'LinkedIn', 'sgs-blocks' ),
			'youtube'   => __( 'YouTube', 'sgs-blocks' ),
			'tiktok'    => __( 'TikTok', 'sgs-blocks' ),
			'whatsapp'  => __( 'WhatsApp', 'sgs-blocks' ),
		);

		$icon_map = array(
			'facebook'  => 'facebook',
			'instagram' => 'instagram',
			'twitter'   => 'twitter',
			'linkedin'  => 'linkedin',
			'youtube'   => 'youtube',
			'tiktok'    => 'music',
			'whatsapp'  => 'message-circle',
		);

		$items = '';
		foreach ( $networks as $network_slug => $network_label ) {
			$social_url = (string) Sgs_Site_Info::get( "socials.{$network_slug}", '' );
			if ( '' === $social_url ) {
				continue;
			}
			$items .= sprintf(
				'<li class="sgs-adaptive-nav__drawer-social-item"><a href="%s" class="sgs-adaptive-nav__drawer-social-link sgs-adaptive-nav__drawer-social-link--%s" target="_blank" rel="noopener noreferrer" aria-label="%s">%s</a></li>',
				esc_url( $social_url ),
				sanitize_html_class( $network_slug ),
				esc_attr( $network_label ),
				sgs_get_lucide_icon( $icon_map[ $network_slug ] ?? 'link' )
			);
		}

		if ( '' === $items ) {
			return '';
		}

		return sprintf( '<ul class="sgs-adaptive-nav__drawer-socials">%s</ul>', $items );
	}
}
