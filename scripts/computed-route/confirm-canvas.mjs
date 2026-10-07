// Live confirmation of lib/triage.mjs::canvasSettable's claims, BY FAMILY, read-only.
//
// THE CLAIM. A row's difference is classed W (explained, not a framework gap) because some OTHER block - an
// ancestor of the row, or a sibling in the canvas - declares a setting whose css_property covers this property,
// and the route's reachability gate (citeReaches / reachesElement) judged its emission to reach the row's
// element. All 168 claims rest on `via: declared`: a DB declaration plus a source-level argument. None has ever
// been confirmed against a rendered page.
//
// THE INSTRUMENT. Not computed styles and not CDP matched-styles: both answer "what paints right now", which
// cannot separate "the cited setting loses" from "the cited setting is simply unset". Instead enumerate EVERY
// rule in every loaded stylesheet that declares the property AND whose selector matches the row element
// (CSSOM `row.matches(selectorText)`). That set is value-independent: it is every rule that could ever govern
// this property on this element. The claim holds only if one of those rules belongs to the cited block, either
// by naming one of its classes or by consuming a custom property the cited block is the declared source of.
//
//   CONFIRMED   one matching rule is the cited block's own emission.
//   VAR-CHANNEL one matching rule reads a custom property that the framework sets on the cited block's
//               selector - a real channel, but which value wins still depends on where the var is set.
//   REFUTED     rules for this property do match the row, but none of them is the cited block's: no value the
//               client could choose on the cited setting would move this row.
//   NO-RULE     nothing anywhere declares this property for this element, so the cited setting cannot paint it
//               either. A stronger refutation than REFUTED.
//   ABSENT      the row element is not in the DOM on this page (needs its walker state, or another surface).
//
// Nothing is written: no tree, no setting, no page, no stylesheet.
import { chromium } from 'playwright';
import fs from 'fs';
import { waitOutHostCheck } from '../parity/lib/helpers.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cssProp } from './lib/solve-rows.mjs';
import { canvasSettable, issueContext, issuesOf } from './lib/triage.mjs';
import { surfaceContext } from './triage.mjs';

// Usage: confirm-canvas.mjs [--candidates --client <slug>] <families.json | triage dir> <out.json> [base url] [only indices]
//   node scripts/computed-route/confirm-canvas.mjs sites/eye-care-ward-end/build/qa/triage out.json http://localhost:8081
//   node scripts/computed-route/confirm-canvas.mjs --candidates --client eye-care-ward-end sites/eye-care-ward-end/build/qa/triage sites/eye-care-ward-end/build/qa/canvas-confirm.json https://darkcyan-grouse-898606.hostingersite.com

const URL_OF = {
	footer: '/', header: '/', 'mobile-menu': '/', 'mega-lenses': '/', 'mega-brands': '/', 'mega-help': '/',
	'mega-sunglasses': '/', home: '/', 'size-guide': '/', lenses: '/prescription-lenses/', help: '/help/',
	shop: '/shop/', product: '/product/gucci-oversized-cat-eye/', lens: '/product/gucci-oversized-cat-eye/',
	contact: '/contact/', 'contact-form': '/contact/',
};

// The families, grouped from the triage reports themselves so there is no separate hand step to go stale:
// one family is (cited block, cited setting, row property), which is the unit the claim is made in. Rows are the
// wrong axis (168 rows collapse to 63 families) and so is surface, because a family spans surfaces.
export function familiesFrom( triageDir ) {
	const rows = [];
	for ( const file of fs.readdirSync( triageDir ).filter( ( f ) => f.endsWith( '.json' ) ).sort() ) {
		const surface = file.slice( 0, -5 );
		const walk = ( o ) => {
			if ( Array.isArray( o ) ) {
				o.forEach( walk );
			} else if ( o && 'object' === typeof o ) {
				if ( 'canvas-settable' === o.decidedBy ) { rows.push( { surface, row: o } ); }
				Object.values( o ).forEach( walk );
			}
		};
		walk( JSON.parse( fs.readFileSync( `${ triageDir }/${ file }`, 'utf8' ) ) );
	}
	const fams = new Map();
	for ( const { surface, row } of rows ) {
		const ev = ( row.evidence || [] ).find( ( e ) => 'canvas-settable' === e.check );
		if ( ! ev ) { continue; }
		// The CSS property the row stands for (painted-ground is background-color), which is both what a stylesheet
		// declares and what lib/triage.mjs::measuredReachFrom is looked up with.
		const property = cssProp( row.property );
		const k = `${ ev.block }|${ ev.setting }|${ property }`;
		const f = fams.get( k ) || { block: ev.block, setting: ev.setting, property, claims: 0, surfaces: [], keys: [], citedRefs: [], where: [], cssProperty: [] };
		f.claims += 1;
		f.surfaces.includes( surface ) || f.surfaces.push( surface );
		f.keys.push( row.key );
		ev.ref && ! f.citedRefs.includes( ev.ref ) && f.citedRefs.push( ev.ref );
		// `where` is absent on a resolver-hop citation and present on a canvas-roster one: the same claim reached
		// from two directions (lib/triage.mjs), so the two are reported apart.
		const where = ev.where || 'resolver-cite';
		f.where.includes( where ) || f.where.push( where );
		ev.property && ! f.cssProperty.includes( ev.property ) && f.cssProperty.push( ev.property );
		fams.set( k, f );
	}
	return [ ...fams.values() ].sort( ( a, b ) => b.claims - a.claims );
}

// Candidates mode. familiesFrom measures only the family each row cites NOW; once a measurement refutes it,
// canvasSettable cites the next block declaring the property, which is unmeasured and fails open again. This asks
// canvasSettable about every issue of every canvas surface with a measuredReach that records each (block, setting,
// property) it would test and answers false, so it walks every candidate it could ever cite. Asking about every issue,
// not only today's canvas-settable rows, makes the set independent of the confirm file it replaces: a row a refutation
// moved off canvas-settable still has its candidates measured, so writing this set over the old file loses nothing.
// The current citations (familiesFrom, which also holds resolver-hop cites canvasSettable never makes) are unioned in.
// contextFor( surface, recorder ) returns { report, walkReport, ctx, close } (triage.mjs::surfaceContext by default).
export function candidatesFrom( { client, triageDir, manifest, contextFor = null } ) {
	const open = contextFor || ( ( surface, measuredReach ) => surfaceContext( { client, surface, measuredReach } ) );
	const fams = new Map( familiesFrom( triageDir ).map( ( f ) => [ `${ f.block }|${ f.setting }|${ f.property }`, f ] ) );
	for ( const [ surface, entry ] of Object.entries( manifest ) ) {
		if ( ! entry.canvas ) {
			continue;
		}
		let issue = null;
		const recorder = ( block, setting, property, ref ) => {
			const k = `${ block }|${ setting }|${ property }`;
			const f = fams.get( k ) || { block, setting, property, claims: 0, surfaces: [], keys: [], citedRefs: [], where: [], cssProperty: [] };
			if ( ! f.keys.includes( issue.key ) ) {
				f.claims += 1;
				f.keys.push( issue.key );
			}
			f.surfaces.includes( surface ) || f.surfaces.push( surface );
			ref && ! f.citedRefs.includes( ref ) && f.citedRefs.push( ref );
			const where = ( issue.rows[ 0 ].owners || [] ).some( ( o ) => o.ref === ref ) ? 'ancestor' : 'sibling';
			f.where.includes( where ) || f.where.push( where );
			fams.set( k, f );
			return false;
		};
		const { report, walkReport, ctx, close } = open( surface, recorder );
		const full = issueContext( report, walkReport, ctx );
		for ( issue of issuesOf( report, surface ) ) {
			canvasSettable( issue, full );
		}
		close();
	}
	return [ ...fams.values() ].sort( ( a, b ) => b.claims - a.claims );
}

// Everything below runs only when the file is invoked directly, so familiesFrom stays importable
// (the route's own convention: scripts/computed-route/pairs.mjs, sweep.mjs, triage.mjs).
async function main() {
	const argv = process.argv.slice( 2 );
	const candidates = argv.includes( '--candidates' );
	const ci = argv.indexOf( '--client' );
	const client = -1 === ci ? null : argv[ ci + 1 ];
	const pos = argv.filter( ( a, i ) => ! a.startsWith( '--' ) && ( -1 === ci || i !== ci + 1 ) );
	const [ FAMILIES, OUT ] = pos;
	const BASE = pos[ 2 ] || 'http://localhost:8081';
	const ONLY = pos[ 3 ] ? pos[ 3 ].split( ',' ) : null;
	if ( candidates && ! client ) {
		throw new Error( '--candidates needs --client <slug> (it reads sites/<slug>/build/surfaces.json and each surface\'s Solve report)' );
	}
	const manifestFile = client && path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', 'sites', client, 'build', 'surfaces.json' );

	const families = ( candidates ? candidatesFrom( { client, triageDir: FAMILIES, manifest: JSON.parse( fs.readFileSync( manifestFile, 'utf8' ) ) } )
		: FAMILIES.endsWith( '.json' ) ? JSON.parse( fs.readFileSync( FAMILIES, 'utf8' ) ) : familiesFrom( FAMILIES ) )
		.map( ( f, i ) => ( { ...f, idx: i } ) )
		.filter( ( f ) => ! ONLY || ONLY.includes( String( f.idx ) ) );
	console.error( `${ families.length } families to measure${ candidates ? ' (every canvasSettable candidate)' : '' }` );

	const browser = await chromium.launch();
	const pages = {};
	const openPage = async ( url ) => {
		if ( pages[ url ] ) { return; }
		const p = await browser.newPage( { viewport: { width: 1440, height: 1000 } } );
		const bust = BASE + url + ( url.includes( '?' ) ? '&' : '?' ) + `cb=${ Date.now() }`;
		await p.goto( bust, { waitUntil: 'networkidle', timeout: 90000 } ).catch( ( e ) => console.error( `goto ${ url }: ${ e.name }` ) );
		// Hostinger's edge answers automated browsers with a "Checking your browser" 403 for 45+ minutes after a
		// burst. A challenged page carries no markup, so EVERY family on it would read ABSENT - refutations that
		// look like a finding. Wait the challenge out, then REFUSE a page with no instrumentation at all.
		await waitOutHostCheck( p );
		await p.waitForTimeout( 1500 );
		const reach = await p.evaluate( () => ( { refs: document.querySelectorAll( '[class*="cr-ref-"]' ).length, sheets: document.styleSheets.length, title: document.title.slice( 0, 60 ) } ) );
		if ( ! reach.refs || ! reach.sheets ) {
			throw new Error( `${ BASE + url } carries no route instrumentation (cr-ref ${ reach.refs }, stylesheets ${ reach.sheets }, title "${ reach.title }"). Every family on it would read ABSENT, so the run refuses rather than reporting refutations.` );
		}
		console.error( `opened ${ url }: ${ reach.refs } cr-ref elements, ${ reach.sheets } stylesheets` );
		await p.evaluate( async () => {
			for ( let y = 0; y < document.body.scrollHeight; y += 800 ) {
				window.scrollTo( 0, y );
				await new Promise( ( r ) => setTimeout( r, 60 ) );
			}
			window.scrollTo( 0, 0 );
		} );
		await p.waitForTimeout( 700 );
		pages[ url ] = p;
	};

	const results = [];
	for ( const fam of families ) {
		const surface = fam.surfaces.find( ( x ) => URL_OF[ x ] ) || fam.surfaces[ 0 ];
		const url = URL_OF[ surface ];
		const rec = { idx: fam.idx, block: fam.block, setting: fam.setting, property: fam.property, claims: fam.claims, surface, surfaces: fam.surfaces, url: url ?? null, where: fam.where, cssProperty: fam.cssProperty };
		if ( ! url ) {
			rec.verdict = 'NO-URL';
			rec.why = `no URL mapped for surface ${ surface }`;
			results.push( rec );
			continue;
		}
		await openPage( url );
		const [ ref, pathSel ] = ( fam.keys[ 0 ] || '' ).split( '|' );
		rec.ref = ref;
		rec.path = pathSel || null;
		const r = await pages[ url ].evaluate( ( [ refCls, sel, citedRefs, prop, block, surfacePrefix ] ) => {
			// How many refs this SURFACE has on this page. A page carrying only another surface's refs (every
			// page carries the footer's) passes a generic reachability check while still lacking this one.
			const surfaceRefs = document.querySelectorAll( `[class*="${ surfacePrefix }"]` ).length;
			const refEl = document.querySelector( `.${ refCls }` );
			const row = ! refEl ? null
				: sel ? ( refEl.matches( sel ) ? refEl : refEl.querySelector( sel ) ) || document.querySelector( `.${ refCls } ${ sel }` )
					: refEl;
			if ( ! row ) {
				return { rowPresent: false, refPresent: !! refEl, surfaceRefs };
			}
			const cited = citedRefs.map( ( c ) => document.querySelector( `.${ c }` ) ).find( Boolean ) || null;
			const citedClasses = cited ? [ ...cited.classList ] : [];
			// The cited block's base class, so a framework rule for the block type counts as its emission even when
			// the instance's own uid class is not in the selector: sgs/container -> .sgs-container.
			const base = `sgs-${ String( block ).replace( /^sgs\//, '' ) }`;
			const ownNames = [ ...citedClasses, base ];

			// Every rule in every loaded sheet that declares `prop` and whose selector matches the row.
			const matching = [];
			const varSetters = {};
			const visit = ( rules ) => {
				for ( const rule of rules ) {
					if ( rule.cssRules && ! rule.selectorText ) { visit( rule.cssRules ); continue; }
					if ( ! rule.selectorText || ! rule.style ) { continue; }
					// Which rules declare custom properties, and on what selector: the var-channel source.
					for ( const n of rule.style ) {
						if ( n.startsWith( '--' ) ) {
							( varSetters[ n ] ||= [] ).push( rule.selectorText );
						}
					}
					const v = rule.style.getPropertyValue( prop );
					if ( ! v ) { continue; }
					let hit = false;
					try { hit = row.matches( rule.selectorText ); } catch { hit = false; }
					if ( hit ) { matching.push( { selector: rule.selectorText, value: v } ); }
				}
			};
			// Sheet accounting. A hand-rolled styleSheets walk silently skips any sheet whose cssRules throws
			// (cross-origin, or blocked), and a skipped sheet turns a NO-RULE verdict into a false negative
			// rather than a finding. So skips are COUNTED and returned: a verdict is trustworthy only at
			// skipped === 0. Recorded because auto-memory warns this walk can report zero matches on an
			// element that demonstrably computes the value.
			const sheets = { total: 0, read: 0, skipped: 0, skippedHrefs: [] };
			for ( const sheet of document.styleSheets ) {
				sheets.total += 1;
				let rules;
				try {
					rules = sheet.cssRules;
				} catch {
					sheets.skipped += 1;
					sheets.skippedHrefs.push( sheet.href || '(inline)' );
					continue;
				}
				if ( ! rules ) {
					sheets.skipped += 1;
					sheets.skippedHrefs.push( `${ sheet.href || '(inline)' } [null cssRules]` );
					continue;
				}
				sheets.read += 1;
				visit( rules );
			}
			let depth = -1;
			if ( cited ) {
				let d = 0;
				for ( let a = row; a; a = a.parentElement, d++ ) { if ( a === cited ) { depth = d; break; } }
			}
			return {
				rowPresent: true, refPresent: true, surfaceRefs,
				rowTag: row.tagName, rowClasses: [ ...row.classList ].join( ' ' ),
				citedPresent: !! cited, citedClasses: citedClasses.join( ' ' ), depthFromCited: depth, ownNames,
				sheets,
				matching: matching.slice( 0, 40 ),
				matchingCount: matching.length,
				// A matching rule owned by the cited block: its selector names one of the cited block's classes.
				citedOwned: matching.filter( ( m ) => ownNames.some( ( c ) => m.selector.includes( `.${ c }` ) ) ),
				// A matching rule that reads a custom property, with the selectors the framework sets that var on.
				varReads: matching.filter( ( m ) => /var\(\s*--/.test( m.value ) ).map( ( m ) => {
					const names = [ ...m.value.matchAll( /var\(\s*(--[\w-]+)/g ) ].map( ( x ) => x[ 1 ] );
					return { selector: m.selector, value: m.value, vars: names.map( ( n ) => ( { name: n, setOn: ( varSetters[ n ] || [] ).slice( 0, 6 ) } ) ) };
				} ),
			};
		}, [ ref, pathSel, fam.citedRefs, fam.property, fam.block, `cr-ref-${ surface }-` ] );
		Object.assign( rec, r );
		if ( ! r.rowPresent ) {
			rec.verdict = 'ABSENT';
			rec.why = r.refPresent
			? `ref ${ ref } present but no "${ pathSel }" under it`
			: r.surfaceRefs
				? `ref ${ ref } is not in the DOM on ${ url }, though ${ r.surfaceRefs } other ${ surface } refs are: the row needs its walker state opened`
				: `${ url } carries NO ${ surface } instrumentation at all (0 cr-ref-${ surface }-* elements), so this is an unmeasurable page for this surface, NOT a refutation`;
		} else if ( r.citedOwned.length ) {
			rec.verdict = 'CONFIRMED';
			rec.why = `${ r.citedOwned.length } rule(s) matching this row belong to the cited ${ fam.block }: ${ r.citedOwned.map( ( m ) => m.selector ).slice( 0, 3 ).join( ' | ' ) }`;
		} else if ( ! r.matchingCount ) {
			rec.verdict = 'NO-RULE';
			rec.why = `no rule in any loaded stylesheet declares ${ fam.property } for this element, so the cited ${ fam.block } setting cannot paint it either`;
		} else {
			// A var channel counts only when the framework sets that var on a selector naming the cited block.
			const chan = r.varReads.filter( ( vr ) => vr.vars.some( ( v ) => v.setOn.some( ( s ) => ( r.ownNames || [] ).some( ( c ) => s.includes( `.${ c }` ) ) ) ) );
			if ( chan.length ) {
				rec.verdict = 'VAR-CHANNEL';
				rec.channel = chan.slice( 0, 3 );
				rec.why = `a rule matching this row reads a custom property that the framework sets on the cited ${ fam.block }: ${ chan[ 0 ].selector } reads ${ chan[ 0 ].vars.map( ( v ) => v.name ).join( ',' ) }`;
			} else {
				rec.verdict = 'REFUTED';
				rec.why = `${ r.matchingCount } rule(s) govern ${ fam.property } on this row and none is the cited ${ fam.block }: ${ r.matching.map( ( m ) => m.selector ).slice( 0, 3 ).join( ' | ' ) }. The row sits at depth ${ r.depthFromCited } from the cited block, so no value on that setting would move it.`;
			}
		}
		results.push( rec );
		console.error( `${ fam.idx } ${ rec.verdict } ${ fam.block }::${ fam.setting } ${ fam.property } (depth ${ r.depthFromCited ?? '-' }, ${ r.matchingCount ?? 0 } matching)` );
	}

	fs.writeFileSync( OUT, JSON.stringify( results, null, 1 ) );
	const tally = results.reduce( ( a, x ) => ( ( a[ x.verdict ] = ( a[ x.verdict ] || 0 ) + 1 ), a ), {} );
	const claims = results.reduce( ( a, x ) => ( ( a[ x.verdict ] = ( a[ x.verdict ] || 0 ) + x.claims ), a ), {} );
	console.log( JSON.stringify( { families: results.length, claims: results.reduce( ( a, x ) => a + x.claims, 0 ), familiesByVerdict: tally, claimsByVerdict: claims } ) );
	await browser.close();

}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	await main();
}