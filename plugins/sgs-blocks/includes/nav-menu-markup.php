<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- shared per-instance include; class namespace lives in the block slug.
/**
 * SGS Nav Menu (sgs/nav-menu) — markup renderers.
 *
 * Split out of render.php (Spec 41 step 8, pure refactor). REQUIRED, not
 * optional — the markup half (428 code lines) cannot fit one 300-line file
 * alongside render.php's own class/entry + menu resolution. This file holds
 * the two flat-list renderers (`sgs_nav_menu_render_items()`,
 * `sgs_nav_menu_render_items_drawer()`, extracted from
 * SGS_Nav_Menu_Bar_Renderer's own methods — the class itself, its
 * constructor, `flatten()`, `from_link()` and `from_page_list()` all STAY in
 * render.php, matching the plan's own file assignment) and the burger/
 * trigger markup builder (`sgs_nav_menu_burger_toggle_markup()`).
 *
 * ⚠ NOT a pure copy-paste of the class methods: `$this->featured_ids`,
 * `$this->uid` and `$this->submenu` become explicit parameters, since a
 * free function has no `$this`. Every function body is otherwise
 * byte-identical to the class method it replaces — see each function's own
 * docblock for the exact before/after parameter mapping. Proven
 * byte-identical output via the fixture harness in the reuse ledger
 * (.claude/verify/spec-41-reuse-ledger.md).
 *
 * Required PER-INSTANCE from render.php, matching sgs/product-card's
 * `includes/product-card-builtin-render.php` precedent (`require_once
 * dirname( __DIR__, 3 ) . '/includes/...'`).
 *
 * ⚠ LOAD ORDER: unlike `helpers-tokens.php`/`helpers-hover-state.php`/
 * `helpers-colour-variants.php` (required globally at plugin bootstrap via
 * `includes/render-helpers.php`), this file is NOT bootstrap-loaded — it is
 * `require_once`'d per-instance from `render.php`, exactly like
 * `nav-menu-css.php` and `nav-menu-submenu-css.php`. Its functions are only
 * in scope after nav-menu's own `render.php` has run at least once on that
 * page load. Fine today (nothing else calls into nav-menu internals) — a
 * future cross-block call needs this file required first, or it fatals for
 * a reason nobody will find without this note.
 *
 * ⛔ FATAL AVOIDANCE: this page carries TWO nav-menu instances (header bar +
 * the drawer's own seeded instance). Every function below is wrapped in its
 * own `if ( ! function_exists( '...' ) )` guard so the second `require_once`
 * (and the second render) never re-declares it.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_menu_render_items' ) ) {
		/**
		 * Render the flat <li><a> list.
		 *
		 * Split out of the SGS_Nav_Menu_Bar_Renderer class (Spec 41 step 8,
		 * pure refactor) into a standalone function -- $this->featured_ids/
		 * uid/submenu become explicit parameters, body otherwise byte-identical.
		 *
		 * @param array $items Flattened items from flatten().
		 * @param array  $submenu      Submenu settings: align/caret/close_grace (was $this->submenu).
		 * @param string $uid          This block instance's uid (was $this->uid).
		 * @param array  $featured_ids Featured item identifiers (was $this->featured_ids).
		 * @return string HTML <li> elements.
		 */
		function sgs_nav_menu_render_items( array $items, array $featured_ids, string $uid, array $submenu ): string {
			$html = '';
			foreach ( $items as $item ) {
				$is_featured = in_array( $item['identifier'], $featured_ids, true );
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
						// Instance-scoped id (reviewer finding): fold in $uid so
						// two nav-menus bound to the SAME menu can't collide (axe
						// duplicate-id-aria). $uid already carries the sgs-nav-menu- prefix.
						$panel_dom_id = $uid . '-mega-' . (int) $item['object_id'];
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
							// `data-lenis-prevent`: the site runs Lenis smooth scrolling
							// (<html class="lenis">), which intercepts wheel events
							// document-wide and drives the PAGE. Without the opt-out, a
							// wheel gesture over an open panel scrolls the page behind it
							// while the panel's own `overflow-y:auto` never moves — the
							// panel's max-height bound below would give it a scroll region
							// no mouse could reach. `overscroll-behavior:contain` does NOT
							// cover this: that governs native scroll CHAINING, not a JS
							// wheel hijacker. Same attribute, same reasoning, as
							// theme/sgs-theme/assets/js/sgs-shop-filters.js::scrollWrap.
							// Set in the markup rather than at runtime because this
							// element is server-rendered.
							. '<div id="%3$s" class="sgs-nav-menu__mega-panel-wrap" data-sgs-mega-panel data-lenis-prevent data-wp-on--keydown="actions.panelKeydown">%6$s</div>'
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
						$child_featured = in_array( $child['identifier'], $featured_ids, true );
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
						$sub_dom_id = $uid . '-sub-' . substr( md5( $item['identifier'] ), 0, 8 );
						$sub_ctx    = wp_interactivity_data_wp_context(
							array(
								'isOpen'      => false,
								'megaId'      => $sub_dom_id,
								'intentDelay' => 300,
								'closeGrace'  => $submenu['close_grace'],
							)
						);
						$sub_caret  = '';
						if ( $submenu['caret'] && function_exists( 'sgs_get_lucide_icon' ) ) {
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

						// FR-41-10 (Spec 41 step 17 built the CSS; nothing applied the
						// class until now). `$submenu['animation']` is already
						// PHP-validated to one of none|fade|slide-down by the
						// renderer's constructor — 'none' emits no modifier class,
						// matching the pre-animation markup byte-for-byte.
						$sub_wrap_class = 'sgs-nav-menu__submenu-wrap'
							. ( 'none' !== $submenu['animation'] ? ' sgs-nav-menu__submenu-wrap--' . $submenu['animation'] : '' );

						$html .= sprintf(
							'<li class="%1$s sgs-nav-menu__item--has-submenu">'
							. '<div class="sgs-nav-menu__submenu-root" data-sgs-nav-disclosure="dropdown" data-sgs-nav-submenu-align="%2$s" data-wp-interactive="sgs/mega" %3$s data-wp-on--mouseenter="actions.enterBridge" data-wp-on--mouseleave="actions.leaveBridge" data-wp-watch="callbacks.watchOpenState">'
							. '%4$s'
							// `data-lenis-prevent` for the same reason as the mega panel
							// above — see that note. A dropdown is the likelier of the two
							// to overflow its bound, so it is the likelier to need a
							// wheel-reachable scroll region.
							. '<div id="%5$s" class="%6$s" data-sgs-mega-panel data-lenis-prevent data-wp-on--keydown="actions.panelKeydown">'
							. '<ul class="sgs-nav-menu__submenu">%7$s</ul>'
							. '</div>'
							. '</div></li>',
							esc_attr( $li_class ),
							esc_attr( $submenu['align'] ),
							$sub_ctx, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_interactivity_data_wp_context() self-escapes.
							$trigger_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled above from esc_url/esc_attr/esc_html parts.
							esc_attr( $sub_dom_id ),
							esc_attr( $sub_wrap_class ),
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
}

if ( ! function_exists( 'sgs_nav_menu_render_items_drawer' ) ) {
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
		 * Split out of the SGS_Nav_Menu_Bar_Renderer class (Spec 41 step 8,
		 * pure refactor) into a standalone function -- $this->featured_ids
		 * becomes an explicit parameter, body otherwise byte-identical.
		 *
		 * @param array  $items Flattened items from flatten().
		 * @param string $model 'accordion' or 'drill-down' (validated by caller).
		 * @param string $uid   The block instance's uid (accordion `name=` scope
		 *                      + sub-panel DOM id namespace, mirrors the mega
		 *                      panel's own instance-scoping).
		 * @param array  $featured_ids Featured item identifiers (was $this->featured_ids).
		 * @return string HTML <li> elements.
		 */
		function sgs_nav_menu_render_items_drawer( array $items, string $model, string $uid, array $featured_ids, string $marker_icon = '' ): string {
			$html = '';
			foreach ( $items as $item ) {
				$is_featured = in_array( $item['identifier'], $featured_ids, true );
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
					// Bean, 2026-09-10 (reference site): a small right-pointing marker
					// in each sub-item's indent, matching the reference's convention of
					// using the same caret family for both "this expands" (chevron-down,
					// rotates on open) and "this is a leaf" (chevron-right, static).
					// FR-41-30(b): the glyph is now operator-chosen (`sublinkMarkerIcon`),
					// resolved by render.php through the same source-aware resolver
					// `sgs/icon` uses and handed in already-rendered. The stored default
					// is lucide/chevron-right, so an untouched nav is byte-identical.
					$sub_marker = '' !== $marker_icon
						? '<span class="sgs-nav-menu__sublink-marker" aria-hidden="true">' . $marker_icon . '</span>'
						: '';
					$child_html = '';
					foreach ( $children as $child ) {
						if ( '' === (string) ( $child['label'] ?? '' ) ) {
							continue;
						}
						$child_featured = in_array( $child['identifier'], $featured_ids, true );
						$child_html    .= sprintf(
							'<li class="sgs-nav-menu__subitem%1$s"><a class="sgs-nav-menu__sublink" href="%2$s" data-sgs-nav-path="%3$s">%4$s%5$s</a></li>',
							$child_featured ? ' sgs-nav-menu__subitem--featured' : '',
							esc_url( $child['url'] ),
							esc_attr( wp_parse_url( $child['url'], PHP_URL_PATH ) ?? '' ),
							$sub_marker, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon(), same pattern as $caret elsewhere in this file.
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

if ( ! function_exists( 'sgs_nav_menu_burger_toggle_markup' ) ) {
	/**
	 * Build the burger button + toggle-wrap markup (was inlined in render.php
	 * as the `$toggle_html = sprintf(...)` assignment; body byte-identical,
	 * now a `return sprintf(...)` inside its own function).
	 *
	 * @param string $burger_context_attr Pre-built `data-wp-context` attribute string
	 *                                     (from `wp_interactivity_data_wp_context()`).
	 * @param string $drawer_ref          The drawer id this burger opens.
	 * @param string $burger_icon         Pre-rendered trigger glyph (FR-41-30(a)); '' under `text`.
	 * @param string $trigger_mode        icon | text | icon-and-text (FR-41-12).
	 * @param string $trigger_label       The visible word, used by `text`/`icon-and-text`.
	 * @param string $aria_attr           Pre-built ` aria-label="…"` segment, or '' to omit it.
	 * @param string $magnet_attrs        Pre-built ` data-sgs-fx…` segment, or '' (FR-41-31).
	 * @param bool   $is_default_icon     True when `triggerIcon` is unset/the stored default
	 *                                     (`{source:lucide,name:menu}`) — gates the G4 burger↔X
	 *                                     morph markup. A custom `triggerIcon` (G3) keeps
	 *                                     rendering `$burger_icon` untouched (no morph, since a
	 *                                     morph has no well-defined shape for an arbitrary glyph).
	 * @return string The `<div>` + `<button>` toggle markup.
	 */
	function sgs_nav_menu_burger_toggle_markup( string $burger_context_attr, string $drawer_ref, string $burger_icon, string $trigger_mode = 'icon', string $trigger_label = '', string $aria_attr = '', string $magnet_attrs = '', bool $is_default_icon = false ): string {
		if ( ! in_array( $trigger_mode, array( 'icon', 'text', 'icon-and-text' ), true ) ) {
			$trigger_mode = 'icon';
		}

		/*
		 * ⚠ The accessible name is an ATTRIBUTE SEGMENT built by the caller and
		 * interpolated here, never a `%s` inside the format string — feeding ''
		 * into an `aria-label="%s"` literal emits `aria-label=""`, an EMPTY
		 * accessible name, strictly worse than the Label-in-Name mismatch the
		 * omission exists to fix (Spec 41 FR-41-12). A caller that passes nothing
		 * under `icon` mode still gets the label, so no route emits a nameless
		 * icon-only button.
		 */
		if ( '' === $aria_attr && 'icon' === $trigger_mode ) {
			$aria_attr = sprintf( ' aria-label="%s"', esc_attr__( 'Open menu', 'sgs-blocks' ) );
		}

		$icon_html = '';
		if ( 'text' !== $trigger_mode && '' !== $burger_icon ) {
			if ( $is_default_icon ) {
				// G4 — the unmodified default glyph is restructured into three real
				// `<span>` bars (not the resolved SVG's `<path>` elements) so the
				// CSS-only burger↔X morph in style.css has genuine independently-
				// animatable structure to work with. Always wrapped (both `icon`
				// and `icon-and-text`) — unlike the custom-icon branch below, this
				// is new-feature markup, not a byte-identical-preservation case.
				$icon_html = '<span class="sgs-nav-menu__burger-icon" aria-hidden="true">'
					. str_repeat( '<span class="sgs-nav-menu__burger-bar"></span>', 3 )
					. '</span>';
			} else {
				// ⚠ Under `icon-and-text` a real visible word names the button, so the
				// glyph is decorative — the same convention this file already applies
				// to `.sgs-nav-menu__sublink-marker` and `.sgs-nav-menu__caret`. Under
				// `icon` the SVG is the only content and the button's own aria-label
				// names it, so it is emitted bare — byte-identical to pre-0.4.x output.
				// A custom `triggerIcon` (G3) never morphs — an arbitrary glyph has no
				// well-defined 3-bar shape (Spec 41 G4 scope boundary, disclosed).
				$icon_html = 'icon' === $trigger_mode
					? $burger_icon
					: '<span class="sgs-nav-menu__burger-icon" aria-hidden="true">' . $burger_icon . '</span>';
			}
		}

		$text_html = 'icon' === $trigger_mode
			? ''
			: '<span class="sgs-nav-menu__burger-text">' . esc_html( $trigger_label ) . '</span>';

		// No modifier class under `icon`: that mode must render today's markup
		// byte-for-byte (FR-41-12), and a class nothing styles is not free.
		$mode_class = 'icon' === $trigger_mode ? '' : ' sgs-nav-menu__burger--' . $trigger_mode;

		return sprintf(
			'<div class="sgs-nav-menu__toggle-wrap" data-wp-interactive="sgs/nav" %1$s data-wp-init="callbacks.pruneDanglingAriaControls">' .
			'<button type="button" class="sgs-nav-menu__burger%2$s" data-wp-on--click="actions.toggleDrawer" data-wp-bind--aria-expanded="state.isOpen" aria-controls="%3$s"%4$s%5$s>%6$s%7$s</button>' .
			'</div>',
			$burger_context_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_interactivity_data_wp_context() self-escapes.
			esc_attr( $mode_class ),
			esc_attr( $drawer_ref ),
			$aria_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from a fixed literal + esc_attr__() by this function or its caller.
			$magnet_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from fixed literals + absint()+esc_attr() values in render.php.
			$icon_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted icon markup from sgs_nav_menu_icon_markup() (esc_attr/esc_html per source).
			$text_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled above from an esc_html() label.
		);
	}
}
