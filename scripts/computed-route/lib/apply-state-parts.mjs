// A state look the block's root has no setting for, held by a setting of a part inside it. The applier reads a state on the live
// block's root element, but a block can style a state on a part: an icon list's text and icons, an icon's circle. The draft
// element then stands for that part (a list's pair is its first item row; an icon's pair is the circle drawn around its glyph),
// and the resolver reports "no <prop> setting on <block> paints ''" while the DB lists settings that paint the property in this
// state. This looks those settings up by the slot calibration tied each one to and resolves the value there.
import { candidates } from './db.mjs';
import { stateItem } from './apply-state-resolve.mjs';

// The resolver's own gap for a block whose settings for the property all paint another element than the one asked about.
export const ROOT_UNPAINTED = /^no-setting: no .+ setting on .+ paints "/;

const filled = ( v ) => undefined !== v && null !== v && '' !== v && 'none' !== v;

// The calibrated slots, other than the root, of the block's settings that paint `prop` in `state`: { slot: [ attr ] }.
export function partSlots( { db, calFor, block }, prop, state ) {
	const out = {};
	for ( const row of candidates( db, block, prop, state ) ) {
		const slot = calFor( block )?.settings?.[ row.attr_name ]?.slot;
		if ( 'string' === typeof slot && '' !== slot ) {
			( out[ slot ] ??= [] ).push( row.attr_name );
		}
	}
	return out;
}

// stateItem on the root; when no setting paints the root, the value resolved on each part a setting paints. A part whose setting
// already holds a different value is left alone (the draft gave that part a look of its own). The writes are not re-read: the
// applier's re-read measures the block's root, which these settings do not paint (status `unchecked` after a write).
export function stateItemOrParts( args ) {
	const root = stateItem( args );
	if ( '' !== args.slot || 'no-setting' !== root.status || ! ROOT_UNPAINTED.test( root.why ) ) {
		return root;
	}
	const { ctx, prop, state } = args;
	const writes = [];
	const held = [];
	const own = [];
	const slots = partSlots( ctx, prop, state );
	for ( const [ slot, attrs ] of Object.entries( slots ) ) {
		const part = stateItem( { ...args, slot } );
		if ( 'op' === part.status ) {
			const clash = part.writes.filter( ( w ) => filled( ctx.saved[ w.attr ] ) && JSON.stringify( ctx.saved[ w.attr ] ) !== JSON.stringify( w.value ) );
			clash.length ? own.push( ...clash.map( ( w ) => w.attr ) ) : writes.push( ...part.writes );
		} else if ( 'equal' === part.status ) {
			held.push( ...attrs );
		}
	}
	const base = { prop: args.label ?? prop, state: state ?? undefined, ...( args.record ? { record: args.record } : {} ) };
	if ( writes.length ) {
		return { ...base, status: 'op', why: `${ prop } ${ state ?? 'rest' } ${ args.value } on the parts of ${ ctx.block } the draft element stands for: ${ writes.map( ( w ) => w.attr ).join( ', ' ) }`, writes, checks: [] };
	}
	if ( held.length || own.length ) {
		return { ...base, status: 'equal', why: `${ [ ...held, ...own ].join( ', ' ) } already ${ held.length ? `paint ${ args.value }` : 'hold a value of their own' } for the ${ prop } ${ state ?? 'rest' } look of the parts the draft element stands for` };
	}
	return root;
}
