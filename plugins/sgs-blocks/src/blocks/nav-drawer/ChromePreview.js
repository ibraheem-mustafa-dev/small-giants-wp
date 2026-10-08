/**
 * Editor-canvas preview of the drawer's chrome row (Spec 36 FR-36-6): the
 * logo and free slot as the active editor device will show them, with the ×
 * preview passed in as children. Non-interactive, like the × preview; the
 * frontend markup is `includes/nav-drawer-chrome.php`. Inline styles are
 * editor-only (Spec 32 governs the frontend render).
 *
 * @package SGS\Blocks
 */

import ServerSideRender from '../../components/ServerSideRender';
import { resolveTier, tierLengthPreview } from '../../utils';
import { chromeRowStyle, chromeSlotStyle } from './chrome-preview-style';

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
 * The `sgs/google-rating-badge` attributes for the google-rating slot; the
 * same object includes/nav-drawer-chrome.php::sgs_nav_drawer_chrome_rating_attrs sends.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} The badge's attributes.
 */
function ratingBadgeAttributes( attributes ) {
	const badge = {
		badgeStyle: 'pill',
		compactBelow: 0,
		showCount: !! attributes.chromeSlotBadgeShowCount,
		borderStyle: 'none',
		borderWidth: { top: '0', right: '0', bottom: '0', left: '0' },
		backgroundColour: 'transparent',
		padding: { desktop: { right: '0', left: '0' } },
	};
	const colour = ( attributes.chromeSlotColour || '' ).trim();
	if ( colour ) {
		badge.scoreColour = colour;
		badge.captionColour = colour;
	}
	return badge;
}

/**
 * @param {Object}  props            Props.
 * @param {Object}  props.attributes Block attributes.
 * @param {string}  props.deviceTier The active editor device tier.
 * @param {Array}   props.palette    Theme colour palette.
 * @param {Element} props.children   The × preview.
 * @return {Element} The preview row.
 */
export default function ChromePreview( { attributes, deviceTier, palette, children } ) {
	const tier = deviceTier || 'desktop';
	const logoUrl = logoUrlFor( attributes, tier );
	const showLogo = !! logoUrl && false !== resolveTier( attributes.chromeLogoShow, tier, true ).value;
	const type = attributes.chromeSlotType || '';
	const text = ( attributes.chromeSlotText || '' ).trim();
	const isRating = 'google-rating' === type;
	const showSlot =
		'' !== type &&
		( isRating || '' !== text ) &&
		( 'button' !== type || !! attributes.chromeSlotUrl ) &&
		false !== resolveTier( attributes.chromeSlotShow, tier, true ).value;
	const placement = attributes.chromeSlotPlacement || 'after-logo';
	const logoWidth = tierLengthPreview( attributes.chromeLogoWidth, tier );
	const linkedLogo = ! Object.prototype.hasOwnProperty.call( attributes, 'chromeLogoLink' ) || !! attributes.chromeLogoLink;
	const LogoTag = linkedLogo ? 'a' : 'span';
	// The slot's tag, as nav-drawer-chrome.php picks it: a heading takes its level, a label is a span, text a paragraph, a button a link.
	const SlotTag = {
		heading: [ 'h2', 'h3', 'h4', 'p' ].includes( attributes.chromeSlotHeadingLevel ) ? attributes.chromeSlotHeadingLevel : 'h2',
		label: 'span',
		text: 'p',
		button: 'a',
	}[ type ] || 'span';
	const slotLinkProps = 'button' === type && attributes.chromeSlotNewTab ? { target: '_blank', rel: 'noopener' } : {};

	return (
		<div
			className="sgs-nav-drawer__chrome sgs-nav-drawer__chrome-preview"
			style={ chromeRowStyle( attributes, tier, palette ) }
		>
			{ children }
			{ showLogo && (
				<LogoTag
					className="sgs-nav-drawer__chrome-logo"
					{ ...( linkedLogo ? { href: '#', onClick: ( event ) => event.preventDefault() } : {} ) }
				>
					<img
						className="sgs-nav-drawer__chrome-logo-image"
						src={ logoUrl }
						alt=""
						style={ logoWidth ? { width: logoWidth, height: 'auto' } : undefined }
					/>
				</LogoTag>
			) }
			{ showSlot && isRating && (
				<div
					className={ `sgs-nav-drawer__chrome-slot sgs-nav-drawer__chrome-slot--google-rating sgs-nav-drawer__chrome-slot--at-${ placement }` }
				>
					<ServerSideRender block="sgs/google-rating-badge" attributes={ ratingBadgeAttributes( attributes ) } />
				</div>
			) }
			{ showSlot && ! isRating && (
				<SlotTag
					className={ `sgs-nav-drawer__chrome-slot sgs-nav-drawer__chrome-slot--${ type } sgs-nav-drawer__chrome-slot--at-${ placement }` }
					style={ chromeSlotStyle( attributes, tier, palette ) }
					{ ...( 'button' === type ? { href: '#', onClick: ( event ) => event.preventDefault(), ...slotLinkProps } : {} ) }
				>
					{ text }
				</SlotTag>
			) }
		</div>
	);
}
