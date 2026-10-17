'use strict';

/**
 * The census for check-focus-system.js: runs the right scanner over every corpus file and
 * tallies items (each in exactly one category) per category and per group, the target findings,
 * the distinct indicator forms, the report-C comparison set, and the corpus control (a dumb
 * `:focus` substring count reconciled, per file, against the classifier's accounting).
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );

const { SYSTEM_FILE, GAP_OK, GROUPS } = require( './config.js' );
const { kindOf } = require( './corpus.js' );
const { analyseCss } = require( './classify-css.js' );
const { analyseCode, analyseJson } = require( './emitters.js' );
const { countFocus } = require( './selector.js' );

const { loadRegistry } = require( './json-io.js' );

function bump( obj, key, n ) {
	obj[ key ] = ( obj[ key ] || 0 ) + ( undefined === n ? 1 : n );
}

function analyseFile( text, rel, kind, allow ) {
	if ( 'css' === kind ) {
		return analyseCss( text, rel, { allow } );
	}
	if ( 'json' === kind ) {
		return analyseJson( text, rel );
	}
	return analyseCode( text, rel, kind, { allow } );
}

/**
 * @param {{ root: string, files: string[], allow: Array }} args
 */
function buildCensus( { root, files, allow } ) {
	const items = [];
	const findings = [];
	const control = { dumbTotal: 0, classifiedTotal: 0, gap: {}, failures: [] };
	const texts = {};

	for ( const rel of files ) {
		const kind = kindOf( rel );
		if ( ! kind ) {
			continue;
		}
		const text = fs.readFileSync( path.join( root, rel ), 'utf8' );
		texts[ rel ] = text;
		const dumb = countFocus( text );
		control.dumbTotal += dumb;
		let res;
		try {
			res = analyseFile( text, rel, kind, allow );
		} catch ( err ) {
			const msg = String( err && err.message ? err.message : err ).split( '\n' )[ 0 ];
			items.push( { kind: 'parse-error', category: 'unrecognised', path: rel, context: '', selector: msg, group: 'links-other', decls: [] } );
			findings.push( { category: 'unrecognised', path: rel, context: '', selector: `parse error: ${ msg }`, prop: '', value: '', group: 'links-other', key: `unrecognised | ${ rel } |  | parse error | ` } );
			control.failures.push( `${ rel }: parse error (${ msg })` );
			continue;
		}
		items.push( ...res.items );
		findings.push( ...res.findings );
		let accounted = res.classifiedFocus;
		for ( const [ bucket, n ] of Object.entries( res.gap ) ) {
			if ( ! GAP_OK[ bucket ] ) {
				control.failures.push( `${ rel }: gap bucket "${ bucket }" has no GAP_OK reason` );
			}
			bump( control.gap, bucket, n );
			accounted += n;
		}
		control.classifiedTotal += res.classifiedFocus;
		if ( accounted !== dumb ) {
			control.failures.push( `${ rel }: dumb :focus count ${ dumb } but the classifier accounts for ${ accounted }` );
		}
	}

	const counts = { items: {}, findings: {}, byGroup: {} };
	for ( const g of GROUPS ) {
		counts.byGroup[ g ] = {};
	}
	for ( const it of items ) {
		bump( counts.items, it.category );
		counts.byGroup[ it.group ] = counts.byGroup[ it.group ] || {};
		bump( counts.byGroup[ it.group ], it.category );
	}
	for ( const f of findings ) {
		bump( counts.findings, f.category );
	}

	// The ratchet's form count: the indicator declaration strings still drawn outside the system
	// file by a target (plan Task 15 expects only the system's forms to remain).
	const DRAWS = new Set( [ 'bespoke', 'php-emitter', 'js-emitter', 'json-focus' ] );
	const forms = new Set();
	const systemForms = new Set();
	for ( const it of items ) {
		if ( ! it.indicatorShaped || ! it.form ) {
			continue;
		}
		if ( it.path === SYSTEM_FILE ) {
			systemForms.add( it.form );
		} else if ( DRAWS.has( it.category ) ) {
			forms.add( it.form );
		}
	}

	// Report C's scope (.claude/reports/2026-10-17-focus-indicator/C-sgs-inventory.md §1): CSS and
	// SCSS rules outside editor.css / editor.scss; its "indicator" kind is an outline or focus
	// box-shadow that draws the ring, which here is bespoke, allow or shared-outline.
	const REPORT_C_INDICATOR = new Set( [ 'bespoke', 'allow', 'shared-outline' ] );
	const cssRules = items.filter( ( i ) => 'css-rule' === i.kind && i.path !== SYSTEM_FILE );
	const scope = cssRules.filter( ( i ) => ! /(^|\/)editor\.s?css$/.test( i.path ) );
	const scopeIndicator = scope.filter( ( i ) => REPORT_C_INDICATOR.has( i.category ) && i.indicatorShaped );
	const comparison = {
		rules: scope.length,
		indicatorRules: scopeIndicator.length,
		indicatorForms: new Set( scopeIndicator.map( ( i ) => i.form ) ).size,
		files: new Set( scope.map( ( i ) => i.path ) ).size,
		indicatorFiles: new Set( scopeIndicator.map( ( i ) => i.path ) ).size,
		editorCssRules: cssRules.length - scope.length,
		allCssRules: cssRules.length,
	};

	const staleRegistry = loadRegistry().entries.filter( ( e ) => ! ( texts[ e.path ] || '' ).includes( e.contains ) ).map( ( e ) => `${ e.path } :: ${ e.contains }` );
	const allowUsed = new Set( items.filter( ( i ) => 'allow' === i.category ).map( ( i ) => `${ i.path } :: ${ i.selector }` ) );
	const staleAllow = ( allow || [] ).filter( ( a ) => ! [ ...allowUsed ].some( ( u ) => u.startsWith( `${ a.path } :: ` ) && u.includes( a.selector.replace( /\s+/g, ' ' ).trim() ) ) ).map( ( a ) => `${ a.path } :: ${ a.selector }` );

	return {
		files: Object.keys( texts ).length,
		items,
		findings,
		counts,
		distinctForms: forms.size,
		systemForms: systemForms.size,
		comparison,
		control,
		staleRegistry,
		staleAllow,
	};
}

module.exports = { buildCensus };
