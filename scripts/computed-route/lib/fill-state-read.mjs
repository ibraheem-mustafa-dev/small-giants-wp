// The draft's state looks (Spec 48 FR-48-81, the states wave): what each target's code declares while a state holds,
// beside FR-48-8's resting read (lib/fill-declared.mjs). A state is anything the framework's state vocabulary names
// (the framework DB's `states` table, seeded from plugins/sgs-blocks/scripts/data/states.json): a pseudo-class, an ARIA
// or native attribute, a state class or a data attribute. For every style rule of the draft whose selector carries one,
// and which matches the target once its state tokens are taken out, the reader enters the state on the element that
// carries it (the host, the target or an ancestor: `.card:hover .title`, `.burger[aria-expanded="true"] .bar`), reads
// the target's declared values and their render, and restores the page. Code first, the render confirms (R-47-4).

import { declaredValues, forcedPseudo, settleAnimations } from '../../parity/lib/devtools.mjs';

// The reaches the reader can enter in a page; environment states (media emulation) belong to the media-feature
// entries, and an unreachable one (:visited) is listed, never guessed.
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
// Returns { [targetId]: [{ selector, tokens: [{ i, text, host }] }] }.
export function stateCombos( [ jobs, rows, resolveSrc, hostAttr ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const res = rows.map( ( r ) => ( { i: r.i, re: new RegExp( r.src, 'g' ) } ) );
	const parts = [];
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
	const walk = ( list ) => {
		for ( const rule of list ) {
			if ( rule.media && ! matchMedia( rule.media.mediaText ).matches ) {
				continue;
			}
			if ( rule.selectorText ) {
				splitTop( rule.selectorText ).forEach( ( p ) => parts.push( p ) );
			}
			if ( rule.cssRules ) {
				walk( rule.cssRules );
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
	const compoundEnd = ( sel, from ) => {
		let depth = 0;
		for ( let k = from; k < sel.length; k++ ) {
			const ch = sel[ k ];
			depth += '([' .includes( ch ) ? 1 : ')]'.includes( ch ) ? -1 : 0;
			if ( 0 === depth && /[\s>+~]/.test( ch ) ) {
				return k;
			}
		}
		return sel.length;
	};
	const unique = [ ...new Set( parts ) ];
	const out = {};
	let n = 0;
	for ( const job of jobs ) {
		// A target a state reveals (a popover, a dropdown panel) is hidden at rest, and a string finder resolves only
		// visible elements, so it falls back to the first match; a draft identity (tpl) finder never filters by visibility.
		const el = resolve( job.finder ) || ( 'string' === typeof job.finder ? document.querySelector( job.finder ) : null );
		if ( ! el ) {
			continue;
		}
		for ( const part of unique ) {
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
			let matches = false;
			try {
				matches = el.matches( strip( part, hits ) );
			} catch {
				continue;
			}
			if ( ! matches ) {
				continue;
			}
			const tokens = hits.map( ( h ) => {
				const cut = part.slice( 0, compoundEnd( part, h.at ) );
				let host = null;
				try {
					host = el.closest( strip( cut, hits.filter( ( x ) => x.at < cut.length ) ) );
				} catch {
					host = null;
				}
				if ( host && ! host.hasAttribute( hostAttr ) ) {
					host.setAttribute( hostAttr, String( ++n ) );
				}
				return { i: h.i, text: h.text, host: host ? host.getAttribute( hostAttr ) : null };
			} );
			( out[ job.id ] ??= [] ).push( { selector: part, tokens } );
		}
	}
	return out;
}

// In-page: enter (on) or leave (off) one non-pseudo token on its host; returns what to restore.
function applyToken( [ hostSel, reach, text, call, on, saved ] ) {
	const host = document.querySelector( hostSel );
	if ( ! host ) {
		return null;
	}
	if ( 'set-attribute' === reach ) {
		const m = /^\[\s*([\w-]+)(?:\s*([~|^$*]?=)\s*["']?([^"'\]]*)["']?)?/.exec( text );
		const name = m[ 1 ];
		if ( on ) {
			const before = host.getAttribute( name );
			const value = undefined === m[ 3 ] ? ( 'aria-current' === name ? 'page' : '' ) : ( '~=' === m[ 2 ] && before ? `${ before } ${ m[ 3 ] }` : m[ 3 ] );
			host.setAttribute( name, value );
			return { name, before };
		}
		if ( null === saved.before ) {
			host.removeAttribute( saved.name );
		} else {
			host.setAttribute( saved.name, saved.before );
		}
		return null;
	}
	if ( 'toggle-class' === reach ) {
		const cls = text.replace( /^\./, '' );
		if ( on ) {
			const had = host.classList.contains( cls );
			host.classList.add( cls );
			return { cls, had };
		}
		if ( ! saved.had ) {
			host.classList.remove( saved.cls );
		}
		return null;
	}
	if ( 'call' === reach ) {
		const leave = { showModal: 'close', showPopover: 'hidePopover' }[ call ];
		try {
			host[ on ? call : leave ]();
		} catch {
			// A host that cannot enter the state (not a dialog or not a popover) is left as it was.
		}
		return {};
	}
	if ( 'scroll' === reach ) {
		if ( on ) {
			const y = scrollY;
			scrollTo( 0, Math.max( 600, innerHeight ) );
			return { y };
		}
		scrollTo( 0, saved.y );
		return null;
	}
	return null;
}

// In-page: the rendered values of `props` on a job's element.
function renderedOf( [ finder, resolveSrc, props ] ) {
	// eslint-disable-next-line no-new-func
	const el = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! el ) {
		return null;
	}
	const cs = getComputedStyle( el );
	return Object.fromEntries( props.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) );
}

// What changes between two declared reads: { prop: value } for each property the state declares differently.
export function declaredDiff( rest, state ) {
	return Object.fromEntries( Object.entries( state || {} ).filter( ( [ p, v ] ) => ( rest || {} )[ p ] !== v ) );
}

// Every state look of every target at the page's current width: { [targetId]: [{ states, family, selector, tokens,
// declared, rendered }] } for each combination whose declared values differ from rest, and `unreached`: the
// combinations naming a state the browser never exposes (:visited) or whose host was not found. page/cdp: the open
// draft page and its DevTools session (lib/fill-read.mjs::readDraft); jobs: lib/fill-read.mjs::jobsFor; rows: the
// state vocabulary; rest: the resting declared read at this width ({ [targetId]: { prop: value } }).
export async function readStates( { page, cdp, jobs, rows, rest, resolveSrc, log = () => {} } ) {
	const vocab = readableRows( rows );
	const combos = await page.evaluate( stateCombos, [ jobs, vocab, resolveSrc, HOST_ATTR ] );
	const byI = new Map( vocab.map( ( r ) => [ r.i, r ] ) );
	const out = { looks: {}, unreached: [] };
	try {
		for ( const job of jobs ) {
			for ( const combo of combos[ job.id ] || [] ) {
				const tokens = combo.tokens.map( ( t ) => ( { ...t, row: byI.get( t.i ) } ) );
				if ( tokens.some( ( t ) => 'unreachable' === t.row.reach || null === t.host ) ) {
					out.unreached.push( { id: job.id, selector: combo.selector, why: tokens.some( ( t ) => null === t.host ) ? 'no host element' : `${ tokens.find( ( t ) => 'unreachable' === t.row.reach ).text } is never exposed to scripts` } );
					continue;
				}
				const look = await readOne( page, cdp, job, tokens, resolveSrc ).catch( ( e ) => {
					log( `state read failed for ${ job.id } (${ combo.selector }): ${ e.message }` );
					return null;
				} );
				const declared = declaredDiff( rest?.[ job.id ], look?.declared );
				if ( look && Object.keys( declared ).length ) {
					const states = [ ...new Set( tokens.map( ( t ) => t.row.state ) ) ];
					out.looks[ job.id ] ??= [];
					out.looks[ job.id ].push( { states, family: tokens[ 0 ].row.family, selector: combo.selector, tokens: tokens.map( ( t ) => t.text ), declared, rendered: look.rendered } );
				}
			}
		}
	} finally {
		await page.evaluate( ( a ) => document.querySelectorAll( `[${ a }]` ).forEach( ( e ) => e.removeAttribute( a ) ), HOST_ATTR );
	}
	return out;
}

// One combination: enter every token's state on its host, read the target, leave in reverse order.
async function readOne( page, cdp, job, tokens, resolveSrc ) {
	const hostSel = ( t ) => `[${ HOST_ATTR }="${ t.host }"]`;
	const pseudo = tokens.filter( ( t ) => 'force-pseudo' === t.row.reach );
	const others = tokens.filter( ( t ) => 'force-pseudo' !== t.row.reach );
	const saved = [];
	try {
		for ( const t of others ) {
			saved.push( [ t, await page.evaluate( applyToken, [ hostSel( t ), t.row.reach, t.text, t.row.call, true, null ] ) ] );
		}
		const read = async () => {
			const declared = await declaredValues( cdp, job.finder, resolveSrc, null, { keepDocument: pseudo.length > 0 } );
			const rendered = declared ? await page.evaluate( renderedOf, [ job.finder, resolveSrc, Object.keys( declared ) ] ) : null;
			return { declared, rendered };
		};
		if ( ! pseudo.length ) {
			await settleAnimations( page, { floor: 30, cap: 3000 } );
			return await read();
		}
		// Pseudo-classes on one host are forced together; a combination with pseudo tokens on two hosts forces the
		// nearer host's chain, which covers the farther one when it is an ancestor (hover and focus chains).
		const host = pseudo[ 0 ].host;
		return await forcedPseudo( cdp, page, hostSel( pseudo[ 0 ] ), resolveSrc, pseudo.filter( ( t ) => t.host === host ).map( ( t ) => t.text.slice( 1 ) ), read );
	} finally {
		for ( const [ t, s ] of saved.reverse() ) {
			if ( s ) {
				await page.evaluate( applyToken, [ hostSel( t ), t.row.reach, t.text, t.row.call, false, s ] );
			}
		}
	}
}
