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
		// The alpha as the draft wrote it (a function's last argument); a hex digit pair only quantises it, so it is the fallback.
		const written = String( css[ 'background-color' ] ).match( /^rgba?\([^)]*?[,/]\s*([\d.]+)(%?)\s*\)$/i );
		const alpha = written ? Number( written[ 1 ] ) / ( written[ 2 ] ? 100 : 1 ) : hex && 9 === hex.length ? Math.round( parseInt( hex.slice( 7 ), 16 ) / 2.55 ) / 100 : 1;
		const own = undefined === css.opacity ? 1 : Number( css.opacity );
		const blur = String( css[ 'backdrop-filter' ] ?? '' ).match( /blur\(\s*([\d.]+(?:px|rem|em))\s*\)/ )?.[ 1 ] ?? null;
		const fades = /\b(opacity|all)\b/.test( css[ 'transition-property' ] ?? '' );
		return { colour: hex ? hex.slice( 0, 7 ) : null, opacity: hex && Number.isFinite( own ) ? num( alpha * own ) : null, blur, fade: fades ? ms( css[ 'transition-duration' ] ) : null };
	}
	return null;
}

// nodes: Fill's records ({ index, name }); flat: the tree's nodes by index; refOf( node ): its ref; facts: the fact record;
// scrimBlocks: the blocks whose settings paint a scrim (framework DB); defaultOf( block, attr ): the setting's default, parsed.
// Returns { writes, unmapped, notes }.
export function scrimWrites( { nodes, flat, refOf, facts, scrimBlocks, defaultOf } ) {
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
			if ( null === value || json( value ) === json( defaultOf( rec.name, attr ) ) || undefined !== node.attributes?.[ attr ] ) {
				continue;
			}
			const { before, after } = setAttr( node, { attr, value } );
			out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: attr, attr, before, after, widths: [], how: 'scrim', note: 'the draft\'s backdrop beside its drawers (a surface part of kind backdrop)' } );
		}
		look.colour || out.notes.push( `${ ref }: the draft's backdrop paints no plain colour, so ${ rec.name } keeps its own scrim colour` );
	}
	return out;
}
