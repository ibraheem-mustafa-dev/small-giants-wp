<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- dynamic block render template; helper class below is rendered inline, its namespace lives in the block slug.
/**
 * SGS Nav Menu (sgs/nav-menu) — server-side render. (D270)
 *
 * This is the site's VISIBLE menu: a FLAT horizontal bar of real <a href>
 * links on desktop; below `collapsePoint` it becomes a burger that opens
 * `sgs/nav-drawer` through the shared `store('sgs/nav')` Interactivity store
 * (src/shared/nav-interactivity/store.js). Submenus (one level deep,
 * MAX_SUBMENU_DEPTH = 1) and mega panels ARE rendered — dropdown roots,
 * sub-toggles and `sgs_mega_render_panel_content()` panels, all driven by the
 * shared `sgs/mega` interactivity store.
 *
 * Menu source: the shared SGS_Nav_Menu_Source resolver (one-source rule,
 * Spec 36 FR-36-1) — the SAME resolver the drawer content uses.
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

// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
// Fixed 2026-09-06: sgs_responsive_normalise_object() lives in
// helpers-responsive.php, which this file's own render-helpers.php
// require below WOULD load -- but too late, since these two calls run
// before that require executes. A block whose render.php is the first
// SGS block PHP to run in a request (nav-menu in the site header, on
// every page) fatals with "Call to undefined function" before any
// other block's render.php has had a chance to load it. Requiring the
// defining file directly, here, removes the load-order dependency.
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
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-trigger-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-submenu-css.php';
// class-sgs-container-wrapper.php is deliberately NOT required — this block
// renders its root block-private since D539 (see §5). Re-adding the require
// would reintroduce a dependency nothing uses.

if ( ! function_exists( 'sgs_nav_menu_typography_hover_rule' ) ) {
	/**
	 * BLOCK-PRIVATE hover-typography emitter (Spec 41 FR-41-21, owner ruling 2).
	 *
	 * ⛔ Declared HERE, in this block's own render.php, NOT in `includes/` —
	 * `includes/` is the SHARED folder even for a file only nav-menu requires,
	 * and `TypographyControls`' `showHover` trio is block-private code. It is
	 * wrapped in a `function_exists()` guard because a top-level function
	 * declaration in a per-instance render.php fatals on the page's SECOND
	 * instance, and this page has two (the header bar + the drawer's own copy).
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
	 *                                   Spec 41 FR-41-26 "SWEEP + A HOVER
	 *                                   TEXT-DECORATION": `text-decoration-color` is
	 *                                   NOT governed by `-webkit-text-fill-color`, so
	 *                                   without this the glyphs travel and the line
	 *                                   under them stays at the resting colour.
	 * @return string CSS, or '' when nothing permitted is set.
	 */
	function sgs_nav_menu_typography_hover_rule( array $attributes, string $prefix, string $selector, string $sweep_hover_colour = '' ): string {
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

if ( ! class_exists( 'SGS_Nav_Menu_Bar_Renderer' ) ) {
	/**
	 * Flattens a resolved menu-block tree into the sgs/nav-menu FLAT bar markup.
	 *
	 * Deliberately simpler than the accordion renderer this block used before
	 * ⛔ STALE UNTIL 2026-09-07 — this paragraph described the pre-fc021a340
	 * behaviour and contradicted the DROPDOWN branch at :393-425 in this same
	 * file for ~5 weeks. Plain submenus DO render a real disclosure now.
	 * Historical text follows.
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
		 * How many levels of submenu nesting render as real nested structure.
		 *
		 * 1 = a top-level item plus ONE level of children (a classic dropdown).
		 * Anything deeper is flattened into that level rather than dropped —
		 * see flatten(). Declared, not discovered: WordPress's Menus screen
		 * permits arbitrary drag-nesting, so the deeper case is reachable and
		 * needs a stated behaviour.
		 *
		 * @var int
		 */
		private const MAX_SUBMENU_DEPTH = 1;

		/**
		 * Operator-facing submenu settings, already validated by the caller.
		 *
		 * Only the values the MARKUP needs live here (alignment, caret, close
		 * grace). Everything purely visual — background, colour, padding, radius,
		 * min-width — is emitted as scoped CSS further down this file and never
		 * reaches this class, so adding a colour control can never change the
		 * rendered structure.
		 *
		 * @var array{align: string, caret: bool, close_grace: int}
		 */
		private array $submenu;

		/**
		 * Constructor.
		 *
		 * @param array  $featured_ids Featured item identifiers.
		 * @param string $uid          This block instance's uid (CSS scope + id namespace).
		 * @param array  $submenu      Submenu settings: align (start|center|end),
		 *                             caret (bool), close_grace (int ms),
		 *                             animation (none|fade|slide-down).
		 */
		public function __construct( array $featured_ids, string $uid = '', array $submenu = array() ) {
			$this->featured_ids = array_map( 'strval', $featured_ids );
			$this->uid          = $uid;
			$this->submenu      = array(
				'align'       => in_array( $submenu['align'] ?? '', array( 'start', 'center', 'end' ), true )
					? (string) $submenu['align']
					// Fitts's Law + every comparable builder (Bootstrap, Kadence,
					// Elementor, GenerateBlocks) ships start-aligned nav dropdowns:
					// the most-clicked entry sits nearest the launch point.
					: 'start',
				'caret'       => ! isset( $submenu['caret'] ) || (bool) $submenu['caret'],

				/*
				 * 170ms, matching the mega panel's live deterministic value in this
				 * same file. Deliberately NOT changed as a side effect of adding
				 * dropdowns: this timing governs every existing nav on both live
				 * sites, and a design doc asserting 500 was checked against the
				 * code rather than believed.
				 */
				'close_grace' => isset( $submenu['close_grace'] ) ? max( 0, (int) $submenu['close_grace'] ) : 170,

				// PHP-validated, not a JSON enum (block.json::submenuAnimation is
				// plain string) -- an out-of-list stored value coerces to the
				// no-animation default rather than emitting an unstyled modifier
				// class the CSS (style.css, Spec 41 step 17) never defined.
				'animation'   => in_array( $submenu['animation'] ?? '', array( 'fade', 'slide-down' ), true )
					? (string) $submenu['animation']
					: 'none',
			);
		}

		/**
		 * Accessor for the validated submenu settings (Spec 41 step 8, pure
		 * refactor) -- render.php now calls sgs_nav_menu_render_items() as a
		 * free function (see includes/nav-menu-markup.php), which has no
		 * $this and so cannot read $this->submenu directly. This getter is the
		 * ONLY new surface this split adds to the class; it exposes existing
		 * validated state, it does not compute anything new.
		 *
		 * @return array{align: string, caret: bool, close_grace: int, animation: string}
		 */
		public function get_submenu(): array {
			return $this->submenu;
		}

		/**
		 * Flatten resolved nav blocks into a list of { identifier, url, label }.
		 *
		 * The identifier mirrors edit.js's client-side flattening (same rule)
		 * so a featuredItemIds entry ticked in the inspector matches the
		 * server-rendered item: the underlying post/menu-item id when present,
		 * else a stable 'label:<text>' fallback key.
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
							// Depth cap reached. WordPress's own Menus screen lets an
							// operator drag-nest to ANY depth, so this case is reachable
							// from the UI. Emit the parent, then FLATTEN its descendants
							// into this same level rather than dropping them — a silent
							// truncation here is the D338 data-loss class. Declared
							// behaviour, not discovered behaviour.
							$items[] = $item;

							/*
							 * Path-qualify the flattened descendants under THIS
							 * item, not under the caller's $parent_path.
							 *
							 * Passing $parent_path collided sibling grandchildren:
							 * `L1 > L2a > About` and `L1 > L2b > About` both
							 * resolved to `label:L1>label:About`. Reproduced, not
							 * theorised. Consequences were real — ticking one
							 * "About" as featured also featured the other, and a
							 * fourth level would have produced two panels sharing
							 * one DOM id, the duplicate-id-aria fault the
							 * identifier scheme exists to prevent.
							 */
							$items = array_merge( $items, $this->flatten( $inner, $depth, $item['identifier'] ) );
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
			$raw_url = (string) ( $attrs['url'] ?? '' );
			$has_url = '' !== $raw_url;
			$url     = $has_url ? $raw_url : '#';
			$own_key = isset( $attrs['id'] ) && '' !== $attrs['id']
				? 'id:' . sanitize_key( (string) $attrs['id'] )
				: 'label:' . $label;

			/*
			 * Path-qualify CHILD identifiers only. A flat menu could safely key on
			 * 'label:<text>', but with children two sibling submenus that each hold
			 * an "About" item collide on that key — which would mis-target
			 * markCurrentPage() (view.js) and data-sgs-nav-path. Top-level keys are
			 * deliberately left unchanged so existing featuredItemIds selections
			 * keep matching.
			 */
			$identifier = '' === $parent_path ? $own_key : $parent_path . '>' . $own_key;

			return array(
				'identifier' => $identifier,
				'url'        => $url,
				// A parent that exists only to open its children has no URL of its
				// own. Rendering it as <a href="#"> jumps the page to the top on
				// click; render_items() uses this to emit a non-link trigger instead.
				'has_url'    => $has_url,
				'label'      => $label,
				'type'       => (string) ( $attrs['type'] ?? '' ),
				'object_id'  => (int) ( $attrs['id'] ?? 0 ),
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
// ── 1. Deterministic content-addressed uid (CSS scope). ────────────────────
// STOP-NO-KSORT: $attributes passed verbatim into the uid hash + the wrapper.
$anchor_val = isset( $block->parsed_block['attrs']['anchor'] ) ? (string) $block->parsed_block['attrs']['anchor'] : '';
$uid        = 'sgs-nav-menu-' . substr( md5( wp_json_encode( $attributes ) . $anchor_val ), 0, 8 );
$uid_sel    = '.' . $uid;

// ── 2. Resolve the menu (one-source rule) + flatten to top-level links only. ──
$ref          = isset( $attributes['ref'] ) ? absint( $attributes['ref'] ) : 0;
$menu_blocks  = SGS_Nav_Menu_Source::get_menu_blocks( $ref, true );
$featured_ids = is_array( $attributes['featuredItemIds'] ?? null ) ? $attributes['featuredItemIds'] : array();
$bar_renderer = new SGS_Nav_Menu_Bar_Renderer(
	$featured_ids,
	$uid,
	array(
		'align'       => (string) ( $attributes['submenuAlign'] ?? 'start' ),
		'caret'       => ! isset( $attributes['submenuCaret'] ) || (bool) $attributes['submenuCaret'],
		'close_grace' => (int) ( $attributes['submenuCloseGrace'] ?? 170 ),
		'animation'   => (string) ( $attributes['submenuAnimation'] ?? 'none' ),
	)
);
$flat_items   = $bar_renderer->flatten( $menu_blocks );

/*
 * ── Bar vs drawer rendering fork (Spec 36 FR-36-6). ─────────────────────────
 *
 * `sgs/nav-drawer` provides `sgs/navDrawerSubmenuModel` (block.json
 * `providesContext`, mapped from its own `submenuModel` attribute) to every
 * descendant — this is standard WP block-context propagation, resolved by
 * `WP_Block::render()` BEFORE a child's render callback runs, so it works
 * identically whether the drawer is rendered as normal page content OR via
 * the Active-drawer `do_blocks()` route (`class-sgs-drawer-render.php`):
 * both routes parse the drawer's stored block markup through the same
 * `render_block()`/`WP_Block` machinery, so context is computed from the
 * PARSED BLOCK TREE, not from any assumption about which post it lives in.
 *
 * A `sgs/nav-menu` with no `sgs/nav-drawer` ancestor never receives this
 * context key at all (absent from `$block->context`), so the flat bar
 * (`render_items()`, unchanged, dropdowns/mega intact) stays the default for
 * every existing header/footer instance.
 */
// FR-41-30(b): the drawer sub-item marker is operator-chosen, resolved through
// the same source-aware resolver as the trigger icon. The stored default
// (`lucide`/`chevron-right`) reproduces the previously-hardcoded glyph exactly.
$sgs_nm_sublink_marker = sgs_nav_menu_icon_markup(
	$attributes['sublinkMarkerIcon'] ?? null,
	array(
		'source' => 'lucide',
		'name'   => 'chevron-right',
	)
);

/*
 * FR-41-30(b) RESOLVED 2026-09-11: full Hover/Current + gradient states for
 * the marker colour, reusing `sgs/icon`'s own SOURCE-AWARE gradient
 * mechanism (`sgs_icon_gradient_css()`) rather than `sgs_svg_stroke_gradient()`
 * directly — the latter silently no-ops when the operator picks a
 * dashicon/emoji marker, since neither source renders an `<svg>` to target.
 * The inspector reveals this colour row only once `sublinkMarkerIcon` differs
 * from its declared default (edit.js's reveal condition) — render.php carries
 * no matching gate because an UNSET colour value already paints nothing here
 * regardless of which icon is showing, so the reveal is purely an inspector
 * affordance, never a render-time branch.
 *
 * `defs` (the lucide/wp-icon `<linearGradient>`) is injected into the
 * marker's OWN `<svg>` markup, never into `$css` — `wp_strip_all_tags()` on
 * the block's `<style>` assembly (§5 below) would destroy it on sight.
 * dashicon/emoji sources always return an empty `defs`, so injection is a
 * safe no-op there.
 */
// Validated the same way sgs/icon validates its own iconSource — an invalid
// stored value would otherwise pass a source `sgs_icon_gradient_css()`
// doesn't recognise while `sgs_nav_menu_icon_markup()` (above) has already
// silently fallen back to lucide/chevron-right for the MARKUP; keeping the
// two in lockstep avoids a flat-colour-works/gradient-silently-empty split.
$sgs_nm_marker_source = (string) ( $attributes['sublinkMarkerIcon']['source'] ?? 'lucide' );
if ( ! in_array( $sgs_nm_marker_source, array( 'lucide', 'wp-icon', 'dashicon', 'emoji' ), true ) ) {
	$sgs_nm_marker_source = 'lucide';
}
$sgs_nm_marker_sel  = '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink-marker';
$sgs_nm_sublink_sel = '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink';

$sgs_nm_marker_colour                  = (string) ( $attributes['sublinkMarkerColour'] ?? '' );
$sgs_nm_marker_colour_hover            = (string) ( $attributes['sublinkMarkerColourHover'] ?? '' );
$sgs_nm_marker_colour_current          = (string) ( $attributes['sublinkMarkerColourCurrent'] ?? '' );
$sgs_nm_marker_colour_gradient         = (string) ( $attributes['sublinkMarkerColourGradient'] ?? '' );
$sgs_nm_marker_colour_hover_gradient   = (string) ( $attributes['sublinkMarkerColourHoverGradient'] ?? '' );
$sgs_nm_marker_colour_current_gradient = (string) ( $attributes['sublinkMarkerColourCurrentGradient'] ?? '' );

$sgs_nm_marker_css = '';

// Flat colour is source-agnostic: lucide/wp-icon SVGs paint via
// `stroke="currentColor"`, dashicon/emoji are text nodes that paint via
// `color:` directly — both follow a plain `color:` declaration on the
// marker's own wrapper, exactly like sgs/icon's own `$root_decls` colour line.
if ( '' !== $sgs_nm_marker_colour ) {
	$sgs_nm_marker_css .= $sgs_nm_marker_sel . '{color:' . sgs_colour_value( $sgs_nm_marker_colour ) . ';}';
}
if ( '' !== $sgs_nm_marker_colour_current ) {
	$sgs_nm_marker_css .= $sgs_nm_sublink_sel . '[aria-current="page"] .sgs-nav-menu__sublink-marker{color:'
		. sgs_colour_value( $sgs_nm_marker_colour_current ) . ';}';
}
if ( '' !== $sgs_nm_marker_colour_hover ) {
	$sgs_nm_marker_css .= sgs_hover_state_rules(
		$sgs_nm_sublink_sel,
		'color:' . sgs_colour_value( $sgs_nm_marker_colour_hover ),
		':focus-visible',
		' .sgs-nav-menu__sublink-marker'
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
	$sgs_nm_sublink_sel . ':hover .sgs-nav-menu__sublink-marker'
);
$sgs_nm_sublink_marker    = sgs_svg_inject_defs( $sgs_nm_sublink_marker, $sgs_nm_marker_grad_hover['defs'] );
if ( '' !== $sgs_nm_marker_grad_hover['css'] ) {
	$sgs_nm_marker_css .= sgs_hover_state_rules(
		$sgs_nm_sublink_sel,
		$sgs_nm_marker_grad_hover['css'],
		':focus-visible',
		' .sgs-nav-menu__sublink-marker'
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
	$sgs_nm_sublink_sel . '[aria-current="page"] .sgs-nav-menu__sublink-marker'
);
$sgs_nm_sublink_marker      = sgs_svg_inject_defs( $sgs_nm_sublink_marker, $sgs_nm_marker_grad_current['defs'] );
if ( '' !== $sgs_nm_marker_grad_current['css'] ) {
	$sgs_nm_marker_css .= $sgs_nm_sublink_sel . '[aria-current="page"] .sgs-nav-menu__sublink-marker{'
		. $sgs_nm_marker_grad_current['css'] . ';}';
}
if ( '' !== $sgs_nm_marker_grad_current['fallback_rule'] ) {
	$sgs_nm_marker_css .= $sgs_nm_marker_grad_current['fallback_rule'];
}

$submenu_model_ctx = $block->context['sgs/navDrawerSubmenuModel'] ?? null;
if ( is_string( $submenu_model_ctx ) && in_array( $submenu_model_ctx, array( 'accordion', 'drill-down' ), true ) ) {
	$items_html            = sgs_nav_menu_render_items_drawer( $flat_items, $submenu_model_ctx, $uid, $featured_ids, $sgs_nm_sublink_marker );
	$sgs_nm_is_drawer_list = true;
} else {
	$items_html            = sgs_nav_menu_render_items( $flat_items, $featured_ids, $uid, $bar_renderer->get_submenu() );
	$sgs_nm_is_drawer_list = false;
	$submenu_model_ctx     = '';
}

if ( '' === $items_html ) {
	return '';
}

// ── 3. Burger + drawer-toggle context. ──────────────────────────────────────
$drawer_ref = isset( $attributes['drawerRef'] ) && '' !== $attributes['drawerRef']
	? sanitize_html_class( (string) $attributes['drawerRef'] )
	: 'sgs-nav-drawer';

/*
 * ── "A burger asked for a drawer" (W2-a). ────────────────────────────────────
 *
 * The burger below is always emitted — CSS at `collapsePoint` decides whether it
 * is visible, so the button is in the DOM on every device tier. Record the id it
 * controls so Sgs_Drawer_Render can render the site's Active menu drawer at
 * `wp_footer` ONLY on pages that have something to open it. A page with no burger
 * keeps byte-identical output.
 *
 * This runs on every nav-menu render, including the one INSIDE the drawer's own
 * content. That re-entry is harmless: the wp_footer callback sets its attempt
 * guard before `do_blocks()`, so a registry write arriving mid-render cannot cause
 * a second drawer (see the write-ordering note in class-sgs-drawer-render.php).
 */
if ( class_exists( '\\SGS\\Blocks\\Sgs_Drawer_Render' ) ) {
	\SGS\Blocks\Sgs_Drawer_Render::note_burger( $drawer_ref );
}

/*
 * ── Menu button: mode, label, icon, magnet (FR-41-12 / FR-41-30(a) / FR-41-31).
 *
 * `triggerMode` is PHP-validated, not a JSON enum — an out-of-enum stored value
 * would otherwise coerce silently back to the block.json default, which bites
 * hardest via a programmatic writer (the cloning converter, a theme pattern).
 *
 * ⚠ The `aria-label` is built as a VARIABLE and interpolated. It used to live
 * inside the `sprintf()` FORMAT STRING, where the only way to "drop" it was to
 * feed it '' — emitting `aria-label=""`, an EMPTY accessible name, strictly
 * worse than the Label-in-Name mismatch it was meant to fix. Under `text` and
 * `icon-and-text` the visible word IS the accessible name, so the attribute is
 * omitted entirely; under `icon` it stays.
 */
$trigger_mode = in_array( $attributes['triggerMode'] ?? '', array( 'icon', 'text', 'icon-and-text' ), true )
	? (string) $attributes['triggerMode']
	: 'icon';

$trigger_label = trim( (string) ( $attributes['triggerLabel'] ?? '' ) );
if ( '' === $trigger_label ) {
	$trigger_label = __( 'Menu', 'sgs-blocks' );
}

$burger_icon = 'text' === $trigger_mode
	? ''
	: sgs_nav_menu_icon_markup(
		$attributes['triggerIcon'] ?? null,
		array(
			'source' => 'lucide',
			'name'   => 'menu',
		)
	);

/*
 * G4 — is the resolved glyph the UNMODIFIED default ({source:lucide,name:menu})?
 * Gates the burger↔X morph markup in sgs_nav_menu_burger_toggle_markup(): a
 * custom triggerIcon (G3) can be any glyph shape with no guaranteed 3-line
 * structure, so it must keep rendering its own resolved markup untouched.
 */
$burger_icon_is_default = 'lucide' === (string) ( $attributes['triggerIcon']['source'] ?? 'lucide' )
	&& 'menu' === (string) ( $attributes['triggerIcon']['name'] ?? 'menu' );

$burger_aria_attr = 'icon' === $trigger_mode
	? sprintf( ' aria-label="%s"', esc_attr__( 'Open menu', 'sgs-blocks' ) )
	: '';

/*
 * FR-41-31 — the magnet rides as three data attributes on the button and
 * NOTHING else. The motion registry's enqueue is MARKUP-SNIFFED (it regexes the
 * rendered HTML for `data-sgs-fx="…"`), so the shared fx-magnet module and its
 * stylesheet are picked up automatically when the attribute is present and are
 * not loaded at all when it is absent. ⛔ No view.js change and no enqueue code
 * — that would be a second mechanism competing with a working one. When the
 * toggle is off, NO attribute is emitted, so the markup is byte-identical.
 */
$burger_magnet_attrs = '';
if ( ! empty( $attributes['triggerMagnetEnabled'] ) ) {
	$burger_magnet_attrs = ' data-sgs-fx="magnet"'
		. ' data-sgs-fx-magnet-radius="' . esc_attr( (string) absint( $attributes['triggerMagnetRadius'] ?? 120 ) ) . '"'
		. ' data-sgs-fx-magnet-strength="' . esc_attr( (string) absint( $attributes['triggerMagnetStrength'] ?? 24 ) ) . '"';
}

// wp_interactivity_data_wp_context() is the WP-canonical compact single-quoted
// emitter (avoids the &quot; bloat get_block_wrapper_attributes() would add) —
// mirrors the SGS_Container_Wrapper opts doc for `extra_attr_html`.
$burger_context_attr = wp_interactivity_data_wp_context(
	array(
		'isOpen'    => false,
		'drawerRef' => $drawer_ref,
	)
);

$toggle_html = sgs_nav_menu_burger_toggle_markup(
	$burger_context_attr,
	$drawer_ref,
	$burger_icon,
	$trigger_mode,
	$trigger_label,
	$burger_aria_attr,
	$burger_magnet_attrs,
	$burger_icon_is_default
);

// ── The <nav> landmark label (FR-36-10 / FR-36-11) ──────────────────────────
// The landmark ITSELF is this block's root: the final `printf()` at the end of
// this file emits `<nav %s>` directly via get_block_wrapper_attributes(), so the
// root IS a <nav>. This label rides onto it through $nav_root_attrs.
// ⚠ Corrected 2026-08-21: this previously said SGS_Container_Wrapper renders the
// tag. That stopped being true at D539, when the block moved to a block-private
// root (see the require note at the top — the wrapper file is deliberately NOT
// required). The warning below still stands; only the mechanism named changed.
//
// ⚠ HISTORY, so this is not "fixed" a third time. On 2026-07-23 a change added
// a SECOND, inner <nav class="sgs-nav-menu__nav"> here and moved the label onto
// it, on the stated grounds that the block "emitted NO <nav> element at all" and
// that the wrapper was "a roleless <div>". Both premises were false. They came
// from `grep -c "<nav" nav-menu/render.php`, which returns 0 because the <nav>
// was at that time emitted by class-sgs-container-wrapper.php — a different file
// the grep never read (STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING). Live on the
// canary that change produced <nav> nested inside <nav> around the SAME links,
// with the OUTER one unnamed, and axe still reported `landmark-unique`. Reverted
// 2026-07-23. Before changing the landmark structure again, read the printf()
// at the end of this file — that is what emits the landmark now.
//
// The label falls back through: operator `navLabel` → the resolved MENU'S OWN
// NAME → 'Primary'. Preferring the menu name means two nav instances bound to
// DIFFERENT menus get distinct landmark names automatically, which is what
// FR-36-11 (and axe's landmark-unique) actually require. This requires
// `navLabel` to default to '' in block.json — a non-empty default makes the
// menu-name branch below unreachable dead code (it was, until 2026-07-23).
$nav_label = trim( (string) ( $attributes['navLabel'] ?? '' ) );
if ( '' === $nav_label && $ref > 0 ) {
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
 * `indicatorStyle`/`indicatorColour`/`indicatorColourGradient` were deleted
 * with no deprecation by the Spec 41 manifest rewrite (bb9df82dc, D270) and
 * replaced by `itemBgHoverTreatment` (2026-09-11 fix): the sliding pill is
 * now ONE of that mode-selector's three options ('highlight'), and it
 * paints from the item Background row's OWN Hover swatch
 * (`itemBgHover`/`itemBgHoverGradient`) rather than a colour of its own —
 * "one picker, one property, three ways of applying it" (block.json's own
 * `indicator` element note). `$indicator_style` is kept as a local 'none'/
 * 'pill' value purely so the two call sites below (the `data-sgs-nav-
 * indicator` flag and `nav_menu_submenu_css()`'s existing parameter) don't
 * need their own signature/consumer changes.
 */
$indicator_style           = 'highlight' === ( $attributes['itemBgHoverTreatment'] ?? 'swap' ) ? 'pill' : 'none';
$indicator_colour          = isset( $attributes['itemBgHover'] ) ? (string) $attributes['itemBgHover'] : '';
$indicator_colour_gradient = sgs_css_gradient_value( $attributes['itemBgHoverGradient'] ?? '' );
$magnet_enabled            = ! empty( $attributes['itemMagnetEnabled'] );
$bar_data_attrs            = '';
$bar_data_attrs           .= 'pill' === $indicator_style ? ' data-sgs-nav-indicator' : '';
$bar_data_attrs           .= $magnet_enabled ? ' data-magnet' : '';

// In-drawer nested list (FR-36-6): a distinct BEM modifier class + the
// resolved submenu model as a data attribute — style.css's structural
// accordion/drill-down rules key off both, and nav-drilldown.js (view.js)
// reads the data attribute to decide whether to enhance at all.
$bar_class = 'sgs-nav-menu__bar';
if ( $sgs_nm_is_drawer_list ) {
	$bar_class      .= ' sgs-nav-menu__bar--drawer';
	$bar_data_attrs .= ' data-sgs-nav-submenu-model="' . esc_attr( $submenu_model_ctx ) . '"';
}

$bar_html = sprintf(
	'<ul class="%3$s"%2$s>%1$s</ul>',
	$items_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $items_html built from esc_url/esc_html/esc_attr fragments.
	$bar_data_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from fixed literal strings + esc_attr()'d submenu model, no unescaped user input.
	esc_attr( $bar_class )
);

/*
 * ── 3b. RESOLVE the hover treatments ONCE, server-side (FR-41-26). ───────────
 *
 * ⛔ The Sweep eligibility predicate is not a UI rule — it is the EMISSION rule,
 * and the inspector merely reflects it. Its inputs are OTHER attributes, which
 * the operator can change AFTER choosing Sweep, so a UI-only gate is not a gate
 * at all. `sgs_nav_menu_resolved_treatments()` re-evaluates the SAME declared
 * rows (`block.json::supports.sgs.sweepEligibility`) the inspector reads, and
 * falls back to 'swap' when the predicate is false — regardless of the stored
 * value, which is NOT cleared (it becomes valid again the moment the operator
 * clears the blocking attribute).
 *
 * ⛔ Every downstream rule reads THIS variable, never the stored attribute
 * again. The sweep-plus-text-decoration rule (FR-41-26) is the first consumer
 * where that distinction bites: keyed on the stored value it would fire on a row
 * that never swept.
 */
$sgs_nm_treatments = sgs_nav_menu_resolved_treatments( $attributes );

// ── 4. Scoped CSS assembly (no-inline, Spec 32). ────────────────────────────
$css  = '';
$css .= sgs_nav_menu_item_state_css( $attributes, $uid_sel, $sgs_nm_treatments );
$css .= sgs_nav_menu_trigger_css( $attributes, $uid_sel, $sgs_nm_treatments, $trigger_mode );
$css .= sgs_nav_menu_submenu_css(
	$attributes,
	$uid_sel,
	$indicator_style,
	$indicator_colour,
	$indicator_colour_gradient,
	$sgs_tor_padding_tiers,
	$sgs_tor_padding_desktop,
	$sgs_tor_margin_desktop,
	$sgs_nm_treatments
);
// FR-41-30(b): sublink-marker colour CSS, built above alongside the marker's
// own SVG defs injection (§ before line 456) — kept as a plain string here
// rather than threading extra params through sgs_nav_menu_submenu_css()'s
// signature.
$css .= $sgs_nm_marker_css;

// ── 5. Assemble — BLOCK-PRIVATE root (D539, Bean-approved 2026-08-09).
//
// This block used to render through SGS_Container_Wrapper with kind 'layout'.
// It no longer does. The evidence, measured rather than argued:
// (a) it declared 24 of the wrapper's ~107 attribute keys and only THREE were
// reachable by a client — maxWidth plus the two padding tiers;
// (b) the wrapper contributed ZERO live arrangement CSS. justifyContent,
// flexDirection, flexWrap, alignItems and the whole grid family were frozen at
// empty defaults with no control, so its arrangement array stayed empty and
// 100% of this nav's visible flex layout comes from style.css;
// (c) `gap` was wired but inert in practice — the bar and the toggle swap by
// display:none at the collapse point (§4f), so only ever ONE flex child exists
// and a flex gap between one item paints nothing.
// The 21 unreachable attributes are DELETED from block.json, not reproduced.
//
// ⛔ Do NOT "restore the composite-mirror rule" here. D294's KIND axis (layout
// KIND keeps the wrapper) was weighed and consciously departed from; D539
// records the reasoning and amends D538's over-broad "specialised block"
// framing. Re-read D539 before reverting this.
//
// R-31-9 is NOT breached: per D294's own clarification, "mirror capabilities"
// forbids a per-block hack that DIVERGES from the wrapper's computed behaviour,
// not a clean block-private implementation reproducing the same capability set
// — which §4g-bis above does for max-width, native spacing and the tiers.
$inner_html = $bar_html . $toggle_html;

if ( '' !== $css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( $css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via the shared helpers + esc_attr/sanitize_html_class fragments above; wp_strip_all_tags guards </style>.
}

// STOP-21 / DONE-item-2: the block's own scoped `<style>` targets `.$uid …`, so
// the SAME `$uid` MUST ride onto the rendered element as a CLASS or every scoped
// rule above is a silent render no-op. `sgs-nav-menu` is the stable BEM root the
// stylesheet and view.js both key on; `$uid` is the per-instance scope.
$nav_root_classes = array( 'sgs-nav-menu', $uid );

// This <nav> IS the navigation landmark, so the accessible name belongs here —
// on the element carrying the role. Exactly one <nav> per instance and exactly
// one label, so the two cannot drift (FR-36-10 / FR-36-11; see the label block
// above for why an inner second <nav> was reverted on 2026-07-23).
//
// ⚠ $nav_label and $anchor_val are passed RAW. get_block_wrapper_attributes()
// runs esc_attr() on every value it renders. The pre-exit code passed
// esc_attr($nav_label) into the wrapper's extra_attrs, which forwarded it into
// the SAME function (class-sgs-container-wrapper.php:923) — so the accessible
// name was escaped TWICE, and a label containing `&` reached the a11y tree as a
// literal `&amp;`. Escaping once here is a fix, not an omission; do not "restore"
// the esc_attr.
$nav_root_attrs = array(
	'class'      => implode( ' ', $nav_root_classes ),
	'aria-label' => $nav_label,
);

// `anchor: true` is declared in block.json. The wrapper used to wire the id for
// free via get_block_wrapper_attributes(); rendering block-private means doing it
// explicitly. Miss this and every Table-of-Contents / jump link targeting this nav
// breaks SILENTLY — no gate catches an unresolvable fragment. Pattern mirrors
// quote/render.php:557-561.
if ( '' !== $anchor_val ) {
	$nav_root_attrs['id'] = $anchor_val;
}

printf(
	'<nav %1$s>%2$s</nav>',
	get_block_wrapper_attributes( $nav_root_attrs ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() esc_attr()s every value and returns a ready-to-print attribute string.
	$inner_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from pre-sanitised/escaped fragments (esc_url/esc_attr/esc_html per link).
);
