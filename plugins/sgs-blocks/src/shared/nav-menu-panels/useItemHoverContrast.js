/**
 * SGS Nav Bar/Drawer Menu (shared, sgs/nav-bar-menu + sgs/nav-drawer-menu) — item hover-text readability check (FR-41-5).
 *
 * Split out of edit.js (file-size maintenance pass, 2026-09-14) — verbatim
 * logic, just relocated behind a hook boundary, matching the existing
 * `useDrawerNotice`/`useNavMenuSource` extraction pattern in this directory.
 *
 * UNCONDITIONAL — fires regardless of `itemSmartContrast` (that attribute
 * only gates the automatic colour SWAP in nav-menu-css.php; this warns every
 * time, so an operator always knows their choice may be hard to read,
 * whether or not they want it auto-corrected). Only checked against
 * `itemColourHover` once the operator has actually set one — an untouched
 * attribute stays '' in the stored attributes even though render.php
 * default-closes it to 'accent' server-side (see nav-menu-css.php's own
 * comment on that default-close), so this never fires against a value the
 * operator never chose. Background is the hover fill if set, else falls back
 * to the resting surface (itemBg/navBg) — the same surface that shows
 * through when no hover background is set.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from 'react';
import {
	calculateRelativeLuminance,
	calculateContrastRatio,
	meetsWCAG_AA,
} from '../../utils/wcag-contrast';
import { resolveColourToken } from '../../components';

/**
 * @param {Object} root0                  Hook params.
 * @param {string} root0.itemColourHover  `itemColourHover` attribute value.
 * @param {string} root0.itemHoverSurface The surface actually behind the item on hover.
 * @param {Array}  root0.colourPalette    `useSettings( 'color.palette' )` result.
 * @param {Object} root0.contrastRefEl    Ref to an element in the block's own DOM subtree,
 *                                        used to resolve `var(--wp--preset--color--x)` stops.
 * @return {string|null} The warning notice text, or null when there is nothing to warn about.
 */
export default function useItemHoverContrast( {
	itemColourHover,
	itemHoverSurface,
	colourPalette,
	contrastRefEl,
} ) {
	const [ itemHoverContrastNotice, setItemHoverContrastNotice ] = useState( null );

	useEffect( () => {
		if ( ! itemColourHover || ! itemHoverSurface ) {
			setItemHoverContrastNotice( null );
			return;
		}

		try {
			const bgLuminance = calculateRelativeLuminance(
				resolveColourToken( itemHoverSurface, colourPalette ) || itemHoverSurface,
				contrastRefEl.current
			);
			const fgLuminance = calculateRelativeLuminance(
				resolveColourToken( itemColourHover, colourPalette ) || itemColourHover,
				contrastRefEl.current
			);
			const ratio = calculateContrastRatio( bgLuminance, fgLuminance );

			if ( ! meetsWCAG_AA( ratio, false ) ) {
				setItemHoverContrastNotice(
					__(
						'This hover colour may be hard to read against its background. Turn on “Keep text readable automatically” in the Accessibility panel (General tab) to have it corrected automatically, or choose a different colour.',
						'sgs-blocks'
					)
				);
			} else {
				setItemHoverContrastNotice( null );
			}
		} catch ( error ) {
			// Never throw on an unparseable colour — warn-only, fall back to no notice.
			setItemHoverContrastNotice( null );
		}
	}, [ itemColourHover, itemHoverSurface, colourPalette ] );

	return itemHoverContrastNotice;
}
