// Fill's writer of the page dimming behind a drawer or the basket panel (Spec 48 FR-48-8, plan RF1): the draft draws one
// backdrop element beside its drawers (a fixed, inset-0 `div` with `background: rgba(58, 42, 34, .45)` and an opacity
// transition; the fact record's surface part of kind `backdrop`), and the framework's drawers and basket panel paint their own
// scrim from `scrimColour` (opaque), `scrimOpacity` (per device), `scrimBlur` and `scrimFadeDuration` (css_element `scrim`).
// The draft states colour and strength as one rgba(), so the colour is written opaque and its alpha, times any opacity the
// backdrop declares itself, is the strength: written as the one value the block would otherwise multiply a second time.
// A value equal to the setting's default is not written. A block with no such settings is skipped (the framework DB names them).
import { colourHex } from './tokens.mjs';
import { setAttr } from './tree.mjs';

const json = ( v ) => JSON.stringify( v ?? null );
const num = ( v ) => Math.round( Number( v ) * 1000 ) / 1000;

// The declared static values of a template element of the fact record: { property: value }.
const declaredOf = ( tpl ) => Object.fromEntries( ( tpl?.style?.static || [] ).map( ( [ p, v ] ) => [ p, v ] ) );

// The seconds or milliseconds of a CSS time as milliseconds.
const ms = ( t ) => {
	const m = String( t ?? '' ).trim().match( /^([\d.]+)(ms|s)$/ );
	return m ? Math.round( Number( m[ 1 ] ) * ( 's' === m[ 2 ] ? 1000 : 1 ) ) : null;
};

// The alpha a colour function states: the fourth comma argument, or the argument after `/`; `rgb(r, g, b)` states none, so 1
// (its blue is not an alpha). A hex digit pair only quantises the alpha, so it is the fallback for an 8-digit hex.
function alphaOf( value, hex ) {
	const fn = String( value ).match( /^(?:rgba?|hsla?)\(\s*([^)]*?)\s*\)$/i );
	if ( fn ) {
		const args = fn[ 1 ].split( ',' );
		const arg = fn[ 1 ].includes( '/' ) ? fn[ 1 ].split( '/' )[ 1 ] : 4 === args.length ? args[ 3 ] : null;
		const m = String( arg ?? '' ).trim().match( /^([\d.]+)(%?)$/ );
		return m ? Number( m[ 1 ] ) / ( m[ 2 ] ? 100 : 1 ) : 1;
	}
	return hex && 9 === hex.length ? Math.round( parseInt( hex.slice( 7 ), 16 ) / 2.55 ) / 100 : 1;
}

// The blocks whose scrim is the page dimming behind a drawer or the basket panel, from the framework DB: the interactive
// overlay blocks (category sgs-interactive: nav-drawer, cart) that hold a scrim colour and a scrim fade. The other scrim
// blocks dim something else (a gallery's lightbox, an open dropdown or mega panel, the product search), which the draft's
// drawer backdrop does not style.
export const drawerScrimBlocks = ( db ) => new Set( db.prepare(
	"SELECT DISTINCT a.block_slug FROM block_attributes a JOIN block_attributes f ON f.block_slug = a.block_slug AND f.attr_name = 'scrimFadeDuration' AND f.css_element = 'scrim' JOIN blocks b ON b.slug = a.block_slug WHERE a.css_element = 'scrim' AND a.attr_name = 'scrimColour' AND b.category = 'sgs-interactive'"
).all().map( ( r ) => r.block_slug ) );

// The draft's backdrop look: { colour, opacity, blur, fade } from the first `backdrop` part of the fact record's surfaces, or
// null when the draft draws none. `colour` is null when the declared background is not a plain colour (a gradient, a var()).
export function backdropLook( facts ) {
	const els = facts?.elements || {};
	for ( const surface of Object.values( facts?.surfaces || {} ) ) {
		const part = ( surface.parts || [] ).find( ( p ) => 'backdrop' === p.kind );
		const css = part ? declaredOf( els[ part.roots?.[ 0 ] ]?.template ) : null;
		if ( ! css ) {
			continue;
		}
		const hex = /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test( colourHex( css[ 'background-color' ] ) ?? '' ) ? colourHex( css[ 'background-color' ] ).toLowerCase() : null;
		const alpha = alphaOf( css[ 'background-color' ], hex );
		const blur = String( css[ 'backdrop-filter' ] ?? '' ).match( /blur\(\s*([\d.]+(?:px|rem|em))\s*\)/ )?.[ 1 ] ?? null;
		const fades = /\b(opacity|all)\b/.test( css[ 'transition-property' ] ?? '' );
		// A static opacity is the backdrop's strength only when it stays: 0 is its hidden rest (a class or state shows it later),
		// and a transitioned opacity is a rest value the open state replaces, so neither multiplies the colour's own alpha.
		const own = undefined === css.opacity || fades || 0 === Number( css.opacity ) ? 1 : Number( css.opacity );
		return { colour: hex ? hex.slice( 0, 7 ) : null, opacity: hex && Number.isFinite( own ) ? num( alpha * own ) : null, blur, fade: fades ? ms( css[ 'transition-duration' ] ) : null };
	}
	return null;
}

// nodes: Fill's records ({ index, name }); flat: the tree's nodes by index; refOf( node ): its ref; facts: the fact record;
// scrimBlocks: the blocks whose scrim sits behind a drawer or the basket panel (drawerScrimBlocks); defaultOf( block, attr ): the
// setting's default, parsed; declares( block, attr ): whether the block has that setting (a block without it is never written it).
// Returns { writes, unmapped, notes }.
export function scrimWrites( { nodes, flat, refOf, facts, scrimBlocks, defaultOf, declares } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const look = backdropLook( facts );
	const targets = nodes.filter( ( r ) => scrimBlocks.has( r.name ) );
	if ( ! look || ! targets.length ) {
		return out;
	}
	const values = {
		scrimColour: look.colour,
		scrimOpacity: null === look.opacity ? null : { desktop: look.opacity },
		scrimBlur: look.blur ? { desktop: look.blur } : null,
		scrimFadeDuration: look.fade,
	};
	for ( const rec of targets ) {
		const node = flat[ rec.index ];
		const ref = refOf( node );
		for ( const [ attr, value ] of Object.entries( values ) ) {
			if ( null === value || ! declares( rec.name, attr ) || json( value ) === json( defaultOf( rec.name, attr ) ) || undefined !== node.attributes?.[ attr ] ) {
				continue;
			}
			const { before, after } = setAttr( node, { attr, value } );
			out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: attr, attr, before, after, widths: [], how: 'scrim', note: 'the draft\'s backdrop beside its drawers (a surface part of kind backdrop)' } );
		}
		look.colour || out.notes.push( `${ ref }: the draft's backdrop paints no plain colour, so ${ rec.name } keeps its own scrim colour` );
	}
	return out;
}
