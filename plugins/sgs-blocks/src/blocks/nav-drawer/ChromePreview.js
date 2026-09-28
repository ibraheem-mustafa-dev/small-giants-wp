/**
 * Editor-canvas preview of the drawer's chrome row (Spec 36 FR-36-6): the
 * logo and free slot as the active editor device will show them, with the ×
 * preview passed in as children. Non-interactive, like the × preview; the
 * frontend markup is `includes/nav-drawer-chrome.php`. Inline styles are
 * editor-only (Spec 32 governs the frontend render).
 *
 * @package SGS\Blocks
 */

import { resolveTier } from '../../utils';

/**
 * The logo URL the given tier shows (tablet falls back to desktop, mobile to tablet).
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       desktop | tablet | mobile.
 * @return {string} URL or ''.
 */
function logoUrlFor( attributes, tier ) {
	const desktop = attributes.chromeLogoUrl || '';
	const tablet = attributes.chromeLogoUrlTablet || desktop;
	const mobile = attributes.chromeLogoUrlMobile || tablet;
	return { desktop, tablet, mobile }[ tier ] || '';
}

/**
 * @param {Object}  props            Props.
 * @param {Object}  props.attributes Block attributes.
 * @param {string}  props.deviceTier The active editor device tier.
 * @param {Element} props.children   The × preview.
 * @return {Element} The preview row.
 */
export default function ChromePreview( { attributes, deviceTier, children } ) {
	const tier = deviceTier || 'desktop';
	const logoUrl = logoUrlFor( attributes, tier );
	const showLogo = !! logoUrl && false !== resolveTier( attributes.chromeLogoShow, tier, true );
	const type = attributes.chromeSlotType || '';
	const text = ( attributes.chromeSlotText || '' ).trim();
	const showSlot =
		'' !== type &&
		'' !== text &&
		( 'button' !== type || !! attributes.chromeSlotUrl ) &&
		false !== resolveTier( attributes.chromeSlotShow, tier, true );
	const placement = attributes.chromeSlotPlacement || 'after-logo';
	const height = resolveTier( attributes.chromeRowHeight, tier, '' );
	const gap = resolveTier( attributes.chromeRowGap, tier, '' );
	const logoWidth = resolveTier( attributes.chromeLogoWidth, tier, '' );

	return (
		<div
			className="sgs-nav-drawer__chrome sgs-nav-drawer__chrome-preview"
			style={ {
				...( height ? { minHeight: height } : {} ),
				...( gap ? { gap } : {} ),
			} }
		>
			{ children }
			{ showLogo && (
				<span className="sgs-nav-drawer__chrome-logo">
					<img
						className="sgs-nav-drawer__chrome-logo-image"
						src={ logoUrl }
						alt=""
						style={ logoWidth ? { width: logoWidth, height: 'auto' } : undefined }
					/>
				</span>
			) }
			{ showSlot && (
				<span
					className={ `sgs-nav-drawer__chrome-slot sgs-nav-drawer__chrome-slot--${ type } sgs-nav-drawer__chrome-slot--at-${ placement }` }
				>
					{ text }
				</span>
			) }
		</div>
	);
}
