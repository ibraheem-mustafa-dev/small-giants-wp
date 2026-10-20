// The draft's state looks (Spec 48 FR-48-81, the states wave): what each target's code declares while a state holds,
// beside FR-48-8's resting read (lib/fill-declared.mjs). A state is anything the framework's state vocabulary names
// (the framework DB's `states` table, seeded from plugins/sgs-blocks/scripts/data/states.json): a pseudo-class, an ARIA
// or native attribute, a state class or a data attribute. For every style rule of the draft whose selector carries one,
// and which matches the target once its state tokens are taken out, the reader enters the state on the element that
// carries it (the host, the target or an ancestor: `.card:hover .title`, `.burger[aria-expanded="true"] .bar`), reads
// the target's declared values and their render, and restores the page. Code first, the render confirms (R-47-4).

import { declaredValues, settleAnimations } from '../../parity/lib/devtools.mjs';
import { applyToken, renderedOf } from './fill-state-apply.mjs';
import { codeLooks } from './fill-state-code.mjs';
import { pseudoDeclared, pseudoRenderedOf } from './fill-state-pseudo.mjs';
import { reasonOf } from './fill-state-reason.mjs';

// The reaches the reader can enter in a page; environment states (media emulation) belong to the media-feature
// entries, and an unreachable one (:visited) is read from its stylesheet rules, never entered.
export const READABLE = [ 'force-pseudo', 'set-attribute', 'toggle-class', 'call', 'scroll' ];
const HOST_ATTR = 'data-sgs-state-host';
const esc = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

// The regex source that finds one vocabulary row's token inside a selector. A pseudo-class never matches a longer
// name (`:focus` is not `:focus-visible`); an attribute token without a value matches any value of that attribute, and
// one without its closing bracket (`[data-state`) is a prefix; a class token starting `--` is a BEM modifier on any
// element, one ending `-` a class prefix.
export function tokenSource( row ) {
	const t = row.token;
	if ( 'pseudo-class' === row.kind ) {
		return `${ esc( t ) }(?![\\w-])`;
	}
	if ( 'media' === row.kind ) {
		return null;
	}
	if ( t.startsWith( '[' ) ) {
		const m = /^\[([\w-]+)(?:([~|^$*]?=)"?([^"\]]*)"?)?(\])?$/.exec( t );
		if ( ! m ) {
			return null;
		}
		const [ , name, op, value, closed ] = m;
		if ( ! closed ) {
			return `\\[\\s*${ esc( name ) }(?![\\w-])[^\\]]*\\]`;
		}
		return op ? `\\[\\s*${ esc( name ) }\\s*${ esc( op ) }\\s*["']?${ esc( value ) }["']?\\s*\\]` : `\\[\\s*${ esc( name ) }(?:\\s*[~|^$*]?=[^\\]]*)?\\s*\\]`;
	}
	if ( t.startsWith( '--' ) ) {
		return `\\.[\\w-]+${ esc( t ) }(?![\\w-])`;
	}
	return t.endsWith( '-' ) ? `\\.${ esc( t ) }[\\w-]+` : `\\.${ esc( t ) }(?![\\w-])`;
}

// The vocabulary rows the reader can enter, each with its token's regex source: [{ i, state, family, kind, reach,
// call, src }]. rows: the `states` table (or states.json's `states`).
export function readableRows( rows ) {
	return rows.map( ( r, i ) => ( { ...r, i, src: tokenSource( r ) } ) ).filter( ( r ) => r.src && ( READABLE.includes( r.reach ) || 'unreachable' === r.reach ) );
}

// In-page: every state combination the stylesheets hold for each target. A selector part (one entry of a comma list)
// with one or more state tokens is a combination; it applies to a target when the part matches it with the tokens taken
// out. Each token's host is the nearest element (the target or an ancestor) that matches the part cut after the
// token's compound, tokens taken out; it is marked with a numbered attribute so the node side can reach it.
// A combination the page cannot enter (a token whose reach is unreachable, or with no host) also carries `code`: the
// declarations of every rule that produced its selector part, [{ order, d: [[prop, value, priority]] }], var() resolved
// on the target (lib/fill-state-code.mjs).
// Returns { [targetId]: [{ selector, tokens: [{ i, text, host }], code? }] }.
export function stateCombos( [ jobs, rows, resolveSrc, hostAttr ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const res = rows.map( ( r ) => ( { i: r.i, re: new RegExp( r.src, 'g' ) } ) );
	const parts = [];
	const unreachable = new Set( rows.filter( ( r ) => 'unreachable' === r.reach ).map( ( r ) => r.i ) );
	const ruleDecls = new Map();
	let ruleOrder = 0;
	const splitTop = ( sel ) => {
		const out = [];
		let depth = 0;
		let start = 0;
		for ( let k = 0; k < sel.length; k++ ) {
			const ch = sel[ k ];
			depth += '([' .includes( ch ) ? 1 : ')]'.includes( ch ) ? -1 : 0;
			if ( ',' === ch && 0 === depth ) {
				out.push( sel.slice( start, k ).trim() );
				start = k + 1;
			}
		}
		out.push( sel.slice( start ).trim() );
		return out;
	};
	// A nested rule's selector is resolved against its parent's: `&` stands for the parent, and a nested selector with
	// no `&` is a descendant of it.
	const nest = ( sel, parent ) => {
		if ( ! parent ) {
			return sel;
		}
		return sel.includes( '&' ) ? sel.replaceAll( '&', `:is(${ parent })` ) : `:is(${ parent }) ${ sel }`;
	};
	// `:is()` and `:where()` list alternatives: `.a:is(:hover, :focus-visible)` is a hover look and a focus look, never
	// one look needing both, so each argument becomes its own part, wrapped in the function it came from (`:where()`
	// keeps counting nothing toward the part's specificity).
	const alternatives = ( sel, budget = 32 ) => {
		const m = /:(?:is|where)\(/.exec( sel );
		if ( ! m ) {
			return [ sel ];
		}
		const open = m.index + m[ 0 ].length;
		let depth = 1;
		let k = open;
		const cuts = [];
		for ( ; k < sel.length && depth; k++ ) {
			const ch = sel[ k ];
			depth += '([' .includes( ch ) ? 1 : ')]'.includes( ch ) ? -1 : 0;
			if ( ',' === ch && 1 === depth ) {
				cuts.push( k );
			}
		}
		const close = k - 1;
		const args = [ open, ...cuts.map( ( c ) => c + 1 ) ].map( ( s, j ) => sel.slice( s, j < cuts.length ? cuts[ j ] : close ).trim() );
		const head = sel.slice( 0, m.index );
		const tail = sel.slice( close + 1 );
		const fn = m[ 0 ].slice( 0, -1 );
		// One argument: keep it, and expand what follows.
		if ( 1 === args.length ) {
			return alternatives( tail, budget ).map( ( t ) => `${ head }${ fn }(${ args[ 0 ] })${ t }` );
		}
		return args.slice( 0, budget ).flatMap( ( a ) => alternatives( `${ head }${ fn }(${ a })${ tail }`, budget ) ).slice( 0, budget );
	};
	const walk = ( list, parent = null ) => {
		for ( const rule of list ) {
			if ( rule.media && ! matchMedia( rule.media.mediaText ).matches ) {
				continue;
			}
			let own = parent;
			if ( rule.selectorText ) {
				own = splitTop( rule.selectorText ).map( ( p ) => nest( p, parent ) ).join( ', ' );
				const d = rule.style ? Array.from( rule.style ).map( ( p ) => [ p, rule.style.getPropertyValue( p ), rule.style.getPropertyPriority( p ) ] ) : [];
				ruleOrder++;
				splitTop( own ).flatMap( ( p ) => alternatives( p ) ).forEach( ( p ) => {
					parts.push( p );
					ruleDecls.set( p, [ ...( ruleDecls.get( p ) || [] ), { order: ruleOrder, d } ] );
				} );
			}
			if ( rule.cssRules ) {
				walk( rule.cssRules, own );
			}
		}
	};
	for ( const sheet of document.styleSheets ) {
		try {
			walk( sheet.cssRules );
		} catch {
			// A cross-origin sheet cannot be read; the draft's own styles are same-origin.
		}
	}
	// The selector with its state tokens taken out. A token that was a whole compound (`.x :hover`, `.a > :checked`)
	// leaves the universal selector, so the combinators keep their meaning; one inside a compound just goes.
	const strip = ( sel, hits ) => {
		let out = sel;
		[ ...hits ].sort( ( a, b ) => b.at - a.at ).forEach( ( h ) => ( out = `${ out.slice( 0, h.at ) }\u0000${ out.slice( h.at + h.text.length ) }` ) );
		return out.replace( /\u0000+/g, ( m, at, s ) => ( /^$|[\s>+~(,]$/.test( s.slice( Math.max( 0, at - 1 ), at ) ) && /^$|^[\s>+~),]/.test( s.slice( at + m.length, at + m.length + 1 ) ) ? '*' : '' ) ).trim();
	};
	// A token inside :not( … ) says "not in that state": it is not a state to enter.
	const negated = ( sel, at ) => {
		let depth = 0;
		for ( let k = at - 1; k >= 0; k-- ) {
			depth += ')' === sel[ k ] ? 1 : '(' === sel[ k ] ? -1 : 0;
			if ( depth < 0 ) {
				return /:not$/.test( sel.slice( 0, k ) );
			}
		}
		return false;
	};
	// Where the compound holding position `from` ends: the first combinator outside every bracket, with the depth counted
	// from the selector's start, so a token inside `:is( … )` ends at its own compound, not at the selector's end.
	const compoundEnd = ( sel, from ) => {
		let depth = 0;
		for ( let k = 0; k < from; k++ ) {
			depth += '([' .includes( sel[ k ] ) ? 1 : ')]'.includes( sel[ k ] ) ? -1 : 0;
		}
		for ( let k = from; k < sel.length; k++ ) {
			const ch = sel[ k ];
			depth += '([' .includes( ch ) ? 1 : ')]'.includes( ch ) ? -1 : 0;
			if ( 0 === depth && /[\s>+~]/.test( ch ) ) {
				return k;
			}
		}
		return sel.length;
	};
	// A token inside :has( … ) is a state of a descendant the selector only tests for: its host is not on the target's
	// ancestor chain, so it is listed, never entered on the wrong element.
	const insideHas = ( sel, at ) => {
		let depth = 0;
		for ( let k = at - 1; k >= 0; k-- ) {
			depth += ')' === sel[ k ] ? 1 : '(' === sel[ k ] ? -1 : 0;
			if ( depth < 0 && /:has$/.test( sel.slice( 0, k ) ) ) {
				return true;
			}
		}
		return false;
	};
	// What does not depend on the target, worked out once per part: its tokens, the selector they leave, and each
	// token's host selector. A part that leaves nothing but the universal selector (`[hidden]{display:none}`, a bare
	// `:disabled`) is a page-wide utility, not a look of any one element, so it is skipped.
	const analysed = [];
	for ( const full of new Set( parts ) ) {
		// A trailing pseudo-element (`.card:hover::after`) is cut off before matching: the part names the element that
		// carries it, and the look is the pseudo-element's own.
		const pm = /::?(before|after|marker|placeholder)$/.exec( full );
		const part = pm ? full.slice( 0, pm.index ) : full;
		const pseudo = pm ? `::${ pm[ 1 ] }` : null;
		const hits = [];
		for ( const { i, re } of res ) {
			re.lastIndex = 0;
			for ( let m; ( m = re.exec( part ) ); ) {
				// One occurrence counts once: the first row that names it (rows are ordered specific first).
				if ( ! hits.some( ( h ) => h.at === m.index ) && ! negated( part, m.index ) ) {
					hits.push( { i, at: m.index, text: m[ 0 ] } );
				}
			}
		}
		if ( ! hits.length ) {
			continue;
		}
		const stripped = strip( part, hits );
		if ( ! /[.#[]|(^|[\s>+~(])[a-z]/i.test( stripped.replace( /:is\(\*\)/g, '' ) ) ) {
			continue;
		}
		const hostOf = hits.map( ( h ) => ( insideHas( part, h.at ) ? null : strip( part.slice( 0, compoundEnd( part, h.at ) ), hits.filter( ( x ) => x.at < compoundEnd( part, h.at ) ) ) ) );
		// The pseudo-element left in the selector: `matches()` never matches one, so the element is matched without it.
		const tail = /::[a-z-]+(\([^)]*\))?$/.exec( stripped );
		analysed.push( { part, full, pseudo, hits, stripped: tail ? stripped.slice( 0, tail.index ) || '*' : stripped, hostOf, unreadable: !! tail } );
	}
	const out = {};
	let n = 0;
	for ( const job of jobs ) {
		// A target a state reveals (a popover, a dropdown panel) is hidden at rest, and a string finder resolves only
		// visible elements, so it falls back to the first match; a draft identity (tpl) finder never filters by visibility.
		const el = resolve( job.finder ) || ( 'string' === typeof job.finder ? document.querySelector( job.finder ) : null );
		if ( ! el ) {
			continue;
		}
		for ( const { part, full, pseudo, hits, stripped, hostOf, unreadable } of analysed ) {
			let matches = false;
			try {
				matches = el.matches( stripped );
			} catch {
				continue;
			}
			if ( ! matches ) {
				continue;
			}
			if ( unreadable ) { // a trailing pseudo-element no browser reads (`::selection`): reported, never dropped
				( out[ job.id ] ??= [] ).push( { selector: full, tokens: [], unreadable: 'pseudo-element not readable' } );
				continue;
			}
			const tokens = hits.map( ( h, k ) => {
				let host = null;
				try {
					host = null === hostOf[ k ] ? null : el.closest( hostOf[ k ] );
				} catch {
					host = null;
				}
				if ( host && ! host.hasAttribute( hostAttr ) ) {
					host.setAttribute( hostAttr, String( ++n ) );
				}
				return { i: h.i, text: h.text, host: host ? host.getAttribute( hostAttr ) : null, inHas: null === hostOf[ k ] };
			} );
			const entry = { selector: full, tokens, ...( pseudo ? { pseudo } : {} ) };
			if ( hits.some( ( h ) => unreachable.has( h.i ) ) || tokens.some( ( t ) => null === t.host ) ) {
				const style = getComputedStyle( el );
				const plain = ( v ) => {
					let text = v;
					for ( let k = 0; k < 5 && /var\(/.test( text ); k++ ) {
						text = text.replace( /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, ( m, name, fallback ) => style.getPropertyValue( name ).trim() || ( fallback || '' ).trim() );
					}
					return text;
				};
				entry.code = ( ruleDecls.get( full ) || [] ).map( ( r ) => ( { order: r.order, d: r.d.map( ( [ p, v, i ] ) => [ p, plain( v ), i ] ) } ) );
			}
			( out[ job.id ] ??= [] ).push( entry );
		}
	}
	return out;
}

// What changes between two declared reads: { prop: value } for each property the state declares differently.
export function declaredDiff( rest, state ) {
	return Object.fromEntries( Object.entries( state || {} ).filter( ( [ p, v ] ) => ( rest || {} )[ p ] !== v ) );
}

// Every state look of every target at the page's current width: { [targetId]: [{ states, family, selector, tokens,
// declared, rendered, read }] } for each combination whose declared values differ from rest, and `unreached`: the
// combinations the page cannot enter whose rules declare nothing to read. A state the browser never exposes (:visited)
// or whose host was not found is read from its stylesheet rules (lib/fill-state-code.mjs, `read: 'code'`, rendered
// null: the render cannot confirm it); an entered state has `read: 'entered'`. page/cdp: the open
// draft page and its DevTools session (lib/fill-read.mjs::readDraft); jobs: lib/fill-read.mjs::jobsFor; rows: the
// state vocabulary; rest: the resting declared read at this width ({ [targetId]: { prop: value } }).
export async function readStates( { page, cdp, jobs, rows, rest, resolveSrc, log = () => {} } ) {
	const vocab = readableRows( rows );
	const combos = await page.evaluate( stateCombos, [ jobs, vocab, resolveSrc, HOST_ATTR ] );
	const byI = new Map( vocab.map( ( r ) => [ r.i, r ] ) );
	const out = { looks: {}, unreached: [] };
	const pseudoRests = new Map();
	try {
		for ( const job of jobs ) {
			const blocked = [];
			for ( const combo of combos[ job.id ] || [] ) {
				if ( combo.unreadable ) {
					out.unreached.push( { id: job.id, selector: combo.selector, why: combo.unreadable } );
					continue;
				}
				const tokens = combo.tokens.map( ( t ) => ( { ...t, row: byI.get( t.i ) } ) );
				if ( tokens.some( ( t ) => 'unreachable' === t.row.reach || null === t.host ) ) {
					if ( combo.pseudo ) {
						out.unreached.push( { id: job.id, selector: combo.selector, why: `${ reasonOf( tokens ) }; a state look of a pseudo-element is entered, never read from code` } );
						continue;
					}
					blocked.push( { combo, tokens } );
					continue;
				}
				const look = await readOne( page, cdp, job, tokens, resolveSrc, combo.pseudo ).catch( ( e ) => {
					log( `state read failed for ${ job.id } (${ combo.selector }): ${ e.message }` );
					return null;
				} );
				// A pseudo-element's look differs from the pseudo-element's own resting values, not the element's.
				const restKey = `${ job.id }|${ combo.pseudo }`;
				if ( combo.pseudo && ! pseudoRests.has( restKey ) ) {
					pseudoRests.set( restKey, ( await readOne( page, cdp, job, [], resolveSrc, combo.pseudo ).catch( ( e ) => log( `pseudo-element resting read failed for ${ job.id } (${ combo.pseudo }): ${ e.message }` ) ) )?.declared ?? null );
				}
				if ( combo.pseudo && ! pseudoRests.get( restKey ) ) { // every declared property would read as a change without the resting values
					log( `state look ${ combo.selector } of ${ job.id } skipped: the ${ combo.pseudo } resting values could not be read` );
					continue;
				}
				const restOf = combo.pseudo ? pseudoRests.get( restKey ) : rest?.[ job.id ];
				const declared = declaredDiff( restOf, look?.declared );
				if ( look && Object.keys( declared ).length ) {
					const states = [ ...new Set( tokens.map( ( t ) => t.row.state ) ) ];
					out.looks[ job.id ] ??= [];
					out.looks[ job.id ].push( { states, family: tokens[ 0 ].row.family, selector: combo.selector, tokens: tokens.map( ( t ) => t.text ), declared, rendered: look.rendered, read: 'entered', ...( combo.pseudo ? { pseudo: combo.pseudo } : {} ) } );
				}
			}
			const code = codeLooks( { id: job.id, blocked, rest: rest?.[ job.id ], reasonOf } );
			if ( code.looks.length ) {
				( out.looks[ job.id ] ??= [] ).push( ...code.looks );
			}
			out.unreached.push( ...code.unreached );
		}
	} finally {
		await page.evaluate( ( a ) => document.querySelectorAll( `[${ a }]` ).forEach( ( e ) => e.removeAttribute( a ) ), HOST_ATTR );
	}
	return out;
}

// One combination: enter every token's state on its host, read the target, leave in reverse order.
async function readOne( page, cdp, job, tokens, resolveSrc, pseudoName = null ) {
	const hostSel = ( t ) => `[${ HOST_ATTR }="${ t.host }"]`;
	const pseudo = tokens.filter( ( t ) => 'force-pseudo' === t.row.reach );
	const others = tokens.filter( ( t ) => 'force-pseudo' !== t.row.reach );
	const saved = [];
	try {
		for ( const t of others ) {
			saved.push( [ t, await page.evaluate( applyToken, [ hostSel( t ), t.row.reach, t.text, t.row.call, true, null ] ) ] );
		}
		const read = async () => {
			const declared = pseudoName ? await pseudoDeclared( cdp, job.finder, resolveSrc, pseudoName, pseudo.length > 0 ) : await declaredValues( cdp, job.finder, resolveSrc, null, { keepDocument: pseudo.length > 0 } );
			const rendered = declared ? await page.evaluate( pseudoName ? pseudoRenderedOf : renderedOf, [ job.finder, resolveSrc, Object.keys( declared ), pseudoName ] ) : null;
			return { declared, rendered };
		};
		if ( ! pseudo.length ) {
			await settleAnimations( page, { floor: 30, cap: 3000 } );
			return await read();
		}
		// Every host's own pseudo-classes are forced at once (`.card:hover .title:focus` forces :hover on the card and
		// :focus on the title), then cleared.
		const byHost = new Map();
		pseudo.forEach( ( t ) => byHost.set( t.host, [ ...( byHost.get( t.host ) || [] ), t.text.slice( 1 ) ] ) );
		const { root } = await cdp.send( 'DOM.getDocument', { depth: 0 } );
		const nodes = [];
		for ( const [ host, states ] of byHost ) {
			const { nodeId } = await cdp.send( 'DOM.querySelector', { nodeId: root.nodeId, selector: `[${ HOST_ATTR }="${ host }"]` } );
			if ( nodeId ) {
				nodes.push( nodeId );
				await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states } );
			}
		}
		try {
			await settleAnimations( page, { floor: 30, cap: 3000 } );
			return await read();
		} finally {
			for ( const nodeId of nodes ) {
				await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] } );
			}
			await settleAnimations( page, { floor: 0, cap: 3000 } );
		}
	} finally {
		for ( const [ t, s ] of saved.reverse() ) {
			if ( s ) {
				await page.evaluate( applyToken, [ hostSel( t ), t.row.reach, t.text, t.row.call, false, s ] );
			}
		}
	}
}
