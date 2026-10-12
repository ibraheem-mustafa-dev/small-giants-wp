// The reading record (Spec 48 FR-48-28, Appendix C "Reading"): one JSON record per stamped element, width, state and
// sample time, read under the determinism harness (lib/intake-harness.mjs) and written as JSON lines sorted by draft ID,
// then path, then property, so two runs of one surface at one width and mode give byte-identical text.
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_PROPS, tplKeyOf } from '../../parity/lib/collect.mjs';
import { schemaProblems } from './handoff.mjs';
import { openHarness, settleRest, sampleAt } from './intake-harness.mjs';

export const READING_SCHEMA = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'reading.schema.json' );

// In-page. in: [ rootSelector, keySrc, props ]. Every [data-dc-tpl] element under the root (the root included):
// { draftId, path, computed, declared, box } or { error }.
function collectReading( [ rootSelector, keySrc, props ] ) {
	// eslint-disable-next-line no-new-func
	const keyOf = new Function( `return (${ keySrc });` )();
	const root = document.querySelector( rootSelector );
	if ( ! root ) {
		return { error: `no element matches ${ rootSelector }` };
	}
	const unknown = props.filter( ( p ) => ! CSS.supports( p, 'initial' ) );
	if ( unknown.length ) {
		return { error: `not CSS properties this browser reads: ${ unknown.join( ', ' ) }` };
	}
	const pathOf = ( e ) => {
		const parts = [];
		for ( let x = e; x && x !== root; x = x.parentElement ) {
			parts.unshift( `${ x.tagName.toLowerCase() }:nth-child(${ [ ...x.parentElement.children ].indexOf( x ) + 1 })` );
		}
		return [ rootSelector, ...parts ].join( ' > ' );
	};
	const r2 = ( n ) => Math.round( n * 100 ) / 100 + 0;
	const out = [];
	for ( const e of [ root, ...root.querySelectorAll( '[data-dc-tpl]' ) ] ) {
		if ( ! e.hasAttribute( 'data-dc-tpl' ) ) {
			continue;
		}
		let draftId;
		try {
			draftId = keyOf( e );
		} catch ( err ) {
			return { error: `draft ID of ${ pathOf( e ) }: ${ err.message }` };
		}
		const cs = getComputedStyle( e );
		const computed = {};
		for ( const p of props ) {
			computed[ p ] = cs.getPropertyValue( p );
		}
		const declared = {};
		for ( let i = 0; i < e.style.length; i++ ) {
			const p = e.style[ i ];
			declared[ p ] = e.style.getPropertyValue( p ) + ( e.style.getPropertyPriority( p ) ? ' !important' : '' );
		}
		const b = e.getBoundingClientRect();
		out.push( { draftId, path: pathOf( e ), computed, declared, box: { x: r2( b.x + window.scrollX ), y: r2( b.y + window.scrollY ), w: r2( b.width ), h: r2( b.height ) } } );
	}
	return { records: out };
}

// The properties a reading holds: the walker's DEFAULT_PROPS less the ones it synthesises from painted shapes
// (icon-*), which are not CSS properties.
export const READING_PROPS = DEFAULT_PROPS.filter( ( p ) => ! p.startsWith( 'icon-' ) );

// One record per stamped element under rootSelector (Appendix C Reading). `harness` is harnessSettings(); a read
// without it is refused.
export async function readRecords( page, { surface, mode, width, state = 'default', t = 0, rootSelector = '#dc-root', props = READING_PROPS, harness } ) {
	if ( ! harness || 'object' !== typeof harness ) {
		throw new Error( 'readRecords: a reading without its harness settings is refused (FR-48-28)' );
	}
	if ( ! [ 'rest', 'sample' ].includes( mode ) ) {
		throw new Error( `readRecords: mode must be 'rest' or 'sample', not ${ JSON.stringify( mode ) }` );
	}
	const res = await page.evaluate( collectReading, [ rootSelector, tplKeyOf.toString(), props ] );
	if ( res.error ) {
		throw new Error( `readRecords (${ surface } at ${ width }): ${ res.error }` );
	}
	return sortRecords( res.records.map( ( r ) => ( { surface, mode, width, state, t, ...r, harness } ) ) );
}

const cmp = ( a, b ) => ( a < b ? -1 : a > b ? 1 : 0 );
const sortKeys = ( o ) => Object.fromEntries( Object.keys( o ).sort( cmp ).map( ( k ) => [ k, o[ k ] && 'object' === typeof o[ k ] && ! Array.isArray( o[ k ] ) ? sortKeys( o[ k ] ) : o[ k ] ] ) );

// Records in the canonical order and shape: by draft ID, then path, then sample time; fixed field order; the keys of
// computed, declared and harness sorted.
export function sortRecords( records ) {
	return [ ...records ]
		.sort( ( a, b ) => cmp( a.draftId, b.draftId ) || cmp( a.path, b.path ) || a.t - b.t || cmp( a.state, b.state ) || a.width - b.width )
		.map( ( r ) => ( {
			surface: r.surface, mode: r.mode, width: r.width, state: r.state, t: r.t, draftId: r.draftId, path: r.path,
			computed: sortKeys( r.computed || {} ), declared: sortKeys( r.declared || {} ),
			box: r.box ? { x: r.box.x, y: r.box.y, w: r.box.w, h: r.box.h } : r.box,
			...( undefined === r.harness ? {} : { harness: r.harness && 'object' === typeof r.harness ? sortKeys( r.harness ) : r.harness } ),
		} ) );
}

// The records as JSON lines, one per record, in canonical order, ending with a newline.
export const toJsonl = ( records ) => sortRecords( records ).map( ( r ) => JSON.stringify( r ) ).join( '\n' ) + '\n';

// Every schema problem across the records, each prefixed with the record's index and draft ID; empty when all valid.
export function readingProblems( records, ajv ) {
	return records.flatMap( ( r, i ) => schemaProblems( ajv, READING_SCHEMA, r ).map( ( p ) => `record ${ i } (${ r?.draftId ?? '?' }): ${ p }` ) );
}

// One harness run of one surface at one width: opens a fresh sandbox, settles in rest mode, and reads (rest), or then
// samples `sample.target` at `sample.times` (sample; kind 'animation'), or samples a timer or frame writer from boot
// (sample with kind 'clock', no settle). Returns { records, jsonl, settings, summary, url }.
export async function readSurface( { folder, index, harPath, file = index, hash = '', width = 1440, mode = 'rest', surface, state = 'default', rootSelector = '#dc-root', props = READING_PROPS, sample = null, ...opts } ) {
	const h = await openHarness( { folder, index, harPath, file, hash, width, ...opts } );
	try {
		const base = { surface: surface ?? `${ file }${ hash ? `#${ hash.replace( /^#/, '' ) }` : '' }`, mode, width, state, rootSelector, props, harness: h.settings };
		let summary = null;
		let records;
		if ( 'rest' === mode ) {
			summary = await settleRest( h.page, h.options );
			records = await readRecords( h.page, base );
		} else if ( 'sample' === mode ) {
			if ( ! sample?.target || ! Array.isArray( sample.times ) ) {
				throw new Error( 'readSurface sample mode needs sample: { target, times }' );
			}
			if ( 'clock' !== sample.kind ) {
				summary = await settleRest( h.page, h.options );
			}
			records = sortRecords( await sampleAt( h.page, { ...h.options, target: sample.target, times: sample.times, kind: sample.kind ?? 'animation', read: ( t ) => readRecords( h.page, { ...base, t } ) } ) );
		} else {
			throw new Error( `readSurface mode must be 'rest' or 'sample', not ${ JSON.stringify( mode ) }` );
		}
		return { records, jsonl: toJsonl( records ), settings: h.settings, summary, url: h.page.url() };
	} finally {
		await h.close();
	}
}
