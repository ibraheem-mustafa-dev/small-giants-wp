<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- dynamic block render template; helper class below is rendered inline, its namespace lives in the block slug.
/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — server-side render.
 * This block renders ONLY the vertical accordion / drill-down list of links
 * that lives inside `sgs/nav-drawer` — `"ancestor": ["sgs/nav-drawer"]`
 * (block.json) makes that structural, so this render.php can read the
 * drawer's own context UNCONDITIONALLY. The horizontal bar + burger +
 * dropdowns/mega live in the sibling block, `sgs/nav-bar-menu`.
 *
 * Submenus (one level deep, MAX_SUBMENU_DEPTH = 1) render as native
 * `<details>` accordion rows via `sgs_nav_drawer_menu_render_items()`
 * (`includes/nav-menu-markup.php`, SHARED with the bar block). A mega-typed item degrades to a plain link unless the operator
 * opted it into the accordion fallback via `megaDrawerFallbackIds`.
 *
 * Menu source: the shared SGS_Nav_Menu_Source resolver (one-source rule,
 * Spec 36 FR-36-1) — the SAME resolver `sgs/nav-bar-menu` uses.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check. Colour / hover / typography / featured styling are emitted into
 * this block's own scoped <style> (custom-property VALUES / var()
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

// padding/margin are owned tier-object attrs {desktop,tablet,mobile}.
// Normalise once, into fresh locals only -- never written back into
// $attributes.
// sgs_responsive_normalise_object() lives in helpers-responsive.php, which
// this file's own render-helpers.php require below WOULD load -- but too
// late, since these two calls run before that require executes. A block
// whose render.php is the first SGS block PHP to run in a request would
// otherwise fatal with "Call to undefined function". Requiring the defining
// file directly, here, removes the load-order dependency.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
$sgs_tor_padding_tiers   = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers    = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-typography.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-wcag.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-nav-menu-source.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-markup.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-treatments.php';
require_once dirname( __DIR__, 3 ) . '/includes/sweep-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-item-border-featured-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-submenu-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-submenu-link-css.php';
// nav-menu-trigger-css.php is deliberately NOT required — this block never
// emits a burger/trigger, so sgs_nav_bar_menu_trigger_css() is never called.
// class-sgs-container-wrapper.php is deliberately NOT required — this block
// renders its root block-private (see §5).

if ( ! function_exists( 'sgs_nav_shared_typography_hover_rule' ) ) {
	/**
	 * BLOCK-PRIVATE hover-typography emitter (Spec 41 FR-41-21, owner ruling 2).
	 *
	 * ⛔ Declared HERE, in this block's own render.php, NOT in `includes/` —
	 * `includes/` is the SHARED folder even for a file only this block requires,
	 * and `TypographyControls`' `showHover` trio is block-private code. Wrapped
	 * in a `function_exists()` guard because a top-level function declaration in
	 * a per-instance render.php fatals on a page's SECOND instance of this block.
	 *
	 * ⛔ Called from the SHARED emitters this render.php requires above
	 * (`includes/nav-menu-css.php`, `includes/nav-menu-submenu-link-css.php`) —
	 * it MUST be declared before those emitters run, and it must exist under
	 * this exact name. Do not rename without updating both call sites (which
	 * this block does not own — they are shared).
	 *
	 * ⛔ The three allowlists are reproduced LITERALLY from
	 * `includes/helpers-typography.php::sgs_typography_css_rule()` — they are
	 * inline arrays inside that function with no exported constant to import.
	 * Duplicating three lines is the accepted cost of NOT extending a shared
	 * helper with callers across most of the block library (FR-41-21). If the
	 * base path's allowlists ever change, this emitter changes in the same commit.
	 *
	 * ⛔ A value that is SET but NOT PERMITTED emits nothing — it never falls
	 * back to the base value. Falling back would repaint the resting declaration
	 * inside a `:hover` rule: invisible when it agrees with the base, a silent
	 * override when it does not.
	 *
	 * @param array  $attributes         Block attributes.
	 * @param string $prefix             Typography prefix ('item' | 'submenu').
	 * @param string $selector           Base selector (no `:hover`).
	 * @param string $sweep_hover_colour RESOLVED sweep hover colour, or '' when this
	 *                                   prefix's resolved treatment is not 'sweep'.
	 * @return string CSS, or '' when nothing permitted is set.
	 */
	function sgs_nav_shared_typography_hover_rule( array $attributes, string $prefix, string $selector, string $sweep_hover_colour = '' ): string {
		if ( '' === $selector ) {
			return '';
		}

		$decls = array();

		$decoration = (string) ( $attributes[ $prefix . 'TextDecorationHover' ] ?? '' );
		if ( in_array( $decoration, array( 'none', 'underline', 'line-through', 'overline' ), true ) ) {
			$decls[] = 'text-decoration:' . $decoration;
			// Same call, so the line and the glyphs arrive together. ⛔ NO
			// transition on it — two transitions at different rates on one
			// element is the exact "looked broken" failure sgs/business-info hit.
			if ( 'none' !== $decoration && '' !== $sweep_hover_colour ) {
				$decls[] = 'text-decoration-color:' . $sweep_hover_colour;
			}
		}

		$transform = (string) ( $attributes[ $prefix . 'TextTransformHover' ] ?? '' );
		if ( in_array( $transform, array( 'none', 'uppercase', 'lowercase', 'capitalize' ), true ) ) {
			$decls[] = 'text-transform:' . $transform;
		}

		$weight = preg_replace( '/[^a-z0-9]/i', '', (string) ( $attributes[ $prefix . 'FontWeightHover' ] ?? '' ) );
		if ( '' !== (string) $weight ) {
			$decls[] = 'font-weight:' . $weight;
		}

		return $decls ? sgs_hover_state_rules( $selector, implode( ';', $decls ), ':focus-visible' ) : '';
	}
}

if ( ! class_exists( 'SGS_Nav_Drawer_Menu_Flattener' ) ) {
	/**
	 * Flattens a resolved menu-block tree into flat items for the drawer's
	 * accordion markup.
	 * Named apart from the bar block's `SGS_Nav_Menu_Bar_Renderer` — two
	 * blocks with a class of the SAME name declared unconditionally at top
	 * level would fatal ("Cannot declare class ... already declared") the
	 * moment BOTH blocks render on one page (a header bar + its drawer, the
	 * normal case). `flatten()`/`from_link()`/`from_page_list()` mirror the
	 * bar block's class — see that file's own docblock for the
	 * identifier-scheme rationale (featuredItemIds parity, depth-cap
	 * flattening, path-qualified child keys).
	 *
	 * Unlike the bar block's class, this one carries no submenu settings
	 * (`$this->submenu`, `get_submenu()`): `submenuAlign`/`submenuCaret`/
	 * `submenuCloseGrace`/`submenuAnimation` are BAR-only and this block never
	 * declares them — `sgs_nav_drawer_menu_render_items()` (the function this
	 * block calls) takes no submenu-settings argument at all.
	 */
	class SGS_Nav_Drawer_Menu_Flattener {

		/**
		 * Featured item identifiers (from the block's featuredItemIds attr).
		 *
		 * @var array<int, string>
		 */
		private array $featured_ids;

		/**
		 * This block instance's content-addressed uid.
		 *
		 * @var string
		 */
		private string $uid;

		/**
		 * How many levels of submenu nesting render as real nested structure.
		 *
		 * @var int
		 */
		private const MAX_SUBMENU_DEPTH = 1;

		/**
		 * Constructor.
		 *
		 * @param array  $featured_ids Featured item identifiers.
		 * @param string $uid          This block instance's uid.
		 */
		public function __construct( array $featured_ids, string $uid = '' ) {
			$this->featured_ids = array_map( 'strval', $featured_ids );
			$this->uid          = $uid;
		}

		/**
		 * Flatten resolved nav blocks into a list of { identifier, url, label }.
		 *
		 * @param array  $blocks      Parsed nav blocks (from SGS_Nav_Menu_Source).
		 * @param int    $depth       Current nesting depth (0 = top level). Internal.
		 * @param string $parent_path Parent item's identifier, used to path-qualify
		 *                            child identifiers so sibling submenus holding
		 *                            the same label do not collide. Internal.
		 * @return array<int, array{identifier: string, url: string, label: string, has_url: bool, children: array}>
		 */
		public function flatten( array $blocks, int $depth = 0, string $parent_path = '' ): array {
			$items = array();
			foreach ( $blocks as $block ) {
				$name = $block['blockName'] ?? '';
				switch ( $name ) {
					case 'core/navigation-link':
						$item = $this->from_link( $block['attrs'] ?? array(), $parent_path );
						if ( $item ) {
							$items[] = $item;
						}
						break;
					case 'core/navigation-submenu':
						$item = $this->from_link( $block['attrs'] ?? array(), $parent_path );
						if ( ! $item ) {
							break;
						}
						$inner = $block['innerBlocks'] ?? array();
						if ( $depth < self::MAX_SUBMENU_DEPTH ) {
							$item['children'] = $this->flatten( $inner, $depth + 1, $item['identifier'] );
							$items[]          = $item;
						} else {
							// Depth cap reached — emit the parent, then FLATTEN its
							// descendants into this same level rather than dropping
							// them (a silent truncation would be data loss), path-qualified under THIS
							// item (not the caller's $parent_path — collision fix,
							// see the bar block's identical comment).
							$items[] = $item;
							$items   = array_merge( $items, $this->flatten( $inner, $depth, $item['identifier'] ) );
						}
						break;
					case 'core/home-link':
						$items[] = array(
							'identifier' => 'special:home',
							'url'        => home_url( '/' ),
							'label'      => __( 'Home', 'sgs-blocks' ),
							'has_url'    => true,
							'children'   => array(),
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
		 * @param array  $attrs       Block attrs (label, url, id).
		 * @param string $parent_path Parent identifier for path-qualifying children
		 *                            ('' for a top-level item).
		 * @return array{identifier: string, url: string, label: string, has_url: bool, children: array}|null
		 */
		private function from_link( array $attrs, string $parent_path = '' ): ?array {
			$label = (string) ( $attrs['label'] ?? '' );
			if ( '' === $label ) {
				return null;
			}
			$raw_url = trim( (string) ( $attrs['url'] ?? '' ) );
			$has_url = SGS_Nav_Menu_Source::is_destination_url( $raw_url );
			$url     = $has_url ? $raw_url : '#';
			$own_key = isset( $attrs['id'] ) && '' !== $attrs['id']
				? 'id:' . sanitize_key( (string) $attrs['id'] )
				: 'label:' . $label;

			$identifier = '' === $parent_path ? $own_key : $parent_path . '>' . $own_key;

			return array(
				'identifier' => $identifier,
				'url'        => $url,
				'has_url'    => $has_url,
				'label'      => $label,
				'type'       => (string) ( $attrs['type'] ?? '' ),
				'object_id'  => (int) ( $attrs['id'] ?? 0 ),
				// Same repurposing of the item's Description field as
				// `nav-bar-menu/render.php`'s own `from_link()` (badge copy).
				'badge'      => (string) ( $attrs['description'] ?? '' ),
				'children'   => array(),
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
	}
}

// CSS-keyword / length sanitisers — free-text attrs concatenated into raw CSS.
// 1. Deterministic content-addressed uid (CSS scope).
$anchor_val = isset( $block->parsed_block['attrs']['anchor'] ) ? (string) $block->parsed_block['attrs']['anchor'] : '';
$uid        = 'sgs-nav-drawer-menu-' . substr( md5( wp_json_encode( $attributes ) . $anchor_val ), 0, 8 );
$uid_sel    = '.' . $uid;

// ── 2. Resolve the menu (one-source rule) + flatten to top-level links only. ──
$ref          = isset( $attributes['ref'] ) ? absint( $attributes['ref'] ) : 0;
$menu_blocks  = SGS_Nav_Menu_Source::get_menu_blocks( $ref, true );
$featured_ids = is_array( $attributes['featuredItemIds'] ?? null ) ? $attributes['featuredItemIds'] : array();
$flattener    = new SGS_Nav_Drawer_Menu_Flattener( $featured_ids, $uid );
$flat_items   = $flattener->flatten( $menu_blocks );

/*
 * ── 2b. Split-nav slicing — the drawer's two-tier look. ────────────────────
 *
 * Same mechanism as `nav-bar-menu/render.php`'s own §2b — same identifier
 * keying, same fail-VISIBLE fallback. Lets two instances of this block share
 * one menu — e.g. a Playfair 34px "primary" tier followed by an Outfit 15px
 * "secondary" tier, each its own instance with its own typography attrs.
 * See that file's §2b docblock for the full rationale.
 */
$sgs_nm_split_side = (string) ( $attributes['splitSide'] ?? '' );
if ( in_array( $sgs_nm_split_side, array( 'before', 'after' ), true ) ) {
	$sgs_nm_split_after_id = (string) ( $attributes['splitAfterItemId'] ?? '' );
	$sgs_nm_split_index    = null;
	if ( '' !== $sgs_nm_split_after_id ) {
		foreach ( $flat_items as $sgs_nm_i => $sgs_nm_item ) {
			if ( ( $sgs_nm_item['identifier'] ?? '' ) === $sgs_nm_split_after_id ) {
				$sgs_nm_split_index = $sgs_nm_i;
				break;
			}
		}
	}
	if ( null !== $sgs_nm_split_index ) {
		$flat_items = 'before' === $sgs_nm_split_side
			? array_slice( $flat_items, 0, $sgs_nm_split_index + 1 )
			: array_slice( $flat_items, $sgs_nm_split_index + 1 );
	}
}

// FR-41-30(b): the drawer sub-item marker is operator-chosen, resolved through
// the same source-aware resolver as sgs/icon. The stored default
// (`lucide`/`chevron-right`) is the standard chevron glyph.
$sgs_nm_sublink_marker = sgs_nav_shared_icon_markup(
	$attributes['sublinkMarkerIcon'] ?? null,
	array(
		'source' => 'lucide',
		'name'   => 'chevron-right',
	)
);

/*
 * FR-41-30(b) full Hover/Current + gradient states for the marker colour,
 * reusing `sgs/icon`'s own SOURCE-AWARE gradient mechanism
 * (`sgs_icon_gradient_css()`).
 */
$sgs_nm_marker_source = (string) ( $attributes['sublinkMarkerIcon']['source'] ?? 'lucide' );
if ( ! in_array( $sgs_nm_marker_source, array( 'lucide', 'wp-icon', 'dashicon', 'emoji' ), true ) ) {
	$sgs_nm_marker_source = 'lucide';
}
// ⚠ These selectors are hardcoded with a `.sgs-nav-drawer ` ancestor prefix —
// always live for this block, since `block.json::ancestor` guarantees a real
// `.sgs-nav-drawer` ancestor.
$sgs_nm_marker_sel  = '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-drawer-menu__sublink-marker';
$sgs_nm_sublink_sel = '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-drawer-menu__sublink';

$sgs_nm_marker_colour                  = (string) ( $attributes['sublinkMarkerColour'] ?? '' );
$sgs_nm_marker_colour_hover            = (string) ( $attributes['sublinkMarkerColourHover'] ?? '' );
$sgs_nm_marker_colour_current          = (string) ( $attributes['sublinkMarkerColourCurrent'] ?? '' );
$sgs_nm_marker_colour_gradient         = (string) ( $attributes['sublinkMarkerColourGradient'] ?? '' );
$sgs_nm_marker_colour_hover_gradient   = (string) ( $attributes['sublinkMarkerColourHoverGradient'] ?? '' );
$sgs_nm_marker_colour_current_gradient = (string) ( $attributes['sublinkMarkerColourCurrentGradient'] ?? '' );

$sgs_nm_marker_css = '';

if ( '' !== $sgs_nm_marker_colour ) {
	$sgs_nm_marker_css .= $sgs_nm_marker_sel . '{color:' . sgs_colour_value( $sgs_nm_marker_colour ) . ';}';
}
if ( '' !== $sgs_nm_marker_colour_current ) {
	$sgs_nm_marker_css .= $sgs_nm_sublink_sel . '[aria-current="page"] .sgs-nav-drawer-menu__sublink-marker{color:'
		. sgs_colour_value( $sgs_nm_marker_colour_current ) . ';}';
}
if ( '' !== $sgs_nm_marker_colour_hover ) {
	$sgs_nm_marker_css .= sgs_hover_state_rules(
		$sgs_nm_sublink_sel,
		'color:' . sgs_colour_value( $sgs_nm_marker_colour_hover ),
		':focus-visible',
		' .sgs-nav-drawer-menu__sublink-marker'
	);
}

// Gradient — resting.
$sgs_nm_marker_grad    = sgs_icon_gradient_css(
	$sgs_nm_marker_source,
	$sgs_nm_marker_colour_gradient,
	$uid . '-smk',
	$sgs_nm_marker_sel
);
$sgs_nm_sublink_marker = sgs_svg_inject_defs( $sgs_nm_sublink_marker, $sgs_nm_marker_grad['defs'] );
if ( '' !== $sgs_nm_marker_grad['css'] ) {
	$sgs_nm_marker_css .= $sgs_nm_marker_sel . '{' . $sgs_nm_marker_grad['css'] . ';}';
}
if ( '' !== $sgs_nm_marker_grad['fallback_rule'] ) {
	$sgs_nm_marker_css .= $sgs_nm_marker_grad['fallback_rule'];
}

// Gradient — hover (touch-guarded, matches every other hover rule on this block).
$sgs_nm_marker_grad_hover = sgs_icon_gradient_css(
	$sgs_nm_marker_source,
	$sgs_nm_marker_colour_hover_gradient,
	$uid . '-smkh',
	$sgs_nm_sublink_sel . ':hover .sgs-nav-drawer-menu__sublink-marker'
);
$sgs_nm_sublink_marker    = sgs_svg_inject_defs( $sgs_nm_sublink_marker, $sgs_nm_marker_grad_hover['defs'] );
if ( '' !== $sgs_nm_marker_grad_hover['css'] ) {
	$sgs_nm_marker_css .= sgs_hover_state_rules(
		$sgs_nm_sublink_sel,
		$sgs_nm_marker_grad_hover['css'],
		':focus-visible',
		' .sgs-nav-drawer-menu__sublink-marker'
	);
}
if ( '' !== $sgs_nm_marker_grad_hover['fallback_rule'] ) {
	$sgs_nm_marker_css .= $sgs_nm_marker_grad_hover['fallback_rule'];
}

// Gradient — current page (never guarded, matches FR-41-3 binding rule 3).
$sgs_nm_marker_grad_current = sgs_icon_gradient_css(
	$sgs_nm_marker_source,
	$sgs_nm_marker_colour_current_gradient,
	$uid . '-smkc',
	$sgs_nm_sublink_sel . '[aria-current="page"] .sgs-nav-drawer-menu__sublink-marker'
);
$sgs_nm_sublink_marker      = sgs_svg_inject_defs( $sgs_nm_sublink_marker, $sgs_nm_marker_grad_current['defs'] );
if ( '' !== $sgs_nm_marker_grad_current['css'] ) {
	$sgs_nm_marker_css .= $sgs_nm_sublink_sel . '[aria-current="page"] .sgs-nav-drawer-menu__sublink-marker{'
		. $sgs_nm_marker_grad_current['css'] . ';}';
}
if ( '' !== $sgs_nm_marker_grad_current['fallback_rule'] ) {
	$sgs_nm_marker_css .= $sgs_nm_marker_grad_current['fallback_rule'];
}

// Per-item opt-out from the mega item's plain-link degrade in the drawer
// (megaDrawerFallbackIds attribute).
$mega_drawer_fallback_ids = is_array( $attributes['megaDrawerFallbackIds'] ?? null ) ? $attributes['megaDrawerFallbackIds'] : array();

/*
 * ── Drawer context (Spec 36 FR-36-6). ───────────────────────────────────────
 * `sgs/nav-drawer` provides `sgs/navDrawerSubmenuModel` + `sgs/navDrawerBg`
 * to every descendant (block.json `providesContext`). This block declares
 * `"ancestor": ["sgs/nav-drawer"]` (block.json) — the editor structurally
 * refuses to insert it anywhere else — so both context keys are ALWAYS
 * present here; there is no "outside a drawer" branch. Read unconditionally.
 */
$submenu_model_ctx = (string) ( $block->context['sgs/navDrawerSubmenuModel'] ?? '' );
if ( ! in_array( $submenu_model_ctx, array( 'accordion', 'drill-down' ), true ) ) {
	$submenu_model_ctx = 'accordion';
}

/*
 * Wave 3C U-11 (ENG-02, Builder-A interface #2) — `sgs/nav-drawer`'s own
 * `accordionExclusive` attribute (default true), reached via block Context
 * exactly like `sgs/navDrawerSubmenuModel` above. MISSING context (a parent
 * whose block.json hasn't shipped the key yet, or this block rendered in
 * isolation outside any drawer) resolves to `true` — today's exclusive
 * behaviour — not `false`.
 */
$sgs_nm_accordion_exclusive = ! array_key_exists( 'sgs/navDrawerAccordionExclusive', $block->context )
	|| (bool) $block->context['sgs/navDrawerAccordionExclusive'];

$items_html = sgs_nav_drawer_menu_render_items( $flat_items, $submenu_model_ctx, $uid, $featured_ids, $sgs_nm_sublink_marker, $mega_drawer_fallback_ids, $sgs_nm_accordion_exclusive );

// FR-41-36 — the drawer's own `drawerBg` attribute,
// reached via the SAME real WP block-context channel as
// `sgs/navDrawerSubmenuModel` above. See nav-menu-submenu-css.php for the
// contrast check this feeds.
$sgs_nm_drawer_bg_ctx = (string) ( $block->context['sgs/navDrawerBg'] ?? '' );

if ( '' === $items_html ) {
	return '';
}

// ── The <nav> landmark label (FR-36-10 / FR-36-11) ──────────────────────────
// The landmark ITSELF is this block's root: the final `printf()` at the end of
// this file emits `<nav %s>` directly via get_block_wrapper_attributes(), so the
// root IS a <nav>. This label rides onto it through $nav_root_attrs.
//
// The label falls back through: operator `navLabel` → the resolved MENU'S OWN
// NAME → 'Primary'. Preferring the menu name means two nav instances bound to
// DIFFERENT menus get distinct landmark names automatically (FR-36-11 / axe
// landmark-unique). Same fallback chain as the bar block's render.php.
$nav_label = trim( (string) ( $attributes['navLabel'] ?? '' ) );
if ( '' === $nav_label && $ref > 0 ) {
	$nav_menu_obj = wp_get_nav_menu_object( $ref );
	if ( $nav_menu_obj && ! empty( $nav_menu_obj->name ) ) {
		// Strip a trailing "menu"/"navigation"/"nav" from the DERIVED name only
		// (W3C ARIA APG landmark guidance) — an explicit operator navLabel is
		// their choice and is passed through untouched.
		$derived   = (string) $nav_menu_obj->name;
		$stripped  = preg_replace( '/\s*\b(menu|navigation|nav)\b\s*$/i', '', $derived );
		$nav_label = '' !== trim( (string) $stripped ) ? trim( (string) $stripped ) : $derived;
	}
}
if ( '' === $nav_label ) {
	$nav_label = __( 'Primary', 'sgs-blocks' );
}

/*
 * Split-nav landmark-unique guard — same as `nav-bar-menu/render.php`'s own
 * guard; see that file for the full rationale.
 */
if ( '' === trim( (string) ( $attributes['navLabel'] ?? '' ) )
	&& in_array( $sgs_nm_split_side, array( 'before', 'after' ), true )
) {
	$nav_label = 'before' === $sgs_nm_split_side
		/* translators: %s: the auto-derived menu label, e.g. "Primary". */
		? sprintf( __( '%s (first half)', 'sgs-blocks' ), $nav_label )
		/* translators: %s: the auto-derived menu label, e.g. "Primary". */
		: sprintf( __( '%s (second half)', 'sgs-blocks' ), $nav_label );
}

/*
 * Sliding indicator / magnet opt-in flags (Mega-Menu Build Spec §6 rows 2 &
 * 4) — bare data-attribute PRESENCE is view.js's init signal; both default
 * OFF. `itemBgHoverTreatment` / `itemMagnetEnabled` are BOTH-classified
 * (measured), so the drawer offers the same controls as the bar.
 */
$indicator_style           = 'highlight' === ( $attributes['itemBgHoverTreatment'] ?? 'swap' ) ? 'pill' : 'none';
$indicator_colour          = isset( $attributes['itemBgHover'] ) ? (string) $attributes['itemBgHover'] : '';
$indicator_colour_gradient = sgs_css_gradient_value( $attributes['itemBgHoverGradient'] ?? '' );
$magnet_enabled            = ! empty( $attributes['itemMagnetEnabled'] );
$bar_data_attrs            = '';
$bar_data_attrs           .= 'pill' === $indicator_style ? ' data-sgs-nav-indicator' : '';
$bar_data_attrs           .= $magnet_enabled ? ' data-magnet' : '';

// This instance IS always the in-drawer nested list (FR-36-6): the
// `--drawer` BEM modifier + resolved submenu model ride unconditionally —
// style.css's structural accordion/drill-down rules key off both, and
// nav-drilldown.js (view.js) reads the data attribute to decide whether to
// enhance at all.
$bar_class       = 'sgs-nav-drawer-menu__bar sgs-nav-drawer-menu__bar--drawer';
$bar_data_attrs .= ' data-sgs-nav-submenu-model="' . esc_attr( $submenu_model_ctx ) . '"';

$bar_html = sprintf(
	'<ul class="%3$s"%2$s>%1$s</ul>',
	$items_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $items_html built from esc_url/esc_html/esc_attr fragments.
	$bar_data_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from fixed literal strings + esc_attr()'d submenu model, no unescaped user input.
	esc_attr( $bar_class )
);

/*
 * ── Resolve the hover treatments ONCE, server-side (FR-41-26). ─────────────
 * `sgs_nav_shared_resolved_treatments()` takes an explicit `$block_name`
 * second argument, so it looks up THIS block's own registered
 * `sweepEligibility` declaration + attribute defaults
 * (`src/blocks/nav-drawer-menu/block.json::supports.sgs.sweepEligibility`).
 */
$sgs_nm_treatments = sgs_nav_shared_resolved_treatments( $attributes, 'sgs/nav-drawer-menu' );

// ── 4. Scoped CSS assembly (no-inline, Spec 32). ────────────────────────────
$css  = '';
$css .= sgs_nav_shared_item_state_css( $attributes, $uid_sel, 'sgs-nav-drawer-menu', $sgs_nm_treatments, 'primary' );
$css .= sgs_nav_shared_submenu_css(
	$attributes,
	$uid_sel,
	$indicator_style,
	$indicator_colour,
	$indicator_colour_gradient,
	$sgs_tor_padding_tiers,
	$sgs_tor_padding_desktop,
	$sgs_tor_margin_desktop,
	'sgs-nav-drawer-menu',
	$sgs_nm_treatments,
	'icon', // Trigger-mode param — this block never has a trigger; 'icon' is also this shared helper's own default.
	$sgs_nm_drawer_bg_ctx,
	count( $flat_items )
);
// FR-41-30(b): sublink-marker colour CSS, built above alongside the marker's
// own SVG defs injection.
$css .= $sgs_nm_marker_css;

// ── 5. Assemble — BLOCK-PRIVATE root.
// Same as the bar block's render.php — see that file's own §5 comment for the
// rationale (few of the wrapper's attrs reachable, zero live arrangement CSS,
// no use for a flex gap with one flex child).
$inner_html = $bar_html;

if ( '' !== $css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( $css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via the shared helpers + esc_attr/sanitize_html_class fragments above; wp_strip_all_tags guards </style>.
}

// STOP-21: the block's own scoped `<style>` targets `.$uid …`, so the SAME
// `$uid` MUST ride onto the rendered element as a CLASS or every scoped rule
// above is a silent render no-op. `sgs-nav-drawer-menu` is this block's own
// BEM root; `$uid` is the per-instance scope.
$nav_root_classes = array( 'sgs-nav-drawer-menu', $uid );

// This <nav> IS the navigation landmark, so the accessible name belongs here
// — on the element carrying the role. Exactly one <nav> per instance and
// exactly one label (FR-36-10 / FR-36-11).
$nav_root_attrs = array(
	'class'      => implode( ' ', $nav_root_classes ),
	'aria-label' => $nav_label,
);

// `anchor: true` is declared in block.json. Miss this and a jump link
// targeting this menu breaks SILENTLY — no gate catches an unresolvable
// fragment.
if ( '' !== $anchor_val ) {
	$nav_root_attrs['id'] = $anchor_val;
}

printf(
	'<nav %1$s>%2$s</nav>',
	get_block_wrapper_attributes( $nav_root_attrs ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() esc_attr()s every value and returns a ready-to-print attribute string.
	$inner_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from pre-sanitised/escaped fragments (esc_url/esc_attr/esc_html per link).
);
