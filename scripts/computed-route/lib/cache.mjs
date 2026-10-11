// The calibration cache (§3.2). A calibration has two outputs:
//   - the SLOT MAP, one library-wide file per block (`cache/<block>.json`): which setting reaches which element and
//     property. It is site-independent, keyed by `slotKey` (the deployed build's hash), and names the measuring site for
//     provenance only. A run on another site replaces it only with --recalibrate.
//   - the DEFAULT PAINT, one file per site and block (`cache/<site>/<block>.paint.json`): the computed style of each
//     element with no settings applied. It carries its `paintKey` (the slot key plus the md5 of that site's
//     theme-snapshot.json). A run on one site never opens another site's paint file. A local mirror is the same site as
//     the test site it copies (`mirrorOf` in calibration-targets.json: same build, same database, same snapshot, so the
//     same paintKey), so a mirror's paint lives in, and is read from, its test site's folder.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
	const { block, site, slotKey, paintKey, playwrightVersion, browserVersion, measured } = file;
	const slotMap = { ...file };
	const paint = { block, site, slotKey, paintKey, playwrightVersion, browserVersion, measured };
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
// site's paint.
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
// is kept, and another site's slot map is kept unless the run asks (--recalibrate).
export function slotMapSkip( dir, block, site, slotKey, recalibrate = false ) {
	const have = readSlotMap( dir, block );
	if ( recalibrate || ! have ) {
		return null;
	}
	if ( have.site && have.site !== site ) {
		return `slot map calibrated on ${ have.site }; pass --recalibrate to replace`;
	}
	return have.slotKey === slotKey ? 'slot map current' : null;
}

// Why a run on `site` must leave the block's default paint for that site alone, or null when it must measure it: only this
// site's own file with the current key is kept.
export function paintSkip( dir, block, site, paintKey, recalibrate = false ) {
	const have = recalibrate ? null : readPaint( dir, site, block );
	return have && have.paintKey === paintKey ? `default paint current for ${ site }` : null;
}

// True when this site's paint file exists but its key no longer matches (so it is re-measured on that site).
export function paintStale( dir, block, site, paintKey ) {
	const have = readPaint( dir, site, block );
	return !! have && have.paintKey !== paintKey;
}
