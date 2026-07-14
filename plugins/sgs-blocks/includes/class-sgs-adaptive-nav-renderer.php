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
 * At the mobile tier, drill-down happens inside the off-canvas <dialog>
 * drawer that this SAME renderer also produces (render_drawer_menu() below) —
 * one resolved menu source feeds both the desktop bar and the drawer accordion,
 * so they never fall out of sync. That includes sgs/mega-menu items, which are
 * ordinary members of the wp_navigation menu: the bar renders their real panel,
 * the drawer flattens them to an accordion of the panel's links.
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
				case 'sgs/mega-menu':
				case 'sgs/mega-menu-item':
					// A mega-menu is a first-class MENU ITEM: operators add it to the
					// wp_navigation menu as a sibling of core/navigation-link (verified
					// live on Indus's menu, D338). Its own render.php emits an <li>
					// root, so it drops straight into this <ul>. Without this case it
					// hit `default` and vanished from the bar entirely — the menu
					// declared 7 items and only 5 rendered.
					$html .= render_block( $block );
					break;
				default:
					// Unknown block (whitespace, etc.) — skip.
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
				case 'sgs/mega-menu':
				case 'sgs/mega-menu-item':
					$html .= $this->render_drawer_mega_menu( $block );
					break;
				default:
					// Unknown block (whitespace, etc.) — skip.
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
			// A nested submenu contributes its OWN link (one level is flattened),
			// mirroring the desktop collect_child_links(). Accepting only
			// navigation-link silently DROPPED a third menu level here while the
			// desktop bar still showed it — the two walks must agree.
			$c_name = $child['blockName'] ?? '';
			if ( 'core/navigation-link' !== $c_name && 'core/navigation-submenu' !== $c_name ) {
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
	 * Render an sgs/mega-menu MENU ITEM as a drawer accordion.
	 *
	 * A mega-menu is a first-class item of the wp_navigation menu, sitting beside
	 * core/navigation-link/-submenu (verified on Indus's live menu, D338). Its
	 * panel content is not block data — it lives in a template part named by the
	 * `menuTemplatePart` attr — so the child links are harvested from the
	 * RENDERED part and fed to the existing submenu accordion as pseudo
	 * navigation-link blocks (the same trick render_drawer_page_list() uses).
	 * The desktop bar renders the real panel; the drawer flattens it to links,
	 * because a multi-column mega panel is unusable at 375px.
	 *
	 * @param array $block Parsed sgs/mega-menu block.
	 * @return string HTML <li> element.
	 */
	private function render_drawer_mega_menu( array $block ): string {
		$attrs = $block['attrs'] ?? array();
		$label = (string) ( $attrs['label'] ?? '' );
		$url   = (string) ( $attrs['url'] ?? '' );
		$slug  = (string) ( $attrs['menuTemplatePart'] ?? $attrs['templatePartSlug'] ?? '' );

		if ( '' === $label ) {
			return '';
		}

		$children = array();

		foreach ( $this->extract_links_from_template_part( $slug ) as $link ) {
			$children[] = array(
				'blockName' => 'core/navigation-link',
				'attrs'     => array(
					'url'   => $link['href'],
					'label' => $link['text'],
				),
			);
		}

		// No template part (or it yielded nothing): fall back to any authored
		// navigation-link innerBlocks.
		if ( empty( $children ) && ! empty( $block['innerBlocks'] ) ) {
			foreach ( $block['innerBlocks'] as $child ) {
				if ( 'core/navigation-link' === ( $child['blockName'] ?? '' ) ) {
					$children[] = $child;
				}
			}
		}

		// "View all X" when the parent carries its own destination — the panel's
		// overview link has no other route into the drawer.
		if ( '' !== $url ) {
			$children[] = array(
				'blockName' => 'core/navigation-link',
				'attrs'     => array(
					'url'   => $url,
					/* translators: %s: mega menu item label */
					'label' => sprintf( __( 'View all %s', 'sgs-blocks' ), $label ) . ' →',
				),
			);
		}

		return $this->render_drawer_submenu( $label, $url, $children );
	}

	/**
	 * Render a template part by slug and extract its links.
	 *
	 * Ported verbatim in behaviour from the retired sgs/mobile-nav renderer, which
	 * is what produced the captured Indus baseline — a mega panel is arbitrary
	 * authored blocks (groups/columns/headings/cards), so scraping the rendered
	 * anchors is more robust than trying to parse an open-ended block tree.
	 *
	 * @param string $slug Template part slug (e.g. 'mega-menu-sectors').
	 * @return array<int, array{href: string, text: string}> Extracted links.
	 */
	private function extract_links_from_template_part( string $slug ): array {
		if ( '' === $slug ) {
			return array();
		}

		$rendered = do_blocks( '<!-- wp:template-part {"slug":"' . esc_js( $slug ) . '"} /-->' );
		if ( ! $rendered ) {
			return array();
		}

		$links = array();

		// Suppress libxml errors from messy authored HTML.
		$prev = libxml_use_internal_errors( true );
		$dom  = new DOMDocument();
		$dom->loadHTML( '<html><body>' . $rendered . '</body></html>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
		libxml_clear_errors();
		libxml_use_internal_errors( $prev );

		foreach ( $dom->getElementsByTagName( 'a' ) as $anchor ) {
			$href = trim( $anchor->getAttribute( 'href' ) );
			$text = trim( $anchor->textContent ); // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- DOMNode::textContent is a PHP DOM API property.

			// An image-only card link: use its alt text as the accessible name.
			if ( '' === $text ) {
				$imgs = $anchor->getElementsByTagName( 'img' );
				if ( $imgs->length > 0 ) {
					$text = trim( $imgs->item( 0 )->getAttribute( 'alt' ) );
				}
			}

			// Still nothing: derive a readable name from the URL's last segment.
			if ( '' === $text && '' !== $href && '#' !== $href ) {
				$path  = trim( (string) wp_parse_url( $href, PHP_URL_PATH ), '/' );
				$parts = explode( '/', $path );
				$last  = end( $parts );
				if ( $last ) {
					$text = ucwords( str_replace( array( '-', '_' ), ' ', $last ) );
				}
			}

			if ( '' !== $href && '' !== $text && '#' !== $href ) {
				$links[] = array(
					'href' => $href,
					'text' => $text,
				);
			}
		}

		return $links;
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

	// Drawer socials are NOT rendered here. sgs/social-icons already does this
	// job (source="site-info", D335) and is the block operators can place, style
	// and reorder — so the drawer's socials are simply that block, placed in the
	// drawer drop-zone. A private copy here was a duplicate of a working block
	// and drifted from it immediately (it shipped the 7-network list while the
	// store grew to 8). Deleted D338.
}
