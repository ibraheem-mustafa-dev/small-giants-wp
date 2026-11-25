// Items from a probe (lib/apply-probes.mjs): one differing computed value of a part becomes a setting write through the
// resolver, found by the DB's css_element, never by a name table of this file's own.
import { attrRow, candidates } from './db.mjs';
import { parseColour, snapColour, toHex } from './normalise.mjs';
import { exactHome } from './fill-part-pairing.mjs';
import { differs, stateItem } from './apply-state-resolve.mjs';
import { firstFamily } from './fill-confirm.mjs';
import { normalKeywords } from './fill-normal-keywords.mjs';

const distinct = ( values ) => [ ...new Set( values.filter( ( v ) => undefined !== v && '' !== v && null !== v ) ) ];

// The setting that holds `prop` on the block's part `element` in `state`, with the slot its record places it at and the
// state it paints in there (`paints`: a part that stands for a state, the tile-selected part a tile setting paints in its
// `checked` state, is one element of the record in that state), or null for the record's resting state.
export function settingAt( { db, block, calFor, element, prop, state = null } ) {
	const row = candidates( db, block, prop, state ).find( ( r ) => r.css_element === element );
	if ( ! row ) {
		return null;
	}
	const cal = calFor( block );
	const placed = cal?.settings?.[ row.attr_name ];
	return { attr: row.attr_name, slot: placed?.slot ?? exactHome( db, block, cal, element ) ?? '', paints: placed?.state ?? null };
}

// A colour as a setting holds it: a palette slug where the palette paints exactly that colour, else the hex (or `transparent`).
export function colourValue( raw, snapshot ) {
	const c = parseColour( raw );
	if ( ! c ) {
		return null;
	}
	if ( c.a < 0.02 ) {
		return 'transparent';
	}
	const s = snapshot?.palette ? snapColour( raw, snapshot ) : null;
	return s && 'slug' === s.form && 'exact' === s.kind ? s.value : toHex( c );
}

const DIRECT_COLOUR = /^(?:color|background-color|border-(?:top-)?color)$/;

// A part setting the calibration never measured (no calibrated slot), holding one value: written by its own name, never through
// the resolver, which would reach a setting of the block's wrapper for the same property. Colours and a string border width.
function directItem( { ctx, at, row, element, prop, state, want, label, check } ) {
	const type = attrRow( ctx.db, ctx.block, row.attr_name )?.attr_type;
	const value = DIRECT_COLOUR.test( prop ) ? colourValue( want, ctx.snapshot ) : ( 'border-top-width' === prop && 'string' === type ? want : null );
	if ( null === value ) {
		return null;
	}
	const base = { prop: label ?? row.attr_name, state: state ?? undefined };
	if ( String( ctx.saved?.[ row.attr_name ] ?? '' ) === String( value ) ) {
		return { ...base, status: 'no-setting', why: `${ row.attr_name } already holds ${ value } on ${ element }, yet the live read differs from the draft's ${ want }: another rule wins` };
	}
	return { ...base, status: 'op', why: `${ row.attr_name } ${ state ?? 'rest' } ${ value }`, writes: [ { attr: row.attr_name, value } ], checks: [ { width: 1440, prop, want, ...check } ] };
}

// drafts and lives: the values one property takes across the probed parts of each side. `check` is the extra check shape the
// judge reads (`probe`: a path into facts.probes; `all`: the key of every field's styles). Several draft values for a property
// the block holds once are reported, never averaged. `fontPx`: the part's own font size in px, the basis a unitless line height or an
// em letter spacing is converted against (the resolver's default is the 16px root). `normalPx`: the px of one line box of the part's
// font where its line height computes to `normal` (the probe's `normalLineHeight`): a draft `normal` is written as that length, as
// Fill writes it (lib/fill-normal-keywords.mjs), instead of refusing a keyword no setting holds; the part's own height, so it is
// held as the length ratio the setting stores (the descendant-inheriting `declared` form is Fill's, for a whole element).
export function partItems( { ctx, element, prop, state = null, drafts, lives, label = null, check = {}, why = '', fontPx = null, normalPx = null } ) {
	// A font stack paints as its first family (the route's own comparison, fill-confirm.mjs::TOLERANCE): stacks sharing it are one value.
	const stacks = 'font-family' === prop;
	const collapse = ( values ) => ( stacks ? [ ...new Map( distinct( values ).map( ( v ) => [ firstFamily( v ), v ] ) ).values() ] : distinct( values ) );
	const want = collapse( drafts );
	if ( ! want.length ) {
		return [];
	}
	const have = collapse( lives );
	const prefix = `${ element }${ state ? ` ${ state }` : '' } ${ prop }`;
	const at = settingAt( { db: ctx.db, block: ctx.block, calFor: ctx.calFor, element, prop, state } );
	if ( want.length > 1 ) {
		return [ { status: 'no-setting', prop: label ?? prefix, state: state ?? undefined, why: `${ at ? `${ at.attr } holds one value for all of them` : 'the block has no setting for it' }; the draft has ${ want.length } different values: ${ want.join( ' | ' ) }${ why }` } ];
	}
	if ( 1 === have.length && ( stacks ? firstFamily( want[ 0 ] ) === firstFamily( have[ 0 ] ) : ! differs( want[ 0 ], have[ 0 ] ) ) ) {
		return [];
	}
	if ( ! at ) {
		return [ { status: 'no-setting', prop: label ?? prefix, state: state ?? undefined, why: `${ ctx.block } has no ${ state ?? 'resting' } setting for ${ prop } on ${ element }${ why }` } ];
	}
	if ( ! at.slot ) {
		const row = candidates( ctx.db, ctx.block, prop, state ).find( ( r ) => r.css_element === element );
		const direct = directItem( { ctx, at, row, element, prop, state, want: want[ 0 ], label, check } );
		if ( direct ) {
			return [ direct ];
		}
	}
	// A part that stands for a state its record paints in is resolved among the settings placed in that state.
	const normal = 'line-height' === prop && 'normal' === String( want[ 0 ] ).trim() && normalPx > 0 ? normalKeywords( prop, { 1440: want[ 0 ] }, { snaps: { 1440: { normalLineHeight: normalPx, styles: { 'font-size': fontPx ? `${ fontPx }px` : undefined } } } } ) : null;
	const item = stateItem( { ctx, prop, value: normal?.draft[ 1440 ] ?? want[ 0 ], state, paintState: state ? null : at.paints, slot: at.slot, label: label ?? at.attr, extra: check, fontPx } );
	// The resolver may paint a prop through a setting of another part (the wrapper's); only a setting of this part counts.
	const own = candidates( ctx.db, ctx.block, prop, state ).filter( ( r ) => r.css_element === element ).map( ( r ) => r.attr_name );
	const stray = 'op' === item.status ? item.writes.filter( ( w ) => ! own.includes( w.attr ) ) : [];
	if ( stray.length ) {
		return [ { status: 'no-setting', prop: item.prop, state: item.state, why: `the resolver reached ${ stray.map( ( w ) => w.attr ).join( ', ' ) }, not a setting of ${ element } (${ own.join( ', ' ) }); ${ at.slot ? `calibrated slot ${ at.slot }` : 'no calibrated slot' }${ why }` } ];
	}
	return [ item ];
}
