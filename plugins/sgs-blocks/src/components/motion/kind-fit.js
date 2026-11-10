/**
 * Which effects fit which media kind, and on which devices (Spec 49 §10.1, FR-49-40).
 *
 * A part that declares `availableWhen: { slot, kinds }` shows a different kind on each device (a photo on Desktop, a
 * video on Mobile). The Effects panel lists an effect when it fits the kind on at least one device, names the devices
 * it fits, and scopes the layer to them through the layer's `off` tiers, which every effect runtime already honours.
 *
 * The filter is the registry's own: an effect whose schema row names `x-part-kinds` `svg` fits an SVG kind, one that
 * names `text` fits no media kind, and `effect-kinds.json` names the effects that need an image. An effect with no
 * such row fits every kind.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';
import defs from './motion-defs';
import effectKinds from './effect-kinds.json';

export const KIND_DEVICES = [ 'desktop', 'tablet', 'mobile' ];
const DEVICE_LABELS = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };
const KIND_NOUNS = { image: 'a photo', video: 'a video', embed: 'a video', svg: 'an SVG' };

const EFFECTS = defs[ 'x-sgs-effects' ];

/** An embed is shown as a video: the same effects fit both. */
const normalise = ( kind ) => ( 'embed' === kind ? 'video' : kind );

/**
 * Whether an effect fits one media kind.
 *
 * @param {string} effect Effect slug.
 * @param {string} kind   `image`, `video`, `embed` or `svg`.
 * @return {boolean} True when it fits.
 */
export function effectFitsKind( effect, kind ) {
	const resolved = normalise( kind );
	const partKinds = EFFECTS[ effect ]?.[ 'x-part-kinds' ];
	if ( Array.isArray( partKinds ) ) {
		if ( ! partKinds.includes( 'svg' ) || 'svg' !== resolved ) {
			return false;
		}
	}
	const needs = effectKinds[ effect ];
	return ! Array.isArray( needs ) || needs.includes( resolved );
}

/**
 * The devices an effect fits, given the kind shown on each.
 *
 * @param {string} effect         Effect slug.
 * @param {Object} kindsByDevice  `{ desktop, tablet, mobile }` to a kind.
 * @return {string[]} The fitting devices, widest first.
 */
export function devicesFor( effect, kindsByDevice ) {
	return KIND_DEVICES.filter( ( device ) => kindsByDevice[ device ] && effectFitsKind( effect, kindsByDevice[ device ] ) );
}

/**
 * The effects that fit the kind on at least one device, in the given order.
 *
 * @param {string[]} effects        Candidate slugs.
 * @param {Object}   kindsByDevice  `{ desktop, tablet, mobile }` to a kind.
 * @return {string[]} The slugs.
 */
export function effectsForKinds( effects, kindsByDevice ) {
	return effects.filter( ( effect ) => devicesFor( effect, kindsByDevice ).length > 0 );
}

/**
 * The `off` tiers (tablet, mobile) an effect needs on this slot: the narrower devices whose kind it does not fit.
 * Desktop is the base tier and has no `off`.
 *
 * @param {string} effect         Effect slug.
 * @param {Object} kindsByDevice  `{ desktop, tablet, mobile }` to a kind.
 * @return {string[]} `tablet` and/or `mobile`.
 */
export function offTiersFor( effect, kindsByDevice ) {
	const fits = devicesFor( effect, kindsByDevice );
	return [ 'tablet', 'mobile' ].filter( ( device ) => ! fits.includes( device ) );
}

/**
 * The sentence the panel shows when an effect does not run on every device, or '' when it does.
 *
 * @param {string} effect         Effect slug.
 * @param {Object} kindsByDevice  `{ desktop, tablet, mobile }` to a kind.
 * @return {string} For example "Desktop and tablet; the phone shows a video."
 */
export function deviceNote( effect, kindsByDevice ) {
	const fits = devicesFor( effect, kindsByDevice );
	const misses = KIND_DEVICES.filter( ( device ) => ! fits.includes( device ) && kindsByDevice[ device ] );
	if ( ! misses.length || ! fits.length ) {
		return '';
	}
	const names = fits.map( ( d ) => DEVICE_LABELS[ d ] );
	const list = 1 === names.length ? names[ 0 ] : `${ names.slice( 0, -1 ).join( ', ' ) } ${ __( 'and', 'sgs-blocks' ) } ${ names[ names.length - 1 ].toLowerCase() }`;
	const shown = misses
		.map( ( d ) => {
			const noun = KIND_NOUNS[ kindsByDevice[ d ] ] || kindsByDevice[ d ];
			const who = 'mobile' === d ? __( 'the phone', 'sgs-blocks' ) : 'tablet' === d ? __( 'the tablet', 'sgs-blocks' ) : __( 'the desktop', 'sgs-blocks' );
			/* translators: 1: the device, for example "the phone"; 2: what it shows, for example "a video". */
			return sprintf( __( '%1$s shows %2$s', 'sgs-blocks' ), who, noun );
		} )
		.join( '; ' );
	return `${ list }; ${ shown }.`;
}

/**
 * Whether a part is available for the kinds shown: its `availableWhen.kinds` includes the kind on some device.
 * A part with no `availableWhen` is always available.
 *
 * @param {Object|undefined} part           The part's declaration.
 * @param {Object}           kindsByDevice  `{ desktop, tablet, mobile }` to a kind.
 * @return {boolean} True when the target picker lists it.
 */
export function partAvailable( part, kindsByDevice ) {
	const kinds = part?.availableWhen?.kinds;
	if ( ! Array.isArray( kinds ) ) {
		return true;
	}
	return KIND_DEVICES.some( ( device ) => kinds.includes( normalise( kindsByDevice[ device ] ) ) || kinds.includes( kindsByDevice[ device ] ) );
}
