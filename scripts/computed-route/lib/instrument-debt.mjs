// The instrument-debt list (Spec 48 FR-48-67): sites/<client>/build/qa/instrument-debt.json holds every I-class row the gate
// chain produced, grouped by owner (the seeder, or calibration), each with its block, attribute and the gate's evidence
// (treated as opaque: a string, or the structured { command, line } or { file, key } shape, passed through unchanged). A row
// with no evidence is refused. The known items are read from the real inputs: a NULL css_property named in
// data/instrument-debt-known.json, and every slot map whose deploy hash or read key no longer matches the local build.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { I_CLASSES } from './gap-classes.mjs';
import { OWNERS } from './gaps-file.mjs';

const KNOWN = JSON.parse( fs.readFileSync( path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'instrument-debt-known.json' ), 'utf8' ) );

export const debtPath = ( client, root ) => path.join( root, 'sites', client, 'build', 'qa', 'instrument-debt.json' );

const blank = ( v ) => null == v || ( 'string' === typeof v && '' === v.trim() ) || ( 'object' === typeof v && 0 === Object.keys( v ).length );

// One debt row from a chain result row ({ key, class, gate, evidence, block, attribute, property }) found on `surface`
// (`known`: a known item, id `<surface>:known:<key>`); throws when it is not an I-class row, carries no evidence or names
// no surface.
export function debtRow( r, { surface, known = false } ) {
	if ( ! I_CLASSES.includes( r.class ) ) {
		throw new Error( `${ r.key }: ${ JSON.stringify( r.class ) } is not an I-class row` );
	}
	if ( blank( r.evidence ) ) {
		throw new Error( `${ r.key }: the ${ r.class } row carries no gate evidence` );
	}
	if ( blank( surface ) ) {
		throw new Error( `${ r.key }: the debt row names no surface` );
	}
	return { id: `${ surface }:${ known ? 'known:' : '' }${ r.key }`, class: r.class, owner: OWNERS[ r.class ], surface, known, block: r.block ?? null, attribute: r.attribute ?? null, property: r.property ?? null, gate: r.gate ?? null, evidence: r.evidence };
}

// Every I-class row of the chain's results as debt rows; every row is checked before any is returned.
export const debtRows = ( rows, { surface } ) => rows.filter( ( r ) => I_CLASSES.includes( r.class ) ).map( ( r ) => debtRow( r, { surface } ) );

// The known items (unroutedKnown's and staleSlotMaps's rows alike) as debt rows of one surface: only those whose block the
// surface's tree holds (inTree: a Set of block names).
export const knownRows = ( { rows, inTree, surface } ) => rows.filter( ( r ) => inTree.has( r.block ) ).map( ( r ) => debtRow( r, { surface, known: true } ) );

// The known NULL-css_property items (data/instrument-debt-known.json) the DB confirms today, unless calibration discovered the
// setting (isDiscovered( { block_slug, attr_name } )): an enum setting calibration discovered is routed through discovery.
export function unroutedKnown( { db, isDiscovered = () => false } ) {
	const out = [];
	for ( const k of KNOWN.unrouted ) {
		const row = db.prepare( 'SELECT block_slug, attr_name, css_property, role FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( k.block, k.attribute );
		if ( row && null === row.css_property && ! isDiscovered( row ) ) {
			out.push( { key: `${ k.block }:${ k.attribute }`, class: 'I-unrouted', gate: 'G3', block: k.block, attribute: k.attribute, property: null,
				evidence: { file: 'sgs-framework.db', key: `block_attributes[${ k.block }][${ k.attribute }].css_property is NULL (role ${ row.role })` } } );
		}
	}
	return out;
}

// Every slot map in the cache folder whose deploy key differs from the local build's hash, or whose read key differs from the
// current one. i: { cacheDir, readKey, localHash( short ) -> hash | null }. Returns { rows, missing }: `missing` names an input
// that could not be read (no cache folder, no local build for a block), so an absent input is reported, never read as current.
export function staleSlotMaps( { cacheDir, readKey, localHash } ) {
	if ( ! fs.existsSync( cacheDir ) ) {
		return { rows: [], missing: [ `the calibration cache folder ${ cacheDir } does not exist` ] };
	}
	const [ rows, missing ] = [ [], [] ];
	for ( const f of fs.readdirSync( cacheDir ).filter( ( n ) => /^[\w-]+\.json$/.test( n ) ).sort() ) {
		let cal;
		try {
			cal = JSON.parse( fs.readFileSync( path.join( cacheDir, f ), 'utf8' ) );
		} catch {
			missing.push( `${ f } is not readable JSON` );
			continue;
		}
		if ( ! cal?.block || ! cal.slotKey ) {
			continue;
		}
		const have = localHash( cal.block.replace( /^sgs\//, '' ) );
		if ( ! have ) {
			missing.push( `${ cal.block }: no local build to hash` );
			continue;
		}
		const why = cal.slotKey !== have ? `slotKey ${ cal.slotKey } is not the local build hash ${ have }` : ( cal.readKey !== readKey ? `readKey ${ cal.readKey ?? 'none' } is not the current ${ readKey }` : null );
		why && rows.push( { key: `${ cal.block }:slot-map`, class: 'I-stale', gate: 'G0', block: cal.block, attribute: null, property: null, evidence: { file: `scripts/computed-route/cache/${ f }`, key: why } } );
	}
	return { rows, missing };
}

// Writes the debt file for a client from one surface's debt rows (debtRows for its chain results, knownRows for the known
// items its tree holds). Rows of other surfaces stay, known items included; this surface's rows are replaced, and a row
// naming no surface is dropped. Every row is checked before the file is touched. Returns { file, rows, byOwner }.
export function writeDebt( { file, rows, surface, publishedOn } ) {
	const prior = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : { groups: [] };
	const kept = ( prior.groups || [] ).flatMap( ( g ) => g.rows ).filter( ( r ) => ! blank( r.surface ) && r.surface !== surface );
	const all = [ ...kept, ...rows ];
	const bare = all.find( ( r ) => blank( r.evidence ) );
	if ( bare ) {
		throw new Error( `${ bare.id }: the row carries no gate evidence` );
	}
	const dup = all.find( ( r, i ) => all.findIndex( ( x ) => x.id === r.id ) !== i );
	if ( dup ) {
		throw new Error( `${ dup.id }: two rows carry the same id` );
	}
	const groups = [ ...new Set( all.map( ( r ) => r.owner ) ) ].sort().map( ( owner ) => ( { owner, rows: all.filter( ( r ) => r.owner === owner ) } ) );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, JSON.stringify( { publishedOn, groups }, null, 1 ) );
	return { file, rows: all, byOwner: Object.fromEntries( groups.map( ( g ) => [ g.owner, g.rows.length ] ) ) };
}
