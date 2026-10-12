// FR-48-34 test 1, unresolved-binding (Spec 48 §9, R-47-4): a `style-*` value holds a `{{ }}` binding still
// unresolved at read time. The runtime compiles each style-* attribute into an `!important` pseudo rule (support.js
// createPseudoSheet) from the raw attribute text, so the live rule is read from the rendered page's stylesheets: a bound
// declaration that kept the literal `{{`, or that the browser dropped as invalid, is a defect; one the rule holds
// resolved is not. Re-exported by lib/intake-defects.mjs.
import { cssDecls } from './intake-census-logic.mjs';

const nOf = ( r ) => r.draftId.slice( r.draftId.lastIndexOf( ':' ) + 1 );

// The bound style-* rows of a census (FR-48-34 test 1 candidates).
export const boundStyleRows = ( census ) => census.rows.filter( ( r ) => 'style-hover' === r.kind && r.detail?.bound );

// In-page: the compiled pseudo rule of each item, read from the live stylesheets. Found through a rendered copy's
// `scp*` class, else by matching the rule the browser keeps for the raw value (serialised in a probe sheet) against
// the live pseudo rules. Returns [ { rendered, rule: { selector, cssText, props } | null, via } ].
function readCompiled( items ) {
	const parentHost = ( x ) => ( x.parentElement ? x.parentElement.closest( '.sc-host' ) : null );
	const live = [];
	for ( const sheet of document.styleSheets ) {
		let rules = [];
		try {
			rules = [ ...sheet.cssRules ];
		} catch {
			continue;
		}
		rules.filter( ( r ) => r.selectorText && /^\.scp[0-9a-z]+::?[a-z-]+$/.test( r.selectorText ) ).forEach( ( r ) => live.push( r ) );
	}
	const split = ( css ) => {
		const out = [];
		let start = 0;
		let depth = 0;
		let quote = '';
		for ( let i = 0; i < css.length; i++ ) {
			const c = css[ i ];
			if ( quote ) {
				quote = '\\' === c ? ( i++, quote ) : c === quote ? '' : quote;
			} else if ( '"' === c || "'" === c ) {
				quote = c;
			} else if ( '(' === c ) {
				depth++;
			} else if ( ')' === c ) {
				depth = Math.max( 0, depth - 1 );
			} else if ( ';' === c && ! depth ) {
				out.push( css.slice( start, i ) );
				start = i + 1;
			}
		}
		return [ ...out, css.slice( start ) ].map( ( d ) => d.trim() ).filter( Boolean );
	};
	const probe = new CSSStyleSheet();
	return items.map( ( it ) => {
		const sep = [ 'before', 'after' ].includes( it.pseudo ) ? '::' : ':';
		const els = [ ...document.querySelectorAll( `[data-dc-tpl="${ it.n }"]` ) ].filter( ( e ) => parentHost( e )?.dataset.scName === it.comp );
		let rule = null;
		let via = null;
		for ( const e of els ) {
			const cls = [ ...e.classList ].find( ( c ) => live.some( ( r ) => r.selectorText === `.${ c }${ sep }${ it.pseudo }` ) );
			if ( cls ) {
				rule = live.find( ( r ) => r.selectorText === `.${ cls }${ sep }${ it.pseudo }` );
				via = 'element';
				break;
			}
		}
		if ( ! rule ) {
			const body = '::' === sep ? it.value : split( it.value ).map( ( d ) => ( /!\s*important$/i.test( d ) ? d : `${ d } !important` ) ).join( ';' );
			probe.replaceSync( `.x${ sep }${ it.pseudo }{${ body }}` );
			const want = probe.cssRules[ 0 ]?.style.cssText;
			const hits = live.filter( ( r ) => r.selectorText.endsWith( `${ sep }${ it.pseudo }` ) && r.style.cssText === want );
			rule = hits[ 0 ] || null;
			via = rule ? `serialisation (${ hits.length } identical rule${ 1 === hits.length ? '' : 's' })` : null;
		}
		return { rendered: els.length, via, rule: rule ? { selector: rule.selectorText, cssText: rule.cssText, props: Object.fromEntries( it.props.map( ( p ) => [ p, rule.style.getPropertyValue( p ) ] ) ) } : null };
	} );
}

// The verdict for one bound declared value against its compiled rule ({ props } or null):
// { verdict: 'unresolved'|'dropped'|'resolved'|'no-rule', decls: [ { prop, declared, compiled, state } ] }.
export function classifyCompiled( { value, rule } ) {
	const decls = cssDecls( value ).filter( ( [ , v ] ) => v.includes( '{{' ) ).map( ( [ prop, declared ] ) => {
		const compiled = rule ? rule.props[ prop ] ?? '' : null;
		const state = ! rule ? 'no-rule' : '' === compiled.trim() ? 'dropped' : compiled.includes( '{{' ) ? 'unresolved' : 'resolved';
		return { prop, declared, compiled, state };
	} );
	const has = ( s ) => decls.some( ( d ) => d.state === s );
	return { verdict: ! rule ? 'no-rule' : has( 'unresolved' ) ? 'unresolved' : has( 'dropped' ) ? 'dropped' : 'resolved', decls };
}

// Reads the bound rows' compiled rules on one page: Map(row.id → [ { width, visit, read } ]) merged into `into`.
export async function readPageBindings( page, rows, { width = null, visit = null } = {}, into = new Map() ) {
	if ( ! rows.length ) {
		return into;
	}
	const items = rows.map( ( r ) => ( { comp: r.component, n: nOf( r ), pseudo: r.detail.pseudo, value: r.detail.value, props: cssDecls( r.detail.value ).map( ( [ p ] ) => p ) } ) );
	const reads = await page.evaluate( readCompiled, items );
	rows.forEach( ( r, i ) => into.set( r.id, [ ...( into.get( r.id ) || [] ), { width, visit, read: reads[ i ] } ] ) );
	return into;
}

// Test 1 verdicts from the reads: { rows, notDefects, gaps }. An element-found rule is preferred as evidence.
export function bindingVerdicts( rows, reads ) {
	const out = { rows: [], notDefects: [], gaps: [] };
	for ( const r of rows ) {
		const seen = reads.get( r.id ) || [];
		const best = seen.find( ( s ) => 'element' === s.read.via ) || seen.find( ( s ) => s.read.rule );
		const widths = [ ...new Set( seen.filter( ( s ) => s.read.rule ).map( ( s ) => s.width ) ) ].filter( ( w ) => null !== w );
		if ( ! best ) {
			out.gaps.push( { construct: 'style-hover', draftId: r.draftId, error: `no compiled :${ r.detail.pseudo } rule found for ${ JSON.stringify( r.detail.value ) } on ${ seen.length } page read(s)` } );
			continue;
		}
		const c = classifyCompiled( { value: r.detail.value, rule: best.read.rule } );
		const evidence = { pseudo: r.detail.pseudo, declared: r.detail.value, rule: best.read.rule.cssText, selector: best.read.rule.selector, via: best.read.via, decls: c.decls, read: { width: best.width, visit: best.visit } };
		if ( 'resolved' === c.verdict ) {
			out.notDefects.push( { draftId: r.draftId, censusId: r.id, why: 'render-wins', test: 'unresolved-binding', note: 'every bound declaration is resolved in the compiled rule', evidence } );
		} else {
			out.rows.push( { draftId: r.draftId, censusId: r.id, component: r.component, test: 'unresolved-binding', kind: r.kind, verdict: c.verdict, evidence, widths } );
		}
	}
	return out;
}

// FR-48-34 test 1 on already-open, settled pages ([ { page, width, visit } ]).
export async function unresolvedBindingDefects( { pages, census } ) {
	const rows = boundStyleRows( census );
	const reads = new Map();
	for ( const p of pages ) {
		await readPageBindings( p.page, rows, p, reads );
	}
	return bindingVerdicts( rows, reads );
}
