<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- shared per-instance include; class namespace lives in the block slug.
/**
 * SGS Nav Bar Menu / Nav Drawer Menu — shared markup renderers (the drawer's
 * per-row pieces live in `nav-drawer-menu-items.php`, required below): the two
 * flat-list renderers (`sgs_nav_bar_menu_render_items()`,
 * `sgs_nav_drawer_menu_render_items()`) and the burger/trigger markup builder
 * (`sgs_nav_bar_menu_burger_toggle_markup()`). `$featured_ids`, `$uid` and
 * `$submenu` are explicit parameters because a free function has no `$this`.
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
 * in scope after a nav block's own `render.php` has run at least once on that
 * page load. Nothing else calls into these internals — a cross-block call
 * needs this file required first, or it fatals for a reason nobody will find
 * without this note.
 *
 * ⛔ FATAL AVOIDANCE: a page carries a `sgs/nav-bar-menu` (header) and a
 * `sgs/nav-drawer-menu` (inside the drawer). Every function below is wrapped in its
 * own `if ( ! function_exists( '...' ) )` guard so the second `require_once`
 * (and the second render) never re-declares it.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/nav-drawer-menu-items.php';

if ( ! function_exists( 'sgs_nav_shared_badge_html' ) ) {
	/**
	 * Build the optional badge fragment for a leaf item's link.
	 *
	 * Same datum for both blocks (`$item['badge']`, from each render.php's own
	 * `from_link()` — the operator's menu-item "Description" field, repurposed;
	 * unused by any other render path, see that function's own docblock).
	 * `$bem_root` only picks which BEM root's `__badge` element applies — `style.css` owns the actual visual difference (a tinted chip on
	 * the bar, a bare letter-spaced word in the drawer).
	 *
	 * Real visually-hidden TEXT, not CSS `::before`/`::after` `content` — some
	 * browser/AT combinations do not fold generated content into the
	 * accessible name, so a real text node is the only reliable way to make
	 * "Glasses" + "SOON" read as one phrase, "Glasses (SOON)", rather than
	 * "GlassesSOON" run together.
	 *
	 * @param string $badge    Badge text, '' = none.
	 * @param string $bem_root 'sgs-nav-bar-menu' or 'sgs-nav-drawer-menu'.
	 * @return string HTML fragment, or '' when there is no badge.
	 */
	function sgs_nav_shared_badge_html( string $badge, string $bem_root ): string {
		$badge = trim( $badge );
		if ( '' === $badge ) {
			return '';
		}
		// A badge is a short marker, not a second sentence — cap it so an
		// operator who filled this field in with a real description doesn't
		// ship a paragraph-long chip. 24 chars covers
		// every reference badge copy ("SOON", "NEW", "Coming spring 2027")
		// with headroom.
		$badge = function_exists( 'mb_substr' ) ? mb_substr( $badge, 0, 24 ) : substr( $badge, 0, 24 );
		return sprintf(
			'<span class="screen-reader-text"> (</span><span class="%1$s__badge">%2$s</span><span class="screen-reader-text">)</span>',
			esc_attr( $bem_root ),
			esc_html( $badge )
		);
	}
}

if ( ! function_exists( 'sgs_nav_bar_menu_render_items' ) ) {
		/**
		 * Render the flat <li><a> list.
		 *
		 * @param array $items Flattened items from flatten().
		 * @param array  $submenu      Submenu settings: align/caret/close_grace.
		 * @param string $uid          This block instance's uid.
		 * @param array  $featured_ids Featured item identifiers.
		 * @param array  $disabled_ids Wave B: identifiers rendered as
		 *                             non-interactive, non-focusable text
		 *                             instead of a link (the block's own
		 *                             disabledItemIds attribute, same
		 *                             identifier scheme as $featured_ids).
		 *                             Optional -- callers built before Wave B
		 *                             pass nothing and every item stays a
		 *                             live link.
		 * @return string HTML <li> elements.
		 */
		function sgs_nav_bar_menu_render_items( array $items, array $featured_ids, string $uid, array $submenu, array $disabled_ids = array() ): string {
			$html = '';
			foreach ( $items as $item ) {
				$is_featured = in_array( $item['identifier'], $featured_ids, true );
				$is_disabled = in_array( $item['identifier'], $disabled_ids, true );
				$li_class    = 'sgs-nav-bar-menu__item' . ( $is_featured ? ' sgs-nav-bar-menu__item--featured' : '' )
					. ( $is_disabled ? ' sgs-nav-bar-menu__item--disabled' : '' );

				if ( 'sgs_mega_menu' === ( $item['type'] ?? '' ) ) {
					// The panel plus its "View all" fallback, through the one
					// helper the drawer fork also uses (helpers-mega-render.php).
					$panel_html = function_exists( 'sgs_mega_render_item_panel' )
						? sgs_mega_render_item_panel( $item, 'sgs-nav-bar-menu__mega-viewall' )
						: null;
					if ( null !== $panel_html ) {
						// Instance-scoped id (reviewer finding): fold in $uid so
						// two nav-menus bound to the SAME menu can't collide (axe
						// duplicate-id-aria). $uid already carries the sgs-nav-bar-menu- prefix.
						$panel_dom_id = $uid . '-mega-' . (int) $item['object_id'];
						$mega_ctx     = wp_interactivity_data_wp_context(
							array(
								'isOpen'      => false,
								'megaId'      => (string) (int) $item['object_id'],
								'intentDelay' => $submenu['intent_delay'],
								'closeGrace'  => $submenu['close_grace'],
								'openOn'      => $submenu['open_on'],
							)
						);
						// The caret honours the block's submenuCaret setting, as the
						// plain dropdown branch below does.
						$caret = ( $submenu['caret'] && function_exists( 'sgs_get_lucide_icon' ) )
							? '<span class="sgs-nav-bar-menu__caret" aria-hidden="true">' . sgs_get_lucide_icon( 'chevron-down' ) . '</span>'
							: '';
						$html .= sprintf(
							'<li class="%1$s sgs-nav-bar-menu__item--mega">'
							. '<div class="sgs-nav-bar-menu__mega" data-wp-interactive="sgs/mega" %2$s data-wp-on--mouseenter="actions.enterBridge" data-wp-on--mouseleave="actions.leaveBridge" data-wp-watch="callbacks.watchOpenState">'
							. '<button type="button" class="sgs-nav-bar-menu__link sgs-nav-bar-menu__mega-trigger" data-sgs-mega-trigger aria-expanded="false" aria-controls="%3$s" data-wp-bind--aria-expanded="context.isOpen" data-wp-on--click="actions.toggle" data-wp-on--keydown="actions.triggerKeydown">'
							. '<span class="sgs-nav-bar-menu__label sgs-nav-bar-menu__magnet-target">%4$s</span>%5$s'
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
							. '<div id="%3$s" class="sgs-nav-bar-menu__mega-panel-wrap sgs-nav-bar-menu__panel-motion sgs-nav-bar-menu__panel-motion--%7$s" data-sgs-mega-panel data-lenis-prevent data-wp-on--keydown="actions.panelKeydown">%6$s</div>'
							. '</div></li>',
							esc_attr( $li_class ),
							$mega_ctx, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_interactivity_data_wp_context() self-escapes.
							esc_attr( $panel_dom_id ),
							sgs_label_roll_markup( (string) $item['label'], (string) ( $submenu['label_roll'] ?? '' ) ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_label_roll_markup() esc_html's the label.
							$caret, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
							$panel_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- do_blocks() output; already-safe rendered block HTML. The "View all" fallback (when the panel has no CTA of its own) is INSIDE this string, injected via sgs_mega_panel_footer_html.
							esc_attr( $submenu['animation'] ?? 'none' )
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
						 * A CHILD can be featured too (a priority item). Same
						 * featuredItemIds check the top-level branch uses, so
						 * one mechanism covers both levels rather than a
						 * parallel one for children.
						 */
						$child_featured = in_array( $child['identifier'], $featured_ids, true );

						/*
						 * Wave B: a CHILD can be disabled too, same
						 * disabledItemIds scheme as the top-level branch. A
						 * disabled sublink renders as non-link text: no
						 * href, no data-sgs-nav-path (so markCurrentPage()
						 * in view.js, which only queries
						 * `[data-sgs-nav-path]`, never touches it), not
						 * focusable.
						 */
						$child_disabled = in_array( $child['identifier'], $disabled_ids, true );

						// Wave B: badge copy already flows through from_link()
						// for every item including children — only the
						// leaf top-level branch actually printed it before.
						$child_badge = sgs_nav_shared_badge_html( (string) ( $child['badge'] ?? '' ), 'sgs-nav-bar-menu' );

						if ( $child_disabled ) {
							$child_html .= sprintf(
								'<li class="sgs-nav-bar-menu__subitem sgs-nav-bar-menu__subitem--disabled"><span class="sgs-nav-bar-menu__sublink" aria-disabled="true">%s%s</span></li>',
								esc_html( $child['label'] ),
								$child_badge // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_nav_shared_badge_html() esc_attr/esc_html's internally.
							);
						} else {
							$child_html .= sprintf(
								'<li class="sgs-nav-bar-menu__subitem%s"><a class="sgs-nav-bar-menu__sublink" href="%s" data-sgs-nav-path="%s">%s%s</a></li>',
								$child_featured ? ' sgs-nav-bar-menu__subitem--featured' : '',
								esc_url( $child['url'] ),
								esc_attr( wp_parse_url( $child['url'], PHP_URL_PATH ) ?? '' ),
								esc_html( $child['label'] ),
								$child_badge // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_nav_shared_badge_html() esc_attr/esc_html's internally.
							);
						}
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
								'intentDelay' => $submenu['intent_delay'],
								'closeGrace'  => $submenu['close_grace'],
								'openOn'      => $submenu['open_on'],
							)
						);
						$sub_caret  = '';
						if ( $submenu['caret'] && function_exists( 'sgs_get_lucide_icon' ) ) {
							$sub_caret = '<span class="sgs-nav-bar-menu__caret" aria-hidden="true">'
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
								'<a class="sgs-nav-bar-menu__link" href="%s" data-sgs-nav-path="%s"><span class="sgs-nav-bar-menu__link-text sgs-nav-bar-menu__magnet-target">%s</span></a>'
								. '<button type="button" class="sgs-nav-bar-menu__subtoggle" data-sgs-mega-trigger aria-expanded="false" aria-controls="%s" data-wp-bind--aria-expanded="context.isOpen" data-wp-on--click="actions.toggle" data-wp-on--keydown="actions.triggerKeydown">'
								. '<span class="screen-reader-text">%s</span>%s</button>',
								esc_url( $item['url'] ),
								esc_attr( wp_parse_url( $item['url'], PHP_URL_PATH ) ?? '' ),
								sgs_label_roll_markup( (string) $item['label'], (string) ( $submenu['label_roll'] ?? '' ) ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_label_roll_markup() esc_html's the label.
								esc_attr( $sub_dom_id ),
								/* translators: %s is the parent menu item's label. */
								esc_html( sprintf( __( 'Show submenu for %s', 'sgs-blocks' ), $item['label'] ) ),
								$sub_caret // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
							);
						} else {
							$trigger_html = sprintf(
								'<button type="button" class="sgs-nav-bar-menu__link sgs-nav-bar-menu__subtoggle" data-sgs-mega-trigger aria-expanded="false" aria-controls="%s" data-wp-bind--aria-expanded="context.isOpen" data-wp-on--click="actions.toggle" data-wp-on--keydown="actions.triggerKeydown">'
								. '<span class="sgs-nav-bar-menu__link-text sgs-nav-bar-menu__magnet-target">%s</span>%s</button>',
								esc_attr( $sub_dom_id ),
								sgs_label_roll_markup( (string) $item['label'], (string) ( $submenu['label_roll'] ?? '' ) ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_label_roll_markup() esc_html's the label.
								$sub_caret // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
							);
						}

						// FR-41-10 / Wave 3C U-5. `$submenu['animation']` is already
						// PHP-validated by the renderer's constructor; the same motion
						// class rides on the mega panel wrap, so one set of rules in
						// nav-bar-menu/style.css animates both forks.
						$sub_wrap_class = 'sgs-nav-bar-menu__submenu-wrap sgs-nav-bar-menu__panel-motion sgs-nav-bar-menu__panel-motion--' . ( $submenu['animation'] ?? 'none' );

						$html .= sprintf(
							'<li class="%1$s sgs-nav-bar-menu__item--has-submenu">'
							. '<div class="sgs-nav-bar-menu__submenu-root" data-sgs-nav-disclosure="dropdown" data-sgs-nav-submenu-align="%2$s" data-wp-interactive="sgs/mega" %3$s data-wp-on--mouseenter="actions.enterBridge" data-wp-on--mouseleave="actions.leaveBridge" data-wp-watch="callbacks.watchOpenState">'
							. '%4$s'
							// `data-lenis-prevent` for the same reason as the mega panel
							// above — see that note. A dropdown is the likelier of the two
							// to overflow its bound, so it is the likelier to need a
							// wheel-reachable scroll region.
							. '<div id="%5$s" class="%6$s" data-sgs-mega-panel data-lenis-prevent data-wp-on--keydown="actions.panelKeydown">'
							. '<ul class="sgs-nav-bar-menu__submenu">%7$s</ul>'
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

				$leaf_badge = sgs_nav_shared_badge_html( (string) ( $item['badge'] ?? '' ), 'sgs-nav-bar-menu' );

				// Wave B: a top-level leaf item can be disabled too — the
				// SAME disabledItemIds scheme the earlier branches read
				// ($is_disabled, computed once per item above). Non-link
				// text, no href, no data-sgs-nav-path, no
				// magnet-target (a disabled item is never a hover-effect
				// target), aria-disabled="true".
				if ( $is_disabled ) {
					$html .= sprintf(
						'<li class="%s"><span class="sgs-nav-bar-menu__link" aria-disabled="true"><span class="sgs-nav-bar-menu__link-text">%s</span>%s</span></li>',
						esc_attr( $li_class ),
						esc_html( $item['label'] ),
						$leaf_badge // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_nav_shared_badge_html() esc_attr/esc_html's internally.
					);
				} else {
					$html .= sprintf(
						'<li class="%s"><a class="sgs-nav-bar-menu__link" href="%s" data-sgs-nav-path="%s"><span class="sgs-nav-bar-menu__link-text sgs-nav-bar-menu__magnet-target">%s</span>%s</a></li>',
						esc_attr( $li_class ),
						esc_url( $item['url'] ),
						esc_attr( wp_parse_url( $item['url'], PHP_URL_PATH ) ?? '' ),
						sgs_label_roll_markup( (string) $item['label'], (string) ( $submenu['label_roll'] ?? '' ) ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_label_roll_markup() esc_html's the label.
						$leaf_badge // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_nav_shared_badge_html() esc_attr/esc_html's internally.
					);
				}
			}
			return $html;
		}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_render_items' ) ) {
		/**
		 * Render the flat items as a REAL nested vertical list for the drawer
		 * (Spec 36 FR-36-6 — the desktop/burger bar above collapses a submenu to
		 * one link; the drawer gets a genuine nested submenu).
		 *
		 * Both `accordion` and `drill-down` share IDENTICAL server markup — a
		 * `<details name>` exclusive accordion (the spec's own stated no-JS
		 * fallback for drill-down). `drill-down`'s extra behaviour (sliding to a
		 * full sub-panel with Back) is a JS-only progressive enhancement layered
		 * on top by `nav-drilldown.js`; nothing here differs between the two
		 * models except the `data-sgs-nav-submenu-model` flag consumed by that
		 * script and by style.css.
		 *
		 * A mega-menu item renders its mega panel post inside its own accordion
		 * row (`megaDrawerMode` `panel`, the default): the panel is server-
		 * rendered block content, so it needs no JS, and it renders in the
		 * `drawer` context, where `sgs/mega-panel` draws no floating shell.
		 * `link` (or a panel that resolves to nothing) gives a plain link.
		 *
		 * $mega_drawer_fallback_ids takes precedence: a mega-typed item authored
		 * as a `core/navigation-submenu` carrying REAL nested child links, with
		 * its identifier listed here, renders those children as an ordinary
		 * accordion instead of its panel. The bar form always gets the panel.
		 *
		 * @param array  $items Flattened items from flatten().
		 * @param string $model 'accordion' or 'drill-down' (validated by caller).
		 * @param string $uid   The block instance's uid (accordion `name=` scope
		 *                      + sub-panel DOM id namespace, mirrors the mega
		 *                      panel's own instance-scoping).
		 * @param array  $featured_ids Featured item identifiers.
		 * @param string $marker_icon Rendered sublink-marker glyph HTML.
		 * @param array  $mega_drawer_fallback_ids Mega item identifiers opted OUT of the
		 *                      plain-link degrade in favour of an accordion of their own
		 *                      nested children (megaDrawerFallbackIds attribute).
		 * @param bool   $exclusive Wave 3C U-11, ENG-02 — `sgs/nav-drawer`'s own
		 *                      `accordionExclusive` attribute (default true), reached via
		 *                      block context `sgs/navDrawerAccordionExclusive`. True (today's
		 *                      behaviour): every rendered `<details>` carries a shared
		 *                      `name=` so the browser keeps only one open at a time. False:
		 *                      the `name=` attribute is omitted entirely, so each `<details>`
		 *                      opens/closes independently (away's reference opens two panels
		 *                      at once).
		 * @param array  $options Row options from sgs_nav_drawer_menu_row_options()
		 *                      (mega mode, label roll, ornament, expander, media).
		 * @return string HTML <li> elements.
		 */
		function sgs_nav_drawer_menu_render_items( array $items, string $model, string $uid, array $featured_ids, string $marker_icon = '', array $mega_drawer_fallback_ids = array(), bool $exclusive = true, array $options = array() ): string {
			// Row options (ornament, roll, media, expander, mega mode) resolved
			// once by the caller; a caller that passes none gets the defaults.
			$options += sgs_nav_drawer_menu_row_options( array() );

			$html = '';
			foreach ( $items as $item ) {
				$is_featured = in_array( $item['identifier'], $featured_ids, true );
				$li_class    = 'sgs-nav-drawer-menu__item sgs-nav-drawer-menu__item--drawer' . ( $is_featured ? ' sgs-nav-drawer-menu__item--featured' : '' );
				$link_html   = sprintf(
					'<li class="%1$s"><a class="sgs-nav-drawer-menu__link" href="%2$s" data-sgs-nav-path="%3$s">%4$s%5$s</a></li>',
					esc_attr( $li_class ),
					esc_url( $item['url'] ),
					esc_attr( wp_parse_url( $item['url'], PHP_URL_PATH ) ?? '' ),
					sgs_nav_drawer_menu_label_inner( $item, $options ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_html'd label, trusted icon markup, wp_get_attachment_image().
					sgs_nav_shared_badge_html( (string) ( $item['badge'] ?? '' ), 'sgs-nav-drawer-menu' ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_nav_shared_badge_html() esc_attr/esc_html's internally.
				);

				/*
				 * Mega item (Spec 36 FR-36-6 "Mega items in the drawer"). An item
				 * listed in megaDrawerFallbackIds that carries real nested children
				 * renders those children as an ordinary accordion (falls through).
				 * Otherwise, with megaDrawerMode `panel` (the default), the item's
				 * mega panel post renders inside its accordion, in the drawer
				 * context (no floating shell); `link`, or a panel that resolves to
				 * nothing, gives a plain link.
				 */
				if ( 'sgs_mega_menu' === ( $item['type'] ?? '' ) ) {
					$mega_children = isset( $item['children'] ) && is_array( $item['children'] ) ? $item['children'] : array();
					$mega_fallback = ! empty( $mega_children ) && in_array( $item['identifier'], $mega_drawer_fallback_ids, true );
					if ( ! $mega_fallback ) {
						$panel_html = ( 'panel' === $options['mega_mode'] && function_exists( 'sgs_mega_render_item_panel' ) )
							? sgs_mega_render_item_panel( $item, 'sgs-nav-drawer-menu__mega-viewall', 'drawer' )
							: null;
						if ( null !== $panel_html && '' !== trim( $panel_html ) ) {
							$html .= sgs_nav_drawer_menu_accordion_html(
								$item,
								$li_class,
								$uid,
								$exclusive,
								'<li class="sgs-nav-drawer-menu__mega-body">' . $panel_html . '</li>',
								$options,
								' sgs-nav-drawer-menu__item--mega'
							);
							continue;
						}
						$html .= $link_html;
						continue;
					}
				}

				$children = isset( $item['children'] ) && is_array( $item['children'] ) ? $item['children'] : array();
				if ( $children ) {
					// A small right-pointing marker in each sub-item's indent
					// (FR-41-30(b): operator-chosen `sublinkMarkerIcon`, resolved by
					// render.php and handed in already-rendered).
					$sub_marker = '' !== $marker_icon
						? '<span class="sgs-nav-drawer-menu__sublink-marker" aria-hidden="true">' . $marker_icon . '</span>'
						: '';
					$child_html = '';
					foreach ( $children as $child ) {
						if ( '' === (string) ( $child['label'] ?? '' ) ) {
							continue;
						}
						$child_featured = in_array( $child['identifier'], $featured_ids, true );
						$child_html    .= sprintf(
							'<li class="sgs-nav-drawer-menu__subitem%1$s"><a class="sgs-nav-drawer-menu__sublink" href="%2$s" data-sgs-nav-path="%3$s">%4$s%5$s</a></li>',
							$child_featured ? ' sgs-nav-drawer-menu__subitem--featured' : '',
							esc_url( $child['url'] ),
							esc_attr( wp_parse_url( $child['url'], PHP_URL_PATH ) ?? '' ),
							$sub_marker, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
							esc_html( $child['label'] )
						);
					}

					// Every child had an empty label: degrade to a plain link.
					if ( '' === $child_html ) {
						$html .= $link_html;
						continue;
					}

					$html .= sgs_nav_drawer_menu_accordion_html( $item, $li_class, $uid, $exclusive, $child_html, $options );
					continue;
				}

				$html .= $link_html;
			}
			return $html;
		}
}

if ( ! function_exists( 'sgs_nav_bar_menu_burger_toggle_markup' ) ) {
	/**
	 * Build the burger button + toggle-wrap markup.
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
	 * @param int    $collapse_point      Wave 3C U-9/U-11 (DEC-09) — the bar's resolved
	 *                                     `collapsePoint` (already sanitised by the caller the
	 *                                     same way `nav-menu-submenu-css.php` does). Rides onto
	 *                                     this button as `data-sgs-nav-collapse="{N}"` so
	 *                                     `store.js` can watch the SAME width the CSS bar/burger
	 *                                     switch uses, without a second source of truth.
	 * @param string $burger_morph        Resolved `burgerMorph` — x (default) | x-rotate | line |
	 *                                     none. Rides onto this button as `data-sgs-nav-burger-morph="…"`
	 *                                     ONLY when `$is_default_icon` (the bars markup this
	 *                                     attribute selects on only exists for the default glyph).
	 * @param string $icon_position       `triggerIconPosition`: before | after (a visual reorder).
	 * @param array  $label_roll          Wave 3C U-6 (M-25): `roll` (labelRoll), `hover`
	 *                                     (triggerHoverLabel) and `open` (triggerOpenLabel). The
	 *                                     visible word rolls to `hover` on hover (only when set)
	 *                                     and to `open` while the drawer is open; the button's
	 *                                     name follows the visible word.
	 * @return string The `<div>` + `<button>` toggle markup.
	 */
	function sgs_nav_bar_menu_burger_toggle_markup( string $burger_context_attr, string $drawer_ref, string $burger_icon, string $trigger_mode = 'icon', string $trigger_label = '', string $aria_attr = '', string $magnet_attrs = '', bool $is_default_icon = false, int $collapse_point = 768, string $burger_morph = 'x', string $icon_position = 'after', array $label_roll = array() ): string {
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
				// and `icon-and-text`), unlike the custom-icon branch below.
				$icon_html = '<span class="sgs-nav-bar-menu__burger-icon" aria-hidden="true">'
					. str_repeat( '<span class="sgs-nav-bar-menu__burger-bar"></span>', 3 )
					. '</span>';
			} else {
				// ⚠ Under `icon-and-text` a real visible word names the button, so the
				// glyph is decorative — the same convention this file already applies
				// to `.sgs-nav-bar-menu__sublink-marker` and `.sgs-nav-bar-menu__caret`. Under
				// `icon` the SVG is the only content and the button's own aria-label
				// names it, so it is emitted bare.
				// A custom `triggerIcon` (G3) never morphs — an arbitrary glyph has no
				// well-defined 3-bar shape.
				$icon_html = 'icon' === $trigger_mode
					? $burger_icon
					: '<span class="sgs-nav-bar-menu__burger-icon" aria-hidden="true">' . $burger_icon . '</span>';
			}
		}

		$text_html = 'icon' === $trigger_mode
			? ''
			: '<span class="sgs-nav-bar-menu__burger-text">' . sgs_label_roll_markup(
				$trigger_label,
				(string) ( $label_roll['roll'] ?? '' ),
				(string) ( $label_roll['hover'] ?? '' ),
				(string) ( $label_roll['open'] ?? '' ),
				'' !== (string) ( $label_roll['hover'] ?? '' ),
				'state.isOpen'
			) . '</span>';

		// No modifier class under `icon` (FR-41-12): a class nothing styles is
		// not free.
		$mode_class = 'icon' === $trigger_mode ? '' : ' sgs-nav-bar-menu__burger--' . $trigger_mode;
		if ( 'icon-and-text' === $trigger_mode && 'before' === $icon_position ) {
			$mode_class .= ' sgs-nav-bar-menu__burger--icon-before';
		}

		// Wave 3C U-9 (DEC-09, Builder-A interface #1) — always emitted, on the
		// SAME button that carries `data-wp-on--click="actions.toggleDrawer"`,
		// regardless of icon default/custom: store.js's resize watcher needs the
		// collapse width whichever glyph is in use.
		$collapse_attr = ' data-sgs-nav-collapse="' . absint( $collapse_point ) . '"';

		// Wave 3C U-9 (§4.4) — the morph mode selector only has matching CSS for
		// the restructured 3-bar default glyph (see `$icon_html`'s `$is_default_icon`
		// branch above); a custom glyph gets no attribute at all, since there is
		// nothing for it to select.
		$morph_attr = '';
		if ( $is_default_icon && in_array( $burger_morph, array( 'x', 'x-rotate', 'line', 'none' ), true ) ) {
			$morph_attr = ' data-sgs-nav-burger-morph="' . esc_attr( $burger_morph ) . '"';
		}

		return sprintf(
			'<div class="sgs-nav-bar-menu__toggle-wrap" data-wp-interactive="sgs/nav" %1$s data-wp-init="callbacks.pruneDanglingAriaControls">' .
			'<button type="button" class="sgs-nav-bar-menu__burger%2$s" data-wp-on--click="actions.toggleDrawer" data-wp-bind--aria-expanded="state.isOpen" aria-controls="%3$s"%4$s%5$s%8$s%9$s>%6$s%7$s</button>' .
			'</div>',
			$burger_context_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_interactivity_data_wp_context() self-escapes.
			esc_attr( $mode_class ),
			esc_attr( $drawer_ref ),
			$aria_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from a fixed literal + esc_attr__() by this function or its caller.
			$magnet_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from fixed literals + absint()+esc_attr() values in render.php.
			$icon_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted icon markup from sgs_nav_shared_icon_markup() (esc_attr/esc_html per source).
			$text_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled above from an esc_html() label.
			$collapse_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from absint().
			$morph_attr // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from a fixed literal + esc_attr() against a closed allow-list.
		);
	}
}
