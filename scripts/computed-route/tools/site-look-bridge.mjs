#!/usr/bin/env node
// The route's side of the site look (plugins/sgs-blocks/scripts/site-look/site_look.py): which renders a block's
// per-setting facts are read from, and how those readings fold into the keys the route reads. The planning and folding
// are calibration's own pure functions (lib/calibrate-instances.mjs::planInstances, lib/calibrate-content.mjs::
// planContentInstances, lib/calibrate.mjs::discoverEffects, lib/calibrate-content.mjs::collectContent), so the facts
// mean what they meant when calibration measured them; only the reading moves offline (site_look.py renders the
// instances through the setting record's runner and reads them with its cascade reader).
//
//   node tools/site-look-bridge.mjs plan <block> <snapshot.json>   -> JSON { discover, content, forms, states, enums } on stdout
//   node tools/site-look-bridge.mjs fold < readings.json            -> JSON { discovered, text?, presence?, link? }
//
// plan: the instances to render, each { key, attrs, variant, isDefault?, isBase?, baseKey?, discover?, content? }, the
// fixture taken from the setting record's fixtures.json (the fixtures the site look and Fill both read). The
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
import { STATE_LOOK_PROPS } from '../lib/calibrate-instances.mjs';
import { defOf } from '../lib/calibrate-markers.mjs';
import { contentRowsFor, planContentInstances, collectContent } from '../lib/calibrate-content.mjs';
import { RECORD_FIXTURES, recordRows } from '../lib/setting-record.mjs';
import { enumReadInstances } from '../lib/enum-read-plan.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
export { RECORD_FIXTURES };
// setting-record/render.py::PLACEHOLDERS: the runner's stand-in image, named so the runner fills in its id and URL.
export const STAND_IN_IMAGE = { id: '{{image}}', url: '{{image.url}}' };

// The value an enum setting holds by default ('' when it holds none): a per-device setting's desktop tier.
export function enumDefaultOf( row, schema ) {
	const def = defOf( row, schema );
	const d = def.default && 'object' === typeof def.default ? def.default.desktop : def.default;
	return 'string' === typeof d ? d : '';
}

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
	// The value-form markers (lib/calibrate-markers.mjs: clamp, vw, repeat probes; count, hex and slug plain markers) and
	// the state markers (a hover or focus setting), each read against its baseline: the site look judges a form by the
	// marker's own expectation and reads a state setting's look in its state.
	const marked = ( i ) => ( { ...keep( i ), setting: i.row.attr_name, props: longhands( i.row.css_property ), ...( i.row.css_state ? { state: i.row.css_state } : {} ), marker: { label: i.marker?.label, form: i.marker?.form ?? null, probe: !! i.marker?.probe, expect: i.marker?.expect ?? null, tracks: i.marker?.tracks ?? null, tolerance: i.marker?.tolerance ?? null } } );
	const forms = plan.instances.filter( ( i ) => i.row && i.marker?.form );
	const states = plan.instances.filter( ( i ) => i.row && i.row.css_state && i.marker && ! i.marker.probe );
	// The per-value instances of the enum settings whose readings the resolver can need (lib/enum-read-plan.mjs), each carrying
	// the default value of its setting: the default render holds that value's reading, so no instance is planned for it.
	const enums = enumReadInstances( plan.instances, recordRows( db, block ).rows ).map( ( i ) => ( { ...marked( i ), enumValue: i.marker.enumValue, enumDefault: enumDefaultOf( i.row, schema ) } ) );
	const needBases = new Set( [ ...forms, ...states, ...enums ].map( ( i ) => i.baseKey ).filter( Boolean ) );
	const extraBases = plan.instances.filter( ( i ) => i.isBase && needBases.has( i.baseKey ) && ! bases.has( i.baseKey ) );
	return { discover: [ ...styleSide, ...extraBases ].map( keep ), content: content.instances.map( keep ), forms: forms.map( marked ), states: states.map( marked ), enums, stateLookProps: STATE_LOOK_PROPS, noMarker: [ ...plan.noMarker, ...content.noMarker ] };
}

// The readings folded into the keys the route reads, exactly as calibration folded them (lib/calibrate-content.mjs::
// collectContent for the content, the `discovered` fold for the rest).
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
