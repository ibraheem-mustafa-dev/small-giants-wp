<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- dynamic block render template; helper class below is rendered inline, its namespace lives in the block slug.
/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — server-side render. (D1059 split)
 *
 * This is the site's VISIBLE menu BAR: a FLAT horizontal row of real <a href>
 * links on desktop; below `collapsePoint` it becomes a burger that opens
 * `sgs/nav-drawer` through the shared `store('sgs/nav')` Interactivity store
 * (src/shared/nav-interactivity/store.js). Submenus (one level deep,
 * MAX_SUBMENU_DEPTH = 1) and mega panels ARE rendered — dropdown roots,
 * sub-toggles and `sgs_mega_render_panel_content()` panels, all driven by the
 * shared `sgs/mega` interactivity store.
 *
 * Split from the former conflated `sgs/nav-menu` (D1059, 2026-09-14): this
 * block renders ONLY the bar fork. The in-drawer accordion/drill-down list is
 * the separate `sgs/nav-drawer-menu` block — there is no runtime fork here
 * any more (`isDrawerInstance` / `$sgs_nm_is_drawer_list` are gone by
 * construction, not by branch). The burger is ALWAYS emitted by this block.
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
// SGS block PHP to run in a request (the bar sits in the site header, on
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
require_once dirname( __DIR__, 3 ) . '/includes/sweep-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-item-border-featured-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-trigger-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-submenu-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-submenu-link-css.php';
// class-sgs-container-wrapper.php is deliberately NOT required — this block
// renders its root block-private since D539 (see §5). Re-adding the require
// would reintroduce a dependency nothing uses.

if ( ! function_exists( 'sgs_nav_shared_typography_hover_rule' ) ) {
	/**
	 * BLOCK-PRIVATE hover-typography emitter (Spec 41 FR-41-21, owner ruling 2).
	 *
	 * ⛔ Declared HERE, in this block's own render.php, NOT in `includes/` —
	 * `includes/` is the SHARED folder even for a file only this block requires,
	 * and `TypographyControls`' `showHover` trio is block-private code. It is
	 * wrapped in a `function_exists()` guard because a top-level function
	 * declaration in a per-instance render.php fatals on a page's SECOND
	 * instance, and the sibling `sgs/nav-menu` (retired at Step 5) declares the
	 * identical function under the same name/guard during the migration window.
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
				 * dropdowns: this timing governs every existing nav, and a design
				 * doc asserting 500 was checked against the code rather than
				 * believed.
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
		 * refactor) -- render.php now calls sgs_nav_bar_menu_render_items() as a
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
$uid        = 'sgs-nav-bar-menu-' . substr( md5( wp_json_encode( $attributes ) . $anchor_val ), 0, 8 );
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
 * ── 2b. Split-nav slicing (Step 6, D1059). ──────────────────────────────────
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

// ── D1059 split: this block ALWAYS renders the flat bar. ────────────────────
// The former runtime fork (`sgs/navDrawerSubmenuModel` context /
// `$sgs_nm_is_drawer_list`) is gone by construction: the in-drawer
// accordion/drill-down list is the separate `sgs/nav-drawer-menu` block,
// which calls `sgs_nav_drawer_menu_render_items()` in its OWN render.php.
// This block never receives drawer context and never needs to detect what it
// is — it IS the bar. (`$flat_items` may be a SLICE of the full menu — see
// §2b above — but the render path itself never forks on that.)
$items_html = sgs_nav_bar_menu_render_items( $flat_items, $featured_ids, $uid, $bar_renderer->get_submenu() );

if ( '' === $items_html ) {
	return '';
}

// ── 3. Burger + drawer-toggle context. ──────────────────────────────────────
$drawer_ref = isset( $attributes['drawerRef'] ) && '' !== $attributes['drawerRef']
	? sanitize_html_class( (string) $attributes['drawerRef'] )
	: 'sgs-nav-drawer';

// `showBurger` (Step 6, D1059) — the right-hand half of a split menu (§2b)
// suppresses its own burger; the left-hand half keeps the real one. Default
// TRUE so every pre-Step-6 instance (and a fresh single, unsplit instance)
// is unaffected.
$sgs_nm_show_burger = ! isset( $attributes['showBurger'] ) || (bool) $attributes['showBurger'];

/*
 * ── "A burger asked for a drawer" (W2-a). ────────────────────────────────────
 *
 * When shown, the burger below is always emitted — CSS at `collapsePoint`
 * decides whether it is visible, so the button is in the DOM on every device
 * tier. Record the id it controls so Sgs_Drawer_Render can render the site's
 * Active menu drawer at `wp_footer` ONLY on pages that have something to open
 * it. A page with no burger (either no instance of this block, or every
 * instance has `showBurger` off) keeps byte-identical output.
 */
if ( $sgs_nm_show_burger && class_exists( '\\SGS\\Blocks\\Sgs_Drawer_Render' ) ) {
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
	: sgs_nav_shared_icon_markup(
		$attributes['triggerIcon'] ?? null,
		array(
			'source' => 'lucide',
			'name'   => 'menu',
		)
	);

/*
 * G4 — is the resolved glyph the UNMODIFIED default ({source:lucide,name:menu})?
 * Gates the burger↔X morph markup in sgs_nav_bar_menu_burger_toggle_markup(): a
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

// The burger toggle used to be ALWAYS emitted by this block, back when only
// one instance of it could ever exist on a page. Step 6 (D1059, split-nav)
// makes that no longer true: two instances can share one menu either side of
// a logo, and only ONE of them should own the burger — `$sgs_nm_show_burger`
// (§3 above) is that gate. It never runs as the drawer's own internal list
// (that is `sgs/nav-drawer-menu`'s job) — contrast the pre-split
// `$sgs_nm_is_drawer_list ? '' : …` fork, which this is not a revival of.
$toggle_html = $sgs_nm_show_burger ? sgs_nav_bar_menu_burger_toggle_markup(
	$burger_context_attr,
	$drawer_ref,
	$burger_icon,
	$trigger_mode,
	$trigger_label,
	$burger_aria_attr,
	$burger_magnet_attrs,
	$burger_icon_is_default
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
 * Split-nav landmark-unique guard (Step 6, D1059). Two split instances of
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

// D1059 split (Step 3, 2026-09-14): `sgs-nav-bar-menu__bar` is this block's
// own separate BEM root -- no longer shared with the drawer fork. The former
// `--drawer` modifier + `data-sgs-nav-submenu-model` attribute belonged
// exclusively to the in-drawer render path ($sgs_nm_is_drawer_list), which no
// longer exists on this block — that branch, and the modifier class, are gone
// here (they live on `sgs/nav-drawer-menu`'s own render.php instead).
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
// context — the drawer's own render path is `sgs/nav-drawer-menu` now), so
// the drawer-bg-aware submenu contrast parameter is always ''.
$css = '';

/*
 * `justifyContent` (Step 6, D1059) — a plain restore, not new plumbing:
 * `style.css`'s `:where(.sgs-nav-bar-menu){justify-content:space-between}`
 * was already written (D539) to yield to an attribute-driven rule at normal
 * specificity the moment one exists. Whitelisted rather than merely
 * `esc_attr()`'d — this concatenates straight into a raw `<style>` block, not
 * an HTML attribute, and the value can arrive via a programmatic writer (the
 * cloning converter, WP-CLI) that bypasses the editor's `enum` validation.
 */
$sgs_nm_justify_allowed = array( 'flex-start', 'center', 'flex-end', 'space-between', 'space-around' );
$sgs_nm_justify_content = (string) ( $attributes['justifyContent'] ?? '' );
if ( in_array( $sgs_nm_justify_content, $sgs_nm_justify_allowed, true ) ) {
	$css .= $uid_sel . '{justify-content:' . $sgs_nm_justify_content . '}';
}

$css .= sgs_nav_shared_item_state_css( $attributes, $uid_sel, 'sgs-nav-bar-menu', $sgs_nm_treatments );
$css .= sgs_nav_bar_menu_trigger_css( $attributes, $uid_sel, $sgs_nm_treatments, $trigger_mode );
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
// The unreachable attributes were DELETED from block.json, not reproduced.
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
// rule above is a silent render no-op. `sgs-nav-bar-menu` is this block's own
// BEM root (D1059 split, Step 3); `$uid` is the per-instance scope.
$nav_root_classes = array( 'sgs-nav-bar-menu', $uid );

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
