<?php
/**
 * The mega panel's drawer copy (Spec 36 FR-36-6, "Mega items in the drawer"):
 * the opt-in rules `mega-panel/render.php` adds inside its `$sgs_mm_in_drawer`
 * block.
 *
 * - The card shell (`drawerShell*`): corner radius, padding and shadow on the
 *   panel itself in the drawer, where it otherwise draws no shell.
 * - The link-row fill (`drawerLinkBg*` at rest, `drawerLinkHoverBg*` while the
 *   row is hovered or holds keyboard focus, touch-guarded) and the row's
 *   corner radius (`drawerLinkRadius`).
 * - The aside card's radius and padding outside compact mode
 *   (`drawerCardRadius`, `drawerCardPadding`), which compact mode prints itself.
 * - `drawerCardLayout` `stacked-overlay`: the aside card at full width, its
 *   media frame on top with the tag laid over the image's top-left corner,
 *   the title and description below it, and the link drawn as a 40px circle
 *   holding only its icon (the label stays as the link's accessible name),
 *   from the mega-aside's five-slot order (media frame, tag, title,
 *   description, link).
 *
 * Every unset attribute emits nothing. Rules are rooted on the panel's own
 * uid class, as the rest of the drawer copy's rules are.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-colour-variants.php';
require_once __DIR__ . '/helpers-box.php';
require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/helpers-css-safety.php';

if ( ! function_exists( 'sgs_mega_panel_drawer_len' ) ) {
	/**
	 * One single-length attribute, validated.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $key        Attribute name.
	 * @return string A CSS length, or ''.
	 */
	function sgs_mega_panel_drawer_len( array $attributes, string $key ): string {
		return sgs_css_single_length_value( isset( $attributes[ $key ] ) && is_string( $attributes[ $key ] ) ? trim( $attributes[ $key ] ) : '' );
	}
}

if ( ! function_exists( 'sgs_mega_panel_drawer_shell_css' ) ) {
	/**
	 * The drawer copy's card shell and its link-row hover.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The panel's scoped root selector.
	 * @param string $row_sel    The link-row selector.
	 * @return string CSS.
	 */
	function sgs_mega_panel_drawer_shell_css( array $attributes, string $root_sel, string $row_sel ): string {
		$css    = '';
		$decls  = array();
		$radius = sgs_mega_panel_drawer_len( $attributes, 'drawerShellRadius' );
		if ( '' !== $radius ) {
			$decls[] = 'border-radius:' . $radius;
		}
		$decls  = array_merge( $decls, sgs_box_object_longhand_list( $attributes['drawerShellPadding'] ?? null, 'padding' ) );
		$shadow = sgs_shadow_decls( $attributes, sgs_shadow_attr_map( 'drawerShellShadow' ), 'sgs/mega-panel' );
		$decls  = array_merge( $decls, $shadow['normal'] );
		if ( $decls ) {
			$css .= $root_sel . '{' . implode( ';', $decls ) . ';}';
		}

		$row_decls  = array();
		$row_radius = sgs_mega_panel_drawer_len( $attributes, 'drawerLinkRadius' );
		if ( '' !== $row_radius ) {
			$row_decls[] = 'border-radius:' . $row_radius;
		}
		$fill      = sgs_fill_decls(
			$attributes,
			array(
				'base'           => 'drawerLinkBg',
				'gradient'       => 'drawerLinkBgGradient',
				'hover'          => 'drawerLinkHoverBg',
				'hover_gradient' => 'drawerLinkHoverBgGradient',
			)
		);
		$row_decls = array_merge( $row_decls, $fill['normal'] );
		if ( $row_decls ) {
			$css .= $row_sel . '{' . implode( ';', $row_decls ) . ';}';
		}
		if ( $fill['hover'] ) {
			$css .= sgs_hover_state_rules( $row_sel, implode( ';', $fill['hover'] ), ':focus-within' );
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_mega_panel_drawer_card_box_decls' ) ) {
	/**
	 * The aside card's radius and padding outside compact mode.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Declarations (each ending `;`), or ''.
	 */
	function sgs_mega_panel_drawer_card_box_decls( array $attributes ): string {
		$out    = '';
		$radius = sgs_mega_panel_drawer_len( $attributes, 'drawerCardRadius' );
		$pad    = sgs_mega_panel_drawer_len( $attributes, 'drawerCardPadding' );
		if ( '' !== $radius ) {
			$out .= 'border-radius:' . $radius . ';';
		}
		if ( '' !== $pad ) {
			$out .= 'padding:' . $pad . ';';
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_mega_panel_drawer_stacked_css' ) ) {
	/**
	 * The `stacked-overlay` aside card.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $aside_sel  The in-drawer aside selector.
	 * @param string $card_decls The card's ground and spacing declarations.
	 * @return string CSS.
	 */
	function sgs_mega_panel_drawer_stacked_css( array $attributes, string $aside_sel, string $card_decls ): string {
		$radius = sgs_mega_panel_drawer_len( $attributes, 'drawerCardRadius' );
		$pad    = sgs_mega_panel_drawer_len( $attributes, 'drawerCardPadding' );
		$pad    = '' !== $pad ? $pad : '14px';
		$gap    = sgs_mega_panel_drawer_len( $attributes, 'drawerCardGap' );
		$gap    = '' !== $gap ? $gap : '12px';

		$css  = $aside_sel . '{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:' . $gap . ';align-items:center;position:relative;overflow:hidden;flex:none;width:100%;padding:0;'
			. ( '' !== $radius ? 'border-radius:' . $radius . ';' : '' )
			. $card_decls . '}';
		$css .= sgs_border_states_css(
			$aside_sel,
			$attributes,
			array(
				'base'     => 'drawerCardBorderColour',
				'gradient' => 'drawerCardBorderColourGradient',
				'width'    => '1px',
			)
		);
		// Slot 1, the media frame, spans the card's full width at the top.
		$css .= $aside_sel . ' > :nth-child(1){grid-column:1 / -1;grid-row:1;width:100%;margin:0;}';
		// Slot 2, the tag, sits over the image's top-left corner.
		$css .= $aside_sel . ' > :nth-child(2){position:absolute;inset-block-start:12px;inset-inline-start:12px;z-index:1;margin:0;pointer-events:none;}';
		// Slots 3 and 4, the title and description, fill the first column below the image.
		$css .= $aside_sel . ' > :nth-child(3){grid-column:1;grid-row:2;margin:0;padding-block-start:' . $pad . ';padding-inline-start:' . $pad . ';}';
		$css .= $aside_sel . ' > :nth-child(4){grid-column:1;grid-row:3;margin:4px 0 0;padding-block-end:' . $pad . ';padding-inline-start:' . $pad . ';}';
		// Slot 5, the link, is a 40px circle beside them holding only its icon.
		$css .= $aside_sel . ' > :nth-child(5){grid-column:2;grid-row:2 / span 2;margin:0;padding-inline-end:' . $pad . ';}';
		$css .= $aside_sel . ' > :nth-child(5) .sgs-button{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:40px;height:40px;min-width:40px;padding:0;border-radius:50%;}';
		$css .= $aside_sel . ' > :nth-child(5) .sgs-button__label{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}';

		$tag_size = sgs_mega_panel_drawer_len( $attributes, 'drawerCardTagSize' );
		$tag_pad  = sgs_box_object_longhand_list( $attributes['drawerCardTagPadding'] ?? null, 'padding' );
		if ( '' !== $tag_size || $tag_pad ) {
			$css .= $aside_sel . ' > :nth-child(2) .wp-block-sgs-label{'
				. ( '' !== $tag_size ? 'font-size:' . $tag_size . ';line-height:1.5;' : '' )
				. ( $tag_pad ? implode( ';', $tag_pad ) . ';' : '' ) . '}';
		}
		$title_size = sgs_mega_panel_drawer_len( $attributes, 'drawerCardTitleSize' );
		$title_lh   = sgs_mega_panel_drawer_len( $attributes, 'drawerCardTitleLineHeight' );
		if ( '' !== $title_size || '' !== $title_lh ) {
			$css .= $aside_sel . ' > :nth-child(3){'
				. ( '' !== $title_size ? 'font-size:' . $title_size . ';' : '' )
				. ( '' !== $title_lh ? 'line-height:' . $title_lh . ';' : '' ) . '}';
		}
		return $css;
	}
}
