<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- dynamic block render template; helper class below is rendered inline, its namespace lives in the block slug.
/**
 * SGS Nav Menu (sgs/nav-menu) — server-side render.
 *
 * REBUILD (Spec 36 Phase 1 Wave 2, Step 6 — D270 same-slug rebuild, no
 * deprecation). This is the site's VISIBLE menu: a FLAT horizontal bar of
 * real <a href> links on desktop; below `collapsePoint` it becomes a burger
 * that opens `sgs/nav-drawer` through the shared `store('sgs/nav')`
 * Interactivity store (src/shared/nav-interactivity/store.js). No
 * submenus/dropdowns/mega this phase — a submenu/mega-menu item collapses to
 * its OWN single top-level link.
 *
 * Menu source: the shared SGS_Nav_Menu_Source resolver (one-source rule,
 * FR-S9-4) — the SAME resolver sgs/adaptive-nav and the drawer content use.
 *
 * NO-INLINE (Spec 32): the rendered subtree carries ZERO inline CSS property
 * declarations. Colour / hover / typography / featured styling are emitted
 * into this block's own scoped <style> (custom-property VALUES / var()
 * references only ride inline, and only inside the wrapper's own mechanism).
 *
 * `aria-current="page"` is intentionally NOT computed here — the stack sits
 * behind LiteSpeed page cache, so a server-baked value would serve a stale
 * page's answer to every cached visitor. view.js computes it client-side at
 * mount by comparing `location.pathname` (FR-36-10/-11).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Unused (dynamic block, no InnerBlocks).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-typography.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-wcag.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-nav-menu-source.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

if ( ! class_exists( 'SGS_Nav_Menu_Bar_Renderer' ) ) {
	/**
	 * Flattens a resolved menu-block tree into the sgs/nav-menu FLAT bar markup.
	 *
	 * Deliberately simpler than the accordion renderer this block used before
	 * the Spec 36 rebuild: every submenu/mega-menu item collapses to ONE
	 * top-level link (its own URL when set, else '#') — no nested <ul>, no
	 * disclosure toggle. Phase-1 scope is a flat bar only.
	 */
	class SGS_Nav_Menu_Bar_Renderer {

		/**
		 * Featured item identifiers (from the block's featuredItemIds attr).
		 *
		 * @var array<int, string>
		 */
		private array $featured_ids;

		/**
		 * This block instance's content-addressed uid — folded into each mega
		 * panel's DOM id so two nav-menu instances bound to the SAME menu (a
		 * client can do that today) never emit a duplicate id / aria-controls
		 * target (axe duplicate-id-aria).
		 *
		 * @var string
		 */
		private string $uid;

		/**
		 * Constructor.
		 *
		 * @param array  $featured_ids Featured item identifiers.
		 * @param string $uid          This block instance's uid (CSS scope + id namespace).
		 */
		public function __construct( array $featured_ids, string $uid = '' ) {
			$this->featured_ids = array_map( 'strval', $featured_ids );
			$this->uid          = $uid;
		}

		/**
		 * Flatten resolved nav blocks into a list of { identifier, url, label }.
		 *
		 * The identifier mirrors edit.js's client-side flattening (same rule)
		 * so a featuredItemIds entry ticked in the inspector matches the
		 * server-rendered item: the underlying post/menu-item id when present,
		 * else a stable 'label:<text>' fallback key.
		 *
		 * @param array $blocks Parsed nav blocks (from SGS_Nav_Menu_Source).
		 * @return array<int, array{identifier: string, url: string, label: string}>
		 */
		public function flatten( array $blocks ): array {
			$items = array();
			foreach ( $blocks as $block ) {
				$name = $block['blockName'] ?? '';
				switch ( $name ) {
					case 'core/navigation-link':
						$item = $this->from_link( $block['attrs'] ?? array() );
						if ( $item ) {
							$items[] = $item;
						}
						break;
					case 'core/navigation-submenu':
						// Flatten to the PARENT's own link only — no children this phase.
						$item = $this->from_link( $block['attrs'] ?? array() );
						if ( $item ) {
							$items[] = $item;
						}
						break;
					case 'core/home-link':
						$items[] = array(
							'identifier' => 'special:home',
							'url'        => home_url( '/' ),
							'label'      => __( 'Home', 'sgs-blocks' ),
						);
						break;
					case 'core/page-list':
						$items = array_merge( $items, $this->from_page_list( (int) ( $block['attrs']['parentPageID'] ?? 0 ) ) );
						break;
					default:
						// Whitespace / unknown block — skip.
						break;
				}
			}
			return $items;
		}

		/**
		 * Build one flat item from a navigation-link/submenu/mega-menu's own attrs.
		 *
		 * @param array $attrs Block attrs (label, url, id).
		 * @return array{identifier: string, url: string, label: string}|null
		 */
		private function from_link( array $attrs ): ?array {
			$label = (string) ( $attrs['label'] ?? '' );
			if ( '' === $label ) {
				return null;
			}
			$url        = (string) ( $attrs['url'] ?? '' );
			$url        = '' !== $url ? $url : '#';
			$identifier = isset( $attrs['id'] ) && '' !== $attrs['id']
				? 'id:' . sanitize_key( (string) $attrs['id'] )
				: 'label:' . $label;

			return array(
				'identifier' => $identifier,
				'url'        => $url,
				'label'      => $label,
				'type'       => (string) ( $attrs['type'] ?? '' ),
				'object_id'  => (int) ( $attrs['id'] ?? 0 ),
			);
		}

		/**
		 * Expand a top-level core/page-list into flat items (no-ref fallback).
		 *
		 * @param int $parent_id Root page id (0 = top level).
		 * @return array<int, array{identifier: string, url: string, label: string}>
		 */
		private function from_page_list( int $parent_id ): array {
			$pages = get_pages(
				array(
					'parent'      => $parent_id,
					'sort_column' => 'menu_order,post_title',
					'post_status' => 'publish',
				)
			);
			$items = array();
			foreach ( $pages as $page ) {
				$items[] = array(
					'identifier' => 'id:page-' . (int) $page->ID,
					'url'        => (string) get_permalink( $page->ID ),
					'label'      => (string) $page->post_title,
				);
			}
			return $items;
		}

		/**
		 * Render the flat <li><a> list.
		 *
		 * @param array $items Flattened items from flatten().
		 * @return string HTML <li> elements.
		 */
		public function render_items( array $items ): string {
			$html = '';
			foreach ( $items as $item ) {
				$is_featured = in_array( $item['identifier'], $this->featured_ids, true );
				$li_class    = 'sgs-nav-menu__item' . ( $is_featured ? ' sgs-nav-menu__item--featured' : '' );

				if ( 'sgs_mega_menu' === ( $item['type'] ?? '' ) ) {
					$panel_post_id = (int) ( $item['object_id'] ?? 0 );

					/*
					 * Does the panel ship its own CTA? Checked against the STORED
					 * post_content (a `wp:sgs/button` marker) rather than the
					 * rendered HTML, because the answer decides whether to register
					 * the footer filter BEFORE do_blocks() runs — checking rendered
					 * output would be a chicken-and-egg (the panel is already built
					 * by then). A block comment is the same source of truth the
					 * editor writes, so this cannot drift from what renders.
					 */
					$panel_post    = $panel_post_id ? get_post( $panel_post_id ) : null;
					$panel_has_cta = $panel_post instanceof WP_Post
						&& false !== strpos( (string) $panel_post->post_content, 'wp:sgs/button' );

					// Build the fallback link BEFORE rendering so it can be handed
					// to sgs/mega-panel's footer slot (Bean 2026-07-28: it must
					// render INSIDE the panel, never as a sibling).
					$viewall_for_panel = '';
					if ( ! $panel_has_cta && '#' !== $item['url'] && '' !== $item['url'] ) {
						$viewall_for_panel = sprintf(
							'<a class="sgs-nav-menu__mega-viewall" href="%s">%s</a>',
							esc_url( $item['url'] ),
							// translators: %s is the mega-menu item's own label (e.g. "Products").
							esc_html( sprintf( __( 'View all %s', 'sgs-blocks' ), $item['label'] ) )
						);
					}

					$viewall_filter = null;
					if ( '' !== $viewall_for_panel ) {
						$viewall_filter = static function ( $html, $id ) use ( $viewall_for_panel, $panel_post_id ) {
							return (int) $id === $panel_post_id ? $viewall_for_panel : $html;
						};
						add_filter( 'sgs_mega_panel_footer_html', $viewall_filter, 10, 2 );
					}

					$panel_html = function_exists( 'sgs_mega_render_panel_content' )
						? sgs_mega_render_panel_content( $panel_post_id )
						: null;

					// Remove immediately — the slot must never leak into the NEXT
					// mega item's panel on the same bar.
					if ( null !== $viewall_filter ) {
						remove_filter( 'sgs_mega_panel_footer_html', $viewall_filter, 10 );
					}
					if ( null !== $panel_html ) {
						// Instance-scoped id (reviewer finding): fold in $this->uid so
						// two nav-menus bound to the SAME menu can't collide (axe
						// duplicate-id-aria). $uid already carries the sgs-nav-menu- prefix.
						$panel_dom_id = $this->uid . '-mega-' . (int) $item['object_id'];
						$mega_ctx     = function_exists( 'wp_interactivity_data_wp_context' )
							? wp_interactivity_data_wp_context(
								array(
									'isOpen'      => false,
									'megaId'      => (string) (int) $item['object_id'],
									'intentDelay' => 300,
									'closeGrace'  => 170,
								)
							)
							: sprintf(
								"data-wp-context='%s'",
								esc_attr(
									wp_json_encode(
										array(
											'isOpen'      => false,
											'megaId'      => (string) (int) $item['object_id'],
											'intentDelay' => 300,
											'closeGrace'  => 170,
										)
									)
								)
							);
						$caret = function_exists( 'sgs_get_lucide_icon' ) ? sgs_get_lucide_icon( 'chevron-down' ) : '';
						$html .= sprintf(
							'<li class="%1$s sgs-nav-menu__item--mega">'
							. '<div class="sgs-nav-menu__mega" data-wp-interactive="sgs/mega" %2$s data-wp-on--mouseenter="actions.enterBridge" data-wp-on--mouseleave="actions.leaveBridge" data-wp-watch="callbacks.watchOpenState">'
							. '<button type="button" class="sgs-nav-menu__link sgs-nav-menu__mega-trigger" data-sgs-mega-trigger aria-expanded="false" aria-controls="%3$s" data-wp-bind--aria-expanded="context.isOpen" data-wp-on--click="actions.toggle" data-wp-on--keydown="actions.triggerKeydown">'
							. '<span class="sgs-nav-menu__label sgs-nav-menu__magnet-target">%4$s</span><span class="sgs-nav-menu__caret" aria-hidden="true">%5$s</span>'
							. '</button>'
							. '<div id="%3$s" class="sgs-nav-menu__mega-panel-wrap" data-sgs-mega-panel data-wp-on--keydown="actions.panelKeydown">%6$s</div>'
							. '</div></li>',
							esc_attr( $li_class ),
							$mega_ctx, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_interactivity_data_wp_context() self-escapes; the fallback branch esc_attr()s the JSON.
							esc_attr( $panel_dom_id ),
							esc_html( $item['label'] ),
							$caret, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
							$panel_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- do_blocks() output; already-safe rendered block HTML. The "View all" fallback (when the panel has no CTA of its own) is INSIDE this string, injected via sgs_mega_panel_footer_html.
						);
						continue; // Handled this item.
					}
					// Panel resolved null (trashed/missing/recursion) — fall through to plain link (FR-36-9a degrade).
				}

				$html .= sprintf(
					'<li class="%s"><a class="sgs-nav-menu__link" href="%s" data-sgs-nav-path="%s"><span class="sgs-nav-menu__link-text sgs-nav-menu__magnet-target">%s</span></a></li>',
					esc_attr( $li_class ),
					esc_url( $item['url'] ),
					esc_attr( wp_parse_url( $item['url'], PHP_URL_PATH ) ?? '' ),
					esc_html( $item['label'] )
				);
			}
			return $html;
		}
	}
}

// CSS-keyword / length sanitisers — free-text attrs concatenated into raw CSS.
$sgs_nm_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};
$sgs_nm_css_length  = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// ── 1. Deterministic content-addressed uid (CSS scope). ────────────────────
// STOP-NO-KSORT: $attributes passed verbatim into the uid hash + the wrapper.
$anchor_val = isset( $block->parsed_block['attrs']['anchor'] ) ? (string) $block->parsed_block['attrs']['anchor'] : '';
$uid        = 'sgs-nav-menu-' . substr( md5( wp_json_encode( $attributes ) . $anchor_val ), 0, 8 );
$uid_sel    = '.' . $uid;

// ── 2. Resolve the menu (one-source rule) + flatten to top-level links only. ──
$ref          = isset( $attributes['ref'] ) ? absint( $attributes['ref'] ) : 0;
$menu_blocks  = SGS_Nav_Menu_Source::get_menu_blocks( $ref, true );
$featured_ids = is_array( $attributes['featuredItemIds'] ?? null ) ? $attributes['featuredItemIds'] : array();
$bar_renderer = new SGS_Nav_Menu_Bar_Renderer( $featured_ids, $uid );
$flat_items   = $bar_renderer->flatten( $menu_blocks );
$items_html   = $bar_renderer->render_items( $flat_items );

if ( '' === $items_html ) {
	return '';
}

// ── 3. Burger + drawer-toggle context. ──────────────────────────────────────
$drawer_ref = isset( $attributes['drawerRef'] ) && '' !== $attributes['drawerRef']
	? sanitize_html_class( (string) $attributes['drawerRef'] )
	: 'sgs-nav-drawer';

$burger_context = wp_json_encode(
	array(
		'isOpen'    => false,
		'drawerRef' => $drawer_ref,
	)
);

$burger_icon = sgs_get_lucide_icon( 'menu' );

// wp_interactivity_data_wp_context() is the WP-canonical compact single-quoted
// emitter (avoids the &quot; bloat get_block_wrapper_attributes() would add) —
// mirrors the SGS_Container_Wrapper opts doc for `extra_attr_html`.
$burger_context_attr = function_exists( 'wp_interactivity_data_wp_context' )
	? wp_interactivity_data_wp_context(
		array(
			'isOpen'    => false,
			'drawerRef' => $drawer_ref,
		)
	)
	: sprintf( "data-wp-context='%s'", esc_attr( $burger_context ) );

$toggle_html = sprintf(
	'<div class="sgs-nav-menu__toggle-wrap" data-wp-interactive="sgs/nav" %s>' .
	'<button type="button" class="sgs-nav-menu__burger" data-wp-on--click="actions.toggleDrawer" data-wp-bind--aria-expanded="state.isOpen" aria-controls="%s" aria-label="%s">%s</button>' .
	'</div>',
	$burger_context_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_interactivity_data_wp_context() self-escapes; the fallback branch above esc_attr()s the JSON.
	esc_attr( $drawer_ref ),
	esc_attr__( 'Open menu', 'sgs-blocks' ),
	$burger_icon // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
);

// ── The <nav> landmark label (FR-36-10 / FR-36-11) ──────────────────────────
// The landmark ITSELF is the wrapper element: SGS_Container_Wrapper is called
// below with `'tag' => 'nav'`, so this block's root IS a <nav>. It always has
// been. This label rides onto it via `extra_attrs` — see the wrapper call.
//
// ⚠ HISTORY, so this is not "fixed" a third time. On 2026-07-23 a change added
// a SECOND, inner <nav class="sgs-nav-menu__nav"> here and moved the label onto
// it, on the stated grounds that the block "emitted NO <nav> element at all" and
// that the wrapper was "a roleless <div>". Both premises were false. They came
// from `grep -c "<nav" nav-menu/render.php`, which returns 0 because the <nav>
// is emitted by class-sgs-container-wrapper.php — a different file the grep
// never read (STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING). Live on the
// canary that change produced <nav> nested inside <nav> around the SAME links,
// with the OUTER one unnamed, and axe still reported `landmark-unique`. Reverted
// 2026-07-23. Before changing the landmark structure again, read the wrapper.
//
// The label falls back through: operator `navLabel` → the resolved MENU'S OWN
// NAME → 'Primary'. Preferring the menu name means two nav instances bound to
// DIFFERENT menus get distinct landmark names automatically, which is what
// FR-36-11 (and axe's landmark-unique) actually require. This requires
// `navLabel` to default to '' in block.json — a non-empty default makes the
// menu-name branch below unreachable dead code (it was, until 2026-07-23).
$nav_label = trim( (string) ( $attributes['navLabel'] ?? '' ) );
if ( '' === $nav_label && $ref > 0 && function_exists( 'wp_get_nav_menu_object' ) ) {
	$nav_menu_obj = wp_get_nav_menu_object( $ref );
	if ( $nav_menu_obj && ! empty( $nav_menu_obj->name ) ) {
		// Strip a trailing "menu"/"navigation"/"nav" from the DERIVED name only.
		// A landmark's role is already announced, so a label ending in one of
		// those words double-announces — "Main Menu" becomes "Main Menu
		// navigation" (W3C ARIA APG landmark guidance; Adrian Roselli, "Maybe
		// Don't Name That Landmark", 2024). Operators name menus "Main Menu" or
		// "Primary Navigation" constantly, so this WILL fire in practice.
		// Only the auto-derived value is normalised — an explicit operator
		// `navLabel` is their choice and is passed through untouched.
		$derived   = (string) $nav_menu_obj->name;
		$stripped  = preg_replace( '/\s*\b(menu|navigation|nav)\b\s*$/i', '', $derived );
		$nav_label = '' !== trim( (string) $stripped ) ? trim( (string) $stripped ) : $derived;
	}
}
if ( '' === $nav_label ) {
	$nav_label = __( 'Primary', 'sgs-blocks' );
}

/*
 * Sliding indicator / magnet-label opt-in flags (Mega-Menu Build Spec §6
 * rows 2 & 4) — bare data-attribute PRESENCE is view.js's init signal; both
 * default OFF, so an existing nav renders byte-identical until an operator
 * opts in via the Effects panel.
 *
 * `indicatorStyle` is PHP-validated, NOT a JSON `enum` (block.json
 * deliberately declares none) — an out-of-enum JSON enum silently coerces
 * the stored value back to the block.json default with no error/warning,
 * which bites hardest via a programmatic writer (the cloning pipeline,
 * pattern files) that sets the attribute directly rather than through this
 * block's inspector control. Mirrors `mega-panel/render.php`'s
 * `$allowed_variants`/`$allowed_styles` pattern.
 */
$allowed_indicator_styles = array( 'none', 'pill' );
$indicator_style          = isset( $attributes['indicatorStyle'] ) && in_array( $attributes['indicatorStyle'], $allowed_indicator_styles, true )
	? (string) $attributes['indicatorStyle']
	: 'none';
$indicator_colour  = isset( $attributes['indicatorColour'] ) ? (string) $attributes['indicatorColour'] : '';
$magnet_enabled    = ! empty( $attributes['itemMagnetEnabled'] );
$bar_data_attrs    = '';
$bar_data_attrs   .= 'pill' === $indicator_style ? ' data-sgs-nav-indicator' : '';
$bar_data_attrs   .= $magnet_enabled ? ' data-magnet' : '';

$bar_html = sprintf(
	'<ul class="sgs-nav-menu__bar"%2$s>%1$s</ul>',
	$items_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $items_html built from esc_url/esc_html/esc_attr fragments.
	$bar_data_attrs // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from two fixed literal strings above, no user input.
);

// ── 4. Scoped CSS assembly (no-inline, Spec 32). ────────────────────────────
$css      = '';
$link_sel = $uid_sel . ' .sgs-nav-menu__link';

// 4a. Item typography — flat scalar model, shared helper (matches
// TypographyControls' attribute contract: {prefix}FontSize/Unit/Tablet/Mobile).
$css .= sgs_typography_css_rule( $attributes, 'item', $link_sel );

/*
 * 4a-ii. Nav CONTAINER appearance (2026-07-28 — Bean-directed; the block had
 * NO fill controls at all, only per-item ones, so a bar could never sit on
 * its own surface. Audit: `supports` declared spacing only, and the element
 * manifest's `wrapper` mapped padding/margin/max-width and nothing else).
 *
 * Every value is emitted ONLY when the operator has set it, so an untouched
 * nav is byte-identical to before. `$uid_sel` targets the <nav> root itself
 * (SGS_Container_Wrapper renders it with 'tag' => 'nav').
 *
 * This is also what makes drawer styling self-serve: the drawer holds its
 * OWN sgs/nav-menu instance with its own uid, so setting a background here
 * on the drawer's copy styles ONLY the drawer — no per-context plumbing.
 */
$nav_bg       = isset( $attributes['navBg'] ) ? (string) $attributes['navBg'] : '';
$nav_colour   = isset( $attributes['navColour'] ) ? (string) $attributes['navColour'] : '';
$nav_bg_hover = isset( $attributes['navBgHover'] ) ? (string) $attributes['navBgHover'] : '';

$nav_decls = '';
if ( '' !== $nav_bg ) {
	$nav_decls .= 'background-color:' . sgs_colour_value( $nav_bg ) . ';';
}
if ( '' !== $nav_colour ) {
	$nav_decls .= 'color:' . sgs_colour_value( $nav_colour ) . ';';
}
if ( '' !== $nav_decls ) {
	$css .= $uid_sel . '{' . $nav_decls . '}';
}

if ( '' !== $nav_bg_hover ) {
	$css .= $uid_sel . ':hover{background-color:' . sgs_colour_value( $nav_bg_hover ) . ';}';
}

// 4b. Item colours (resting). Base is `inherit` in style.css; an unset slug
// leaves the surrounding context's colour untouched (header/footer agnostic).
// Text and background are SEPARATE properties, each with its own Normal/Hover
// state (Spec 35 element-first): the pre-2026-07-20 model paired resting TEXT
// against hover BACKGROUND in one toggle, so an operator could never set a
// hover text colour at all — it was auto-computed and unreachable.
$item_colour = isset( $attributes['itemColour'] ) ? (string) $attributes['itemColour'] : '';
$item_bg     = isset( $attributes['itemBg'] ) ? sanitize_html_class( $attributes['itemBg'] ) : '';
$item_bg_hex = '' !== $item_bg ? sgs_resolve_palette_hex( $item_bg, '' ) : '';

/*
 * Shape + motion come from ATTRIBUTES and theme TOKENS, never literals. The
 * pre-2026-07-20 code hardcoded `border-radius:8px` on both pills, `font-weight:600`
 * on the featured item and `.15s ease` on every transition — each of which bypasses
 * a token theme.json already ships (--wp--custom--border-radius--medium,
 * --wp--custom--transition--fast), so a client changing their theme's radius or
 * motion scale saw the nav ignore it. Literal fallbacks are kept inside var() so
 * the block still renders correctly on a non-SGS theme (the standalone-framework rule).
 */
$transition_fast = 'var(--wp--custom--transition--fast, 150ms ease)';

$item_radius       = isset( $attributes['itemRadius'] ) ? (float) $attributes['itemRadius'] : 8;
$item_radius_hover = isset( $attributes['itemRadiusHover'] ) && null !== $attributes['itemRadiusHover']
	? (float) $attributes['itemRadiusHover']
	: $item_radius;

if ( '' !== $item_colour ) {
	$css .= $link_sel . '{color:' . sgs_colour_value( $item_colour ) . ';}';
}
if ( '' !== $item_bg_hex ) {
	$css .= $link_sel . '{background-color:' . esc_attr( $item_bg_hex ) . ';border-radius:' . esc_attr( (string) $item_radius ) . 'px;}';
}

// 4c. Hover / focus-visible / current-page state. [aria-current="page"] is set
// by view.js at mount (client-side), so the same treatment doubles as the
// current-page indicator — which is why an operator-chosen style matters.
$hover_targets = array(
	$link_sel . ':hover',
	$link_sel . ':focus-visible',
	$link_sel . '[aria-current="page"]',
);
$hover_sel     = implode( ',', $hover_targets );

/*
 * hoverStyle is PHP-validated, NOT a JSON `enum` (block.json deliberately
 * declares none) — an out-of-enum JSON enum silently coerces the stored value
 * back to the block.json default with no error/warning, which bites hardest via
 * a programmatic writer (the cloning pipeline, pattern files) that sets the
 * attribute directly rather than through this block's inspector control. Mirrors
 * the indicatorStyle pattern (lines 387-390).
 */
$allowed_hover_styles = array( 'pill', 'underline', 'text' );
$hover_style          = isset( $attributes['hoverStyle'] ) && in_array( $attributes['hoverStyle'], $allowed_hover_styles, true )
	? (string) $attributes['hoverStyle']
	: 'pill';
$item_bg_hover     = isset( $attributes['itemBgHover'] ) ? sanitize_html_class( $attributes['itemBgHover'] ) : '';
$item_bg_hover_hex = '' !== $item_bg_hover ? sgs_resolve_palette_hex( $item_bg_hover, '' ) : '';
$item_fg_hover     = isset( $attributes['itemColourHover'] ) ? (string) $attributes['itemColourHover'] : '';

/*
 * PILL — a filled background on hover. The foreground honours the operator's
 * chosen hover text colour when it clears AA against the resolved fill, and
 * falls back to the guaranteed-safe binary only when it would not (or when the
 * operator left it empty). Informational, never a gate: the operator's choice
 * wins whenever it is readable.
 */
if ( 'pill' === $hover_style && '' !== $item_bg_hover_hex ) {
	$preferred = '' !== $item_fg_hover ? sgs_resolve_palette_hex( $item_fg_hover, '' ) : '';
	$hover_fg  = '' !== $preferred
		? sgs_wcag_preferred_text_colour_for_bg( $item_bg_hover_hex, $preferred )
		: sgs_wcag_text_colour_for_bg( $item_bg_hover_hex );
	$css      .= $hover_sel . '{background-color:' . esc_attr( $item_bg_hover_hex ) . ';color:' . esc_attr( $hover_fg ) . ';border-radius:' . esc_attr( (string) $item_radius_hover ) . 'px;transition:background-color ' . $transition_fast . ',color ' . $transition_fast . ',border-radius ' . $transition_fast . ';}';
} elseif ( 'text' === $hover_style && '' !== $item_fg_hover ) {
	// TEXT — colour shift only, no fill, no bar.
	$css .= $hover_sel . '{color:' . sgs_colour_value( $item_fg_hover ) . ';transition:color ' . $transition_fast . ';}';
} else {
	/*
	 * UNDERLINE — a real ::after bar, and the fallback for every other case so
	 * there is never zero visible feedback (WCAG 1.4.1 / 2.4.7).
	 *
	 * NOT `text-decoration:underline`, which was the pre-2026-07-20 fallback:
	 * that hugs the baseline, breaks around descenders, spans only the glyphs
	 * (so every item's line is a different length), and cannot animate. A
	 * positioned bar spans the link box consistently and grows in from the
	 * left. Bean reported it as "quite an ugly look"; the mechanism confirmed it.
	 */
	$u_thickness = isset( $attributes['underlineThickness'] ) ? (float) $attributes['underlineThickness'] : 2;
	$u_offset    = isset( $attributes['underlineOffset'] ) ? (float) $attributes['underlineOffset'] : 6;
	$u_colour    = isset( $attributes['underlineColour'] ) && '' !== $attributes['underlineColour']
		? sgs_colour_value( (string) $attributes['underlineColour'] )
		: 'currentColor';
	$u_colour_h  = isset( $attributes['underlineColourHover'] ) && '' !== $attributes['underlineColourHover']
		? sgs_colour_value( (string) $attributes['underlineColourHover'] )
		: $u_colour;

	/*
	 * A pseudo-element suffix must be applied to EACH selector in the list, not
	 * concatenated onto the imploded string — `'a,b,c' . '::after'` attaches
	 * ::after to `c` alone, so the bar would animate on [aria-current] only and
	 * never on :hover or :focus-visible. Caught by reading the emitted CSS live;
	 * the build, every gate and the unit pass were all green with it broken.
	 */
	$hover_after_sel = implode(
		',',
		array_map(
			static function ( $sel ) {
				return $sel . '::after';
			},
			$hover_targets
		)
	);

	$css .= $link_sel . '{position:relative;}';
	$css .= $link_sel . '::after{content:"";position:absolute;left:0;right:0;bottom:-' . esc_attr( (string) $u_offset ) . 'px;height:' . esc_attr( (string) $u_thickness ) . 'px;background-color:' . $u_colour . ';transform:scaleX(0);transform-origin:left center;transition:transform ' . $transition_fast . ',background-color ' . $transition_fast . ';pointer-events:none;}';
	$css .= $hover_after_sel . '{transform:scaleX(1);background-color:' . $u_colour_h . ';}';
	if ( '' !== $item_fg_hover ) {
		$css .= $hover_sel . '{color:' . sgs_colour_value( $item_fg_hover ) . ';}';
	}
	// Motion is decoration here — the bar's presence carries the meaning.
	$css .= '@media (prefers-reduced-motion:reduce){' . $link_sel . '::after{transition:none;}}';
}

/*
 * 4d. Featured items (FR-36-4). Two forms, both operator-set:
 *
 * LABEL form (featuredBg unset) — the accent-coloured label. Kept as the
 * default so no existing site changes shape.
 *
 * PILL form (featuredBg set) — a filled pill, which is what a draft typically
 * authors a "featured" nav item as (Mama's draft `.sgs-header__nav-featured` =
 * `background:var(--primary)` + `color:var(--text)` + weight 600 on the base
 * link's 8px radius). Without a background attribute the converter had nowhere
 * to put the draft's fill and silently dropped it, leaving accent-on-surface
 * text — 1.35:1 on Mama's, measured live 2026-07-20.
 *
 * The pill's foreground is contrast-checked against the resolved fill by the
 * same shared helper the hover pill uses (4c): the operator's chosen colour
 * wins when it clears AA, else the guaranteed-safe binary fallback. Mama's
 * text #3a2e26 on primary #e68a95 = 5.28:1 PASS, so the draft's own pairing is
 * adopted verbatim — the fidelity fix and the a11y fix are the same fix.
 */
$featured_sel     = $uid_sel . ' .sgs-nav-menu__item--featured .sgs-nav-menu__link';
$featured_colour  = isset( $attributes['featuredColour'] ) && '' !== $attributes['featuredColour']
	? (string) $attributes['featuredColour']
	: 'accent';
$featured_bg_slug = isset( $attributes['featuredBg'] ) ? sanitize_html_class( $attributes['featuredBg'] ) : '';
$featured_bg_hex  = '' !== $featured_bg_slug ? sgs_resolve_palette_hex( $featured_bg_slug, '' ) : '';

$featured_radius       = isset( $attributes['featuredRadius'] ) ? (float) $attributes['featuredRadius'] : 8;
$featured_radius_hover = isset( $attributes['featuredRadiusHover'] ) && null !== $attributes['featuredRadiusHover']
	? (float) $attributes['featuredRadiusHover']
	: $featured_radius;
$featured_weight       = isset( $attributes['featuredFontWeight'] ) ? (int) $attributes['featuredFontWeight'] : 600;
$featured_weight_hover = isset( $attributes['featuredFontWeightHover'] ) && null !== $attributes['featuredFontWeightHover']
	? (int) $attributes['featuredFontWeightHover']
	: $featured_weight;

if ( '' !== $featured_bg_hex ) {
	$preferred_fg = sgs_resolve_palette_hex( $featured_colour, '' );
	$featured_fg  = sgs_wcag_preferred_text_colour_for_bg( $featured_bg_hex, $preferred_fg );
	$css         .= $featured_sel . '{background-color:' . esc_attr( $featured_bg_hex ) . ';color:' . esc_attr( $featured_fg ) . ';font-weight:' . esc_attr( (string) $featured_weight ) . ';border-radius:' . esc_attr( (string) $featured_radius ) . 'px;}';
} else {
	$css .= $featured_sel . '{color:' . sgs_colour_value( $featured_colour ) . ';font-weight:' . esc_attr( (string) $featured_weight ) . ';}';
}

/*
 * 4d-ii. Featured HOVER state. The featured item is the one nav item an
 * operator most wants to stand out (it is usually the "Order now" / "Book"
 * call to action), and before 2026-07-20 it had no hover state at all — it
 * inherited the generic item hover, which fought its own pill. It now carries
 * its own Normal|Hover pair for both text and background, resolved by the same
 * contrast helper as the resting state so the operator's colour wins whenever
 * it is readable.
 */
$featured_hover_sel    = implode(
	',',
	array(
		$featured_sel . ':hover',
		$featured_sel . ':focus-visible',
	)
);
$featured_bg_hover     = isset( $attributes['featuredBgHover'] ) ? sanitize_html_class( $attributes['featuredBgHover'] ) : '';
$featured_bg_hover_hex = '' !== $featured_bg_hover ? sgs_resolve_palette_hex( $featured_bg_hover, '' ) : '';
$featured_fg_hover     = isset( $attributes['featuredColourHover'] ) ? (string) $attributes['featuredColourHover'] : '';

if ( '' !== $featured_bg_hover_hex ) {
	$preferred_hover = '' !== $featured_fg_hover ? sgs_resolve_palette_hex( $featured_fg_hover, '' ) : '';
	$featured_fg_h   = '' !== $preferred_hover
		? sgs_wcag_preferred_text_colour_for_bg( $featured_bg_hover_hex, $preferred_hover )
		: sgs_wcag_text_colour_for_bg( $featured_bg_hover_hex );
	$css            .= $featured_hover_sel . '{background-color:' . esc_attr( $featured_bg_hover_hex ) . ';color:' . esc_attr( $featured_fg_h ) . ';transition:background-color ' . $transition_fast . ',color ' . $transition_fast . ';}';
} elseif ( '' !== $featured_fg_hover ) {
	$css .= $featured_hover_sel . '{color:' . sgs_colour_value( $featured_fg_hover ) . ';transition:color ' . $transition_fast . ';}';
}

// Featured pill SHAPE on hover — emitted only when it differs from the resting
// shape, so an unset hover control adds no rule at all rather than a no-op one.
if ( $featured_radius_hover !== $featured_radius ) {
	$css .= $featured_hover_sel . '{border-radius:' . esc_attr( (string) $featured_radius_hover ) . 'px;transition:border-radius ' . $transition_fast . ';}';
}
if ( $featured_weight_hover !== $featured_weight ) {
	$css .= $featured_hover_sel . '{font-weight:' . esc_attr( (string) $featured_weight_hover ) . ';}';
}

// The featured item owns its own treatment — suppress the generic item
// underline bar on it so the two never render on top of each other.
$css .= $featured_sel . '::after{content:none;}';

// 4e. Burger colour / resting background / hover / size.
$burger_colour = isset( $attributes['burgerColour'] ) ? (string) $attributes['burgerColour'] : '';
if ( '' !== $burger_colour ) {
	$css .= $uid_sel . ' .sgs-nav-menu__burger{color:' . sgs_colour_value( $burger_colour ) . ';}';
}

/*
 * RESTING background — the base for burgerHoverColour's hover state (Spec 35
 * FR-35-5 STATE_WITHOUT_BASE). Before this, the burger's hover background had
 * no resting counterpart: a client could style the hover fill but never the
 * button's own resting fill. style.css's `background:none` stays the
 * byte-identical default when this is left unset.
 */
$burger_bg = isset( $attributes['burgerBg'] ) ? (string) $attributes['burgerBg'] : '';
if ( '' !== $burger_bg ) {
	$css .= $uid_sel . ' .sgs-nav-menu__burger{background-color:' . sgs_colour_value( $burger_bg ) . ';}';
}
$burger_hover_slug = isset( $attributes['burgerHoverColour'] ) ? (string) $attributes['burgerHoverColour'] : '';
if ( '' !== $burger_hover_slug ) {
	$css .= $uid_sel . ' .sgs-nav-menu__burger:hover,' . $uid_sel . ' .sgs-nav-menu__burger:focus-visible{background-color:' . sgs_colour_value( $burger_hover_slug ) . ';}';
}
$burger_size = $sgs_nm_css_length( $attributes['burgerSize'] ?? '44px' );
if ( '' !== $burger_size ) {
	$css .= $uid_sel . ' .sgs-nav-menu__burger{width:' . $burger_size . ';height:' . $burger_size . ';min-width:' . $burger_size . ';min-height:' . $burger_size . ';}';
}

// 4f. Bar ↔ burger collapse-point switch. A LEGITIMATE non-device-tier
// breakpoint (the visual bar/burger swap) — deliberately NOT part of the
// 768/1024 device system (see the block build brief §"Responsive breakpoint
// discipline"). Only the switch point itself lives here; any OTHER custom
// breakpoint goes through sgsCustomCss below.
$collapse_point = isset( $attributes['collapsePoint'] ) ? max( 1, absint( $attributes['collapsePoint'] ) ) : 768;
// Hide the <nav> LANDMARK below the collapse point, not just the <ul> inside it.
// Hiding only `__bar` would leave an EMPTY exposed navigation landmark on mobile
// — worse than no landmark, because a screen-reader user lands in a "Primary"
// navigation region containing nothing. `display:none` removes the whole subtree
// from the accessibility tree, which is what makes the bar/drawer pair safe (see
// the naming note in FR-36-11).
// Below the collapse point the LIST is hidden and the burger takes over. The
// hide targets the <ul>, NOT the block root — the root is the <nav> landmark
// (see the wrapper call) and it must stay exposed, because the burger inside it
// is the control that opens the navigation. A named landmark containing the
// disclosure button is the W3C APG disclosure-navigation shape; hiding the root
// would remove the burger from the accessibility tree along with the list.
$css .= '@media (max-width:' . ( $collapse_point - 1 ) . 'px){' . $uid_sel . ' .sgs-nav-menu__bar{display:none;}' . $uid_sel . ' .sgs-nav-menu__toggle-wrap{display:flex;}}';
$css .= '@media (min-width:' . $collapse_point . 'px){' . $uid_sel . ' .sgs-nav-menu__toggle-wrap{display:none;}}';

// 4g. Mega-menu disclosure — caret rotation + panel positioning (U9). The
// trigger is a <button>, not an <a>, so it needs a minimal reset to inherit
// the bar link's look rather than the browser's default button chrome.
$css .= $uid_sel . ' .sgs-nav-menu__mega-trigger{background:none;border:0;font:inherit;cursor:pointer;}';
// Caret flips when the disclosure is open (300ms = theme medium; reduced-motion snaps).
$css .= $uid_sel . ' .sgs-nav-menu__caret{display:inline-flex;transition:transform .3s var(--wp--custom--transition--medium, ease);}';
$css .= $uid_sel . ' .sgs-nav-menu__mega-trigger[aria-expanded="true"] .sgs-nav-menu__caret{transform:rotate(180deg);}';
$css .= '@media (prefers-reduced-motion: reduce){' . $uid_sel . ' .sgs-nav-menu__caret{transition:none;}}';

/*
 * Panel anchoring (fixed 2026-07-28, Bean design-gated — Gate-3 finding).
 * The wrap previously anchored to `.sgs-nav-menu__mega` (the <li>-level
 * hover bridge, position:relative), so the panel shrink-to-fit against the
 * MENU ITEM's width and rendered as a ~100px vertical sliver on the live
 * page. The draft designs (sites/Mega-menu design + Indus Foods Mega Menu
 * Design, both at "position:absolute;top:100%;left:0;right:0" on the header
 * container with an 1120px-capped centred panel) anchor a wide centred band
 * instead. Our sanctioned anchor is the BAR (`.sgs-nav-menu__bar` is already
 * position:relative in style.css for the indicator pill), so the wrap now
 * centres on the bar and may exceed the bar's width up to the draft's
 * 1120px cap with the draft's 28px side gutters. MEGA-ONLY by construction:
 * plain (non-mega) dropdowns, when built, must anchor left-aligned under
 * their own item — Bean explicitly rejected centring them (the Indus draft
 * centres its "More" dropdown and it reads badly).
 *
 * Hover safety holds because the wrap stays a DOM child of the
 * `.sgs-nav-menu__mega` bridge — mouseleave fires on DOM containment, not
 * geometry — and the panel (>= bar width) always extends beneath its own
 * trigger. Edge overflow: mega-disclosure.js repositionPanel() measures the
 * centred rect and pins to the bar's right/left edge via the CSS vars below
 * (--sgs-mm-tx neutralises the centring translate when pinned).
 *
 * Hidden-until-open via display:none keeps it out of the a11y tree while
 * the links remain in the server HTML for crawlers (FR-36-17). No-JS: stays
 * closed (progressive enhancement, FR-36-7).
 */
$css .= $uid_sel . ' .sgs-nav-menu__mega-panel-wrap{position:absolute;top:100%;left:var(--sgs-mm-overflow-left, 50%);right:var(--sgs-mm-overflow-right, auto);transform:translateX(var(--sgs-mm-tx, -50%));width:min(1120px, calc(100vw - 56px));z-index:100;display:none;}';
$css .= $uid_sel . ' .sgs-nav-menu__mega-trigger[aria-expanded="true"] ~ .sgs-nav-menu__mega-panel-wrap{display:block;}';

/*
 * In-drawer accordion (FR-36-5/-6: "the same panel renders inside the
 * drawer, inline-expanded"). Measured 2026-07-28: the absolute wrap inside
 * the open drawer OVERLAID the menu items below it (Recipes stayed at
 * y=152 under a 1264px-tall panel) instead of pushing them down. Inside a
 * drawer the wrap flows statically at full width so opening the panel
 * pushes the following items down like an accordion.
 */
$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__mega-panel-wrap{position:static;transform:none;width:100%;}';

/*
 * In-drawer width discipline (Bean, 2026-07-28): a vertical drawer menu must
 * FILL the space available, never shrink-wrap to its longest label. Measured
 * before this rule: the whole vertical list hugged to ~95px (the drawer body
 * is align-items:flex-start, and the nav root + bar + items all sized to
 * content), so the in-drawer mega panel inherited a 95px column and its text
 * clipped. Items stretch full-width (standard drawer pattern, bigger touch
 * targets); label alignment stays the natural reading edge (left) — a
 * left/centre/right alignment control is the drawer's own surface, not
 * per-instance CSS here.
 */
$css .= '.sgs-nav-drawer ' . $uid_sel . '{width:100%;}';
$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__bar{width:100%;align-items:stretch;}';

/*
 * listColumns (design gate 2026-07-28) — in-drawer vertical list layout ONLY
 * (nav-drawer/style.css:52-53 already suppresses this bar's horizontal/burger
 * mode and stacks it vertically whenever a nav-menu sits inside a drawer; the
 * HORIZONTAL bar mode is untouched by this attribute entirely). 1 column (the
 * default, an empty/unset object) leaves the existing flex-column stack from
 * nav-drawer/style.css unchanged — byte-identical. >=2 columns switches the
 * bar to a CSS grid (studionamma's 2-column desktop -> 1-column mobile merge).
 * The extra `.wp-block-sgs-nav-menu` qualifier gives this rule certain
 * precedence over nav-drawer/style.css's `display:flex` rule at any tier
 * this attribute is actually set (both are 3-selector-part rules; source
 * order alone should not be relied on across two different stylesheets).
 */
if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['listColumns'] ?? null ) && ! empty( $attributes['listColumns'] ) ) {
	$drawer_bar_sel = '.sgs-nav-drawer ' . $uid_sel . '.wp-block-sgs-nav-menu .sgs-nav-menu__bar';
	$css           .= sgs_emit_responsive_css(
		$drawer_bar_sel,
		array(
			array(
				'value'     => $attributes['listColumns'],
				'css'       => 'display',
				'transform' => static function () {
					return 'grid';
				},
			),
			array(
				'value'     => $attributes['listColumns'],
				'css'       => 'grid-template-columns',
				'transform' => static function ( $raw ) {
					$n = max( 1, absint( $raw ) );
					return 'repeat(' . $n . ', minmax(0, 1fr))';
				},
			),
		)
	);
}

/*
 * Stacking escape for an IN-CONTENT nav (2026-07-28, Gate-3 finding). The
 * page-content container (`.entry-content`) and the site-footer rows each
 * carry `z-index:1`; at equal z the LATER context paints on top, so an open
 * panel belonging to a nav placed inside page content was painted over by
 * the footer — hit-testing then reached the footer, fired mouseleave on the
 * hover bridge, and closed the panel 170ms later ("unhoverable"). While
 * THIS instance's panel is open, lift its entry-content context above its
 * sibling contexts. Fires only for an in-content nav (a header nav has no
 * `.entry-content` ancestor — the header carries its own base z-index, see
 * site-header/style.css), only while open, and is scoped by uid. Verified
 * live by injection: 400ms diagonal hover survives with it, closes without.
 */
$css .= '.entry-content:has(' . $uid_sel . ' .sgs-nav-menu__mega-trigger[aria-expanded="true"]){z-index:2;}';
// The "View all X" fallback now renders INSIDE the panel (sgs/mega-panel's
// footer slot), so it is styled as a panel footer row rather than a bare
// line: separated from the content above, aligned with the panel's own
// padding box, and never sitting under the trigger's hover underline.
$css .= $uid_sel . ' .sgs-nav-menu__mega-viewall{display:inline-block;margin-top:16px;font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:3px;}';

/*
 * 4h-i. Sliding indicator colour override (Mega-Menu Build Spec §6 row 2).
 * The pill's shape/motion (position/transform/opacity/transition) is
 * STRUCTURAL and lives in style.css — only the operator-chosen fill (or its
 * token default) is attribute-driven, so it belongs in the scoped <style>.
 */
if ( 'pill' === $indicator_style && '' !== $indicator_colour ) {
	$css .= $uid_sel . ' .sgs-nav-menu__indicator{background-color:' . sgs_colour_value( $indicator_colour ) . ';}';
}

// 4h. Free-text custom CSS escape hatch — sanitised (letters/digits/basic CSS
// punctuation only) and stripped of any </style> breakout below with the rest.
if ( ! empty( $attributes['sgsCustomCss'] ) ) {
	$css .= preg_replace( '/<\/?script/i', '', (string) $attributes['sgsCustomCss'] );
}

// ── 5. Assemble via the shared composite wrapper (layout KIND — flex/grid +
// maxWidth/contentWidth/gap; no bg/overlay/shape layers). The bar is a
// COMPOSITE (nav + list + toggle), so it keeps SGS_Container_Wrapper rather
// than rendering block-private (R-31-9 composite-mirror rule).
$inner_html = $bar_html . $toggle_html;

if ( '' !== $css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( $css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via the shared helpers + esc_attr/sanitize_html_class fragments above; wp_strip_all_tags guards </style>.
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper escapes internally (get_block_wrapper_attributes()); $inner_html built from pre-sanitised/escaped fragments above.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'nav',
		'block_class'   => 'sgs-nav-menu',
		// STOP-21 / DONE-item-2: the block's own scoped `<style>` targets
		// `.$uid …`, so the SAME `$uid` MUST ride onto the rendered element as a
		// CLASS or every scoped rule is a silent render no-op. The wrapper adds
		// its OWN `sgs-container-<hash>` class (different prefix), so pass this
		// block's `$uid` through extra_classes exactly as the hero reference does.
		'extra_classes' => array( $uid ),
		// `'tag' => 'nav'` above makes THIS element the navigation landmark, so
		// the accessible name belongs here — on the element that carries the
		// role. There is exactly one <nav> per instance and exactly one label,
		// so the two cannot drift. (FR-36-10 / FR-36-11; see the label block
		// above for why an inner second <nav> was reverted on 2026-07-23.)
		'extra_attrs'   => array( 'aria-label' => esc_attr( $nav_label ) ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
