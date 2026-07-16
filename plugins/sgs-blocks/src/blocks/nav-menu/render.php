<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- this is a dynamic block render template; the SGS_Nav_Menu_Renderer helper class below is rendered inline, its namespace lives in the block slug.
/**
 * SGS Menu (sgs/nav-menu) — server-side render.
 *
 * Renders the accordion navigation menu that the sgs/adaptive-nav drawer
 * produces today, but as a first-class, styleable block. The menu SOURCE is
 * resolved by the shared SGS_Nav_Menu_Source (reused by call — a stable shared
 * static library), so this block and the desktop bar stay on ONE menu source
 * (FR-S9-4 one-source rule).
 *
 * The accordion walk below (SGS_Nav_Menu_Renderer) is a DELIBERATE COPY of
 * SGS_Adaptive_Nav_Renderer::render_drawer_* (includes/class-sgs-adaptive-nav-
 * renderer.php, L328–L640), re-rooted from `sgs-adaptive-nav__drawer-*` to
 * `sgs-nav-menu__*` BEM classes. Reuse-by-call is impossible: those methods are
 * private AND hardcode the drawer class names, so calling them would emit the
 * wrong classes. Structure + ARIA are identical (APG disclosure accordion,
 * real <a href> everywhere, aria-current, 44px rows, mega-menu items flattened
 * to accordion panels).
 *
 * SEO / GEO / a11y: EVERY link is a real server-rendered <a href>; the accordion
 * panels are hidden with the `hidden` attribute only, so crawlers (which do not
 * run JS) see the whole link tree. view.js adds the click-to-expand enhancement.
 *
 * NO-INLINE (Spec 32): the rendered subtree carries ZERO inline style property
 * declarations. Link colour / hover / typography / dividers are emitted into the
 * block's own scoped <style> (custom-property VALUES / var() references only).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Unused (dynamic block).
 * @var WP_Block $block       Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-typography.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-wcag.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-nav-menu-source.php';

if ( ! class_exists( 'SGS_Nav_Menu_Renderer' ) ) {
	/**
	 * Turns resolved menu blocks into the sgs/nav-menu accordion markup.
	 *
	 * A re-rooted COPY of the SGS_Adaptive_Nav_Renderer drawer methods (see the
	 * file docblock) — the SAME structure/ARIA, emitting `sgs-nav-menu__*` classes.
	 */
	class SGS_Nav_Menu_Renderer {

		/**
		 * Per-render counter guaranteeing unique accordion panel ids for
		 * aria-controls within this instance.
		 *
		 * @var int
		 */
		private int $panel_index = 0;

		/**
		 * Per-instance id namespace for aria-controls ids (kept distinct from the
		 * content-hash uid so two default-attribute instances on one page do not
		 * collide — FR-34-4).
		 *
		 * @var string
		 */
		private string $id_prefix;

		/**
		 * Lazily computed, request-normalised current page path (scheme/host/query/
		 * trailing-slash agnostic) — cached per render so repeated aria-current
		 * checks across many links do not re-parse $_SERVER['REQUEST_URI'].
		 *
		 * @var string|null
		 */
		private ?string $current_path_cache = null;

		/**
		 * Constructor.
		 *
		 * @param string $id_prefix Per-instance unique id namespace.
		 */
		public function __construct( string $id_prefix ) {
			$this->id_prefix = sanitize_html_class( $id_prefix );
		}

		/**
		 * Dispatch each resolved block to the matching item renderer.
		 *
		 * @param array $blocks Parsed nav blocks (from SGS_Nav_Menu_Source).
		 * @return string HTML <li> elements, or empty string when nothing resolves.
		 */
		public function render_items( array $blocks ): string {
			$html = '';
			foreach ( $blocks as $block ) {
				switch ( $block['blockName'] ?? '' ) {
					case 'core/navigation-link':
						$html .= $this->render_link( $block['attrs']['url'] ?? '', $block['attrs']['label'] ?? '' );
						break;
					case 'core/navigation-submenu':
						$html .= $this->render_submenu(
							$block['attrs']['label'] ?? '',
							$block['attrs']['url'] ?? '',
							$block['innerBlocks'] ?? array()
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
						$html .= $this->render_mega_menu( $block );
						break;
					default:
						// Unknown block (whitespace, etc.) — skip.
						break;
				}
			}
			return $html;
		}

		/**
		 * Render a top-level link as <li><a>, 44px target.
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
				'<li class="sgs-nav-menu__item"><a class="sgs-nav-menu__link" href="%s"%s>%s</a></li>',
				esc_url( $url ),
				$current,
				esc_html( $label )
			);
		}

		/**
		 * Render a submenu as an accordion item: parent link/label + a disclosure
		 * toggle (aria-expanded/aria-controls) revealing a hidden <ul> of children.
		 *
		 * @param string $label    Parent label.
		 * @param string $url      Parent URL (may be empty).
		 * @param array  $children Parsed innerBlocks of the core/navigation-submenu.
		 * @return string HTML <li> element.
		 */
		private function render_submenu( string $label, string $url, array $children ): string {
			if ( '' === $label ) {
				return '';
			}

			$child_html = '';
			foreach ( $children as $child ) {
				// A nested submenu contributes its OWN link (one level flattened),
				// mirroring the drawer walk being copied.
				$c_name = $child['blockName'] ?? '';
				if ( 'core/navigation-link' !== $c_name && 'core/navigation-submenu' !== $c_name ) {
					continue;
				}
				$c_label = $child['attrs']['label'] ?? '';
				if ( '' === $c_label ) {
					continue;
				}
				$c_url       = $child['attrs']['url'] ?? '';
				$c_url       = '' !== $c_url ? $c_url : '#';
				$c_current   = $this->is_current_url( $c_url ) ? ' aria-current="page"' : '';
				$child_html .= sprintf(
					'<li class="sgs-nav-menu__subitem"><a class="sgs-nav-menu__sublink" href="%s"%s>%s</a></li>',
					esc_url( $c_url ),
					$c_current,
					esc_html( $c_label )
				);
			}

			// A submenu with no resolvable children degrades to a plain link.
			if ( '' === $child_html ) {
				return '' !== $url ? $this->render_link( $url, $label ) : '';
			}

			$panel_id = $this->id_prefix . '-sub-' . $this->panel_index++;
			$chevron  = sgs_get_lucide_icon( 'chevron-down' );

			$trigger_link = '' !== $url
				? sprintf( '<a href="%s" class="sgs-nav-menu__link">%s</a>', esc_url( $url ), esc_html( $label ) )
				: sprintf( '<span class="sgs-nav-menu__link sgs-nav-menu__link--no-href">%s</span>', esc_html( $label ) );

			return sprintf(
				'<li class="sgs-nav-menu__item sgs-nav-menu__item--has-children">' .
				'<div class="sgs-nav-menu__item-row">%s' .
				'<button type="button" class="sgs-nav-menu__toggle" aria-expanded="false" aria-controls="%s" aria-label="%s"><span class="sgs-nav-menu__chevron">%s</span></button>' .
				'</div>' .
				'<ul id="%s" class="sgs-nav-menu__submenu" hidden>%s</ul>' .
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
		 * Render an sgs/mega-menu MENU ITEM as an accordion.
		 *
		 * A mega-menu is a first-class item of the wp_navigation menu. Its panel
		 * content lives in a template part named by `menuTemplatePart`, so the
		 * child links are harvested from the RENDERED part and fed to the submenu
		 * accordion as pseudo navigation-link blocks (the same trick the drawer
		 * copy uses — a multi-column mega panel is unusable in an accordion).
		 *
		 * @param array $block Parsed sgs/mega-menu block.
		 * @return string HTML <li> element.
		 */
		private function render_mega_menu( array $block ): string {
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

			// "View all X" when the parent carries its own destination.
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

			return $this->render_submenu( $label, $url, $children );
		}

		/**
		 * Render a template part by slug and extract its links.
		 *
		 * A mega panel is arbitrary authored blocks, so scraping the rendered
		 * anchors is more robust than parsing an open-ended block tree.
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
		 * Expand a core/page-list into accordion items (no-ref fallback).
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
					$html .= $this->render_submenu( $page->post_title, $url, $pseudo_children );
				} else {
					$html .= $this->render_link( $url, $page->post_title );
				}
			}
			return $html;
		}

		/**
		 * Compare a URL against the current page URL — scheme, host, trailing-slash
		 * and query-string agnostic (only the PATH is compared).
		 *
		 * The previous approach compared against get_pagenum_link(), a pagination
		 * helper (blog page 2, 3…), NOT the current request URL — this left
		 * aria-current="page" unset on every ordinary page, including the live
		 * homepage. Compare against $_SERVER['REQUEST_URI'] instead.
		 *
		 * @param string $url The URL to test.
		 * @return bool True when the URL matches the current page.
		 */
		private function is_current_url( string $url ): bool {
			if ( '' === $url || '#' === $url ) {
				return false;
			}
			return $this->normalise_path( $url ) === $this->current_path();
		}

		/**
		 * The current request's path, normalised for comparison. Cached per render.
		 *
		 * @return string Normalised path (never trailing-slashed; '' for the site root).
		 */
		private function current_path(): string {
			if ( null === $this->current_path_cache ) {
				$request_uri              = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only path comparison, no state change.
				$this->current_path_cache = $this->normalise_path( home_url( $request_uri ) );
			}
			return $this->current_path_cache;
		}

		/**
		 * Normalise a URL (absolute or relative) to a bare, trailing-slash-free,
		 * query-string-free path for scheme/host/trailing-slash/query agnostic
		 * comparison.
		 *
		 * @param string $url URL or path to normalise.
		 * @return string Normalised path.
		 */
		private function normalise_path( string $url ): string {
			if ( '' !== $url && ! preg_match( '#^https?://#i', $url ) ) {
				$url = home_url( $url );
			}
			$parts = wp_parse_url( $url );
			$path  = is_array( $parts ) && isset( $parts['path'] ) ? $parts['path'] : '';
			return rtrim( $path, '/' );
		}
	}
}

// ── 1. Deterministic content-addressed uid (CSS scope) + per-instance ARIA id
// namespace. The uid mixes `anchor` into the md5 (the sgs/accordion + adaptive-
// nav idiom) so a scoped <style> dedups across pages. The ARIA id namespace is
// derived SEPARATELY via wp_unique_id(): two DEFAULT-attribute instances on one
// page (drawer + footer column — FR-34-4's required test) share a uid but MUST
// get unique aria-controls ids, so the id namespace carries a per-render unique
// suffix. The uid never appears in an aria-controls id, so decoupling is safe.
// STOP-NO-KSORT: do not reorder $attributes before hashing.
$anchor_val = isset( $block->parsed_block['attrs']['anchor'] ) ? (string) $block->parsed_block['attrs']['anchor'] : '';
$uid        = 'sgs-nav-menu-' . substr( md5( wp_json_encode( $attributes ) . $anchor_val ), 0, 8 );
$uid_sel    = '.' . $uid;
$id_prefix  = wp_unique_id( $uid . '-' );

// ── 2. Resolve the menu: own `ref` ?? context `sgs/navRef` ?? menuFallback.
// `null` ref inherits the parent nav's resolved menu (FR-S9-4 one-source rule);
// setting `ref` in the picker is the deliberate independent-tree escape hatch.
$own_ref = isset( $attributes['ref'] ) ? absint( $attributes['ref'] ) : 0;
$ctx_ref = isset( $block->context['sgs/navRef'] ) ? absint( $block->context['sgs/navRef'] ) : 0;
$ref     = $own_ref > 0 ? $own_ref : $ctx_ref;

$menu_fallback = isset( $attributes['menuFallback'] ) ? sanitize_key( $attributes['menuFallback'] ) : 'page-list';
$menu_blocks   = SGS_Nav_Menu_Source::get_menu_blocks( $ref, 'none' !== $menu_fallback );

$renderer   = new SGS_Nav_Menu_Renderer( $id_prefix );
$items_html = $renderer->render_items( $menu_blocks );

// Zero menu items → render nothing (no empty <ul>).
if ( '' === $items_html ) {
	return '';
}

// ── 3. Scoped CSS assembly (no-inline, Spec 32). ───────────────────────────────
$css         = '';
$link_sel    = $uid_sel . ' .sgs-nav-menu__link';
$sublink_sel = $uid_sel . ' .sgs-nav-menu__sublink';

// 3a. Link typography via the shared helper — weight / style / line-height ONLY.
// The object-model linkFontSize is stripped so it does not fall through the
// helper's legacy-string branch and emit `font-size:Array`; it is emitted just
// below via sgs_emit_responsive_css (mirrors adaptive-nav's split emission).
$typo_attrs = $attributes;
unset( $typo_attrs['linkFontSize'] );
$css .= sgs_typography_css_rule( $typo_attrs, 'link', $link_sel );

// 3b. Link font-size — object model, block-owned emit. Each tier is a length
// STRING ("18px"); a bare number falls back to px.
if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['linkFontSize'] ?? null ) ) {
	$css .= sgs_emit_responsive_css(
		$link_sel,
		array(
			array(
				'value'        => $attributes['linkFontSize'],
				'css'          => 'font-size',
				'unit_default' => 'px',
			),
		),
		array( 'container' => false )
	);
}

// 3b-ii. WP-native colour support (skip-serialised, Spec 32) — the wrapper-level
// text colour an operator sets from the standard Colour panel. Declared because the
// block offers UK per-element colour attrs and the uniformity audit requires the
// native control alongside them (a client should not need to learn a bespoke picker
// for the ordinary case). SkipSerialization means WP populates `style.color.*` but
// does NOT auto-inline it — we emit it into this block's scoped <style> instead.
// HC2-legal: this is an inheritable WRAPPER default on the block ROOT (children
// inherit via `color: inherit`), NOT a per-element parent control.
if ( function_exists( 'wp_style_engine_get_styles' ) && isset( $attributes['style']['color']['text'] )
	&& '' !== $attributes['style']['color']['text'] ) {
	$sgs_nm_scoped = wp_style_engine_get_styles(
		array( 'color' => array( 'text' => (string) $attributes['style']['color']['text'] ) ),
		array( 'selector' => $uid_sel )
	);
	if ( ! empty( $sgs_nm_scoped['css'] ) ) {
		$css .= $sgs_nm_scoped['css'];
	}
}

// The has-*-color preset class WP strips under skip-serialisation. Collected here and
// appended to $wrapper_args['class'] below (this block has no $classes array — its root
// IS the <ul>, per the single-semantic-element rule).
$sgs_nm_text_slug    = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sgs_nm_preset_class = '' !== $sgs_nm_text_slug
	? ' has-text-color has-' . $sgs_nm_text_slug . '-color'
	: '';

// 3c. Link colour (resting) — token slug → preset custom property. Applied to
// both top-level links and sub-links so the menu reads as one colour. Base
// colour is `inherit` (style.css) — an unset slug lets the drawer's computed
// foreground (or the footer's text colour) flow through unchanged.
$link_colour = isset( $attributes['linkColour'] ) ? sanitize_html_class( $attributes['linkColour'] ) : '';
if ( '' !== $link_colour ) {
	$css .= $link_sel . ',' . $sublink_sel . '{color:var(--wp--preset--color--' . $link_colour . ');}';
}

// 3c-ii. Hover + current-page state — WCAG-safe background pill (default) or
// underline (operator opt-out via hoverStyle). Same treatment for :hover,
// :focus-visible AND [aria-current="page"] so "you are here" reads identically
// to "you are about to go here" (Bean-approved persistent-selected pattern).
$hover_state_targets = array(
	$link_sel . ':hover',
	$link_sel . ':focus-visible',
	$link_sel . '[aria-current="page"]',
	$sublink_sel . ':hover',
	$sublink_sel . ':focus-visible',
	$sublink_sel . '[aria-current="page"]',
);
$hover_state_sel     = implode( ',', $hover_state_targets );
$toggle_state_sel    = implode(
	',',
	array(
		$uid_sel . ' .sgs-nav-menu__toggle:hover',
		$uid_sel . ' .sgs-nav-menu__toggle:focus-visible',
	)
);

$hover_style = isset( $attributes['hoverStyle'] ) && 'underline' === $attributes['hoverStyle'] ? 'underline' : 'background';
$bg_emitted  = false;

if ( 'background' === $hover_style ) {
	$hover_bg_slug = isset( $attributes['hoverBgColour'] ) ? sanitize_html_class( $attributes['hoverBgColour'] ) : 'accent';
	$hover_bg_hex  = '' !== $hover_bg_slug ? sgs_resolve_palette_hex( $hover_bg_slug, '' ) : '';

	if ( '' !== $hover_bg_hex ) {
		// WCAG-computed text colour for the resolved background — never an
		// operator-guessed hex, so the pairing is always ≥ 4.5:1 (R-31-13
		// class of guarantee, extended to hover/current-page state).
		$hover_fg_hex = sgs_wcag_text_colour_for_bg( $hover_bg_hex );
		$state_rule   = 'background-color:' . esc_attr( $hover_bg_hex ) . ';color:' . esc_attr( $hover_fg_hex ) . ';';

		$css .= $hover_state_sel . '{' . $state_rule . 'border-radius:8px;padding-inline:12px;text-decoration:none;transition:background-color .15s ease,color .15s ease;}';
		// The chevron is a sibling of the trigger link (inside the toggle
		// button), not its descendant, so it needs its OWN hover/focus rule to
		// pick up the matching WCAG-safe colour via `currentColor`.
		$css       .= $toggle_state_sel . '{' . $state_rule . 'transition:background-color .15s ease,color .15s ease;}';
		$bg_emitted = true;
	}
}

// Underline mode, OR background mode with an unresolvable hoverBgColour slug
// (never leave hover/current-page with zero visible affordance — WCAG 1.4.1 /
// 2.4.7 requires SOME state indicator). An explicit linkHoverColour override
// still applies here (legacy per-instance colour pick); it is intentionally
// NOT honoured in background mode, where the emitted foreground is
// WCAG-computed against the resolved background and must not be overridden.
if ( ! $bg_emitted ) {
	$link_hover = isset( $attributes['linkHoverColour'] ) ? sanitize_html_class( $attributes['linkHoverColour'] ) : '';
	$hover_fg   = '' !== $link_hover ? 'var(--wp--preset--color--' . $link_hover . ')' : 'inherit';
	$css       .= $hover_state_sel . '{color:' . $hover_fg . ';background-color:transparent;text-decoration:underline;text-underline-offset:3px;}';
}

// 3d. Dividers between rows — gated on showDividers. Colour from dividerColour
// (a token slug) else a currentColor-relative tint so the divider stays visible
// on ANY background (the block is context-agnostic — drawer, footer, etc.).
$show_dividers = ! isset( $attributes['showDividers'] ) || ! empty( $attributes['showDividers'] );
if ( $show_dividers ) {
	$divider_slug = isset( $attributes['dividerColour'] ) ? sanitize_html_class( $attributes['dividerColour'] ) : '';
	$link_divider = '' !== $divider_slug
		? 'var(--wp--preset--color--' . $divider_slug . ')'
		: 'color-mix(in srgb, currentColor 18%, transparent)';
	$sub_divider  = '' !== $divider_slug
		? 'var(--wp--preset--color--' . $divider_slug . ')'
		: 'color-mix(in srgb, currentColor 10%, transparent)';
	$css         .= $link_sel . '{border-bottom:1px solid ' . $link_divider . ';}';
	$css         .= $uid_sel . ' .sgs-nav-menu__subitem{border-bottom:1px solid ' . $sub_divider . ';}';
}

// ── 4. Root element (the <ul> IS the block root — single semantic element, no
// useless wrapper div). No 'style' key is passed, so the root carries ZERO inline
// property declarations (Spec 32). The uid is added as a CLASS for the scoped CSS.
$anchor       = isset( $attributes['anchor'] ) ? (string) $attributes['anchor'] : '';
$wrapper_args = array( 'class' => 'sgs-nav-menu ' . $uid . $sgs_nm_preset_class );
if ( '' !== $anchor ) {
	$wrapper_args['id'] = $anchor;
}
$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

if ( '' !== $css ) {
	// wp_strip_all_tags guards a </style> breakout; every value reaching $css is
	// pre-sanitised (sanitize_html_class slugs / var() references / the shared
	// responsive + typography helpers), so no un-sanitised value survives here.
	printf( '<style>%s</style>', wp_strip_all_tags( $css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style>.
}

printf( '<ul %s>%s</ul>', $wrapper_attributes, $items_html ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from get_block_wrapper_attributes(); $items_html built from esc_url/esc_html/esc_attr fragments + trusted SVG.
