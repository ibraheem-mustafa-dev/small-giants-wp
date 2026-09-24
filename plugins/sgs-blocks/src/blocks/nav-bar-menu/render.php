<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- dynamic block render template; helper class below is rendered inline, its namespace lives in the block slug.
/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — server-side render.
 *
 * This is the site's VISIBLE menu BAR: a FLAT horizontal row of real <a href>
 * links on desktop; below `collapsePoint` it becomes a burger that opens
 * `sgs/nav-drawer` through the shared `store('sgs/nav')` Interactivity store
 * (src/shared/nav-interactivity/store.js). Submenus (one level deep,
 * MAX_SUBMENU_DEPTH = 1) and mega panels ARE rendered — dropdown roots,
 * sub-toggles and `sgs_mega_render_panel_content()` panels, all driven by the
 * shared `sgs/mega` interactivity store.
 *
 * This block renders ONLY the bar. The in-drawer accordion/drill-down list is
 * the separate `sgs/nav-drawer-menu` block — there is no runtime fork here.
 * The burger is emitted by this block unless `showBurger` is off.
 *
 * Menu source: the shared SGS_Nav_Menu_Source resolver (one-source rule,
 * Spec 36 FR-36-1) — the SAME resolver `sgs/nav-drawer-menu` uses.
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
// whose render.php is the first SGS block PHP to run in a request (e.g. the
// site-header navigation bar, present on every page) would otherwise fatal
// with "Call to undefined function". Requiring the defining file directly,
// here, removes the load-order dependency.
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
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-trigger-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-submenu-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-submenu-link-css.php';
// class-sgs-container-wrapper.php is deliberately NOT required — this block
// renders its root block-private (see §5). Requiring it would add a
// dependency nothing uses.

if ( ! function_exists( 'sgs_nav_shared_typography_hover_rule' ) ) {
	/**
	 * BLOCK-PRIVATE hover-typography emitter (Spec 41 FR-41-21, owner ruling 2).
	 *
	 * ⛔ Declared HERE, in this block's own render.php, NOT in `includes/` —
	 * `includes/` is the SHARED folder even for a file only this block requires,
	 * and `TypographyControls`' `showHover` trio is block-private code. It is
	 * wrapped in a `function_exists()` guard because a top-level function
	 * declaration in a per-instance render.php fatals on a page's SECOND
	 * instance.
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

if ( ! class_exists( 'SGS_Nav_Menu_Bar_Renderer' ) ) {
	/**
	 * Flattens a resolved menu-block tree into the sgs/nav-bar-menu FLAT bar markup.
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
		 * panel's DOM id so two nav-bar-menu instances bound to the SAME menu (a
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
		 * @var array{align: string, caret: bool, close_grace: int, intent_delay: int, open_on: string}
		 */
		private array $submenu;

		/**
		 * Constructor.
		 *
		 * @param array  $featured_ids Featured item identifiers.
		 * @param string $uid          This block instance's uid (CSS scope + id namespace).
		 * @param array  $submenu      Submenu settings: align (start|center|end),
		 *                             caret (bool), close_grace (int ms),
		 *                             intent_delay (int ms), open_on (hover|click),
		 *                             animation (none|fade|slide-down).
		 */
		public function __construct( array $featured_ids, string $uid = '', array $submenu = array() ) {
			$this->featured_ids = array_map( 'strval', $featured_ids );
			$this->uid          = $uid;
			$this->submenu      = array(
				'align'       => in_array( $submenu['align'] ?? '', array( 'start', 'center', 'end', 'page-centred', 'full-width' ), true )
					? (string) $submenu['align']
					// Fitts's Law + every comparable builder (Bootstrap, Kadence,
					// Elementor, GenerateBlocks) ships start-aligned nav dropdowns:
					// the most-clicked entry sits nearest the launch point.
					: 'start',
				'caret'       => ! isset( $submenu['caret'] ) || (bool) $submenu['caret'],

				/* Default 170ms. This one setting governs both the dropdown and
				 * the mega panel: both forks of `sgs_nav_bar_menu_render_items`
				 * read it into their interactivity context.
				 */
				'close_grace' => isset( $submenu['close_grace'] ) ? max( 0, (int) $submenu['close_grace'] ) : 170,

				// Hover-intent delay in ms, bounded to the control's own range.
				'intent_delay' => isset( $submenu['intent_delay'] ) ? max( 0, min( 400, (int) $submenu['intent_delay'] ) ) : 80,

				// Same values as block.json::submenuOpenOn's enum; anything else is hover.
				'open_on'      => 'click' === ( $submenu['open_on'] ?? '' ) ? 'click' : 'hover',

				// PHP-validated, not a JSON enum (block.json::submenuAnimation is
				// plain string) -- an out-of-list stored value coerces to the
				// no-animation default rather than emitting an unstyled modifier
				// class the CSS (style.css) never defines.
				'animation'   => in_array( $submenu['animation'] ?? '', array( 'fade', 'fade-lift', 'slide-down', 'grow' ), true )
					? (string) $submenu['animation']
					: 'none',
			);
		}

		/**
		 * Accessor for the validated submenu settings -- render.php calls
		 * sgs_nav_bar_menu_render_items() as a free function (see
		 * includes/nav-menu-markup.php), which has no $this and so cannot read
		 * $this->submenu directly. This getter exposes the existing validated
		 * state; it does not compute anything new.
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
							// truncation here would be silent data loss. Declared
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
			$raw_url = trim( (string) ( $attrs['url'] ?? '' ) );
			$has_url = SGS_Nav_Menu_Source::is_destination_url( $raw_url );
			$url     = $has_url ? $raw_url : '#';

			/*
			 * A CUSTOM classic-menu link (no linked post/term) resolves through
			 * SGS_Nav_Menu_Source::classic_items_to_blocks() with `'id' => (int)
			 * $item->object_id`, which is 0 for a custom URL. A check of
			 * `isset( $attrs['id'] ) && '' !== $attrs['id']` would be TRUE for
			 * int 0 (0 !== '' in PHP's loose comparison), collapsing every
			 * custom-link item onto the SAME identifier 'id:0' instead of
			 * falling back to 'label:<text>'. So an id of 0 (or absent) falls
			 * to the label key: (1) a `featuredItemIds` entry saved as
			 * 'label:<text>' for a custom link matches here, so its
			 * pill/background renders; (2) two custom links in the same menu
			 * keep distinct identifiers, so featuring one does not feature both.
			 *
			 * flattenMenuItems() (nav-menu-panels/utils.js) does the same —
			 * `id ? \`id:${id}\` : \`label:${label}\`` treats JS's `0` as
			 * falsy — so both sides agree.
			 */
			$id_val  = $attrs['id'] ?? '';
			$own_key = ( '' !== (string) $id_val && 0 !== (int) $id_val )
				? 'id:' . sanitize_key( (string) $id_val )
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
				// The operator's own "Description" field on a classic menu item /
				// `core/navigation-link`'s native `description` attribute, used
				// as free-text badge copy ("SOON").
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
// ── 1. Deterministic content-addressed uid (CSS scope). ────────────────────
// STOP-NO-KSORT: $attributes passed verbatim into the uid hash + the wrapper.
$anchor_val = isset( $block->parsed_block['attrs']['anchor'] ) ? (string) $block->parsed_block['attrs']['anchor'] : '';
$uid        = 'sgs-nav-bar-menu-' . substr( md5( wp_json_encode( $attributes ) . $anchor_val ), 0, 8 );
$uid_sel    = '.' . $uid;

// ── 2. Resolve the menu (one-source rule) + flatten to top-level links only. ──
$ref          = isset( $attributes['ref'] ) ? absint( $attributes['ref'] ) : 0;
$menu_blocks  = SGS_Nav_Menu_Source::get_menu_blocks( $ref, true );
$featured_ids = is_array( $attributes['featuredItemIds'] ?? null ) ? $attributes['featuredItemIds'] : array();
// Wave B: identifiers rendered as non-interactive text (Disabled items panel).
$disabled_ids = is_array( $attributes['disabledItemIds'] ?? null ) ? $attributes['disabledItemIds'] : array();
$bar_renderer = new SGS_Nav_Menu_Bar_Renderer(
	$featured_ids,
	$uid,
	array(
		'align'       => (string) ( $attributes['submenuAlign'] ?? 'start' ),
		'caret'       => ! isset( $attributes['submenuCaret'] ) || (bool) $attributes['submenuCaret'],
		'close_grace' => (int) ( $attributes['submenuCloseGrace'] ?? 170 ),
		'intent_delay' => (int) ( $attributes['submenuIntentDelay'] ?? 80 ),
		'open_on'     => (string) ( $attributes['submenuOpenOn'] ?? 'hover' ),
		'animation'   => (string) ( $attributes['submenuAnimation'] ?? 'none' ),
	)
);
$flat_items   = $bar_renderer->flatten( $menu_blocks );

/*
 * ── 2b. Split-nav slicing. ──────────────────────────────────
 *
 * `splitSide` + `splitAfterItemId` let two instances of this block share one
 * menu — one instance renders everything up to and including a chosen
 * top-level item, the other renders everything after it (e.g. either side of
 * a centred logo in `sgs/site-header-row`).
 *
 * Keyed to `$flat_items[]['identifier']` — the SAME identifier scheme
 * `featuredItemIds` already uses — never an index, because index-slicing
 * silently drops items the client adds later.
 *
 * ⛔ Fail VISIBLE, not silent: an unresolvable id (item deleted from the menu
 * since this attribute was set) falls through to the untouched, FULL
 * `$flat_items` list — never an empty bar. The editor-side notice is what
 * makes the drift visible to the operator (`SplitPanel.js`); this render path
 * has no notice mechanism, so it defaults to showing everything rather than
 * showing nothing.
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

// ── This block ALWAYS renders the flat bar. ─────────────────────────────────
// The in-drawer accordion/drill-down list is the separate
// `sgs/nav-drawer-menu` block, which calls `sgs_nav_drawer_menu_render_items()`
// in its OWN render.php. This block never receives drawer context and never
// needs to detect what it is — it IS the bar. (`$flat_items` may be a SLICE
// of the full menu — see §2b above — but the render path never forks on that.)
$items_html = sgs_nav_bar_menu_render_items( $flat_items, $featured_ids, $uid, $bar_renderer->get_submenu(), $disabled_ids );

if ( '' === $items_html ) {
	return '';
}

// ── 3. Burger + drawer-toggle context. ──────────────────────────────────────
//
// drawerRef is a `sgs_drawer` POST ID: an operator picks a specific
// published drawer via the SelectControl in DropdownSettingsPanel.js, or
// leaves it 0 to fall back to the site's single Active-drawer pointer
// (Sgs_Active_Layout::AREA_DRAWER — see that class's OPTION_DRAWER docblock:
// "the burger will carry a post id and fall back to this pointer, with no
// second store"). Sgs_Drawer_Render::drawer_ref_for() resolves the ACTUAL
// <dialog> id to open by reading the target post's own sgs/nav-drawer block,
// falling back to 'sgs-nav-drawer' when nothing resolves.
$drawer_post_id = isset( $attributes['drawerRef'] ) ? absint( $attributes['drawerRef'] ) : 0;
$drawer_ref     = class_exists( '\\SGS\\Blocks\\Sgs_Drawer_Render' )
	? \SGS\Blocks\Sgs_Drawer_Render::drawer_ref_for( $drawer_post_id )
	: 'sgs-nav-drawer';

// `showBurger` — the right-hand half of a split menu (§2b) suppresses its own
// burger; the left-hand half keeps the real one. Default TRUE so a single,
// unsplit instance always has its burger.
$sgs_nm_show_burger = ! isset( $attributes['showBurger'] ) || (bool) $attributes['showBurger'];

/*
 * ── "A burger asked for a drawer". ────────────────────────────────────
 *
 * When shown, the burger below is always emitted — CSS at `collapsePoint`
 * decides whether it is visible, so the button is in the DOM on every device
 * tier. Record the id it controls so Sgs_Drawer_Render can render the site's
 * Active menu drawer at `wp_footer` ONLY on pages that have something to open
 * it. A page with no burger (either no instance of this block, or every
 * instance has `showBurger` off) keeps byte-identical output.
 */
if ( $sgs_nm_show_burger && class_exists( '\\SGS\\Blocks\\Sgs_Drawer_Render' ) ) {
	\SGS\Blocks\Sgs_Drawer_Render::note_burger( $drawer_post_id );
}

/*
 * ── Menu button: mode, label, icon, magnet (FR-41-12 / FR-41-30(a) / FR-41-31).
 *
 * `triggerMode` is a TIER OBJECT (desktop concrete, tablet
 * inherits desktop, mobile inherits tablet, fallback `icon`), mirroring
 * sgs/nav-drawer's `closeStyle`. `$sgs_nm_allowed_trigger_modes` is the ONE
 * PHP-validated allow-list (no JSON enum — an out-of-list stored value would
 * otherwise coerce silently back to the block.json default) — Wave 3C U-14
 * adds a fourth value here and nowhere else. A stored FLAT string
 * (pre-migration content) is defended against directly, the same belt the
 * migration script (`scripts/migrate-stored-tier-scalars.py`) is the real fix
 * for.
 */
$sgs_nm_allowed_trigger_modes = array( 'icon', 'text', 'icon-and-text' );
$sgs_nm_trigger_mode_raw      = $attributes['triggerMode'] ?? array();
if ( is_string( $sgs_nm_trigger_mode_raw ) ) {
	$sgs_nm_trigger_mode_raw = '' !== $sgs_nm_trigger_mode_raw ? array( 'desktop' => $sgs_nm_trigger_mode_raw ) : array();
}
if ( ! is_array( $sgs_nm_trigger_mode_raw ) ) {
	$sgs_nm_trigger_mode_raw = array();
}

$sgs_nm_valid_trigger_mode = function ( $value ) use ( $sgs_nm_allowed_trigger_modes ) {
	return in_array( $value, $sgs_nm_allowed_trigger_modes, true ) ? (string) $value : 'icon';
};

$trigger_mode_desktop = $sgs_nm_valid_trigger_mode( sgs_resolve_tier( $sgs_nm_trigger_mode_raw, 'desktop', 'icon' )['value'] );
$trigger_mode_tablet  = $sgs_nm_valid_trigger_mode( sgs_resolve_tier( $sgs_nm_trigger_mode_raw, 'tablet', 'icon' )['value'] );
$trigger_mode_mobile  = $sgs_nm_valid_trigger_mode( sgs_resolve_tier( $sgs_nm_trigger_mode_raw, 'mobile', 'icon' )['value'] );

// The DESKTOP tier drives everything not itself tiered below — mirrors
// closeStyle's own desktop-only-drives convention.
$trigger_mode = $trigger_mode_desktop;

// Any tier showing the icon / any tier showing the word — both markup
// elements can exist in the DOM at once (nav-menu-trigger-css.php hides
// whichever one a given tier doesn't want); "every tier shows the word" is
// the ONLY case that may omit aria-label (Label-in-Name, §"Accessible name").
$sgs_nm_trigger_tiers           = array( $trigger_mode_desktop, $trigger_mode_tablet, $trigger_mode_mobile );
$sgs_nm_trigger_any_icon        = array() !== array_intersect( $sgs_nm_trigger_tiers, array( 'icon', 'icon-and-text' ) );
$sgs_nm_trigger_any_text        = array() !== array_intersect( $sgs_nm_trigger_tiers, array( 'text', 'icon-and-text' ) );
$sgs_nm_trigger_every_tier_text = array() === array_diff( $sgs_nm_trigger_tiers, array( 'text', 'icon-and-text' ) );

// The MARKUP mode handed to sgs_nav_bar_menu_burger_toggle_markup() — that
// function's own icon_html/text_html/mode_class branches are keyed off a
// single flat mode ('text' suppresses the icon; anything but 'icon'
// renders the label). Passing the UNION of what any tier needs reproduces
// exactly "render the icon if any tier shows it, render the label if any
// tier shows it" without touching that shared markup function.
$sgs_nm_trigger_markup_mode = 'icon';
if ( $sgs_nm_trigger_any_icon && $sgs_nm_trigger_any_text ) {
	$sgs_nm_trigger_markup_mode = 'icon-and-text';
} elseif ( $sgs_nm_trigger_any_text ) {
	$sgs_nm_trigger_markup_mode = 'text';
}

$trigger_label = trim( (string) ( $attributes['triggerLabel'] ?? '' ) );
if ( '' === $trigger_label ) {
	$trigger_label = __( 'Menu', 'sgs-blocks' );
}

$burger_icon = $sgs_nm_trigger_any_icon
	? sgs_nav_shared_icon_markup(
		$attributes['triggerIcon'] ?? null,
		array(
			'source' => 'lucide',
			'name'   => 'menu',
		)
	)
	: '';

/*
 * Is the resolved glyph the UNMODIFIED default ({source:lucide,name:menu})?
 * Gates the burger↔X morph markup in sgs_nav_bar_menu_burger_toggle_markup(): a
 * custom triggerIcon can be any glyph shape with no guaranteed 3-line
 * structure, so it must keep rendering its own resolved markup untouched.
 */
$burger_icon_is_default = 'lucide' === (string) ( $attributes['triggerIcon']['source'] ?? 'lucide' )
	&& 'menu' === (string) ( $attributes['triggerIcon']['name'] ?? 'menu' );

/*
 * ⚠ The `aria-label` is built as a VARIABLE and interpolated, never a `%s`
 * inside a `sprintf()` FORMAT STRING — feeding it '' would emit
 * `aria-label=""`, an EMPTY accessible name, strictly worse than the
 * Label-in-Name mismatch it avoids. Whenever ANY tier hides the
 * visible word, the button still needs an accessible name at that tier, so
 * aria-label carries the trigger label (the same word the OTHER tiers show,
 * so Label-in-Name still holds where the word IS visible). Only when EVERY
 * tier shows the word is aria-label omitted entirely, letting the visible
 * text be the accessible name.
 */
// No tier shows a word: a descriptive name. Some tiers show it: that same word
// (Label-in-Name). Every tier shows it: the visible word is the name.
if ( $sgs_nm_trigger_every_tier_text ) {
	$burger_aria_attr = '';
} elseif ( $sgs_nm_trigger_any_text ) {
	$burger_aria_attr = sprintf( ' aria-label="%s"', esc_attr( $trigger_label ) );
} else {
	$burger_aria_attr = sprintf( ' aria-label="%s"', esc_attr__( 'Open menu', 'sgs-blocks' ) );
}

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

/*
 * ── Wave 3C U-9/U-11 interface #1 (DEC-09) — the burger's resolved
 * `collapsePoint`. ────────────────────────────────────────────────────────
 * Same sanitisation `nav-menu-submenu-css.php::sgs_nav_shared_submenu_css()`
 * applies to the SAME attribute (max(1, absint(...)), default 768) — one
 * width, read the same way in both places, so `store.js`'s resize watcher
 * can never disagree with the CSS bar/burger switch it is watching for.
 */
$sgs_nm_collapse_point = isset( $attributes['collapsePoint'] ) ? max( 1, absint( $attributes['collapsePoint'] ) ) : 768;

/*
 * ── Wave 3C U-9 (§4.4) — burger morph mode + motion. ─────────────────────
 * `burgerMorph` carries a real block.json `enum`, so an out-of-list stored
 * value (a hand-authored pattern, an older clone) is already coerced to the
 * default by WordPress before this file runs — the `in_array()` re-check is
 * the same belt-and-braces every other PHP-validated nav attribute in this
 * file applies to a programmatic writer that bypasses the editor entirely.
 */
$sgs_nm_burger_morph = in_array( $attributes['burgerMorph'] ?? 'x', array( 'x', 'x-rotate', 'line', 'none' ), true )
	? (string) ( $attributes['burgerMorph'] ?? 'x' )
	: 'x';

// wp_interactivity_data_wp_context() is the WP-canonical compact single-quoted
// emitter (avoids the &quot; bloat get_block_wrapper_attributes() would add) —
// mirrors the SGS_Container_Wrapper opts doc for `extra_attr_html`.
$burger_context_attr = wp_interactivity_data_wp_context(
	array(
		'isOpen'    => false,
		'drawerRef' => $drawer_ref,
	)
);

// Two instances can share one menu either side of a logo, and only ONE of
// them should own the burger — `$sgs_nm_show_burger` (§3 above) is that gate.
// The drawer's own internal list is `sgs/nav-drawer-menu`'s job, not this
// block's.
$toggle_html = $sgs_nm_show_burger ? sgs_nav_bar_menu_burger_toggle_markup(
	$burger_context_attr,
	$drawer_ref,
	$burger_icon,
	$sgs_nm_trigger_markup_mode,
	$trigger_label,
	$burger_aria_attr,
	$burger_magnet_attrs,
	$burger_icon_is_default,
	$sgs_nm_collapse_point,
	$sgs_nm_burger_morph
) : '';

// ── The <nav> landmark label (FR-36-10 / FR-36-11) ──────────────────────────
// The landmark ITSELF is this block's root: the final `printf()` at the end of
// this file emits `<nav %s>` directly via get_block_wrapper_attributes(), so the
// root IS a <nav>. This label rides onto it through $nav_root_attrs.
//
// The label falls back through: operator `navLabel` → the resolved MENU'S OWN
// NAME → 'Primary'. Preferring the menu name means two nav instances bound to
// DIFFERENT menus get distinct landmark names automatically, which is what
// FR-36-11 (and axe's landmark-unique) actually require. This requires
// `navLabel` to default to '' in block.json — a non-empty default makes the
// menu-name branch below unreachable dead code.
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
 * Split-nav landmark-unique guard. Two split instances of
 * this block read the SAME `$ref` menu (§2b), so the fallback chain above —
 * unaware of the split — would derive the IDENTICAL label for both: two
 * `<nav>` landmarks with the same accessible name is an axe `landmark-unique`
 * failure. Only auto-derived labels are qualified; an operator who typed
 * their OWN `navLabel` already has full control to make the two distinct and
 * that choice is never overridden.
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
 * Sliding indicator / magnet-label opt-in flags (Mega-Menu Build Spec §6
 * rows 2 & 4) — bare data-attribute PRESENCE is view.js's init signal; both
 * default OFF, so an existing nav renders byte-identical until an operator
 * opts in via the Effects panel.
 *
 * The sliding pill is ONE of `itemBgHoverTreatment`'s three options
 * ('highlight'), and it paints from the item Background row's OWN Hover
 * swatch (`itemBgHover`/`itemBgHoverGradient`) rather than a colour of its
 * own — "one picker, one property, three ways of applying it" (block.json's
 * own `indicator` element note).
 */
$indicator_style           = 'highlight' === ( $attributes['itemBgHoverTreatment'] ?? 'swap' ) ? 'pill' : 'none';
$indicator_colour          = isset( $attributes['itemBgHover'] ) ? (string) $attributes['itemBgHover'] : '';
$indicator_colour_gradient = sgs_css_gradient_value( $attributes['itemBgHoverGradient'] ?? '' );
$magnet_enabled            = ! empty( $attributes['itemMagnetEnabled'] );
$bar_data_attrs            = '';
$bar_data_attrs           .= 'pill' === $indicator_style ? ' data-sgs-nav-indicator' : '';
$bar_data_attrs           .= $magnet_enabled ? ' data-magnet' : '';

/*
 * `itemMagnetStrength` (M-10, §4.8) — UNSET means today's exact behaviour:
 * no `data-magnet-strength` attribute at all, so `view.js::initBarEffects`
 * keeps calling `initMagnet(el)` with no options. Only emitted when the
 * operator has actually set a numeric value; clamped to the control's own
 * 0.02–0.5 range so a programmatic writer (pattern, cloning pipeline) can't
 * push `magnet.js`'s pull factor outside what the RangeControl allows.
 */
$sgs_nm_item_magnet_strength = $attributes['itemMagnetStrength'] ?? null;
if ( $magnet_enabled && is_numeric( $sgs_nm_item_magnet_strength ) ) {
	$bar_data_attrs .= ' data-magnet-strength="' . esc_attr( (string) max( 0.02, min( 0.5, (float) $sgs_nm_item_magnet_strength ) ) ) . '"';
}

// `sgs-nav-bar-menu__bar` is this block's own BEM root. The `--drawer`
// modifier + `data-sgs-nav-submenu-model` attribute belong to the in-drawer
// render path, which lives on `sgs/nav-drawer-menu`'s own render.php.
$bar_class = 'sgs-nav-bar-menu__bar';

$bar_html = sprintf(
	'<ul class="%3$s"%2$s>%1$s</ul>',
	$items_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $items_html built from esc_url/esc_html/esc_attr fragments.
	$bar_data_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from fixed literal strings, no unescaped user input.
	esc_attr( $bar_class )
);

/*
 * ── 3b. RESOLVE the hover treatments ONCE, server-side (FR-41-26). ───────────
 *
 * ⛔ The Sweep eligibility predicate is not a UI rule — it is the EMISSION rule,
 * and the inspector merely reflects it. Its inputs are OTHER attributes, which
 * the operator can change AFTER choosing Sweep, so a UI-only gate is not a gate
 * at all. `sgs_nav_shared_resolved_treatments()` re-evaluates the SAME declared
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
$sgs_nm_treatments = sgs_nav_shared_resolved_treatments( $attributes, 'sgs/nav-bar-menu' );

// ── 4. Scoped CSS assembly (no-inline, Spec 32). ────────────────────────────
// This block is never nested inside `sgs/nav-drawer` (no `sgs/navDrawerBg`
// context — the drawer's own render path is `sgs/nav-drawer-menu`), so the
// drawer-bg-aware submenu contrast parameter is always ''.
$css = '';

/*
 * `justifyContent` — `style.css`'s
 * `:where(.sgs-nav-bar-menu){justify-content:space-between}` is written to
 * yield to an attribute-driven rule at normal specificity the moment one
 * exists. Whitelisted rather than merely
 * `esc_attr()`'d — this concatenates straight into a raw `<style>` block, not
 * an HTML attribute, and the value can arrive via a programmatic writer (the
 * cloning converter, WP-CLI) that bypasses the editor's `enum` validation.
 */
$sgs_nm_justify_allowed = array( 'flex-start', 'center', 'flex-end', 'space-between', 'space-around' );
$sgs_nm_justify_content = (string) ( $attributes['justifyContent'] ?? '' );
if ( in_array( $sgs_nm_justify_content, $sgs_nm_justify_allowed, true ) ) {
	$css .= $uid_sel . '{justify-content:' . $sgs_nm_justify_content . '}';
}

/*
 * ── Wave 3C U-9 (§4.4) — burger morph duration + easing custom properties. ──
 * `style.css`'s base rules read `--sgs-nbm-burger-morph-duration`/`-easing`
 * with today's exact hardcoded values as their `var()` fallbacks (200ms /
 * ease), so this block only writes a property when the operator has moved
 * OFF that default — an untouched nav ships nothing extra and renders
 * byte-identical CSS to before this attribute pair existed.
 *
 * Naming ruling (Spec 35/32 audit SHOULD 4, 2026-09-24): FR-32-4's canonical
 * form is `--sgs-{block}-{role}`, which for this block would be
 * `--sgs-nav-bar-menu-*`. `nbm` is an ABBREVIATION of the block slug, same as
 * `sgs/nav-drawer`'s own shipped `--sgs-drawer-*` custom properties abbreviate
 * theirs — this is the established convention within the nav-* block family,
 * not a one-off. Kept as `--sgs-nbm-*` for consistency with that sibling
 * rather than renamed to the longer canonical form.
 */
$sgs_nm_morph_duration = isset( $attributes['burgerMorphDuration'] ) ? (int) $attributes['burgerMorphDuration'] : 200;
$sgs_nm_morph_duration = max( 0, min( 1200, $sgs_nm_morph_duration ) );
$sgs_nm_morph_easing_css = sgs_motion_easing_css( (string) ( $attributes['burgerMorphEasing'] ?? 'ease' ), (string) ( $attributes['burgerMorphEasingCustom'] ?? '' ) );

$sgs_nm_morph_vars = '';
if ( 200 !== $sgs_nm_morph_duration ) {
	$sgs_nm_morph_vars .= '--sgs-nbm-burger-morph-duration:' . $sgs_nm_morph_duration . 'ms;';
}
if ( 'ease' !== $sgs_nm_morph_easing_css ) {
	$sgs_nm_morph_vars .= '--sgs-nbm-burger-morph-easing:' . $sgs_nm_morph_easing_css . ';';
}
if ( '' !== $sgs_nm_morph_vars ) {
	$css .= $uid_sel . '{' . $sgs_nm_morph_vars . '}';
}

/*
 * ── Wave B — badge colour (background + text). ──────────────────────────
 * Block-level: ONE colour applies to every badge this bar renders — the
 * badge's own COPY is per-item (the operator's classic-menu Description
 * field, sgs_nav_shared_badge_html()'s own docblock). Defaults
 * ('accent-light'/'accent-text') are non-empty theme tokens (Spec 32 §3
 * DEFAULT test, same shape as sgs/cart's badgeColour/badgeTextColour), so
 * this rule is always emitted; style.css's own `:where()` default exists
 * only as a defensive fallback (e.g. render bypassed) and this #uid-scoped
 * rule (0,2,0) always wins over it regardless of source order.
 */
$sgs_nm_badge_bg_decl   = sgs_background_paint_decl( (string) ( $attributes['itemBadgeColour'] ?? 'accent-light' ), '' );
$sgs_nm_badge_text_decl = sgs_text_colour_decl( (string) ( $attributes['itemBadgeTextColour'] ?? 'accent-text' ) );
$sgs_nm_badge_css       = '';
if ( '' !== $sgs_nm_badge_bg_decl ) {
	$sgs_nm_badge_css .= $sgs_nm_badge_bg_decl . ';';
}
if ( '' !== $sgs_nm_badge_text_decl ) {
	$sgs_nm_badge_css .= $sgs_nm_badge_text_decl . ';';
}
if ( '' !== $sgs_nm_badge_css ) {
	$css .= $uid_sel . ' .sgs-nav-bar-menu__badge{' . $sgs_nm_badge_css . '}';
}

/*
 * ── Wave B — disabled item/sublink text colour. ─────────────────────────
 * Structural non-interactivity (cursor, pointer-events) is static in
 * style.css; only the colour is attribute-driven. Matches
 * `[aria-disabled="true"]`, the exact selector
 * sgs_nav_bar_menu_render_items()/render_items() emit on a disabled item.
 */
$sgs_nm_disabled_decl = sgs_text_colour_decl( (string) ( $attributes['itemDisabledColour'] ?? 'text-muted' ) );
if ( '' !== $sgs_nm_disabled_decl ) {
	$css .= $uid_sel . ' .sgs-nav-bar-menu__link[aria-disabled="true"],' . $uid_sel . ' .sgs-nav-bar-menu__sublink[aria-disabled="true"]{' . $sgs_nm_disabled_decl . ';}';
}

// The item hover-colour default ('primary') is the same on nav-drawer-menu, so
// both surfaces read alike. See sgs_nav_shared_item_state_css()'s own
// $default_item_colour_hover docblock in includes/nav-menu-css.php.
$css .= sgs_nav_shared_item_state_css( $attributes, $uid_sel, 'sgs-nav-bar-menu', $sgs_nm_treatments, 'primary' );
$css .= sgs_nav_bar_menu_trigger_css( $attributes, $uid_sel, $sgs_nm_treatments, $trigger_mode_desktop, $trigger_mode_tablet, $trigger_mode_mobile );
$css .= sgs_nav_shared_submenu_css(
	$attributes,
	$uid_sel,
	$indicator_style,
	$indicator_colour,
	$indicator_colour_gradient,
	$sgs_tor_padding_tiers,
	$sgs_tor_padding_desktop,
	$sgs_tor_margin_desktop,
	'sgs-nav-bar-menu',
	$sgs_nm_treatments,
	'icon',
	'',
	count( $flat_items )
);

// ── 5. Assemble — BLOCK-PRIVATE root.
//
// This block does not render through SGS_Container_Wrapper. Why:
// (a) only THREE of the wrapper's ~107 attribute keys are reachable by a
// client here — maxWidth plus the two padding tiers;
// (b) the wrapper would contribute ZERO live arrangement CSS. justifyContent,
// flexDirection, flexWrap, alignItems and the whole grid family have no
// control on this block, so 100% of this nav's visible flex layout comes from
// style.css;
// (c) a flex `gap` would be inert — the bar and the toggle swap by
// display:none at the collapse point (§4f), so only ever ONE flex child
// exists and a flex gap between one item paints nothing.
//
// ⛔ Do NOT "restore the composite-mirror rule" here. R-31-9 is NOT breached:
// "mirror capabilities" forbids a per-block hack that DIVERGES from the
// wrapper's computed behaviour, not a clean block-private implementation
// reproducing the same capability set — which §4g-bis above does for
// max-width, native spacing and the tiers.
$inner_html = $bar_html . $toggle_html;

// ── Scrim: the see-through layer that dims the page behind an open dropdown
// or mega panel (Wave 3C U-2, family M-14). Off by default (the four scrim*
// attributes all default empty/unset) — a bar that never touches them ships
// nothing extra. The open selector matches the trigger's own aria-expanded
// state, which stays inside this <nav> even when its panel is reparented
// elsewhere (mega-disclosure.js), so one selector covers dropdowns and mega
// panels alike. See includes/helpers-scrim.php::sgs_scrim_render().
// ── Panel motion (Wave 3C U-5): open and close time, speed curve and item
// stagger for every dropdown and mega panel, as values the rules in style.css
// read. The scrim fades with the panels.
$sgs_nm_panel_in    = sgs_motion_ms( $attributes['submenuAnimationDuration'] ?? 180, 180 );
$sgs_nm_panel_out   = sgs_motion_ms( $attributes['submenuExitDuration'] ?? 150, 150 );
$sgs_nm_panel_ease  = sgs_motion_easing_css( (string) ( $attributes['submenuAnimationEasing'] ?? 'ease-out-css' ), (string) ( $attributes['submenuAnimationEasingCustom'] ?? '' ), 'ease-out' );
$sgs_nm_panel_vars  = '--sgs-nbm-panel-dur:' . $sgs_nm_panel_in . 'ms;--sgs-nbm-panel-exit-dur:' . $sgs_nm_panel_out . 'ms;--sgs-nbm-panel-ease:' . $sgs_nm_panel_ease . ';';
$sgs_nm_stagger     = sgs_motion_ms( $attributes['submenuItemStagger'] ?? 0, 0, 1000 );
if ( $sgs_nm_stagger > 0 ) {
	$sgs_nm_stagger_dur = sgs_motion_ms( $attributes['submenuItemStaggerDuration'] ?? 0, 0 );
	$sgs_nm_stagger_max = sgs_motion_ms( $attributes['submenuItemStaggerMax'] ?? 0, 0, 10000 );
	$sgs_nm_stagger_d   = is_numeric( $attributes['submenuItemStaggerDistance'] ?? null ) ? max( -400, min( 400, (int) round( (float) $attributes['submenuItemStaggerDistance'] ) ) ) : 8;
	$sgs_nm_panel_vars .= '--sgs-nbm-stagger-step:' . $sgs_nm_stagger . 'ms;'
		. '--sgs-nbm-stagger-dur:' . ( $sgs_nm_stagger_dur > 0 ? $sgs_nm_stagger_dur : $sgs_nm_panel_in ) . 'ms;'
		. '--sgs-nbm-stagger-dist:' . $sgs_nm_stagger_d . 'px;'
		. ( $sgs_nm_stagger_max > 0 ? '--sgs-nbm-stagger-max:' . $sgs_nm_stagger_max . 'ms;' : '' );
}
$css .= $uid_sel . '{' . $sgs_nm_panel_vars . '}';

$css .= sgs_scrim_render(
	$attributes,
	$uid,
	array(
		'open'     => '.' . $uid . ' [data-sgs-mega-trigger][aria-expanded="true"]',
		'z_index'  => 'calc(var(--sgs-header-z, 100) - 1)',
		'enter_ms' => $sgs_nm_panel_in,
		'exit_ms'  => $sgs_nm_panel_out,
		'easing'   => $sgs_nm_panel_ease,
	)
);

if ( '' !== $css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( $css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via the shared helpers + esc_attr/sanitize_html_class fragments above; wp_strip_all_tags guards </style>.
}

// STOP-21 / DONE-item-2: the block's own scoped `<style>` targets `.$uid …`, so
// the SAME `$uid` MUST ride onto the rendered element as a CLASS or every scoped
// rule above is a silent render no-op. `sgs-nav-bar-menu` is this block's own
// BEM root; `$uid` is the per-instance scope.
$nav_root_classes = array( 'sgs-nav-bar-menu', $uid );
if ( $sgs_nm_stagger > 0 ) {
	$nav_root_classes[] = 'sgs-nav-bar-menu--panel-stagger';
}

// This <nav> IS the navigation landmark, so the accessible name belongs here —
// on the element carrying the role. Exactly one <nav> per instance and exactly
// one label, so the two cannot drift (FR-36-10 / FR-36-11).
//
// ⚠ $nav_label and $anchor_val are passed RAW. get_block_wrapper_attributes()
// runs esc_attr() on every value it renders — escaping once here is correct,
// not an omission.
$nav_root_attrs = array(
	'class'      => implode( ' ', $nav_root_classes ),
	'aria-label' => $nav_label,
);

// `anchor: true` is declared in block.json. Rendering block-private means
// wiring the id explicitly. Miss this and every Table-of-Contents / jump link
// targeting this nav breaks SILENTLY — no gate catches an unresolvable
// fragment. Pattern mirrors quote/render.php.
if ( '' !== $anchor_val ) {
	$nav_root_attrs['id'] = $anchor_val;
}

printf(
	'<nav %1$s>%2$s</nav>',
	get_block_wrapper_attributes( $nav_root_attrs ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() esc_attr()s every value and returns a ready-to-print attribute string.
	$inner_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from pre-sanitised/escaped fragments (esc_url/esc_attr/esc_html per link).
);
