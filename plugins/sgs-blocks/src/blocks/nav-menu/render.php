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

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-typography.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-wcag.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-nav-menu-source.php';
// class-sgs-container-wrapper.php is deliberately NOT required — this block
// renders its root block-private since D539 (see §5). Re-adding the require
// would reintroduce a dependency nothing uses.

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
		 *                             caret (bool), close_grace (int ms).
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
			);
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
						$mega_ctx     = wp_interactivity_data_wp_context(
							array(
								'isOpen'      => false,
								'megaId'      => (string) (int) $item['object_id'],
								'intentDelay' => 300,
								'closeGrace'  => 170,
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
							$mega_ctx, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_interactivity_data_wp_context() self-escapes.
							esc_attr( $panel_dom_id ),
							esc_html( $item['label'] ),
							$caret, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
							$panel_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- do_blocks() output; already-safe rendered block HTML. The "View all" fallback (when the panel has no CTA of its own) is INSIDE this string, injected via sgs_mega_panel_footer_html.
						);
						continue; // Handled this item.
					}
					// Panel resolved null (trashed/missing/recursion) — fall through to plain link (FR-36-9a degrade).
				}

				/*
				 * DROPDOWN — a menu item that has children and is not a mega menu.
				 *
				 * Reuses the sgs/mega interactivity store wholesale: the same three
				 * hooks (interactive root, [data-sgs-mega-trigger],
				 * [data-sgs-mega-panel]) buy hover-intent, keyboard, ESC,
				 * focus-return, single-open and the WCAG 1.4.13 behaviours with no
				 * new JS — mega-disclosure.js carries zero BEM selectors, so it is
				 * genuinely markup-agnostic rather than mega-specific.
				 *
				 * The root element must PHYSICALLY WRAP both trigger and panel: the
				 * hover bridge is DOM containment (mouseenter/mouseleave on the
				 * root), not geometry, so a sibling panel would close the moment the
				 * pointer left the trigger.
				 */
				$children = isset( $item['children'] ) && is_array( $item['children'] ) ? $item['children'] : array();
				if ( $children ) {
					$child_html = '';
					foreach ( $children as $child ) {
						if ( '' === (string) ( $child['label'] ?? '' ) ) {
							continue;
						}

						/*
						 * data-sgs-nav-path is REQUIRED on child links, not
						 * decorative: markCurrentPage() (view.js) keys the
						 * current-page state off it, so a child without it can
						 * never highlight as current.
						 */

						/*
						 * A CHILD can be featured too (Bean, 2026-07-31 — the
						 * "Send to ward"-style priority item). Same
						 * featuredItemIds check the top-level branch uses, so
						 * one mechanism covers both levels rather than a
						 * parallel one for children.
						 */
						$child_featured = in_array( $child['identifier'], $this->featured_ids, true );
						$child_html    .= sprintf(
							'<li class="sgs-nav-menu__subitem%s"><a class="sgs-nav-menu__sublink" href="%s" data-sgs-nav-path="%s">%s</a></li>',
							$child_featured ? ' sgs-nav-menu__subitem--featured' : '',
							esc_url( $child['url'] ),
							esc_attr( wp_parse_url( $child['url'], PHP_URL_PATH ) ?? '' ),
							esc_html( $child['label'] )
						);
					}

					/*
					 * Every child had an empty label — degrade to a plain link,
					 * mirroring the mega branch's own null-panel degrade above. A
					 * trigger that opens an empty panel is worse than no trigger:
					 * the client sees a caret that does nothing.
					 */
					if ( '' !== $child_html ) {
						$sub_dom_id = $this->uid . '-sub-' . substr( md5( $item['identifier'] ), 0, 8 );
						$sub_ctx    = wp_interactivity_data_wp_context(
							array(
								'isOpen'      => false,
								'megaId'      => $sub_dom_id,
								'intentDelay' => 300,
								'closeGrace'  => $this->submenu['close_grace'],
							)
						);
						$sub_caret  = '';
						if ( $this->submenu['caret'] && function_exists( 'sgs_get_lucide_icon' ) ) {
							$sub_caret = '<span class="sgs-nav-menu__caret" aria-hidden="true">'
								. sgs_get_lucide_icon( 'chevron-down' ) . '</span>';
						}

						/*
						 * A parent with no URL of its own renders a <button>, not
						 * <a href="#">. An href="#" trigger jumps the page to the
						 * top on click and lies to assistive tech about being a
						 * link. A parent WITH a URL keeps its link (so "Products"
						 * still navigates) and gets a separate adjacent toggle.
						 */
						if ( ! empty( $item['has_url'] ) ) {
							$trigger_html = sprintf(
								'<a class="sgs-nav-menu__link" href="%s" data-sgs-nav-path="%s"><span class="sgs-nav-menu__link-text sgs-nav-menu__magnet-target">%s</span></a>'
								. '<button type="button" class="sgs-nav-menu__subtoggle" data-sgs-mega-trigger aria-expanded="false" aria-controls="%s" data-wp-bind--aria-expanded="context.isOpen" data-wp-on--click="actions.toggle" data-wp-on--keydown="actions.triggerKeydown">'
								. '<span class="screen-reader-text">%s</span>%s</button>',
								esc_url( $item['url'] ),
								esc_attr( wp_parse_url( $item['url'], PHP_URL_PATH ) ?? '' ),
								esc_html( $item['label'] ),
								esc_attr( $sub_dom_id ),
								/* translators: %s is the parent menu item's label. */
								esc_html( sprintf( __( 'Show submenu for %s', 'sgs-blocks' ), $item['label'] ) ),
								$sub_caret // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
							);
						} else {
							$trigger_html = sprintf(
								'<button type="button" class="sgs-nav-menu__link sgs-nav-menu__subtoggle" data-sgs-mega-trigger aria-expanded="false" aria-controls="%s" data-wp-bind--aria-expanded="context.isOpen" data-wp-on--click="actions.toggle" data-wp-on--keydown="actions.triggerKeydown">'
								. '<span class="sgs-nav-menu__link-text sgs-nav-menu__magnet-target">%s</span>%s</button>',
								esc_attr( $sub_dom_id ),
								esc_html( $item['label'] ),
								$sub_caret // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
							);
						}

						$html .= sprintf(
							'<li class="%1$s sgs-nav-menu__item--has-submenu">'
							. '<div class="sgs-nav-menu__submenu-root" data-sgs-nav-disclosure="dropdown" data-sgs-nav-submenu-align="%2$s" data-wp-interactive="sgs/mega" %3$s data-wp-on--mouseenter="actions.enterBridge" data-wp-on--mouseleave="actions.leaveBridge" data-wp-watch="callbacks.watchOpenState">'
							. '%4$s'
							. '<div id="%5$s" class="sgs-nav-menu__submenu-wrap" data-sgs-mega-panel data-wp-on--keydown="actions.panelKeydown">'
							. '<ul class="sgs-nav-menu__submenu">%6$s</ul>'
							. '</div>'
							. '</div></li>',
							esc_attr( $li_class ),
							esc_attr( $this->submenu['align'] ),
							$sub_ctx, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_interactivity_data_wp_context() self-escapes.
							$trigger_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled above from esc_url/esc_attr/esc_html parts.
							esc_attr( $sub_dom_id ),
							$child_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled above from esc_url/esc_attr/esc_html parts.
						);
						continue;
					}
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

		/**
		 * Render the flat items as a REAL nested vertical list for the drawer
		 * (Spec 36 FR-36-6 — the flat-bar collapse to one link, above, is
		 * deliberately Phase-1-only for the desktop/burger bar; the drawer gets
		 * a genuine nested submenu).
		 *
		 * Both `accordion` and `drill-down` share IDENTICAL server markup — a
		 * `<details name>` exclusive accordion (the spec's own stated no-JS
		 * fallback for drill-down). `drill-down`'s extra behaviour (sliding to a
		 * full sub-panel with Back) is a JS-only progressive enhancement layered
		 * on top by `nav-drilldown.js`; nothing here differs between the two
		 * models except the `data-sgs-nav-submenu-model` flag consumed by that
		 * script and by style.css.
		 *
		 * A mega-menu item degrades to a plain link inside the drawer (its own
		 * `url`, else '#') rather than emitting the desktop hover-disclosure
		 * markup `render_items()` builds — that markup has no touch equivalent
		 * and dragging it into a `<details>` would need its own JS-driven mega-
		 * in-drawer build. Declared here, not silently dropped: FR-36-5 already
		 * names "the same panel renders inside the drawer" as a FUTURE item this
		 * task does not build.
		 *
		 * @param array  $items Flattened items from flatten().
		 * @param string $model 'accordion' or 'drill-down' (validated by caller).
		 * @param string $uid   The block instance's uid (accordion `name=` scope
		 *                      + sub-panel DOM id namespace, mirrors the mega
		 *                      panel's own instance-scoping).
		 * @return string HTML <li> elements.
		 */
		public function render_items_drawer( array $items, string $model, string $uid ): string {
			$html = '';
			foreach ( $items as $item ) {
				$is_featured = in_array( $item['identifier'], $this->featured_ids, true );
				$li_class    = 'sgs-nav-menu__item sgs-nav-menu__item--drawer' . ( $is_featured ? ' sgs-nav-menu__item--featured' : '' );

				// Mega item — documented degrade (see docblock above).
				if ( 'sgs_mega_menu' === ( $item['type'] ?? '' ) ) {
					$html .= sprintf(
						'<li class="%1$s"><a class="sgs-nav-menu__link" href="%2$s" data-sgs-nav-path="%3$s"><span class="sgs-nav-menu__link-text">%4$s</span></a></li>',
						esc_attr( $li_class ),
						esc_url( $item['url'] ),
						esc_attr( wp_parse_url( $item['url'], PHP_URL_PATH ) ?? '' ),
						esc_html( $item['label'] )
					);
					continue;
				}

				$children = isset( $item['children'] ) && is_array( $item['children'] ) ? $item['children'] : array();
				if ( $children ) {
					$child_html = '';
					foreach ( $children as $child ) {
						if ( '' === (string) ( $child['label'] ?? '' ) ) {
							continue;
						}
						$child_featured = in_array( $child['identifier'], $this->featured_ids, true );
						$child_html    .= sprintf(
							'<li class="sgs-nav-menu__subitem%1$s"><a class="sgs-nav-menu__sublink" href="%2$s" data-sgs-nav-path="%3$s">%4$s</a></li>',
							$child_featured ? ' sgs-nav-menu__subitem--featured' : '',
							esc_url( $child['url'] ),
							esc_attr( wp_parse_url( $child['url'], PHP_URL_PATH ) ?? '' ),
							esc_html( $child['label'] )
						);
					}

					// Every child had an empty label — degrade to a plain link
					// (mirrors render_items()'s own null-panel/empty-children degrade).
					if ( '' === $child_html ) {
						$html .= sprintf(
							'<li class="%1$s"><a class="sgs-nav-menu__link" href="%2$s" data-sgs-nav-path="%3$s"><span class="sgs-nav-menu__link-text">%4$s</span></a></li>',
							esc_attr( $li_class ),
							esc_url( $item['url'] ),
							esc_attr( wp_parse_url( $item['url'], PHP_URL_PATH ) ?? '' ),
							esc_html( $item['label'] )
						);
						continue;
					}

					$details_id = $uid . '-drill-' . substr( md5( $item['identifier'] ), 0, 8 );
					$caret      = function_exists( 'sgs_get_lucide_icon' ) ? sgs_get_lucide_icon( 'chevron-down' ) : '';

					/*
					 * Split parent-link from expander (FR-36-6 — "split parent-link
					 * from expander"). A parent WITH a URL keeps a real, separately
					 * clickable link AND an adjacent expander toggle (mirrors the
					 * bar's own `sgs-nav-menu__subtoggle` split); a parent with NO
					 * URL of its own has nothing to link to, so its label renders as
					 * plain text next to the expander instead of a dead `href="#"`.
					 */
					if ( ! empty( $item['has_url'] ) ) {
						$label_html = sprintf(
							'<a class="sgs-nav-menu__link" href="%1$s" data-sgs-nav-path="%2$s"><span class="sgs-nav-menu__link-text">%3$s</span></a>',
							esc_url( $item['url'] ),
							esc_attr( wp_parse_url( $item['url'], PHP_URL_PATH ) ?? '' ),
							esc_html( $item['label'] )
						);
					} else {
						$label_html = sprintf(
							'<span class="sgs-nav-menu__link sgs-nav-menu__link--label"><span class="sgs-nav-menu__link-text">%s</span></span>',
							esc_html( $item['label'] )
						);
					}

					$html .= sprintf(
						'<li class="%1$s sgs-nav-menu__item--has-submenu">'
						. '<div class="sgs-nav-menu__accordion-row">'
						. '%2$s'
						. '<details class="sgs-nav-menu__accordion" name="sgs-nav-menu-accordion-%3$s" id="%4$s" data-sgs-nav-parent-label="%5$s" data-sgs-nav-back-label="%6$s">'
						. '<summary class="sgs-nav-menu__accordion-summary" aria-label="%7$s"><span class="sgs-nav-menu__caret" aria-hidden="true">%8$s</span></summary>'
						. '<ul class="sgs-nav-menu__submenu" data-sgs-drill-panel>%9$s</ul>'
						. '</details>'
						. '</div></li>',
						esc_attr( $li_class ),
						$label_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled above from esc_url/esc_attr/esc_html parts.
						esc_attr( $uid ),
						esc_attr( $details_id ),
						esc_attr( $item['label'] ),
						/* translators: %s is the parent menu item's label — the drill-down mode's Back button text (JS-injected; nav-drilldown.js reads this attribute rather than hardcoding English). */
						esc_attr( sprintf( __( 'Back to %s', 'sgs-blocks' ), $item['label'] ) ),
						/* translators: %s is the parent menu item's label. */
						esc_attr( sprintf( __( 'Show submenu for %s', 'sgs-blocks' ), $item['label'] ) ),
						$caret, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
						$child_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled above from esc_url/esc_attr/esc_html parts.
					);
					continue;
				}

				$html .= sprintf(
					'<li class="%1$s"><a class="sgs-nav-menu__link" href="%2$s" data-sgs-nav-path="%3$s"><span class="sgs-nav-menu__link-text">%4$s</span></a></li>',
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
$submenu_model_ctx = $block->context['sgs/navDrawerSubmenuModel'] ?? null;
if ( is_string( $submenu_model_ctx ) && in_array( $submenu_model_ctx, array( 'accordion', 'drill-down' ), true ) ) {
	$items_html    = $bar_renderer->render_items_drawer( $flat_items, $submenu_model_ctx, $uid );
	$sgs_nm_is_drawer_list = true;
} else {
	$items_html    = $bar_renderer->render_items( $flat_items );
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

$burger_icon = sgs_get_lucide_icon( 'menu' );

// wp_interactivity_data_wp_context() is the WP-canonical compact single-quoted
// emitter (avoids the &quot; bloat get_block_wrapper_attributes() would add) —
// mirrors the SGS_Container_Wrapper opts doc for `extra_attr_html`.
$burger_context_attr = wp_interactivity_data_wp_context(
	array(
		'isOpen'    => false,
		'drawerRef' => $drawer_ref,
	)
);

$toggle_html = sprintf(
	'<div class="sgs-nav-menu__toggle-wrap" data-wp-interactive="sgs/nav" %s data-wp-init="callbacks.pruneDanglingAriaControls">' .
	'<button type="button" class="sgs-nav-menu__burger" data-wp-on--click="actions.toggleDrawer" data-wp-bind--aria-expanded="state.isOpen" aria-controls="%s" aria-label="%s">%s</button>' .
	'</div>',
	$burger_context_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_interactivity_data_wp_context() self-escapes.
	esc_attr( $drawer_ref ),
	esc_attr__( 'Open menu', 'sgs-blocks' ),
	$burger_icon // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
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
$indicator_colour_gradient = sgs_css_gradient_value( $attributes['indicatorColourGradient'] ?? '' );
$magnet_enabled    = ! empty( $attributes['itemMagnetEnabled'] );
$bar_data_attrs    = '';
$bar_data_attrs   .= 'pill' === $indicator_style ? ' data-sgs-nav-indicator' : '';
$bar_data_attrs   .= $magnet_enabled ? ' data-magnet' : '';

// In-drawer nested list (FR-36-6): a distinct BEM modifier class + the
// resolved submenu model as a data attribute — style.css's structural
// accordion/drill-down rules key off both, and nav-drilldown.js (view.js)
// reads the data attribute to decide whether to enhance at all.
$bar_class = 'sgs-nav-menu__bar';
if ( $sgs_nm_is_drawer_list ) {
	$bar_class       .= ' sgs-nav-menu__bar--drawer';
	$bar_data_attrs  .= ' data-sgs-nav-submenu-model="' . esc_attr( $submenu_model_ctx ) . '"';
}

$bar_html = sprintf(
	'<ul class="%3$s"%2$s>%1$s</ul>',
	$items_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $items_html built from esc_url/esc_html/esc_attr fragments.
	$bar_data_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from fixed literal strings + esc_attr()'d submenu model, no unescaped user input.
	esc_attr( $bar_class )
);

// ── 4. Scoped CSS assembly (no-inline, Spec 32). ────────────────────────────
$css      = '';
$link_sel = $uid_sel . ' .sgs-nav-menu__link';

// 4a. Item typography — flat scalar model, shared helper (matches
// TypographyControls' attribute contract: {prefix}FontSize/Unit/Tablet/Mobile).
$css .= sgs_typography_css_rule( $attributes, 'item', $link_sel );

/*
 * 4a-ii. Nav CONTAINER appearance.
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
$nav_bg_gradient = sgs_css_gradient_value( $attributes['navBgGradient'] ?? '' );
$nav_colour   = isset( $attributes['navColour'] ) ? (string) $attributes['navColour'] : '';
// D956 -- sibling gradient wins when set+valid. Safe unconditionally: navBg
// already lives on a SEPARATE `::after` layer below, never $uid_sel itself.
$nav_colour_gradient  = isset( $attributes['navColourGradient'] ) ? (string) $attributes['navColourGradient'] : '';
$nav_colour_effective = sgs_resolve_text_colour_or_gradient( $nav_colour, $nav_colour_gradient );
$nav_bg_hover = isset( $attributes['navBgHover'] ) ? (string) $attributes['navBgHover'] : '';

// bg_layer=true equivalent (D940 batch): background moves onto a `::after`
// layer so `navColour` is free of a same-selector background for a future
// navColourGradient sibling. $uid_sel is not positioned in style.css, so the
// full helper (position:relative + isolation:isolate) is safe here.
$nav_bg_decl       = sgs_background_paint_decl( $nav_bg, $nav_bg_gradient );
$nav_bg_hover_decl = '' !== $nav_bg_hover ? 'background-color:' . sgs_colour_value( $nav_bg_hover ) : '';
if ( '' !== $nav_bg_decl || '' !== $nav_bg_hover_decl ) {
	$css .= sgs_block_background_layer_css( $uid_sel, $nav_bg_decl, $nav_bg_hover_decl );
}
if ( '' !== $nav_colour_effective ) {
	$nav_colour_decl = sgs_text_colour_decl( $nav_colour_effective );
	if ( '' !== $nav_colour_decl ) {
		$css .= $uid_sel . '{' . $nav_colour_decl . ';}';
	}
	$css .= sgs_text_colour_gradient_fallback_rule( $uid_sel, $nav_colour_effective );
}
if ( '' !== ( $attributes['navColourHover'] ?? '' ) ) {
	$css .= sgs_hover_state_rules( "{$uid_sel}", "color:" . sgs_colour_value( $attributes['navColourHover'] ), ':focus-visible' );
}

// 4b. Item colours (resting). Base is `inherit` in style.css; an unset slug
// leaves the surrounding context's colour untouched (header/footer agnostic).
// Text and background are SEPARATE properties, each with its own Normal/Hover
// state (Spec 35 element-first): the pre-2026-07-20 model paired resting TEXT
// against hover BACKGROUND in one toggle, so an operator could never set a
// hover text colour at all — it was auto-computed and unreachable.
$item_colour = isset( $attributes['itemColour'] ) ? (string) $attributes['itemColour'] : '';
// D956 -- sibling gradient wins when set+valid. Safe unconditionally: itemBg
// (below) paints on a `::before` layer, never $link_sel itself (D942 recipe
// item 1's own comment at the itemBg block explains why ::after was unusable
// here). Hover ($item_fg_hover) is NOT wired to gradient: 'pill' hoverStyle
// auto-computes the text colour for WCAG contrast against itemBgHover, which
// a client-chosen gradient can't meaningfully replace -- separate decision.
$item_colour_gradient  = isset( $attributes['itemColourGradient'] ) ? (string) $attributes['itemColourGradient'] : '';
$item_colour_effective = sgs_resolve_text_colour_or_gradient( $item_colour, $item_colour_gradient );
$item_bg          = isset( $attributes['itemBg'] ) ? sanitize_html_class( $attributes['itemBg'] ) : '';
$item_bg_hex      = '' !== $item_bg ? sgs_resolve_palette_hex( $item_bg, '' ) : '';
$item_bg_gradient = sgs_css_gradient_value( $attributes['itemBgGradient'] ?? '' );

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

if ( '' !== $item_colour_effective ) {
	$item_colour_decl = sgs_text_colour_decl( $item_colour_effective );
	if ( '' !== $item_colour_decl ) {
		$css .= $link_sel . '{' . $item_colour_decl . ';}';
	}
	$css .= sgs_text_colour_gradient_fallback_rule( $link_sel, $item_colour_effective );
}
if ( '' !== $item_bg_hex || '' !== $item_bg_gradient ) {
	/*
	 * D942 recipe item 1 (`itemColour`): `itemColour`'s `color:` and
	 * `itemBg`'s `background-color:` used to paint the SAME selector
	 * ($link_sel) — a same-selector text/background collision that would
	 * block a future `itemColourGradient` sibling from using
	 * `background-clip:text` (it clips the element's whole background
	 * paint area, not just this declaration). The usual fix is
	 * `sgs_block_background_layer_css()`, which moves the paint onto a
	 * `::after` layer, but `$link_sel` already legitimately owns
	 * `::after` for the hoverStyle='underline' bar below — two
	 * pseudo-elements cannot share one selector. `::before` is confirmed
	 * unused anywhere else in this block's own CSS, so the background
	 * moves there instead (same shape, hand-composed for the free slot).
	 * Applies regardless of hoverStyle, same as the resting paint it
	 * replaces. `itemBgGradient` (below) is the sibling gradient wired
	 * 2026-09-04 — the second argument was previously a literal `null`
	 * placeholder.
	 */
	$item_bg_before_decl = sgs_background_paint_decl( $item_bg_hex, $item_bg_gradient );
	$css                .= $link_sel . '{position:relative;isolation:isolate;border-radius:' . esc_attr( (string) $item_radius ) . 'px;}';
	$css                .= $link_sel . '::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . $item_bg_before_decl . ';}';
}

// 4c. Hover / focus-visible / current-page state. [aria-current="page"] is set
// by view.js at mount (client-side), so the same treatment doubles as the
// current-page indicator — which is why an operator-chosen style matters.

/*
 * CURRENT-PAGE IS NO LONGER IN THIS LIST (Bean, 2026-07-31 — he opened the drawer
 * and found "the menu item that matches the current page has the exact same
 * styling as the hover/click"). Reusing the hover treatment as the current-page
 * indicator was deliberate once, but it means a visitor cannot tell WHERE THEY
 * ARE from WHAT THEY ARE POINTING AT. Different questions, different answers.
 * Hover/focus keeps the operator's chosen style; current-page gets its own.
 */
$hover_targets = array(
	$link_sel . ':hover',
	$link_sel . ':focus-visible',
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
	 * NOT `text-decoration:underline`: that hugs the baseline, breaks around
	 * descenders, spans only the glyphs (so every item's line is a different
	 * length), and cannot animate. A positioned bar spans the link box
	 * consistently and grows in from the left.
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
	 * Gradient sibling (D948 rollout). The ::after bar is a standalone
	 * decorative element — no other declaration paints this selector's
	 * background — so this is a safe direct swap, no ::after-layer split
	 * needed (contrast the itemBg/navBg cases where a text colour or a
	 * second background shares the element). Non-empty underlineColourGradient
	 * wins over the flat underlineColour; when both are empty the pre-existing
	 * 'currentColor' fallback is preserved.
	 */
	$underline_colour_gradient = sgs_css_gradient_value( $attributes['underlineColourGradient'] ?? '' );
	$u_paint_decl              = sgs_background_paint_decl( (string) ( $attributes['underlineColour'] ?? '' ), $underline_colour_gradient );
	if ( '' === $u_paint_decl ) {
		$u_paint_decl = 'background-color:' . $u_colour;
	}

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
	$css .= $link_sel . '::after{content:"";position:absolute;left:0;right:0;bottom:-' . esc_attr( (string) $u_offset ) . 'px;height:' . esc_attr( (string) $u_thickness ) . 'px;' . $u_paint_decl . ';transform:scaleX(0);transform-origin:left center;transition:transform ' . $transition_fast . ',background-color ' . $transition_fast . ';pointer-events:none;}';
	$css .= sgs_hover_state_rules( $link_sel, 'transform:scaleX(1);background-color:' . $u_colour_h, ':focus-visible', '::after' );
	if ( '' !== $item_fg_hover ) {
		$css .= sgs_hover_state_rules( $link_sel, 'color:' . sgs_colour_value( $item_fg_hover ), ':focus-visible' );
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
$featured_sel      = $uid_sel . ' .sgs-nav-menu__item--featured .sgs-nav-menu__link';
$featured_colour   = isset( $attributes['featuredColour'] ) && '' !== $attributes['featuredColour']
	? (string) $attributes['featuredColour']
	: 'accent';
// featuredColourGradient is the gradient sibling (mirrors burgerColourGradient,
// D956 rollout) -- resting LABEL form only (no featured_bg). Gradient wins when
// set+valid.
$featured_colour_gradient  = isset( $attributes['featuredColourGradient'] ) ? (string) $attributes['featuredColourGradient'] : '';
$featured_colour_effective = sgs_resolve_text_colour_or_gradient( $featured_colour, $featured_colour_gradient );
$featured_bg_slug  = isset( $attributes['featuredBg'] ) ? sanitize_html_class( $attributes['featuredBg'] ) : '';
$featured_bg_hex   = '' !== $featured_bg_slug ? sgs_resolve_palette_hex( $featured_bg_slug, '' ) : '';

$featured_radius       = isset( $attributes['featuredRadius'] ) ? (float) $attributes['featuredRadius'] : 8;
$featured_radius_hover = isset( $attributes['featuredRadiusHover'] ) && null !== $attributes['featuredRadiusHover']
	? (float) $attributes['featuredRadiusHover']
	: $featured_radius;
$featured_weight       = isset( $attributes['featuredFontWeight'] ) ? (int) $attributes['featuredFontWeight'] : 600;
$featured_weight_hover = isset( $attributes['featuredFontWeightHover'] ) && null !== $attributes['featuredFontWeightHover']
	? (int) $attributes['featuredFontWeightHover']
	: $featured_weight;

$featured_fg = '';
if ( '' !== $featured_bg_hex ) {
	$preferred_fg = sgs_resolve_palette_hex( $featured_colour, '' );
	$featured_fg  = sgs_wcag_preferred_text_colour_for_bg( $featured_bg_hex, $preferred_fg );
	$css         .= $featured_sel . '{background-color:' . esc_attr( $featured_bg_hex ) . ';color:' . esc_attr( $featured_fg ) . ';font-weight:' . esc_attr( (string) $featured_weight ) . ';border-radius:' . esc_attr( (string) $featured_radius ) . 'px;}';
} else {
	$featured_colour_decl = sgs_text_colour_decl( $featured_colour_effective );
	if ( '' !== $featured_colour_decl ) {
		$css .= $featured_sel . '{' . $featured_colour_decl . ';font-weight:' . esc_attr( (string) $featured_weight ) . ';}';
	}
	$css .= sgs_text_colour_gradient_fallback_rule( $featured_sel, $featured_colour_effective );
}

/*
 * Republish the RESOLVED featured values as custom properties so a featured
 * SUBMENU item inherits exactly what the featured bar item uses (Bean,
 * 2026-07-31 — the "Send to ward" priority item must look like itself wherever
 * it appears, bar or burger drawer).
 *
 * Deliberately reuses the values computed ABOVE rather than re-reading the
 * attributes: `$featured_fg` comes from sgs_wcag_preferred_text_colour_for_bg(),
 * which picks a foreground that actually passes contrast against the chosen
 * background. Re-deriving it here would risk a second, less accessible answer
 * for the same setting.
 */
$sgs_nm_featured_vars = '--sgs-nm-featured-weight:' . (int) $featured_weight . ';';
if ( '' !== $featured_bg_hex ) {
	// PILL form — carry the WCAG-resolved foreground computed above, verbatim.
	$sgs_nm_featured_vars .= '--sgs-nm-featured-bg:' . $featured_bg_hex . ';'
		. '--sgs-nm-featured-colour:' . $featured_fg . ';'
		. '--sgs-nm-featured-radius:' . (float) $featured_radius . 'px;';
} elseif ( '' !== $featured_colour ) {
	// LABEL form — no background was chosen, so the submenu row stays
	// transparent rather than inventing a pill the bar itself does not have.
	//
	// Deliberately flat-only (featuredColourGradient is NOT read here). The
	// consumer of --sgs-nm-featured-colour, render.php's
	// `.sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink` rule, paints
	// BOTH `color:var(--sgs-nm-featured-colour,…)` AND
	// `background:var(--sgs-nm-featured-bg,…)` on the SAME selector, so
	// background-clip:text would clip that background paint too --
	// textSharesElementWithBackground() precondition failure (see
	// CLAUDE.md "Colour EMISSION helpers" + submenuColourGradient's block.json
	// note for the identical precedent on this same file's sublink element).
	// Fixing this needs the submenu featured background moved onto its own
	// ::after layer (sgs_block_background_layer_css()) first -- out of scope
	// for this pass.
	$sgs_nm_featured_vars .= '--sgs-nm-featured-colour:' . sgs_colour_value( $featured_colour ) . ';'
		. '--sgs-nm-featured-bg:transparent;';
}
$css .= $uid_sel . '{' . $sgs_nm_featured_vars . '}';

/*
 * 4d-ii. Featured HOVER state. The featured item is the one nav item an
 * operator most wants to stand out (it is usually the "Order now" / "Book"
 * call to action). It carries its own Normal|Hover pair for both text and
 * background, resolved by the same contrast helper as the resting state so
 * the operator's colour wins whenever it is readable.
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
	$css            .= sgs_hover_state_rules( $featured_sel, 'background-color:' . esc_attr( $featured_bg_hover_hex ) . ';color:' . esc_attr( $featured_fg_h ) . ';transition:background-color ' . $transition_fast . ',color ' . $transition_fast, ':focus-visible' );
} elseif ( '' !== $featured_fg_hover ) {
	$css .= sgs_hover_state_rules( $featured_sel, 'color:' . sgs_colour_value( $featured_fg_hover ) . ';transition:color ' . $transition_fast, ':focus-visible' );
}

// Featured pill SHAPE on hover — emitted only when it differs from the resting
// shape, so an unset hover control adds no rule at all rather than a no-op one.
if ( $featured_radius_hover !== $featured_radius ) {
	$css .= sgs_hover_state_rules( $featured_sel, 'border-radius:' . esc_attr( (string) $featured_radius_hover ) . 'px;transition:border-radius ' . $transition_fast, ':focus-visible' );
}
if ( $featured_weight_hover !== $featured_weight ) {
	$css .= sgs_hover_state_rules( $featured_sel, 'font-weight:' . esc_attr( (string) $featured_weight_hover ), ':focus-visible' );
}

// The featured item owns its own treatment — suppress the generic item
// underline bar on it so the two never render on top of each other.
$css .= $featured_sel . '::after{content:none;}';

// 4e. Burger colour / resting background / hover / size.
// D956 — burgerColourGradient is the gradient sibling (778879732 rollout,
// Phase 3); gradient wins when set+valid.
$burger_colour           = isset( $attributes['burgerColour'] ) ? (string) $attributes['burgerColour'] : '';
$burger_colour_gradient  = isset( $attributes['burgerColourGradient'] ) ? (string) $attributes['burgerColourGradient'] : '';
$burger_colour_effective = sgs_resolve_text_colour_or_gradient( $burger_colour, $burger_colour_gradient );
if ( '' !== $burger_colour_effective ) {
	$burger_colour_decl = sgs_text_colour_decl( $burger_colour_effective );
	if ( '' !== $burger_colour_decl ) {
		$css .= $uid_sel . ' .sgs-nav-menu__burger{' . $burger_colour_decl . ';}';
	}
	$css .= sgs_text_colour_gradient_fallback_rule( $uid_sel . ' .sgs-nav-menu__burger', $burger_colour_effective );
}
if ( '' !== ( $attributes['burgerColourHover'] ?? '' ) ) {
	$css .= sgs_hover_state_rules( "{$uid_sel} .sgs-nav-menu__burger", "color:" . sgs_colour_value( $attributes['burgerColourHover'] ), ':focus-visible' );
}

/*
 * RESTING background — the base for burgerHoverColour's hover state (Spec 35
 * FR-35-5 STATE_WITHOUT_BASE). Before this, the burger's hover background had
 * no resting counterpart: a client could style the hover fill but never the
 * button's own resting fill. style.css's `background:none` stays the
 * byte-identical default when this is left unset.
 */
$burger_bg = isset( $attributes['burgerBg'] ) ? (string) $attributes['burgerBg'] : '';
$burger_bg_gradient = sgs_css_gradient_value( $attributes['burgerBgGradient'] ?? '' );
if ( '' !== $burger_bg ) {
	$css .= $uid_sel . ' .sgs-nav-menu__burger{' . sgs_background_paint_decl( $burger_bg, $burger_bg_gradient ) . ';}';
}
$burger_hover_slug = isset( $attributes['burgerHoverColour'] ) ? (string) $attributes['burgerHoverColour'] : '';
if ( '' !== $burger_hover_slug ) {
	$css .= sgs_hover_state_rules( $uid_sel . ' .sgs-nav-menu__burger', 'background-color:' . sgs_colour_value( $burger_hover_slug ), ':focus-visible' );
}
$burger_size = sgs_css_length_value( $attributes['burgerSize'] ?? '44px' );
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
 * Panel anchoring (Bean design-gated — Gate-3 finding). The wrap anchors to
 * the BAR (`.sgs-nav-menu__bar` is already position:relative in style.css
 * for the indicator pill), not to the <li>-level hover bridge, so the panel
 * can exceed a single menu item's width. The draft designs (sites/Mega-menu
 * design + Indus Foods Mega Menu Design, both at
 * "position:absolute;top:100%;left:0;right:0" on the header container with
 * an 1120px-capped centred panel) anchor a wide centred band, so the wrap
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
 * ── DROPDOWN SUBMENU ────────────────────────────────────────────────────────
 *
 * Deliberately mirrors the mega panel's mechanism above rather than inventing a
 * parallel one: same display:none-until-open (keeps it out of the a11y tree
 * while the links stay in the server HTML for crawlers, FR-36-17), same
 * sibling-of-an-expanded-trigger selector, same no-JS-stays-closed progressive
 * enhancement (FR-36-7). Only the GEOMETRY differs — a dropdown aligns to its
 * trigger, a mega panel centres on the viewport.
 *
 * `left` defaults to 0 (start-aligned under the trigger) and is overridden by
 * mega-disclosure.js writing --sgs-mm-overflow-left as a custom-property VALUE.
 * Spec 32: a custom-property value is permitted; a direct style.left write is
 * not.
 */

/*
 * Operator values arrive as custom-property VALUES on the block's own scope, so
 * the rules below stay static and every override is one declaration deep
 * (Spec 32: overrides are custom-property values, never inline declarations).
 * Each is emitted ONLY when the operator actually set it — an unset control
 * writes no property at all, so the rule's own fallback applies rather than a
 * hardcoded value overriding it.
 */
$sgs_nm_submenu_vars = '';
foreach (
	array(
		'--sgs-nm-submenu-bg'        => '' !== (string) ( $attributes['submenuBg'] ?? '' )
			? sgs_colour_value( (string) $attributes['submenuBg'] )
			: '',
		'--sgs-nm-submenu-min-width' => sgs_css_length_value( $attributes['submenuMinWidth'] ?? '' ),
		'--sgs-nm-submenu-radius'    => sgs_css_length_value( $attributes['submenuRadius'] ?? '' ),
	) as $sgs_nm_var => $sgs_nm_val
) {
	if ( '' !== $sgs_nm_val ) {
		$sgs_nm_submenu_vars .= $sgs_nm_var . ':' . $sgs_nm_val . ';';
	}
}
if ( '' !== $sgs_nm_submenu_vars ) {
	$css .= $uid_sel . '{' . $sgs_nm_submenu_vars . '}';
}

$css .= $uid_sel . ' .sgs-nav-menu__submenu-root{position:relative;display:flex;align-items:center;}';
$css .= $uid_sel . ' .sgs-nav-menu__submenu-wrap{position:absolute;top:100%;left:var(--sgs-mm-overflow-left, 0);z-index:100;display:none;}';

/*
 * LIFT THE WHOLE ITEM while its submenu is open (Bean, 2026-07-31 — live-caught:
 * the site logo painted OVER the open dropdown; hit-testing the panel's centre
 * returned `sgs-responsive-logo__image--desktop`, not the panel).
 *
 * `z-index:100` on the panel alone is not enough. The panel sits inside
 * stacking contexts its own ancestors create — `.sgs-nav-menu__item{z-index:1}`,
 * `.sgs-nav-menu__bar{z-index:1}`, `.entry-content{z-index:1}` — so its 100 only
 * ranks it against its SIBLINGS, never against a later block that forms its own
 * context. Raising the ancestor that actually competes is the fix. Scoped with
 * `:has()` to the OPEN state so a closed menu leaves the page's stacking order
 * exactly as it was. A mega panel never hit this because it lives in the sticky
 * header, which already outranks page content.
 */
$css .= $uid_sel . ' .sgs-nav-menu__item--has-submenu:has([data-sgs-mega-trigger][aria-expanded="true"]){z-index:101;}';

/*
 * Lift every level we own, not just the item: `.sgs-nav-menu__bar{z-index:1}`
 * and the block root sit between the item and the page, so a 101 on the item
 * alone only ordered it against its own siblings.
 *
 * WHAT THIS DOES AND DOES NOT FIX (measured 2026-07-31, five sample points):
 *   HEADER placement — the normal one — is fully correct: the open panel is the
 *   topmost element at every sampled point, because the header template part is
 *   `position:sticky; z-index:100` and therefore outranks page content.
 *   A nav placed inside PAGE CONTENT is NOT fully fixed and cannot be from here:
 *   the theme's `.entry-content{position:relative;z-index:1}` creates a stacking
 *   context the block cannot escape, so the sticky header (z-index 100) and the
 *   footer's own positioned rows (z-index 1, later in document order) still
 *   paint over the panel. Raising `.entry-content` would put ALL page content
 *   above the sticky header, which is worse. Tracked as
 *   P-NAV-DROPDOWN-STACKING-IN-PAGE-CONTENT.
 * These lifts are still correct and worth keeping: they order the open panel
 * above rivals WITHIN the same content flow, and they revert the moment it closes.
 *
 * Each is keyed on `[data-sgs-mega-trigger][aria-expanded="true"]`, NOT on a bare
 * `[aria-expanded="true"]`. The burger button binds `aria-expanded` too
 * (render.php ~607, `data-wp-bind--aria-expanded="state.isOpen"`), so the bare
 * form also matched whenever the mobile DRAWER opened and lifted the whole nav
 * for a reason that had nothing to do with a dropdown. Council-caught.
 */
$css .= $uid_sel . ':has([data-sgs-mega-trigger][aria-expanded="true"]){position:relative;z-index:101;}';
$css .= $uid_sel . ' .sgs-nav-menu__bar:has([data-sgs-mega-trigger][aria-expanded="true"]){z-index:101;}';
$css .= $uid_sel . ' [data-sgs-mega-trigger][aria-expanded="true"] ~ .sgs-nav-menu__submenu-wrap{display:block;}';

/*
 * EVERY default here is a THEME TOKEN, never a literal (Bean, 2026-07-31 —
 * live-caught: the first cut hardcoded `#fff` and `rgba(0,0,0,.12)`, so the
 * panel painted white on a client whose surface token is `#fbf3dc` and ignored
 * the palette completely, in every style variation). A literal cannot follow a
 * per-client snapshot or a light/dark variation; a token does, for free. The
 * short literal after each token is a last-resort safety net for a theme that
 * defines no palette at all, NOT a design value.
 */
$css .= $uid_sel . ' .sgs-nav-menu__submenu{list-style:none;margin:0;padding:8px 0;'
	. 'min-width:var(--sgs-nm-submenu-min-width, 200px);'
	. 'background:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface-alt, var(--wp--preset--color--surface, #fff)));'
	. 'border:1px solid var(--wp--preset--color--border, transparent);'
	. 'border-radius:var(--sgs-nm-submenu-radius, var(--wp--custom--border-radius--medium, 8px));'
	. 'box-shadow:var(--wp--preset--shadow--raised, 0 4px 12px rgba(0,0,0,.1));}';

/*
 * submenuPadding — object box model {desktop:{top,right,bottom,left},
 * tablet:{…}, mobile:{…}}, migrated 2026-08-19 from a flat box object to
 * match nav-drawer's drawerPadding shape. Emitted as a tier-aware override
 * of the base rule above via the shared responsive-object helper (same
 * selector, same specificity, later in source order — so an unset tier
 * leaves the `8px 0` fallback in place rather than a custom property that
 * silently drops the value when read as the wrong shape).
 */
if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['submenuPadding'] ?? null ) ) {
	$css .= sgs_emit_responsive_css(
		$uid_sel . ' .sgs-nav-menu__submenu',
		array(
			array(
				'value'        => $attributes['submenuPadding'],
				'css'          => 'padding',
				'box'          => true,
				'unit_default' => 'px',
			),
		)
	);
}

$css .= $uid_sel . ' .sgs-nav-menu__subitem{margin:0;}';

/*
 * 44px min touch target (SGS baseline — beats WCAG 2.2's 24px) and a visible
 * focus ring. Never remove the outline without replacing it.
 */

/*
 * Submenu text defaults to the palette's LINK token (Bean-ruled, 2026-07-31).
 *
 * History, because this moved twice and the reasoning matters:
 *   1. `color:...,inherit` (the first cut) — out-specified the theme's global
 *      link rule and forced inherited body text, so the palette never applied
 *      at all. A straight bug; this is what Bean saw.
 *   2. the TEXT token — palette-driven and high-contrast, chosen because link
 *      pink `#e68a95` on surface `#fbf3dc` measures 2.25:1 against WCAG AA's
 *      4.5:1 floor.
 *   3. the LINK token — BEAN'S RULING, and what ships. He judged the pink-on-
 *      cream pairing easily legible and aesthetically intended, and ruled the
 *      AA floor not applicable to it. That is the owner's call on his own brand
 *      palette: a contrast ratio measures luminance distance, not whether text
 *      is discernible, and the framework should honour the palette the client
 *      chose rather than quietly substituting a different colour.
 * Practical upshot: submenu rows now inherit whatever the theme sets for links,
 * so they follow the palette AND every style variation for free. The related
 * `P-MAMAS-PRIMARY-CONTRAST` entry stands on its own merits and is unaffected.
 * The operator's own colour still overrides, below.
 */
$css .= $uid_sel . ' .sgs-nav-menu__sublink{display:flex;align-items:center;min-height:44px;padding:0 16px;'
	. 'text-decoration:none;white-space:nowrap;'
	. 'color:var(--wp--preset--color--primary, currentColor);}';
// D956 — submenuColourGradient is the gradient sibling (778879732 rollout,
// Phase 3); routed as a direct decl (not the custom-property chain above)
// because a `var(--x, …)` fed into a fixed `color:` declaration cannot
// switch to `background-image` for a gradient.
$submenu_colour_effective = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['submenuColour'] ?? '' ),
	(string) ( $attributes['submenuColourGradient'] ?? '' )
);
if ( '' !== $submenu_colour_effective ) {
	$submenu_colour_decl = sgs_text_colour_decl( $submenu_colour_effective );
	if ( '' !== $submenu_colour_decl ) {
		$css .= $uid_sel . ' .sgs-nav-menu__sublink{' . $submenu_colour_decl . ';}';
	}
	$css .= sgs_text_colour_gradient_fallback_rule( $uid_sel . ' .sgs-nav-menu__sublink', $submenu_colour_effective );
}
if ( '' !== ( $attributes['submenuColourHover'] ?? '' ) ) {
	$css .= sgs_hover_state_rules( "{$uid_sel} .sgs-nav-menu__sublink", "color:" . sgs_colour_value( $attributes['submenuColourHover'] ), ':focus-visible' );
}

/*
 * Hover/focus read as DESIGN, not as a stray underline: a tinted row plus a
 * brand-coloured ring. `currentColor` was wrong here — it resolves to the near
 * black of body text, which is what Bean saw as a "black underline".
 */
$css .= sgs_hover_guarded_rule( $uid_sel . ' .sgs-nav-menu__sublink:hover', 'background:var(--wp--preset--color--surface, rgba(0,0,0,.04))' );

/*
 * CURRENT-PAGE and FEATURED states for submenu items (Bean, 2026-07-31).
 *
 * Both reuse the SAME signals the top-level bar already uses — `aria-current`
 * (set client-side by markCurrentPage, because the page cache would serve a
 * stale server-baked value) and the `featuredItemIds` roster — rather than
 * inventing a submenu-only mechanism. Both default from PALETTE TOKENS, and
 * both fall back to the operator's own top-level choice when they have set one,
 * so a submenu inherits the look of the bar it belongs to instead of drifting.
 *
 * Everything here is scoped to the block uid, NOT to the bar, so it applies
 * identically to the drawer's own nav-menu instance — the burger menu holds a
 * second instance and must not need its own rules.
 */
$css .= $uid_sel . ' .sgs-nav-menu__sublink[aria-current="page"]{'
	. 'color:var(--sgs-nm-submenu-current-colour, var(--wp--preset--color--primary-dark, currentColor));'
	. 'font-weight:600;}';
$css .= $uid_sel . ' .sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink{'
	// Falls back to the operator's TOP-LEVEL featured colours before the token,
	// so a featured child matches the featured bar item by default.
	. 'color:var(--sgs-nm-featured-colour, var(--wp--preset--color--text-inverse, currentColor));'
	. 'background:var(--sgs-nm-featured-bg, var(--wp--preset--color--primary, transparent));'
	. 'font-weight:var(--sgs-nm-featured-weight, 600);'
	. 'border-radius:var(--sgs-nm-featured-radius, 4px);'
	. 'margin:4px 8px;}';
$css .= sgs_hover_guarded_rule(
	$uid_sel . ' .sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink:hover',
	'color:var(--sgs-nm-featured-colour-hover, var(--sgs-nm-featured-colour, var(--wp--preset--color--text-inverse, currentColor)));'
	. 'background:var(--sgs-nm-featured-bg-hover, var(--wp--preset--color--primary-dark, transparent))'
);
$css .= $uid_sel . ' .sgs-nav-menu__sublink:focus-visible{outline:2px solid var(--wp--preset--color--primary, currentColor);outline-offset:-2px;}';

/*
 * The toggle is a real button next to a real link when the parent has its own
 * URL, so it needs its own hit area rather than inheriting the link's.
 */
$css .= $uid_sel . ' .sgs-nav-menu__subtoggle{display:inline-flex;align-items:center;justify-content:center;'
	. 'min-width:44px;min-height:44px;background:none;border:0;padding:0;cursor:pointer;color:inherit;}';
$css .= $uid_sel . ' .sgs-nav-menu__subtoggle:focus-visible{outline:2px solid currentColor;outline-offset:-2px;}';

/*
 * In-drawer: the dropdown becomes an inline accordion, exactly as the mega
 * panel does below — an absolutely-positioned panel inside the drawer overlays
 * the items beneath it instead of pushing them down.
 */

/*
 * IN-DRAWER SUBMENU — real nested accordion/drill-down markup.
 *
 * `.sgs-nav-menu__submenu-root` / `-wrap` no longer render inside a drawer at
 * all — `render_items_drawer()` above emits `.sgs-nav-menu__accordion(-row)`
 * / `-summary` instead (a real `<details name>` exclusive accordion, per
 * FR-36-6), so the CSS that used to reflow those hover-disclosure classes for
 * the drawer context is gone with them. The structural accordion/drill-down
 * rules now live in nav-menu/style.css (they are NOT attribute-driven, so
 * they don't belong in this per-instance scoped block); `nav-drilldown.js`
 * layers the drill-down slide-to-sub-panel behaviour on top as progressive
 * enhancement over the identical no-JS accordion markup.
 *
 * Everything below still derives from `currentColor` so it works on ANY
 * drawer background — light, dark or brand — instead of assuming one; these
 * three rules survive because `.sgs-nav-menu__submenu` / `-sublink` /
 * `-subtoggle` are the SAME class names the new accordion markup reuses for
 * its own nested `<ul>`/`<a>` (the subtoggle rule is inert for a drawer
 * instance specifically — the bar's subtoggle split has no drawer
 * equivalent — but still serves the flat bar's own dropdowns, so it stays).
 */
$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__submenu{box-shadow:none;border:0;min-width:0;'
	. 'background:color-mix(in srgb, currentColor 6%, transparent);border-radius:0;padding:0;margin:0;}';
$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink{color:inherit;padding:0 16px 0 32px;'
	. 'border-left:2px solid color-mix(in srgb, currentColor 25%, transparent);}';
$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__subtoggle{color:inherit;}';
$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__item + .sgs-nav-menu__item,'
	. '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__subitem'
	. '{border-top:1px solid color-mix(in srgb, currentColor 15%, transparent);}';
$css .= sgs_hover_guarded_rule(
	'.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__link:hover,.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink:hover',
	'background:color-mix(in srgb, currentColor 12%, transparent)'
);

/*
 * CURRENT-PAGE gets its OWN persistent treatment, distinct from hover — see the
 * $hover_targets note above. Weight plus a solid left rule reads as "you are
 * here" whether or not the pointer is near it.
 */
$css .= $uid_sel . ' .sgs-nav-menu__link[aria-current="page"],'
	. $uid_sel . ' .sgs-nav-menu__sublink[aria-current="page"]{font-weight:600;}';
$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__link[aria-current="page"],'
	. '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink[aria-current="page"]'
	. '{border-left:3px solid currentColor;background:color-mix(in srgb, currentColor 8%, transparent);}';

/*
 * A mega-menu item degrades to a plain link inside the drawer
 * (render_items_drawer(), see its docblock) rather than rendering the mega
 * panel — so `.sgs-nav-menu__mega-panel-wrap` never appears inside a drawer's
 * OWN nav-menu instance and needs no in-drawer override here. (FR-36-5's
 * "the same panel renders inside the drawer" mega-in-drawer capability
 * remains a declared future item, not yet built.)
 */

/*
 * In-drawer width discipline: a vertical drawer menu must FILL the space
 * available, never shrink-wrap to its longest label. The full width exists
 * to stop child content — mega panels above all — being cut off, and to
 * give items proper touch-target size. That is the whole of its rationale.
 *
 * It says NOTHING about where the LABEL should sit. Where labels sit depends
 * on the drawer's design and how much of the screen it covers, so it is the
 * OPERATOR's pick, made once on the drawer (nav-drawer's "Content alignment"
 * control) and inherited here. Because the box stays full-width by design,
 * align-items can move nothing — only text-align moves the label, which is
 * why the drawer publishes --sgs-drawer-text-align alongside the flex value.
 * Both fall back to the previous behaviour (stretch / start) outside a drawer
 * or if the drawer is an older render.
 */
$css .= '.sgs-nav-drawer ' . $uid_sel . '{width:100%;}';
$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__bar'
	. '{width:100%;align-items:var(--sgs-drawer-align, stretch);}';
$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__link,'
	. '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink'
	. '{text-align:var(--sgs-drawer-text-align, start);}';

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
	$css .= $uid_sel . ' .sgs-nav-menu__indicator{' . sgs_background_paint_decl( $indicator_colour, $indicator_colour_gradient ) . ';}';
}

// 4g-bis. ROOT BOX — max-width + native spacing + responsive padding tiers.
//
// These were SGS_Container_Wrapper's job until this block exited it (D539).
// Measured before the exit: nav-menu declared 24 of the wrapper's ~107
// attribute keys and only THREE were reachable by a client — maxWidth and the
// two padding tiers. The other 21 had no control anywhere and were frozen at
// their block.json defaults forever. They were deleted, not reproduced.
//
// maxWidth then went too (D540) — the parent owns this block's width, see the
// note at the removed emission below. So the wrapper vocabulary this block still
// carries is TWO keys: the padding tiers. `gap` survives as its own control but
// was never part of the reachable-wrapper count above.
//
// ⛔ Native `spacing` is declared with __experimentalSkipSerialization, so
// WordPress does NOT inline padding/margin — whoever renders the root MUST emit
// it scoped or both controls are silently dead. The wrapper used to do this.
// ⛔ No `max-width` here, deliberately (D540, Bean). This block is ALWAYS a
// child — of a site-header-row or of sgs/nav-drawer — and the PARENT owns width.
// The nav's own width is intrinsic to its items, and collapsed to a burger it
// wraps its content. A max-width on this element was a second, competing place
// to control the same thing; the row's own width controls were wired at D539.
// Evidence at removal: no theme pattern set it, and the live canary computed
// `max-width: none`. Do not reintroduce it — add it to the PARENT row instead.
$root_box_css = '';

$nav_base_spacing = array();
foreach ( array( 'padding', 'margin' ) as $spacing_prop ) {
	$raw_sides = $attributes['style']['spacing'][ $spacing_prop ] ?? null;
	if ( ! is_array( $raw_sides ) ) {
		continue;
	}
	$sides = array();
	foreach ( $raw_sides as $side => $value ) {
		if ( is_string( $value ) && '' !== $value ) {
			$sides[ $side ] = $value;
		}
	}
	if ( $sides ) {
		$nav_base_spacing[ $spacing_prop ] = $sides;
	}
}
if ( $nav_base_spacing ) {
	// The style engine resolves preset tokens (var:preset|spacing|40) that a raw
	// string concat would emit verbatim and the browser would drop.
	$nav_spacing_styles = wp_style_engine_get_styles( array( 'spacing' => $nav_base_spacing ) );
	if ( ! empty( $nav_spacing_styles['css'] ) ) {
		$root_box_css .= $uid_sel . '{' . $nav_spacing_styles['css'] . '}';
	}
}

// Device-tier padding. 767/1023 mirrors what the wrapper emitted for these exact
// attributes (verified against class-sgs-container-wrapper.php before the exit),
// so the rendered breakpoints do not move — this is the locked 768/1024 device
// standard, NOT an arbitrary visual breakpoint.
foreach ( array(
	array( 'paddingTablet', '(max-width:1023px)' ),
	array( 'paddingMobile', '(max-width:767px)' ),
) as $nav_tier ) {
	list( $tier_attr, $tier_mq ) = $nav_tier;
	$tier_box = is_array( $attributes[ $tier_attr ] ?? null ) ? $attributes[ $tier_attr ] : array();
	if ( ! $tier_box ) {
		continue;
	}
	$tier_shorthand = sgs_box_object_shorthand( $tier_box );
	if ( null !== $tier_shorthand && '' !== $tier_shorthand ) {
		$root_box_css .= '@media ' . $tier_mq . '{' . $uid_sel . '{padding:' . $tier_shorthand . ';}}';
	}
}

// `gap` — the "Item gap" control. Emitted on the BAR (the <ul> whose flex
// children ARE the item links), not on the root.
//
// ⚠ THIS IS A BUG FIX, not a like-for-like port. SGS_Container_Wrapper emitted
// gap at $grid_sel, which for this block resolved to the ROOT
// (class-sgs-container-wrapper.php:1192 — contentWidth 'full' meant no band, so
// no __inner). The root's flex children are the bar and the toggle, and §4f
// swaps those by display:none at the collapse point, so exactly ONE flex child
// exists at any width — and a flex gap between one item paints nothing. The
// control has therefore been inert for its whole life while looking wired: it
// had a label, a value and a reset, and changed the page not at all.
$nav_gap = isset( $attributes['gap'] ) ? sgs_css_length_value( (string) $attributes['gap'] ) : '';
if ( '' !== $nav_gap ) {
	$root_box_css .= $uid_sel . ' .sgs-nav-menu__bar{gap:' . $nav_gap . ';}';
}

if ( '' !== $root_box_css ) {
	$css .= $root_box_css;
}

// 4h. Free-text custom CSS escape hatch — sanitised (letters/digits/basic CSS
// punctuation only) and stripped of any </style> breakout below with the rest.
if ( ! empty( $attributes['sgsCustomCss'] ) ) {
	$css .= preg_replace( '/<\/?script/i', '', (string) $attributes['sgsCustomCss'] );
}

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
