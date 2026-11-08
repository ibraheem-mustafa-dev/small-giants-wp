// Chrome rules, states and measured parts: the open-status badge (sgs/business-info), the header's top row leaving with the page
// (sgs/site-header-row), the burger bar thickness (sgs/nav-bar-menu) and the process steps' connector line and badge hover
// trigger (sgs/process-steps). A value is a computed read of the draft element, a record, or the client's chrome values file.
import { TIER_WIDTHS } from './fill-prop.mjs';
import { recordsOf, settle } from './apply-chrome-records.mjs';
import { stateLook } from './apply-records.mjs';
import { numberHover } from './apply-chrome-number.mjs';
import { iconHoverColour } from './apply-chrome-iconcolour.mjs';
import { closeIconSize } from './apply-chrome-closeicon.mjs';
import { menuIntent } from './apply-intent.mjs';
import { constantLength, relativeLength } from './apply-lengths.mjs';

const TIER = { [ TIER_WIDTHS[ 0 ] ]: 'desktop', [ TIER_WIDTHS[ 1 ] ]: 'tablet', [ TIER_WIDTHS[ 2 ] ]: 'mobile' };
const toHex = ( rgb ) => {
	const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec( String( rgb ).trim() );
	if ( ! m ) {
		return String( rgb );
	}
	const part = ( n ) => Math.round( Number( n ) ).toString( 16 ).padStart( 2, '0' );
	const alpha = undefined === m[ 4 ] || 1 === Number( m[ 4 ] ) ? '' : part( Number( m[ 4 ] ) * 255 );
	return `#${ [ 1, 2, 3 ].map( ( i ) => part( m[ i ] ) ).join( '' ).toUpperCase() }${ alpha.toUpperCase() }`;
};
// The colour a line is drawn in: its background, or, when that is clear, its dashed or solid border.
const paintOf = ( f ) => {
	const bg = toHex( f.styles[ 'background-color' ] );
	if ( ! /^#[0-9A-F]{6}00$/.test( bg ) && 'transparent' !== bg ) {
		return bg;
	}
	const side = [ 'top', 'bottom' ].find( ( x ) => Number.parseFloat( f.styles[ `border-${ x }-width` ] ) > 0 && 'none' !== f.styles[ `border-${ x }-style` ] );
	return side ? toHex( f.styles[ `border-${ side }-color` ] ) : null;
};
// A line the draft paints with a linear gradient: the gradient with each rgb stop as hex, else null.
export const gradientOf = ( f ) => {
	const img = String( f.styles[ 'background-image' ] ?? '' ).trim();
	return /^linear-gradient\(/.test( img ) && ! /url\(/.test( img ) ? img.replace( /rgba?\([^)]+\)/g, ( c ) => toHex( c ) ) : null;
};
// A line the draft draws dashed or dotted (connectorLineStyle): no gradient, a dashed or dotted border on the line's own side
// (top or bottom for a horizontal line, left or right for a vertical one). Solid returns ''.
export const lineStyleOf = ( f ) => {
	if ( gradientOf( f ) ) {
		return '';
	}
	const sides = [ 'top', 'bottom', 'left', 'right' ].filter( ( x ) => Number.parseFloat( f.styles[ `border-${ x }-width` ] ) > 0 );
	return sides.map( ( x ) => f.styles[ `border-${ x }-style` ] ).find( ( s ) => 'dashed' === s || 'dotted' === s ) ?? '';
};
// The connectorLineStyle write for a drawn line: its dashed or dotted style, or solid over a stale non-solid one, else nothing.
const lineStyleWrites = ( line, saved ) => {
	const style = lineStyleOf( line );
	return style ? [ { attr: 'connectorLineStyle', value: style } ] : saved.connectorLineStyle && 'solid' !== saved.connectorLineStyle ? [ { attr: 'connectorLineStyle', value: 'solid' } ] : [];
};
const shown = ( f ) => f && 'none' !== f.styles?.display && f.box?.w > 0 && f.box?.h > 0;

// The open-status badge in its closed state, read from the draft under the closed clock (apply.mjs: ctx.closed): the dot's colour,
// whether the dot pulses while closed, and the order of the reopening line's words. A draft that is open at that clock yields
// nothing: its closed look is not on the page.
export const pulseDot = ( { target, recordsIndex } ) => {
	const reach = new Set( [ ...( target.reach ?? [] ), Number( /\/(\d+)#/.exec( target.tpl )?.[ 1 ] ) ] );
	for ( const list of recordsIndex.values() ) {
		for ( const r of list ) {
			const pulse = ( r.properties || [] ).some( ( p ) => 'box-shadow' === p.property && /^0 0 0 0 currentColor/.test( p.from ?? '' ) );
			const id = Number( [].concat( r.element?.template_tpl_id ?? [] )[ 0 ] );
			if ( pulse && reach.has( id ) ) {
				return [ { key: `${ target.key ?? target.ref }~${ id }`, tpl: `Root/${ id }#0` } ];
			}
		}
	}
	return [];
};

function lineOrder( text ) {
	const time = /\d{1,2}(?::\d{2})?\s?(?:am|pm)/i.exec( text )?.[ 0 ];
	const words = String( text ).split( /\s+/ );
	if ( ! time || words.length < 3 ) {
		return null;
	}
	const rest = words.slice( 1 ).filter( ( w ) => w !== time && 'at' !== w.toLowerCase() );
	if ( 1 !== rest.length ) {
		return null;
	}
	return { lead: words[ 0 ], pattern: text.replace( words[ 0 ], '{lead}' ).replace( rest[ 0 ], '{when}' ).replace( time, '{time}' ) };
}

function openStatus( { saved, closed, aux, target } ) {
	if ( 'open-status' !== saved.displayType ) {
		return [];
	}
	const key = target.key ?? target.ref;
	const draft = closed?.draft?.[ key ];
	if ( ! draft ) {
		return [ { status: 'no-setting', prop: 'openStatusClosedDot', why: 'no closed-clock read of the draft for this block' } ];
	}
	const writes = [];
	const dotKey = Object.keys( closed.draft ).find( ( k ) => k.startsWith( `${ key }~` ) );
	const dot = dotKey && closed.draft[ dotKey ];
	if ( dot && 'none' !== dot.styles?.display && saved.openStatusOpenDot !== undefined ) {
		const colour = toHex( dot.styles[ 'background-color' ] );
		colour !== toHex( saved.openStatusOpenDot ) && writes.push( { attr: 'openStatusClosedDot', value: colour } );
	}
	const pulsing = ( closed.animate ?? [] ).some( ( a ) => a.key === key && JSON.stringify( a.frames ?? '' ).includes( 'box-shadow' ) || ( dotKey && a.key === dotKey ) );
	saved.openStatusDotPulse && pulsing && writes.push( { attr: 'openStatusDotPulseWhen', value: 'always' } );
	const order = saved.openStatusShowLine === false ? null : lineOrder( draft.text );
	// The closed clock reads the opening line only, so its word order and lead word go on the opening line's own settings.
	order && writes.push( { attr: 'openStatusOpensPattern', value: order.pattern }, { attr: 'openStatusOpensLabel', value: order.lead } );
	return writes.length ? [ settle( { prop: 'openStatusClosedDot', why: `${ target.tpl } closed state read from the draft under the closed clock`, saved, writes } ) ] : [];
}

// The strip above the header is a plain element above the sticky header in the draft: it leaves with the page. The live row
// hides on a scroll down instead. rowScrollAway, per tier where the draft row shows and does not itself stick.
function headerRow( { saved, draft, target } ) {
	if ( 'top' !== saved.rowSlot ) {
		return [];
	}
	const away = {};
	for ( const [ w, tier ] of Object.entries( TIER ) ) {
		const f = draft[ w ];
		if ( shown( f ) && ! /sticky|fixed/.test( f.styles?.position ?? '' ) ) {
			away[ tier ] = 'on';
		}
	}
	if ( ! Object.keys( away ).length ) {
		return [];
	}
	const writes = [ { attr: 'rowScrollAway', value: away } ];
	if ( saved.rowHideOnScroll && Object.keys( saved.rowHideOnScroll ).length ) {
		writes.push( { attr: 'rowHideOnScroll', unset: true } );
	}
	return [ settle( { prop: 'rowScrollAway', why: `${ target.tpl } leaves with the page at ${ Object.keys( away ).join( ', ' ) }`, saved, writes } ) ];
}

// The burger's bars: the records that move the bars name them as children of the burger button.
export const burgerBars = ( { target, recordsIndex } ) => {
	const reach = new Set( target.reach ?? [] );
	const out = new Map();
	for ( const list of recordsIndex.values() ) {
		for ( const r of list ) {
			const parent = /set by :hover on tpl (\d+)/.exec( r.trigger?.detail ?? '' )?.[ 1 ];
			const id = [].concat( r.element?.template_tpl_id ?? [] )[ 0 ];
			if ( parent && reach.has( Number( parent ) ) && 'width' === stateLook( r )?.looks[ 0 ]?.property && id ) {
				out.set( id, { key: `${ target.key ?? target.ref }~${ id }`, tpl: `Root/${ id }#0` } );
			}
		}
	}
	return [ ...out.values() ];
};

function burger( { saved, aux, target } ) {
	const bar = Object.values( aux )[ 0 ];
	if ( ! bar ) {
		return [];
	}
	const value = {};
	for ( const [ w, tier ] of Object.entries( TIER ) ) {
		const h = parseFloat( bar[ w ]?.styles?.height );
		if ( shown( bar[ w ] ) && h > 0 ) {
			value[ tier ] = `${ Math.round( h * 2 ) / 2 }px`;
		}
	}
	if ( ! Object.keys( value ).length ) {
		return [];
	}
	const next = { ...( saved.burgerBarThickness || {} ), ...value };
	return [ settle( { prop: 'burgerBarThickness', why: `${ target.tpl } burger bars are ${ Object.values( value ).join( '/' ) } tall`, saved, writes: [ { attr: 'burgerBarThickness', value: next } ] } ) ];
}

// A connector line the draft draws as one element: the record that draws it (scaleX or scaleY 0 to 1) names it.
export const connectorLine = ( { target, recordsIndex } ) => {
	const reach = new Set( target.reach ?? [] );
	const out = [];
	for ( const list of recordsIndex.values() ) {
		for ( const r of list ) {
			const ids = [].concat( r.element?.template_tpl_id ?? [] ).map( Number );
			const draws = ( r.properties || [] ).some( ( p ) => 'transform' === p.property && /scale[XY]\(0\)/.test( p.from ?? '' ) );
			ids.filter( ( id ) => reach.has( id ) && draws ).forEach( ( id ) => out.push( { key: `${ target.key ?? target.ref }~${ id }`, tpl: `Root/${ id }#0` } ) );
		}
	}
	return out.slice( 0, 1 );
};

const LINE_RULE = /[^{}@]*::?(?:before|after)\s*\{[^{}]*\}\s*/g;

// The timeline's rail: its dashed or dotted style from the draft's drawn line.
function timelineRail( { saved, draft, aux, target } ) {
	const line = Object.values( aux )[ 0 ]?.[ TIER_WIDTHS[ 0 ] ];
	const writes = shown( line ) && draft[ TIER_WIDTHS[ 0 ] ]?.box ? lineStyleWrites( line, saved ) : [];
	return writes.length ? [ settle( { prop: 'connectorLineStyle', why: `${ target.tpl } draws a ${ lineStyleOf( line ) || 'solid' } rail`, saved, writes } ) ] : [];
}

// The draft states its inset as a round percentage (16%), a few px off the exact centre at the narrower widths.
const CENTRE_TOLERANCE = 3;

// The connector's width and its offset from the top of the steps, read at every width where the line shows: the width relative to
// the steps' own width (or per device), the offset as px only where every width agrees. { writes, gaps }.
export function connectorLengths( { saved, draft, aux, block, db } ) {
	const lines = Object.values( aux )[ 0 ];
	const widths = TIER_WIDTHS.filter( ( w ) => shown( lines?.[ w ] ) && draft[ w ]?.box );
	const sample = ( of ) => Object.fromEntries( widths.map( ( w ) => [ w, of( w ) ] ) );
	// The framework's default line runs from the first step's centre to the last step's centre: an inset of half a column from each
	// edge, (row width - (steps - 1) * gap) / (2 * steps). A line that does so at every width needs no connectorWidth.
	const stepCount = Array.isArray( saved.steps ) ? saved.steps.length : 0;
	const onCentres = stepCount > 1 && widths.length > 0 && widths.every( ( w ) => {
		const gap = parseFloat( draft[ w ].styles?.[ 'column-gap' ] );
		const row = draft[ w ].box;
		const inset = ( row.w - ( stepCount - 1 ) * ( Number.isNaN( gap ) ? 0 : gap ) ) / ( 2 * stepCount );
		return 'column-gap' in ( draft[ w ].styles || {} ) && Math.abs( lines[ w ].box.x - row.x - inset ) <= CENTRE_TOLERANCE && Math.abs( row.x + row.w - lines[ w ].box.x - lines[ w ].box.w - inset ) <= CENTRE_TOLERANCE;
	} );
	const width = onCentres ? { value: null } : relativeLength( { db, block: block ?? 'sgs/process-steps', attr: 'connectorWidth', samples: sample( ( w ) => ( { px: lines[ w ].box.w, of: draft[ w ].box.w } ) ) } );
	const offset = constantLength( { db, block: block ?? 'sgs/process-steps', attr: 'connectorOffset', samples: sample( ( w ) => ( { px: lines[ w ].box.y + parseFloat( lines[ w ].styles.height ) / 2 - draft[ w ].box.y } ) ) } );
	const writes = [ [ 'connectorWidth', width ], [ 'connectorOffset', offset ] ].filter( ( [ , r ] ) => r.value ).map( ( [ attr, r ] ) => ( { attr, value: r.value } ) );
	onCentres && saved.connectorWidth && writes.push( { attr: 'connectorWidth', unset: true } );
	return { writes, gaps: [ width, offset ].filter( ( r ) => r.reason ).map( ( r ) => ( { status: 'no-setting', prop: 'connectorLine', why: r.reason } ) ), saved };
}

function processSteps( ctx ) {
	const { saved, draft, aux, target } = ctx;
	const out = [];
	const top = TIER_WIDTHS[ 0 ];
	const line = Object.values( aux )[ 0 ]?.[ top ];
	if ( shown( line ) && draft[ top ]?.box ) {
		const h = parseFloat( line.styles.height );
		const lengths = connectorLengths( ctx );
		const writes = [
			{ attr: 'connectorLine', value: true },
			...( paintOf( line ) ? [ { attr: 'connectorColour', value: paintOf( line ) } ] : [] ),
			...( gradientOf( line ) ? [ { attr: 'connectorColourGradient', value: gradientOf( line ) } ] : saved.connectorColourGradient ? [ { attr: 'connectorColourGradient', unset: true } ] : [] ),
			...lineStyleWrites( line, saved ),
			{ attr: 'connectorThickness', value: `${ Math.round( h * 10 ) / 10 }px` },
			...lengths.writes,
		];
		// The tiers where the draft's line is not drawn (no element, or display none) while the steps are: connectorHidden holds true
		// there and nowhere else.
		const lines = Object.values( aux )[ 0 ];
		const gone = Object.fromEntries( TIER_WIDTHS.filter( ( w ) => shown( draft[ w ] ) && ! shown( lines?.[ w ] ) ).map( ( w ) => [ TIER[ w ], true ] ) );
		Object.keys( gone ).length && writes.push( { attr: 'connectorHidden', value: gone } );
		if ( saved.sgsCustomCss ) {
			const rest = saved.sgsCustomCss.replace( LINE_RULE, '' ).trim();
			rest === saved.sgsCustomCss || writes.push( rest ? { attr: 'sgsCustomCss', value: rest } : { attr: 'sgsCustomCss', unset: true } );
		}
		out.push( settle( { prop: 'connectorLine', why: `${ target.tpl } draws one ${ line.styles.height } connector line`, saved, writes } ), ...lengths.gaps );
	}
	const records = recordsOf( ctx, 'reach' ).filter( ( r ) => 'hover' === r.trigger?.type );
	const own = records.filter( ( r ) => /style-hover/.test( r.trigger?.detail ?? '' ) );
	const parent = records.filter( ( r ) => /parent-driven/.test( r.trigger?.detail ?? '' ) );
	if ( own.length && ! parent.length ) {
		out.push( settle( { prop: 'numberHoverTrigger', why: `${ target.tpl } the badge repaints on its own hover (${ own[ 0 ].id })`, saved, writes: [ { attr: 'numberHoverTrigger', value: 'number' } ], record: own[ 0 ].id, state: 'hover' } ) );
	}
	out.push( ...numberHover( ctx ) );
	return out;
}

// The floating button's distance from the viewport edges, read from the draft's fixed element at every width where it shows: one
// value for every device, so it is written only where the widths agree.
function whatsapp( { saved, draft, target } ) {
	const reads = TIER_WIDTHS.map( ( w ) => draft[ w ] ).filter( ( f ) => f && 'fixed' === f.styles?.position && shown( f ) );
	if ( ! reads.length || ! reads.every( ( f ) => /px$/.test( f.styles.right ) && /px$/.test( f.styles.bottom ) ) ) {
		return [];
	}
	const edge = ( side ) => [ ...new Set( reads.map( ( f ) => f.styles[ side ] ) ) ];
	if ( edge( 'right' ).length > 1 || edge( 'bottom' ).length > 1 ) {
		return [ { status: 'no-setting', prop: 'floatingOffset', why: `${ target.tpl } floats ${ edge( 'right' ).join( ' / ' ) } from the right and ${ edge( 'bottom' ).join( ' / ' ) } from the bottom by device; floatingOffset is one value for every device` } ];
	}
	const value = { right: reads[ 0 ].styles.right, bottom: reads[ 0 ].styles.bottom };
	return [ settle( { prop: 'floatingOffset', why: `${ target.tpl } floats ${ value.right } from the right and ${ value.bottom } from the bottom`, saved, writes: [ { attr: 'floatingOffset', value } ] } ) ];
}

// A card whose image circle the draft shows on hover (a clip-path circle set by :hover on the card): a tap on a touch screen
// shows that circle, so the cursor-field effect takes touchMode circle.
function cursorField( { saved, target, recordsIndex } ) {
	const effects = saved.sgsMotion?.elements?.root?.effects;
	const index = Array.isArray( effects ) ? effects.findIndex( ( e ) => 'cursor-field' === e.effect && 'image-reveal' === e.values?.field ) : -1;
	if ( index < 0 ) {
		return [];
	}
	const id = /\/(\d+)#/.exec( target.tpl )?.[ 1 ];
	const circle = [ ...recordsIndex.values() ].flat().find( ( r ) => new RegExp( 'set by :hover on tpl ' + id + String.raw`(?!\d)` ).test( r.trigger?.detail ?? '' ) && ( r.properties || [] ).some( ( p ) => 'clip-path' === p.property && /^circle\(/.test( p.to ?? '' ) ) );
	if ( ! circle ) {
		return [];
	}
	const next = structuredClone( saved.sgsMotion );
	next.elements.root.effects[ index ].values.touchMode = 'circle';
	return [ settle( { prop: 'touchMode', why: `${ target.tpl } shows its hover circle on a tap (${ circle.id })`, saved, writes: [ { attr: 'sgsMotion', value: next } ], record: circle.id, state: 'hover' } ) ];
}

// The first row of the opened drawer's menu: its border is the list's divider (separators.row colour and width per tier).
// The first row's parent is the element just before it in the draft's pre-order ids; the divider sits on the row or on that parent.
export const rowWrapper = ( { target, block } ) => {
	const lo = Number( /\/(\d+)#/.exec( target.tpl )?.[ 1 ] );
	return 'sgs/nav-drawer-menu' === block && /^row /i.test( target.slot ?? '' ) && /01/.test( target.slot ) && lo > 1 ? [ { key: `${ target.key }~wrap`, tpl: `Root/${ lo - 1 }#0` } ] : [];
};

function drawerRow( { saved, draft, aux, target, all } ) {
	const owner = all?.blocks?.[ target.ref ];
	if ( 'sgs/nav-drawer-menu' !== owner?.block || ! /^row /i.test( target.slot ?? '' ) || target.slot.includes( 'rows' ) || ! /01/.test( target.slot ) ) {
		return [];
	}
	const row = { ...( owner.attrs.separators?.row ?? {} ), style: 'solid' };
	const width = {};
	for ( const [ w, tier ] of Object.entries( TIER ) ) {
		const f = [ draft[ w ], ...Object.values( aux ?? {} ).map( ( a ) => a[ w ] ) ].find( ( c ) => c && [ 'bottom', 'top' ].some( ( x ) => parseFloat( c.styles?.[ `border-${ x }-width` ] ) > 0 && 'none' !== c.styles?.[ `border-${ x }-style` ] ) ) ?? draft[ w ];
		const side = f && [ 'bottom', 'top' ].find( ( x ) => parseFloat( f.styles?.[ `border-${ x }-width` ] ) > 0 && 'none' !== f.styles?.[ `border-${ x }-style` ] );
		if ( shown( f ) && side ) {
			width[ tier ] = f.styles[ `border-${ side }-width` ];
			row.colour = toHex( f.styles[ `border-${ side }-color` ] );
		}
	}
	if ( ! row.colour ) {
		return [];
	}
	row.width = { ...( row.width ?? {} ), ...width };
	return [ settle( { prop: 'separators', why: `${ target.tpl } the draft's row divider is ${ row.colour }`, saved: owner.attrs, writes: [ { attr: 'separators', value: { ...( owner.attrs.separators ?? {} ), row } } ] } ) ];
}

export function stateRule( ctx ) {
	if ( ctx.target.slot ) {
		return drawerRow( ctx );
	}
	const own = cursorField( ctx );
	return [ ...own, ...( { 'sgs/business-info': openStatus, 'sgs/site-header-row': headerRow, 'sgs/nav-bar-menu': ( c ) => [ ...burger( c ), ...menuIntent( c ) ], 'sgs/process-steps': processSteps, 'sgs/timeline': timelineRail, 'sgs/whatsapp-cta': whatsapp, 'sgs/nav-drawer': closeIconSize, 'sgs/icon': iconHoverColour }[ ctx.block ]?.( ctx ) ?? [] ) ];
}
