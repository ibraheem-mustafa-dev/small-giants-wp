<?php
/**
 * Nav bar panels on the Entrance model (Spec 38A FR-38A-51, unit M4.6): what `sgs/nav-bar-menu` reads from its
 * motion layers.
 *
 * During the overlap (build plan, "One model per block during the overlap") a bar whose `sgsMotion` holds elements or
 * stagger settings is on the new model. Every dropdown and mega panel it renders is then a motion state host:
 *
 * - each panel wrap (`.sgs-nav-bar-menu__panel-motion`, the `panel` part) prints `data-sgs-motion-state=""`, and
 *   `panel-motion-state.js` sets `open` and `close` on it as its trigger's `aria-expanded` flips, so the `open`
 *   entrances inside it play (`assets/css/motion-triggers.css`);
 * - the panel's items are server-rendered (dropdown links from the menu, mega panel columns and rows from another
 *   post), so their delays are written by the server from the bar's stored `sgsMotion.stagger` settings: each item
 *   gets its index in its own panel as `data-sgs-loop-i` (restarting per panel, never `:nth-child`) and
 *   `Sgs_Motion_Loop_Delays::item_array` writes one scoped `--sgs-me-delay` (and `--sgs-me-close-delay`) rule per
 *   index. The item parts: `subitem` (a dropdown `<li>`), `mega-item` (a direct child of a mega panel's content row)
 *   and `mega-row` (a direct child of a `sgs/mega-group` column); a part's items are tagged only when it holds an
 *   entrance, and the two mega parts get their class here, because the mega panel's own markup does not print it;
 * - a closing panel stays displayed while its host carries `close`, so the close values play; it takes no pointer
 *   hits and sits below an opening panel, so a move from one trigger to the next never lands on the closing one.
 *
 * The old U-5 panel motion (the `--{shape}` panel classes, the `--sgs-nbm-*` values and the item ladders keyed on
 * `.sgs-nav-bar-menu--panel-stagger`) is skipped for a bar on the model: its panels print the `--none` shape and the
 * stagger classes are never printed. A bar with no `sgsMotion` keeps the old motion until the M6.5 sweep.
 *
 * Panels moved to `<body>` by `mega-disclosure.js` (a bar placed in page content, outside the site header) leave the
 * scoped root, so neither the old rules nor the scoped motion rules reach them; that limitation is unchanged.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-nav-drawer-motion-model.php';

if ( ! function_exists( 'sgs_nav_bar_motion_item_parts' ) ) {
	/**
	 * The bar's item parts on the Entrance model: part key => [ container class, item class ]. An item is a direct
	 * child of a container; the item class is the part's BEM class (`Sgs_Motion_Targets::part_class`).
	 *
	 * @return array<string,array{0:string,1:string}>
	 */
	function sgs_nav_bar_motion_item_parts(): array {
		return array(
			'subitem'   => array( 'sgs-nav-bar-menu__submenu', 'sgs-nav-bar-menu__subitem' ),
			'mega-item' => array( 'sgs-mega-panel__content', 'sgs-nav-bar-menu__mega-item' ),
			'mega-row'  => array( 'sgs-mega-group', 'sgs-nav-bar-menu__mega-row' ),
		);
	}
}

if ( ! function_exists( 'sgs_nav_bar_uses_motion_model' ) ) {
	/**
	 * Whether the bar's panels are on the Entrance model: its `sgsMotion` holds stagger settings or a layer on a part
	 * other than `burger`. A layer on the burger alone (the morph's speed and easing, includes/helpers-state-motion-model.php)
	 * leaves the panels on the old motion until the M6.5 sweep.
	 *
	 * @param array $attributes Block attributes.
	 * @return bool
	 */
	function sgs_nav_bar_uses_motion_model( array $attributes ): bool {
		if ( ! sgs_nav_drawer_uses_motion_model( $attributes ) ) {
			return false;
		}
		$motion = $attributes['sgsMotion'];
		if ( ! empty( $motion['stagger'] ) ) {
			return true;
		}
		return array() !== array_diff( array_keys( is_array( $motion['elements'] ?? null ) ? $motion['elements'] : array() ), array( 'burger' ) );
	}
}

if ( ! function_exists( 'sgs_nav_bar_motion_layer' ) ) {
	/**
	 * One part's entrance layer (`elements.<part>.entrance.base`).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $part       Part key.
	 * @return array|null The layer, or null when the part has none.
	 */
	function sgs_nav_bar_motion_layer( array $attributes, string $part ): ?array {
		$base = $attributes['sgsMotion']['elements'][ $part ]['entrance']['base'] ?? null;
		return is_array( $base ) && array() !== $base ? $base : null;
	}
}

if ( ! function_exists( 'sgs_nav_bar_motion_timing' ) ) {
	/**
	 * The panel entrance's timing, for the scrim: `enter_ms` the open duration, `exit_ms` the close duration (falling
	 * back to the open duration, as the close rule in `motion-triggers.css` does), both null when the panel has no
	 * `open` entrance or stores a token; `easing` the panel's easing as CSS, '' when none is stored.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{enter_ms:?int,exit_ms:?int,easing:string}
	 */
	function sgs_nav_bar_motion_timing( array $attributes ): array {
		$out   = array(
			'enter_ms' => null,
			'exit_ms'  => null,
			'easing'   => '',
		);
		$layer = sgs_nav_bar_motion_layer( $attributes, 'panel' );
		if ( null === $layer || 'open' !== ( $layer['trigger'] ?? '' ) ) {
			return $out;
		}
		$values          = is_array( $layer['values'] ?? null ) ? $layer['values'] : array();
		$close           = is_array( $layer['close'] ?? null ) ? $layer['close'] : array();
		$out['enter_ms'] = sgs_nav_drawer_motion_ms( $values['duration'] ?? null );
		$out['exit_ms']  = array_key_exists( 'closeDuration', $close ) ? sgs_nav_drawer_motion_ms( $close['closeDuration'] ) : $out['enter_ms'];

		$easing = is_string( $values['easing'] ?? null ) ? $values['easing'] : '';
		if ( '' !== $easing && class_exists( '\SGS\Blocks\Motion\Sgs_Motion_Field_Types' ) ) {
			$easing = \SGS\Blocks\Motion\Sgs_Motion_Field_Types::css( 'easing', $easing );
			$easing = $easing['ok'] && is_string( $easing['css'] ?? null ) ? $easing['css'] : '';
		} else {
			// No field-type validator to vet the stored string: fail closed rather than pass it to CSS.
			$easing = '';
		}
		$out['easing'] = $easing;
		return $out;
	}
}

if ( ! function_exists( 'sgs_nav_bar_motion_tag_panels' ) ) {
	/**
	 * Mark every panel wrap as a motion state host and give each item its class and its index in its own panel.
	 *
	 * @param string                                 $html  The rendered items (`sgs_nav_bar_menu_render_items`).
	 * @param array<string,array{0:string,1:string}> $parts The item parts to tag: key => [ container class, item class ].
	 * @return array{html:string,counts:array<string,int>} The HTML and, per item class, the most items one panel holds.
	 */
	function sgs_nav_bar_motion_tag_panels( string $html, array $parts ): array {
		// Elements whose content the tag processor skips: never a nesting level (their closer may not be visited).
		$raw        = array( 'SCRIPT', 'STYLE', 'TEXTAREA', 'TITLE', 'IFRAME', 'NOEMBED', 'NOFRAMES', 'XMP' );
		$void       = array( 'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'LINK', 'META', 'SOURCE', 'TRACK', 'WBR' );
		$containers = array();
		$counts     = array();
		foreach ( $parts as $pair ) {
			$containers[ $pair[0] ] = $pair[1];
			$counts[ $pair[1] ]     = 0;
		}
		$processor = new \WP_HTML_Tag_Processor( $html );
		// Open elements: [ tag, item class its direct children take (or ''), children tagged so far ].
		$stack = array();
		while ( $processor->next_tag( array( 'tag_closers' => 'visit' ) ) ) {
			$tag = (string) $processor->get_tag();
			if ( $processor->is_tag_closer() ) {
				for ( $i = count( $stack ) - 1; $i >= 0; --$i ) {
					if ( $stack[ $i ][0] === $tag ) {
						array_splice( $stack, $i );
						break;
					}
				}
				continue;
			}
			if ( $processor->has_class( 'sgs-nav-bar-menu__panel-motion' ) ) {
				$processor->set_attribute( 'data-sgs-motion-state', '' );
			}
			$top = count( $stack ) - 1;
			if ( $top >= 0 && '' !== $stack[ $top ][1] && ! in_array( $tag, $raw, true ) ) {
				$item_class = $stack[ $top ][1];
				if ( ! $processor->has_class( $item_class ) ) {
					$processor->add_class( $item_class );
				}
				$processor->set_attribute( \SGS\Blocks\Motion\Sgs_Motion_Loop_Delays::ITEM_ATTR, (string) $stack[ $top ][2] );
				++$stack[ $top ][2];
				$counts[ $item_class ] = max( $counts[ $item_class ], $stack[ $top ][2] );
			}
			if ( in_array( $tag, $raw, true ) || in_array( $tag, $void, true ) || $processor->has_self_closing_flag() ) {
				continue;
			}
			$takes = '';
			foreach ( $containers as $container_class => $item_class ) {
				if ( $processor->has_class( $container_class ) ) {
					$takes = $item_class;
					break;
				}
			}
			$stack[] = array( $tag, $takes, 0 );
		}
		return array(
			'html'   => $processor->get_updated_html(),
			'counts' => $counts,
		);
	}
}

if ( ! function_exists( 'sgs_nav_bar_motion_panels' ) ) {
	/**
	 * The bar's panels on the Entrance model: the tagged items, the stored item delays and the closing-panel rule.
	 *
	 * @param string $html       The rendered items.
	 * @param string $uid        The bar's per-instance class.
	 * @param array  $attributes Block attributes.
	 * @return array{html:string,style:string,css:string} `style` is the delay rules' `<style>` tag where the collector
	 *                                                    never flushes (the editor preview), '' otherwise; `css` goes
	 *                                                    into the bar's own scoped `<style>`.
	 */
	function sgs_nav_bar_motion_panels( string $html, string $uid, array $attributes ): array {
		$parts = array();
		foreach ( sgs_nav_bar_motion_item_parts() as $part => $pair ) {
			if ( null !== sgs_nav_bar_motion_layer( $attributes, $part ) ) {
				$parts[ $part ] = $pair;
			}
		}
		$tagged = sgs_nav_bar_motion_tag_panels( $html, $parts );
		$style  = '';
		foreach ( $tagged['counts'] as $item_class => $count ) {
			if ( $count < 1 ) {
				continue;
			}
			$style .= (string) \SGS\Blocks\Motion\Sgs_Motion_Loop_Delays::item_array( 'sgs/nav-bar-menu', $uid, $attributes, $count, '.' . $item_class );
		}
		$css = '.' . $uid . ' .sgs-nav-bar-menu__panel-motion[data-sgs-motion-state~="close"]{display:block;pointer-events:none;z-index:99;}';
		return array(
			'html'  => $tagged['html'],
			'style' => $style,
			'css'   => $css,
		);
	}
}
