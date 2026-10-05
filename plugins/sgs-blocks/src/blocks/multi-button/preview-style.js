/**
 * sgs/multi-button — the editor canvas's style for the button row at the
 * device tier the editor is previewing, resolved the way render.php emits it.
 *
 * @package SGS\Blocks
 */

import { containerWrapperPreview, isCssGradient, tierLengthPreview } from '../../utils';
import { resolveColourToken } from '../../components';

/**
 * The flex row at a tier. render.php's base rule is the desktop tier; its tablet
 * rule falls back to desktop and its mobile rule to fixed defaults for direction
 * (column), wrap (nowrap), gap (8px) and alignment (stretch), as declared there.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier from `usePreviewTier()`.
 * @return {Object} Flex declarations for the block root.
 */
export function multiButtonFlexPreview( attributes, tier = 'desktop' ) {
	const { flexDirection = {}, flexWrap = {}, gap = {}, justifyContent = {}, alignItems = {} } = attributes;
	const has = ( v ) => undefined !== v && null !== v && '' !== v;
	const pick = ( obj, desktopDefault, mobileDefault ) => {
		const desktop = has( obj?.desktop ) ? obj.desktop : desktopDefault;
		if ( 'desktop' === tier ) {
			return desktop;
		}
		if ( 'tablet' === tier ) {
			return has( obj?.tablet ) ? obj.tablet : desktop;
		}
		return has( obj?.mobile ) ? obj.mobile : mobileDefault ?? desktop;
	};
	const gapAt = ( raw, fallback ) => tierLengthPreview( raw ) ?? fallback;
	const desktopGap = gapAt( gap?.desktop, '12px' );
	return {
		display: 'flex',
		flexDirection: pick( flexDirection, 'row', 'column' ),
		flexWrap: pick( flexWrap, 'nowrap', 'nowrap' ),
		gap: {
			desktop: desktopGap,
			tablet: gapAt( gap?.tablet, desktopGap ),
			mobile: gapAt( gap?.mobile, '8px' ),
		}[ tier ] || desktopGap,
		justifyContent: pick( justifyContent, 'flex-start' ),
		alignItems: pick( alignItems, 'center', 'stretch' ),
	};
}

/**
 * The shared wrapper's paint on this block (kind 'content': border, corner
 * radius, max-width) plus the child-button group defaults render.php passes as
 * `--sgs-mb-btn-*-default` custom properties, which every child sgs/button reads.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} Style fragment for the block root.
 */
export function multiButtonWrapperPreview( attributes, tier, palette ) {
	const wrapper = containerWrapperPreview( attributes, tier, palette ).style;
	const style = {};
	[ 'borderWidth', 'borderStyle', 'borderColor', 'borderImage', 'borderRadius', 'maxWidth' ].forEach( ( key ) => {
		if ( undefined !== wrapper[ key ] ) {
			style[ key ] = wrapper[ key ];
		}
	} );
	if ( attributes.childBtnBackground ) {
		style[ '--sgs-mb-btn-bg-default' ] = resolveColourToken( attributes.childBtnBackground, palette ) || attributes.childBtnBackground;
	}
	if ( isCssGradient( attributes.childBtnBackgroundGradient ) ) {
		style[ '--sgs-mb-btn-bg-image-default' ] = attributes.childBtnBackgroundGradient;
	}
	if ( attributes.childBtnTextColour ) {
		style[ '--sgs-mb-btn-color-default' ] = resolveColourToken( attributes.childBtnTextColour, palette ) || attributes.childBtnTextColour;
	}
	return style;
}
