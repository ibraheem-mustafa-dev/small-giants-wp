#!/usr/bin/env node
'use strict';

/**
 * check-focus-system.js: the detector for the unified keyboard focus system (Spec 38A; plan
 * .claude/plans/2026-10-17-unified-focus-system.md §3). One focus system file
 * (theme/sgs-theme/assets/css/focus.css) draws every keyboard focus indicator; no block,
 * theme stylesheet, emitter or token draws its own.
 *
 * Usage (from plugins/sgs-blocks):
 *   node scripts/check-focus-system.js --survey [--group <g>]   census: items per category and group
 *   node scripts/check-focus-system.js --survey --json          also writes reports/migrations/focus-system-census.json
 *   node scripts/check-focus-system.js --fix [--group <g>|--path <glob>]           unified diff only
 *   node scripts/check-focus-system.js --fix --apply [--group <g>|--path <glob>]   writes atomically
 *   node scripts/check-focus-system.js --check [--strict] [--group <g>]   the ratchet gate
 *   node scripts/check-focus-system.js --prune-baseline        lowers stale baseline entries, never adds
 *   node scripts/check-focus-system.js --write-baseline        writes the first baseline (refuses if one exists)
 *   node scripts/check-focus-system.js --self-test             the six fixtures
 *
 * Modules: focus-system/config.js (corpus, tokens, groups), corpus.js, selector.js,
 * classify-css.js, lexer.js, emitters.js, census.js, fixer.js, diff.js, check.js, self-test.js.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );

const { ROOT, ALLOW_FILE, BASELINE_FILE, CENSUS_FILE, GROUPS } = require( './focus-system/config.js' );
const { listCorpus, checkWidth } = require( './focus-system/corpus.js' );
const { buildCensus } = require( './focus-system/census.js' );
const { fixText } = require( './focus-system/fixer.js' );
const { unifiedDiff } = require( './focus-system/diff.js' );
const { runCheck, baselineFromCensus, pruneBaseline } = require( './focus-system/check.js' );
const { runSelfTest } = require( './focus-system/self-test.js' );
const { RULE_PRIORITY } = require( './focus-system/classify-css.js' );

const NOTES = JSON.parse( fs.readFileSync( path.join( __dirname, 'focus-system', 'census-notes.json' ), 'utf8' ) );

function readJson( file ) {
	return JSON.parse( fs.readFileSync( file, 'utf8' ) );
}

/** Write via a .tmp sibling then rename, so an interrupted write never leaves a truncated file. */
function writeAtomic( file, text ) {
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	const tmp = `${ file }.tmp`;
	fs.writeFileSync( tmp, text );
	fs.renameSync( tmp, file );
}

function loadAllow() {
	const data = readJson( ALLOW_FILE );
	const problems = [];
	for ( const e of data.entries ) {
		if ( ! e.path || ! e.selector || ! e.reason ) {
			problems.push( `allow entry missing path, selector or reason: ${ JSON.stringify( e ) }` );
		} else if ( ! fs.existsSync( path.join( ROOT, e.path ) ) ) {
			problems.push( `allow entry path does not exist: ${ e.path }` );
		}
	}
	return { entries: data.entries, problems };
}

function globToRe( glob ) {
	const esc = glob.replace( /[.+^${}()|[\]\\]/g, '\\$&' ).replace( /\*\*/g, '\u0000' ).replace( /\*/g, '[^/]*' ).replace( /\?/g, '[^/]' ).replace( /\u0000/g, '.*' );
	return new RegExp( `^${ esc }$` );
}

function argValue( args, name ) {
	const i = args.indexOf( name );
	return -1 === i ? null : args[ i + 1 ] || null;
}

function printSurvey( census, group ) {
	const order = RULE_PRIORITY.concat( Object.keys( census.counts.items ).filter( ( c ) => ! RULE_PRIORITY.includes( c ) ) );
	console.log( `focus-system census: ${ census.files } corpus files, ${ census.items.length } items` );
	console.log( 'items per category:' );
	for ( const c of order ) {
		if ( census.counts.items[ c ] || 'unrecognised' === c ) {
			console.log( `  ${ c.padEnd( 16 ) } ${ census.counts.items[ c ] || 0 }` );
		}
	}
	console.log( 'target findings (declarations / mentions):' );
	for ( const [ c, n ] of Object.entries( census.counts.findings ) ) {
		console.log( `  ${ c.padEnd( 16 ) } ${ n }` );
	}
	console.log( 'items per group:' );
	for ( const g of GROUPS ) {
		if ( group && g !== group ) {
			continue;
		}
		const row = census.counts.byGroup[ g ] || {};
		const parts = order.filter( ( c ) => row[ c ] ).map( ( c ) => `${ c } ${ row[ c ] }` );
		console.log( `  ${ g.padEnd( 16 ) } ${ parts.join( ', ' ) || '(none)' }` );
	}
	console.log( `distinct indicator forms: ${ census.distinctForms + census.systemForms } (system ${ census.systemForms })` );
	const cmp = census.comparison;
	console.log( `report-C scope (CSS and SCSS outside editor.css / editor.scss): ${ cmp.rules } rules in ${ cmp.files } files; ${ cmp.indicatorRules } draw an indicator (${ cmp.indicatorForms } distinct forms, ${ cmp.indicatorFiles } files); editor.css / editor.scss rules ${ cmp.editorCssRules }` );
	const ctl = census.control;
	const gaps = Object.entries( ctl.gap ).map( ( [ k, n ] ) => `${ k } ${ n }` ).join( ', ' );
	console.log( `corpus control: dumb :focus count ${ ctl.dumbTotal } = classified ${ ctl.classifiedTotal } + gap (${ gaps }); failures ${ ctl.failures.length }` );
}

function censusJson( census, width ) {
	return {
		_meta: {
			tool: 'plugins/sgs-blocks/scripts/check-focus-system.js --survey --json',
			plan: '.claude/plans/2026-10-17-unified-focus-system.md §3',
			note: 'Every item is in exactly one category (classify-css.js::RULE_PRIORITY). Findings are content-keyed (category | path | context | selector | property).',
		},
		summary: {
			corpusFiles: census.files,
			items: census.items.length,
			itemsPerCategory: census.counts.items,
			findingsPerCategory: census.counts.findings,
			itemsPerGroup: census.counts.byGroup,
			distinctIndicatorForms: census.distinctForms + census.systemForms,
			systemForms: census.systemForms,
			reportCComparison: census.comparison,
			corpusControl: { dumbTotal: census.control.dumbTotal, classifiedTotal: census.control.classifiedTotal, gap: census.control.gap, failures: census.control.failures },
			outsideCorpus: width.outside,
		},
		notes: NOTES.notes,
		items: census.items.map( ( i ) => ( { category: i.category, group: i.group, kind: i.kind, path: i.path, context: i.context, selector: i.selector, form: i.form || undefined } ) ),
		findings: census.findings.map( ( f ) => ( { key: f.key, category: f.category, group: f.group } ) ),
	};
}

function main( args ) {
	const { entries: allow, problems } = loadAllow();
	if ( args.includes( '--self-test' ) ) {
		return runSelfTest( ROOT, allow );
	}
	const files = listCorpus( ROOT );
	const census = buildCensus( { root: ROOT, files, allow } );
	const group = argValue( args, '--group' );
	if ( group && ! GROUPS.includes( group ) ) {
		console.error( `unknown --group ${ group }; groups: ${ GROUPS.join( ', ' ) }` );
		return 2;
	}

	if ( args.includes( '--fix' ) ) {
		const glob = argValue( args, '--path' );
		const re = glob ? globToRe( glob ) : null;
		const apply = args.includes( '--apply' );
		let decls = 0;
		let changed = 0;
		const notes = [];
		for ( const rel of files.filter( ( f ) => /\.s?css$/.test( f ) && ( ! re || re.test( f ) ) ) ) {
			const abs = path.join( ROOT, rel );
			const before = fs.readFileSync( abs, 'utf8' );
			const res = fixText( before, rel, { allow, filter: ( f ) => ! group || f.group === group } );
			if ( res.text === before ) {
				continue;
			}
			changed++;
			decls += res.removed;
			notes.push( ...res.orphanComments );
			process.stdout.write( unifiedDiff( before, res.text, rel ) );
			if ( apply ) {
				writeAtomic( abs, res.text );
			}
		}
		for ( const n of notes ) {
			console.log( `NOTE ${ n.path }: the comment "${ n.comment }" sat directly above the dropped "${ n.above }"; delete it by hand if it only described that rule` );
		}
		console.log( `fix: ${ decls } declarations in ${ changed } files${ apply ? ' (applied)' : ' (dry run; add --apply to write)' }` );
		return 0;
	}

	if ( args.includes( '--write-baseline' ) ) {
		if ( fs.existsSync( BASELINE_FILE ) ) {
			console.error( 'baseline exists; the ratchet only goes down (--prune-baseline). Delete it by hand only as a stated staleness correction.' );
			return 1;
		}
		writeAtomic( BASELINE_FILE, JSON.stringify( { _meta: NOTES.baselineMeta, ...baselineFromCensus( census ) }, null, '\t' ) + '\n' );
		console.log( `baseline written: ${ Object.keys( baselineFromCensus( census ).findings ).length } keys` );
		return 0;
	}

	if ( args.includes( '--prune-baseline' ) ) {
		const { baseline, removed } = pruneBaseline( census, readJson( BASELINE_FILE ) );
		writeAtomic( BASELINE_FILE, JSON.stringify( baseline, null, '\t' ) + '\n' );
		console.log( `prune-baseline: ${ removed } findings removed, ${ Object.keys( baseline.findings ).length } keys remain` );
		return 0;
	}

	if ( args.includes( '--check' ) ) {
		const baseline = fs.existsSync( BASELINE_FILE ) ? readJson( BASELINE_FILE ) : null;
		const width = checkWidth( ROOT );
		const res = runCheck( census, baseline, { strict: args.includes( '--strict' ), group, width: width.failures } );
		res.failures.push( ...problems );
		for ( const f of res.failures ) {
			console.log( `FAIL ${ f }` );
		}
		const scope = `${ group ? `group ${ group}` : 'all groups' }${ args.includes( '--strict' ) || ! baseline ? ', strict' : ', against the baseline' }`;
		console.log( `check-focus-system: ${ res.failures.length } failures (${ scope })` );
		return res.failures.length ? 1 : 0;
	}

	const width = checkWidth( ROOT );
	printSurvey( census, group );
	if ( width.failures.length || problems.length ) {
		for ( const f of [ ...width.failures, ...problems ] ) {
			console.log( `WARN ${ f }` );
		}
	}
	if ( args.includes( '--json' ) ) {
		writeAtomic( CENSUS_FILE, JSON.stringify( censusJson( census, width ), null, '\t' ) + '\n' );
		console.log( `census written: ${ path.relative( ROOT, CENSUS_FILE ).replace( /\\/g, '/' ) }` );
	}
	return 0;
}

if ( require.main === module ) {
	if ( process.stdout._handle && process.stdout._handle.setBlocking ) {
		process.stdout._handle.setBlocking( true );
	}
	process.exitCode = main( process.argv.slice( 2 ) );
}

module.exports = { main };
