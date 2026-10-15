/**
 * The schema reads the editor-canvas emitter shares (Spec 38A §6.5, §10): the JS twin of `Sgs_Motion_Emitter::fields()`,
 * `property_channels()`, `value_css()`, `token_or()` and `ordered_channels()` in `includes/motion/class-sgs-motion-emitter.php`.
 *
 * Field names, owner properties, channels and their order come from the motion schema extract (`$defs`,
 * `x-sgs-channels`, `x-sgs-writes`, `x-sgs-effects`) through `src/components/motion/motion-defs.js`; values print through
 * the field-type twin (`src/components/motion/field-types.js`), whose own parity test pins it to the PHP class.
 *
 * @package SGS\Blocks
 */

import defs from '../../../../components/motion/motion-defs';
import { SGS_BREAKPOINTS } from '../../../../utils/responsive';
import {
	fieldCss,
	resolveToken,
} from '../../../../components/motion/field-types';

export const MH_PREFIX = '--sgs-mh-';
export const ME_PREFIX = '--sgs-me-';
export const TIERS = Object.freeze( [ 'desktop', 'tablet', 'mobile' ] );

const DEFS = defs.$defs || {};
const CHANNEL_ROWS = Array.isArray( defs[ 'x-sgs-channels' ] )
	? defs[ 'x-sgs-channels' ]
	: [];
const WRITES = defs[ 'x-sgs-writes' ] || {};
const EFFECTS = defs[ 'x-sgs-effects' ] || {};

const fieldCache = new Map();
let channelMap = null;

/**
 * The fields of one values def: key => node, field type, CSS property, state and per-device flag.
 *
 * @param {string} def A `$defs` name.
 * @return {Object<string,{node:Object,type:string,css:(string|null),state:(string|null),perDevice:boolean}>} Fields.
 */
export function fields( def ) {
	if ( ! fieldCache.has( def ) ) {
		const out = {};
		Object.entries( DEFS[ def ]?.properties || {} ).forEach(
			( [ key, node ] ) => {
				const meta =
					node && typeof node === 'object'
						? node[ 'x-sgs-field' ]
						: null;
				if ( meta && typeof meta === 'object' && meta.fieldType ) {
					out[ key ] = {
						node,
						type: String( meta.fieldType ),
						css: meta.cssProperty ? String( meta.cssProperty ) : null,
						state: meta.state ? String( meta.state ) : null,
						perDevice: Boolean( meta.perDevice ),
					};
				}
			}
		);
		fieldCache.set( def, out );
	}
	return fieldCache.get( def );
}

/**
 * Owner (and shared) custom property => channel, read from `x-sgs-channels`.
 *
 * @return {Object<string,string>} The map.
 */
export function propertyChannels() {
	if ( null === channelMap ) {
		channelMap = {};
		CHANNEL_ROWS.forEach( ( row ) => {
			( row.owners || [] ).forEach( ( owner ) =>
				( owner.properties || [] ).forEach( ( prop ) => {
					channelMap[ String( prop.name ) ] = String( row.channel );
				} )
			);
			( row.shared || [] ).forEach( ( prop ) => {
				channelMap[ String( prop.name ) ] = String( row.channel );
			} );
			( row.inputs || [] ).forEach( ( prop ) => {
				channelMap[ String( prop.name ) ] = String( row.channel );
			} );
		} );
	}
	return channelMap;
}

/**
 * The `x-sgs-channels` rows (the channel table, in order).
 *
 * @return {Object[]} Rows.
 */
export function channelRows() {
	return CHANNEL_ROWS;
}

/**
 * The channels an owner (an effect slug, `hoverState`, `followPointer`) writes, from `x-sgs-writes`.
 *
 * @param {string} owner Owner key.
 * @return {string[]} Channels.
 */
export function ownerWrites( owner ) {
	const list = WRITES[ owner ]?.channels;
	return Array.isArray( list ) ? list.map( String ) : [];
}

/**
 * The channels an effect layer writes (`Sgs_Motion_Emitter::effect_channels`): its effect's `channels`, narrowed by
 * an optional `select` (`{field, true, false}`) to the list matching the layer's desktop boolean value, so parallax
 * writes `background-position` only when its `background` switch is on and `translate` otherwise.
 *
 * @param {Object} layer An effect layer.
 * @return {string[]} Channels.
 */
export function layerWrites( layer ) {
	const writes = WRITES[ String( layer?.effect ?? '' ) ] || {};
	let list = writes.channels;
	const select = writes.select;
	if ( select && typeof select === 'object' && select.field !== undefined ) {
		const value = layer?.values?.[ String( select.field ) ];
		// PHP's empty(): false, 0, '', '0', null and an empty array are all off.
		const on = ! (
			! value ||
			'0' === value ||
			( Array.isArray( value ) && 0 === value.length )
		);
		list = select[ on ? 'true' : 'false' ] ?? list;
	}
	return Array.isArray( list ) ? list.map( String ) : [];
}

/**
 * The owner properties a named owner holds in `x-sgs-channels`, in table order.
 *
 * @param {string} ownerName Owner key.
 * @return {string[]} Property names.
 */
export function ownerProperties( ownerName ) {
	const out = [];
	CHANNEL_ROWS.forEach( ( row ) =>
		( row.owners || [] ).forEach( ( owner ) => {
			if ( ( owner.owner || '' ) === ownerName ) {
				( owner.properties || [] ).forEach( ( prop ) =>
					out.push( String( prop.name ) )
				);
			}
		} )
	);
	return out;
}

/**
 * An effect's values def name (`x-sgs-effects.<effect>.values` without its `#/$defs/` prefix), or ''.
 *
 * @param {string} effect Effect slug.
 * @return {string} Def name.
 */
export function effectValuesDef( effect ) {
	return String( EFFECTS[ effect ]?.values || '' ).replace( '#/$defs/', '' );
}

/**
 * A value's CSS through its field type, or null.
 *
 * @param {string}  def   Values def.
 * @param {string}  key   Field key.
 * @param {unknown} value Value.
 * @return {string|null} CSS.
 */
export function valueCss( def, key, value ) {
	const field = fields( def )[ key ];
	if ( ! field ) {
		return null;
	}
	const out = fieldCss( field.type, value, field.node );
	return out.ok && typeof out.css === 'string' && out.css !== ''
		? out.css
		: null;
}

/**
 * A token reference's CSS, with a literal fallback.
 *
 * @param {string} token    `token:<family>.<key>`.
 * @param {string} fallback Literal when the schema has no such token.
 * @return {string} CSS.
 */
export function tokenOr( token, fallback ) {
	return resolveToken( token ) ?? fallback;
}

/**
 * Channels in `x-sgs-channels` order, then any unknown ones in insertion order.
 *
 * @param {Object<string,boolean>} channels Channel set.
 * @return {string[]} Ordered channels.
 */
export function orderedChannels( channels ) {
	const order = CHANNEL_ROWS.map( ( row ) => row.channel );
	const keys = Object.keys( channels );
	return [
		...order.filter( ( channel ) => keys.includes( channel ) ),
		...keys.filter( ( channel ) => ! order.includes( channel ) ),
	];
}

/**
 * Per-tier value sources of a layer: desktop is `values`, the others its device overrides.
 *
 * @param {Object} layer A layer.
 * @return {{desktop:Object,tablet:Object,mobile:Object}} Tier values.
 */
export function tierValues( layer ) {
	const plain = ( v ) =>
		v && typeof v === 'object' && ! Array.isArray( v ) ? v : {};
	return {
		desktop: plain( layer?.values ),
		tablet: plain( layer?.devices?.tablet ),
		mobile: plain( layer?.devices?.mobile ),
	};
}

/**
 * Whether a stored value is a plain number.
 *
 * @param {unknown} v Value.
 * @return {boolean} True for a finite number.
 */
export function isNumber( v ) {
	return typeof v === 'number' && Number.isFinite( v );
}

/**
 * The scoped rules: desktop in the base rule, Tablet and Mobile inside their media queries (the `SGS_BREAKPOINTS`
 * constants, PHP's `SGS_Breakpoints`); a tier with no declarations writes no block. The twin of
 * `Sgs_Motion_Emitter::rules()`, the one per-device writer, also used by the trigger rules.
 *
 * @param {string} selector Scoped selector.
 * @param {Object} decls    Per-tier declarations.
 * @return {string} CSS.
 */
export function rules( selector, decls ) {
	const media = {
		desktop: null,
		tablet: `@media (max-width:${ SGS_BREAKPOINTS.TABLET_MAX }px)`,
		mobile: `@media (max-width:${ SGS_BREAKPOINTS.MOBILE_MAX }px)`,
	};
	return TIERS.map( ( tier ) => {
		const entries = Object.entries( decls[ tier ] || {} );
		if ( entries.length === 0 ) {
			return '';
		}
		const body = entries.map( ( [ prop, value ] ) => `${ prop }:${ value };` ).join( '' );
		const rule = `${ selector }{${ body }}`;
		return media[ tier ] === null ? rule : `${ media[ tier ] }{${ rule }}`;
	} ).join( '' );
}
