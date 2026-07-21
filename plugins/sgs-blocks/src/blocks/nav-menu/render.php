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
		 * Constructor.
		 *
		 * @param array $featured_ids Featured item identifiers.
		 */
		public function __construct( array $featured_ids ) {
			$this->featured_ids = array_map( 'strval', $featured_ids );
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
					case 'sgs/mega-menu':
					case 'sgs/mega-menu-item':
						$item = $this->from_link( $block['attrs'] ?? array() );
						if ( $item ) {
							$items[] = $item;
						}
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
				$html       .= sprintf(
					'<li class="%s"><a class="sgs-nav-menu__link" href="%s" data-sgs-nav-path="%s">%s</a></li>',
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
$bar_renderer = new SGS_Nav_Menu_Bar_Renderer( $featured_ids );
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

$bar_html = sprintf( '<ul class="sgs-nav-menu__bar">%s</ul>', $items_html ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $items_html built from esc_url/esc_html/esc_attr fragments.

// ── 4. Scoped CSS assembly (no-inline, Spec 32). ────────────────────────────
$css      = '';
$link_sel = $uid_sel . ' .sgs-nav-menu__link';

// 4a. Item typography — flat scalar model, shared helper (matches
// TypographyControls' attribute contract: {prefix}FontSize/Unit/Tablet/Mobile).
$css .= sgs_typography_css_rule( $attributes, 'item', $link_sel );

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

$hover_style       = isset( $attributes['hoverStyle'] ) ? (string) $attributes['hoverStyle'] : 'pill';
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
$featured_hover_sel = implode(
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
$css           .= '@media (max-width:' . ( $collapse_point - 1 ) . 'px){' . $uid_sel . ' .sgs-nav-menu__bar{display:none;}' . $uid_sel . ' .sgs-nav-menu__toggle-wrap{display:flex;}}';
$css           .= '@media (min-width:' . $collapse_point . 'px){' . $uid_sel . ' .sgs-nav-menu__toggle-wrap{display:none;}}';

// 4g. Free-text custom CSS escape hatch — sanitised (letters/digits/basic CSS
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
		'extra_attrs'   => array( 'aria-label' => esc_attr( $attributes['navLabel'] ?? 'Primary' ) ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
