// The calibration cache (§3.2). A calibration has two outputs:
//   - the SLOT MAP, one library-wide file per block (`cache/<block>.json`): which setting reaches which element and
//     property. It is site-independent, keyed by `slotKey` (the deployed build's hash), and names the measuring site for
//     provenance only. A run on another site replaces it only with --recalibrate.
//   - the DEFAULT PAINT, one file per site and block (`cache/<site>/<block>.paint.json`): the computed style of each
//     element with no settings applied. It carries its `paintKey` (the slot key plus the md5 of that site's
//     theme-snapshot.json). A run on one site never opens another site's paint file. A local mirror is the same site as
//     the test site it copies (`mirrorOf` in calibration-targets.json: same build, same database, same snapshot, so the
//     same paintKey), so a mirror's paint lives in, and is read from, its test site's folder.
// Both files carry the `readKey` they were read under (lib/calibrate-props.mjs::READ_KEY); a file read under another
// list is stale on every site, so a property calibration newly reads is measured everywhere.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { READ_KEY } from './calibrate-props.mjs';

const TARGETS_FILE = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'calibration-targets.json' );
let mirrors = null;

// The site whose paint folder `site` uses: the test site a mirror copies (`mirrorOf`), else the site itself.
export function paintSite( site ) {
	if ( ! mirrors ) {
		const targets = fs.existsSync( TARGETS_FILE ) ? JSON.parse( fs.readFileSync( TARGETS_FILE, 'utf8' ) ) : {};
		mirrors = Object.fromEntries( Object.entries( targets ).filter( ( [ , v ] ) => v.mirrorOf ).map( ( [ k, v ] ) => [ k, v.mirrorOf ] ) );
	}
	return mirrors[ site ] || site;
}

// The fields that make up the default paint; every other calibration field belongs to the slot map.
export const PAINT_FIELDS = [ 'elements' ];

const slugOf = ( block ) => String( block ).replace( /^sgs\//, '' );

export const slotMapFile = ( dir, block ) => path.join( dir, `${ slugOf( block ) }.json` );

// Throws on a site name that could leave its own folder: a site is a calibration-targets.json key.
export function paintFile( dir, site, block ) {
	if ( ! site || ! /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test( site ) ) {
		throw new Error( `a default paint needs a site name, got ${ JSON.stringify( site ) }` );
	}
	return path.join( dir, paintSite( site ), `${ slugOf( block ) }.paint.json` );
}

function readJson( file ) {
	if ( ! fs.existsSync( file ) ) {
		return null;
	}
	try {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch {
		return null;
	}
}

// The site a block's slot map was measured on, or null when the block has no file.
export function cachedSite( file ) {
	return readJson( file )?.site || null;
}

// The block's slot map, or null.
export const readSlotMap = ( dir, block ) => readJson( slotMapFile( dir, block ) );

// This site's default paint for the block, or null when it has none. A file measured on another site is not this site's
// (a mirror and its test site count as one site, paintSite).
export function readPaint( dir, site, block ) {
	const paint = readJson( paintFile( dir, site, block ) );
	return paint && paintSite( paint.site ) === paintSite( site ) ? paint : null;
}

// The split of one calibration object into its slot map and its default paint.
export function splitCalibration( file ) {
	const { block, site, slotKey, paintKey, readKey, playwrightVersion, browserVersion, measured } = file;
	const slotMap = { ...file };
	const paint = { block, site, slotKey, paintKey, readKey, playwrightVersion, browserVersion, measured };
	for ( const f of [ ...PAINT_FIELDS, 'paintKey' ] ) {
		delete slotMap[ f ];
	}
	for ( const f of PAINT_FIELDS ) {
		if ( undefined !== file[ f ] ) {
			paint[ f ] = file[ f ];
		}
	}
	return { slotMap, paint };
}

export function writeSlotMap( dir, block, slotMap ) {
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( slotMapFile( dir, block ), JSON.stringify( slotMap, null, 1 ) );
}

export function writePaint( dir, site, block, paint ) {
	const f = paintFile( dir, site, block );
	fs.mkdirSync( path.dirname( f ), { recursive: true } );
	fs.writeFileSync( f, JSON.stringify( paint, null, 1 ) );
}

// The calibration a reader works from: the slot map with THIS site's default paint merged in as `elements`. Null when the
// block has no slot map. A site with no paint file gets `elements: {}` and `paintMissing` naming the site, never another
// site's paint. A file read under an older READ_KEY is returned as it is: what it recorded is still true, and a property
// the read list gained since reads as absent until the site is recalibrated (stage 0 reports that slot map stale).
export function loadCalibration( dir, block, site ) {
	const slotMap = readSlotMap( dir, block );
	if ( ! slotMap ) {
		return null;
	}
	const paint = site ? readPaint( dir, site, block ) : null;
	if ( ! paint ) {
		return { ...slotMap, elements: {}, paintMissing: site ? `no default paint for ${ site }; run calibrate.mjs on that site` : 'no site named, so no default paint to read' };
	}
	return { ...slotMap, elements: paint.elements || {}, paintKey: paint.paintKey, paintSite: paint.site };
}

// Why a run on `site` must leave the block's slot map alone, or null when it may write it: a slot map whose key is current
// is kept, and another site's slot map is kept unless the run asks (--recalibrate). One read under another read list is
// due on any site.
export function slotMapSkip( dir, block, site, slotKey, recalibrate = false ) {
	const have = readSlotMap( dir, block );
	if ( recalibrate || ! have || have.readKey !== READ_KEY ) {
		return null;
	}
	if ( have.site && have.site !== site ) {
		return `slot map calibrated on ${ have.site }; pass --recalibrate to replace`;
	}
	return have.slotKey === slotKey ? 'slot map current' : null;
}

// Why a run on `site` must leave the block's default paint for that site alone, or null when it must measure it: only this
// site's own file with the current key, read under the current read list, is kept.
export function paintSkip( dir, block, site, paintKey, recalibrate = false ) {
	const have = recalibrate ? null : readPaint( dir, site, block );
	return have && have.paintKey === paintKey && have.readKey === READ_KEY ? `default paint current for ${ site }` : null;
}

// Which outputs a run writes for one block, from the reasons to skip each (null = due). `slotMapOnly` (stage 0, FR-48-3)
// never writes a default paint, whatever its state.
export function dueOutputs( slotWhy, paintWhy, slotMapOnly = false ) {
	return { slotMap: ! slotWhy, paint: ! slotMapOnly && ! paintWhy };
}

// True when this site's paint file exists but its key or read list no longer matches (so it is re-measured on that site).
export function paintStale( dir, block, site, paintKey ) {
	const have = readPaint( dir, site, block );
	return !! have && ( have.paintKey !== paintKey || have.readKey !== READ_KEY );
}

// The settings a new slot map drops that the existing one reaches: every key of `prev.settings` missing from
// `next.settings`, and every key of `prev.discovered` missing from `next.discovered` (named `discovered:<attr>`), minus the
// names in `allowed`. Sorted. No existing slot map means nothing to lose.
export function slotMapLosses( prev, next, allowed = [] ) {
	if ( ! prev ) {
		return [];
	}
	const lost = [
		...Object.keys( prev.settings || {} ).filter( ( k ) => ! ( k in ( next?.settings || {} ) ) ),
		...Object.keys( prev.discovered || {} ).filter( ( k ) => ! ( k in ( next?.discovered || {} ) ) ).map( ( k ) => `discovered:${ k }` ),
	];
	return lost.filter( ( n ) => ! allowed.includes( n ) ).sort();
}

// Where a lost setting went in the new slot map: 'dead', 'oneWidth', 'noMarker', 'rejected', 'untestedStates', or 'absent'
// when the new run does not mention it. oneWidth and rejected entries are { key: '<setting>-<instance>' } objects;
// untestedStates entries are 'name:state (reason)' strings.
export function lossDestination( name, next ) {
	const attr = name.replace( /^discovered:/, '' );
	const byKey = ( list ) => ( list || [] ).some( ( e ) => {
		const key = 'string' === typeof e ? e : e?.key;
		return key === attr || String( key ).startsWith( `${ attr }-` );
	} );
	if ( ( next?.dead || [] ).includes( attr ) ) {
		return 'dead';
	}
	if ( byKey( next?.oneWidth ) ) {
		return 'oneWidth';
	}
	if ( ( next?.noMarker || [] ).includes( attr ) ) {
		return 'noMarker';
	}
	if ( byKey( next?.rejected ) ) {
		return 'rejected';
	}
	return ( next?.untestedStates || [] ).some( ( s ) => String( s ).startsWith( `${ attr }:` ) ) ? 'untestedStates' : 'absent';
}

// Whether a run may write the block's slot map: { write, lost: [ { setting, wentTo } ] }. It may not when the new map drops
// a setting the existing one reaches and the loss is not named in `allowed` (calibrate.mjs --allow-loss).
export function slotMapWriteDecision( prev, next, allowed = [] ) {
	const lost = slotMapLosses( prev, next, allowed ).map( ( setting ) => ( { setting, wentTo: lossDestination( setting, next ) } ) );
	return { write: ! lost.length, lost };
}

// The --allow-loss list as { 'sgs/a': [ 'settingX', 'discovered:layout' ] }; each entry is block:name, split on the first
// colon after the block slug.
export function parseAllowLoss( list ) {
	const out = {};
	for ( const entry of String( list || '' ).split( ',' ).filter( Boolean ) ) {
		const m = entry.match( /^([^:]+):(.+)$/ );
		m && ( out[ m[ 1 ] ] ||= [] ).push( m[ 2 ] );
	}
	return out;
}

// Where a refused candidate slot map is kept for review.
export const refusedFile = ( dir, block ) => path.join( dir, `${ slugOf( block ) }.refused.json` );
