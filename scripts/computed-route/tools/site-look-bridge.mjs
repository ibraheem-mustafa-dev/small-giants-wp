#!/usr/bin/env node
// The route's side of the site look (plugins/sgs-blocks/scripts/site-look/site_look.py): which renders a block's
// per-setting facts are read from, and how those readings fold into the keys the route reads. The planning and folding
// are calibration's own pure functions (lib/calibrate-instances.mjs::planInstances, lib/calibrate-content.mjs::
// planContentInstances, lib/calibrate.mjs::discoverEffects, lib/calibrate-content.mjs::collectContent), so the facts
// mean what they meant when calibration measured them; only the reading moves offline (site_look.py renders the
// instances through the setting record's runner and reads them with its cascade reader).
//
//   node tools/site-look-bridge.mjs plan <block> <snapshot.json>   -> JSON { discover, content } on stdout
//   node tools/site-look-bridge.mjs fold < readings.json            -> JSON { discovered, text?, presence?, link? }
//
// plan: the instances to render, each { key, attrs, variant, isDefault?, isBase?, baseKey?, discover?, content? }, the
// fixture taken from the setting record's fixtures.json (the record's fixtures replace calibration-fixtures.json). The
// media object is the runner's stand-in image (setting-record/render.py::PLACEHOLDERS), named by placeholder so the
// runner fills it. fold: { discover: [ { discover, def, read } ], content: [ { content, contentDef, contentRead } ] }, a
// read being { width: { path: reading } } as calibration's page readers returned it.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb, attrsFor, enumSettings, variantInfo, controlsOf } from '../lib/db.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { loadSnapshot } from '../lib/normalise.mjs';
import { planInstances, instanceCtx, longhands, discoverEffects } from '../lib/calibrate.mjs';
import { contentRowsFor, planContentInstances, collectContent } from '../lib/calibrate-content.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
export const RECORD_FIXTURES = path.join( REPO, 'plugins/sgs-blocks/scripts/setting-record/fixtures.json' );
// setting-record/render.py::PLACEHOLDERS: the runner's stand-in image, named so the runner fills in its id and URL.
export const STAND_IN_IMAGE = { id: '{{image}}', url: '{{image.url}}' };

// The renders a block's per-setting facts are read from: each variant's default, every baseline a marked instance is
// read against, the discovery instances (one per value of a setting whose values are not CSS keywords) and the content
// instances (text, link and show/hide markers).
export function planFor( block, { db, fixtures, snapshot } ) {
	const fixture = fixtures[ block ];
	if ( ! fixture ) {
		return { error: `no fixture for ${ block } in the setting record's fixtures.json` };
	}
	const schema = blockSchema( block ) || {};
	const variant = variantInfo( db, block );
	const ctx = { ...instanceCtx( variant, STAND_IN_IMAGE, fixture ), controls: controlsOf( db, block ) };
	const rows = attrsFor( db, block ).filter( ( r ) => longhands( r.css_property ).length );
	const plan = planInstances( block, { rows, enumRows: enumSettings( db, block ), schema, snapshot, fixture, ctx } );
	const keep = ( i ) => ( { key: i.key, attrs: i.attrs, variant: i.variant ?? 0, ...( i.inner ? { inner: i.inner } : {} ), ...( i.isDefault ? { isDefault: true } : {} ), ...( i.isBase ? { isBase: true } : {} ), ...( i.baseKey ? { baseKey: i.baseKey } : {} ), ...( i.discover ? { discover: i.discover } : {} ), ...( i.content ? { content: i.content } : {} ) } );
	const discover = plan.instances.filter( ( i ) => i.discover );
	const bases = new Set( discover.map( ( i ) => i.baseKey ).filter( Boolean ) );
	const styleSide = plan.instances.filter( ( i ) => i.isDefault || ( i.isBase && bases.has( i.baseKey ) ) || i.discover );
	const content = planContentInstances( block, { contentRows: contentRowsFor( db, block ), variant, schema, fixture, ctx } );
	return { discover: styleSide.map( keep ), content: content.instances.map( keep ), noMarker: [ ...plan.noMarker, ...content.noMarker ] };
}

// The readings folded into the keys the route reads, exactly as calibration folded them (lib/calibrate-block.mjs::
// foldMeasured for `discovered`, collectContent for the rest).
export function foldReadings( { discover = [], content = [] } ) {
	const discovered = {};
	for ( const inst of discover ) {
		const fx = discoverEffects( inst.def || {}, inst.read || {} );
		const d = ( discovered[ inst.discover.attr ] ??= {} );
		for ( const [ prop, e ] of Object.entries( fx ) ) {
			( d[ prop ] ??= { slots: [], values: {}, ...( inst.discover.tier ? { tier: inst.discover.tier } : {} ) } );
			d[ prop ].slots = [ ...new Set( [ ...d[ prop ].slots, ...e.slots ] ) ];
			d[ prop ].values[ inst.discover.value ] = e.value;
		}
	}
	return { discovered, ...collectContent( content ) };
}

function main( argv ) {
	const [ cmd, block, snapshotFile ] = argv;
	if ( 'plan' === cmd ) {
		const db = openDb();
		const fixtures = JSON.parse( fs.readFileSync( RECORD_FIXTURES, 'utf8' ) );
		const snapshot = snapshotFile ? loadSnapshot( snapshotFile ) : null;
		process.stdout.write( JSON.stringify( planFor( block, { db, fixtures, snapshot } ) ) );
		return 0;
	}
	if ( 'fold' === cmd ) {
		process.stdout.write( JSON.stringify( foldReadings( JSON.parse( fs.readFileSync( 0, 'utf8' ) ) ) ) );
		return 0;
	}
	process.stderr.write( 'usage: site-look-bridge.mjs plan <block> <snapshot.json> | fold < readings.json\n' );
	return 2;
}

if ( process.argv[ 1 ] && fileURLToPath( import.meta.url ) === path.resolve( process.argv[ 1 ] ) ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}
