// Applier family: forms. One value on the form block serves every field (fieldBackground, fieldTextColour, labelColour and the
// focus settings), so every field of every step is read (lib/apply-probes.mjs: the draft's steps through its component's
// setState) and each property goes through the resolver at the field's part. Where the draft's fields differ among themselves
// the item is a no-setting row naming the values. The first field is also read under keyboard focus.
import { CONSENT_PROPS, FIELD_REST_PROPS, LABEL_PROPS } from './apply-probes.mjs';
import { partItems } from './apply-probe-items.mjs';
import { fieldWidths } from './apply-form-width.mjs';
import { matches } from './apply-ops.mjs';
import { parseColour } from './normalise.mjs';

const FOCUS = [ 'background-color', 'border-top-color', 'border-top-width', 'box-shadow' ];
const col = ( fields, key, prop ) => fields.map( ( f ) => f[ key ]?.[ prop ] );

// A focus shadow that is one solid ring, as computed styles print it: `rgba(10, 126, 168, 0.14) 0px 0px 0px 4px`.
export const ringOf = ( shadow ) => {
	const m = /^(rgba?\([^)]+\)) 0px 0px 0px ([\d.]+)px$/.exec( String( shadow ?? '' ).trim() );
	return m ? { colour: m[ 1 ].replace( /,\s+/g, ', ' ), width: Number( m[ 2 ] ) } : null;
};

// The ring goes through the focus settings by name: the shadow they print is not a calibrated reading.
function focusRing( { saved, d, l } ) {
	const ring = ringOf( d.focus?.[ 'box-shadow' ] );
	if ( ! ring ) {
		return [];
	}
	const held = saved.fieldFocusRingColour === ring.colour && Number( saved.fieldFocusRingWidth ) === ring.width;
	const live = ringOf( l.focus?.[ 'box-shadow' ] );
	const sameColour = ( a, b ) => JSON.stringify( parseColour( a ) ) === JSON.stringify( parseColour( b ) );
	if ( held || ( live && live.width === ring.width && sameColour( live.colour, ring.colour ) ) ) {
		return [ { status: 'equal', prop: 'fieldFocusRingWidth', state: 'focus', why: 'the focus ring gives the draft ring' } ];
	}
	return [ { status: 'op', prop: 'fieldFocusRingWidth', state: 'focus', why: `focus ring ${ d.focus[ 'box-shadow' ] }`, writes: [ { attr: 'fieldFocusRingColour', value: ring.colour }, { attr: 'fieldFocusRingWidth', value: ring.width } ], checks: [] } ];
}

// A label that shrinks as it floats up in the draft (focus size below its resting size) takes the floated size setting, which holds the
// floated state alone; the resting label size stays the label size setting's.
export function floatedLabel( { saved, d, l } ) {
	const want = d.focusLabel?.[ 'font-size' ];
	const rest = d.fields?.find( ( f ) => f.label )?.label?.[ 'font-size' ];
	const have = l.focusLabel?.[ 'font-size' ];
	if ( ! want || ! rest || parseFloat( want ) >= parseFloat( rest ) || ! have || matches( have, want ) ) {
		return [];
	}
	const value = `${ parseFloat( want ) }px`;
	if ( saved.labelFloatedFontSize?.desktop === value ) {
		return [ { status: 'no-setting', prop: 'labelFloatedFontSize', state: 'focus', why: `labelFloatedFontSize already holds ${ value }, yet the live floated label is ${ have }, not the draft's ${ want }: another rule wins` } ];
	}
	return [ { status: 'op', prop: 'labelFloatedFontSize', state: 'focus', why: `the draft's label shrinks from ${ rest } to ${ want } as it floats`, writes: [ { attr: 'labelFloatedFontSize', value: { ...( saved.labelFloatedFontSize ?? {} ), desktop: value } } ], checks: [ { width: 1440, prop: 'font-size', want, probe: [ 'focusLabel' ] } ] } ];
}

// sgs/form-field-consent: a tick box whose painted size differs from the draft's takes boxSize (width and height together).
export function consentBox( { block, draft, live, saved } ) {
	const d = draft[ 1440 ]?.probes?.box;
	const l = live[ 1440 ]?.probes?.box;
	if ( 'sgs/form-field-consent' !== block || ! d || ! l ) {
		return [];
	}
	if ( matches( l.width, d.width ) ) {
		return [ { status: 'equal', prop: 'boxSize', why: `the tick box is ${ l.width }, as in the draft` } ];
	}
	if ( saved?.boxSize === d.width ) {
		return [ { status: 'no-setting', prop: 'boxSize', why: `boxSize already holds ${ d.width }, yet the live box is ${ l.width }: another rule wins` } ];
	}
	return [ { status: 'op', prop: 'boxSize', why: `the draft's tick box is ${ d.width } square; live is ${ l.width }`, writes: [ { attr: 'boxSize', value: d.width } ], checks: [ { width: 1440, prop: 'width', want: d.width, probe: [ 'box' ] } ] } ];
}

export const form = {
	name: 'form',
	// grid-column: the span each field reads (the draft's cells are grid items whose placement the field width settings decide).
	props: [ 'grid-column' ],
	decide( ctx ) {
		const { draft, live, block } = ctx;
		const d = draft[ 1440 ]?.probes;
		const l = live[ 1440 ]?.probes;
		if ( 'sgs/form-field-consent' === block ) {
			return consentBox( ctx );
		}
		if ( 'sgs/form' !== block || ! d?.fields || ! l?.fields ) {
			return [];
		}
		const items = [];
		const why = d.steps > 1 ? ` (${ d.steps } steps read)` : '';
		for ( const prop of FIELD_REST_PROPS.filter( ( p ) => ! /^border-top-(color|width|style)$/.test( p ) ) ) {
			items.push( ...partItems( { ctx, element: 'field-input', prop, drafts: col( d.fields, 'field', prop ), lives: col( l.fields, 'field', prop ), check: { all: 'field' }, why } ) );
		}
		// A unitless line height and an em letter spacing are held against the part's own font size, the draft's (the size this run writes).
		const labelPx = parseFloat( col( d.fields, 'label', 'font-size' ).find( Boolean ) ) || null;
		for ( const prop of LABEL_PROPS ) {
			items.push( ...partItems( { ctx, element: 'field-label', prop, drafts: col( d.fields, 'label', prop ), lives: col( l.fields, 'label', prop ), check: { all: 'label' }, why, fontPx: labelPx } ) );
		}
		for ( const prop of CONSENT_PROPS ) {
			items.push( ...partItems( { ctx, element: 'consent-text', prop, drafts: [ d.consent?.[ prop ] ], lives: [ l.consent?.[ prop ] ], check: { probe: [ 'consent' ] }, fontPx: parseFloat( d.consent?.[ 'font-size' ] ) || null } ) );
		}
		items.push( ...focusRing( { saved: ctx.saved, d, l } ) );
		for ( const prop of FOCUS.filter( ( p ) => 'box-shadow' !== p || ! ringOf( d.focus?.[ p ] ) ).filter( () => d.focus && l.focus ) ) {
			items.push( ...partItems( { ctx, element: 'field-input', prop, state: 'focus', drafts: [ d.focus[ prop ] ], lives: [ l.focus[ prop ] ], check: { probe: [ 'focus' ] } } ) );
		}
		return [ ...items, ...floatedLabel( { saved: ctx.saved, d, l } ), ...fieldWidths( ctx ) ];
	},
};
