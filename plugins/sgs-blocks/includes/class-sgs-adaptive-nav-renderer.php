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

/**
 * Renders the sgs/adaptive-nav desktop bar from resolved menu blocks.
 */
class SGS_Adaptive_Nav_Renderer {

	/**
	 * Per-render counter guaranteeing unique panel ids for aria-controls.
	 *
	 * @var int
	 */
	private int $panel_index = 0;

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
}
