// In-page collectors for scripts/computed-route/pairs.mjs (block pairing, plan .claude/plans/2026-10-04-spec47-full-coverage.md).
// Each runs through page.evaluate; the walker's own collectors are passed in as source.
import { collectAuto } from '../../parity/lib/auto-collect.mjs';
import { AUTO_EXCLUDE } from '../../parity/lib/auto-walk.mjs';
import { makeHelpers, waitOutHostCheck } from '../../parity/lib/helpers.mjs';
import { liftExclusions, rootFor, assertReachable } from './pairs.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';

// The words (tagged with their elements) of the page, as the walker's automatic check collects them.
export function collectTagged( page, side, cfg, lifted = [], state = null ) {
	const exclude = [ ...AUTO_EXCLUDE.filter( ( sel ) => ! lifted.includes( sel ) ), ...( cfg.auto?.exclude?.[ side ] || [] ) ];
	return page.evaluate( ( [ fn, rootSel, ex, resolveSrc, strict ] ) => {
		// eslint-disable-next-line no-new-func
		const collect = new Function( `return (${ fn });` )();
		// eslint-disable-next-line no-new-func
		const excludeEls = ex.filter( ( e ) => e && e.js ).map( ( e ) => new Function( 'root', `return (${ e.js })(root);` )( document ) ).filter( Boolean );
		// eslint-disable-next-line no-new-func
		const resolve = new Function( `return (${ resolveSrc });` )();
		const root = rootSel ? ( 'string' === typeof rootSel ? document.querySelector( rootSel ) : resolve( rootSel ) ) : null;
		// A root a state names itself (cfg.pairRoot) must exist: a missing one would silently walk <body>.
		if ( strict && rootSel && ! root ) {
			throw new Error( 'the pair root for this state was not found on the page' );
		}
		return collect( [ { root, modal: null, excludeEls, tagEls: true }, ex.filter( ( e ) => 'string' === typeof e ), 4000 ] ).words;
	}, [ collectAuto.toString(), rootFor( cfg, side, state ), exclude, resolveFinder.toString(), rootFor( cfg, side, state ) !== ( cfg.auto?.root?.[ side ] ?? null ) ] );
}

// Live: the cr-ref classes around each tagged word, innermost first, each block's border box, content box (the border
// box minus its computed padding) and text run (the extent of all its rendered text, paint.mjs::textRun), and each
// block's parent block (the nearest enclosing ref of this surface, or null).
export function liveBlocks( page, prefix ) {
	return page.evaluate( ( [ pre, src ] ) => {
		// eslint-disable-next-line no-new-func
		const { textRun } = new Function( `${ src }; return { textRun };` )();
		// Only this surface's refs: `<prefix><n>`; an embedded post's blocks (cr-ref-contact-form-3 on the contact page) belong to its own surface.
		const refOf = ( el ) => [ ...el.classList ].find( ( c ) => c.startsWith( pre ) && /^\d+$/.test( c.slice( pre.length ) ) );
		const refsAround = ( el ) => {
			const out = [];
			for ( let a = el; a; a = a.parentElement ) {
				const r = refOf( a );
				r && out.push( r );
			}
			return out;
		};
		const boxes = {};
		const parents = {};
		document.querySelectorAll( `[class*="${ pre }"]` ).forEach( ( el ) => {
			const r = refOf( el );
			if ( r && ! ( r in parents ) ) {
				let a = el.parentElement;
				while ( a && ! refOf( a ) ) {
					a = a.parentElement;
				}
				parents[ r ] = a ? refOf( a ) : null;
			}
			const b = el.getBoundingClientRect();
			const cs = getComputedStyle( el );
			const px = ( p ) => parseFloat( cs[ p ] ) || 0;
			const run = textRun( el, false );
			r && ! boxes[ r ] && b.width > 0 && ( boxes[ r ] = {
				w: Math.round( b.width ),
				h: Math.round( b.height ),
				content: { w: Math.round( b.width - px( 'paddingLeft' ) - px( 'paddingRight' ) ), h: Math.round( b.height - px( 'paddingTop' ) - px( 'paddingBottom' ) ) },
				run: run ? { w: run.box.w, h: run.box.h } : null,
			} );
		} );
		return { refs: window.__crEls.map( refsAround ), boxes, parents };
	}, [ prefix, PAINT_SRC ] );
}

// Draft: for each block (want: ref -> { sure: [element index], repeated: [[candidate element indices]], anchor: path or
// null }), the anchor is the smallest element holding the sure words (else the given anchor path); each repeated word
// takes the candidate nearest that anchor (the one sharing its deepest common ancestor). Returns ref -> the chain from
// the smallest element holding the chosen words up to <body>, nearest first (path, border box, content box, every
// tagged word inside it), with `own` (every chosen word is the first element's own text) and `run` (the extent of the
// first element's text holding those words: paint.mjs::textRun), or null.
export function draftChains( page, want, wordEls, match ) {
	return page.evaluate( ( [ w, wEls, rx, src ] ) => {
		// eslint-disable-next-line no-new-func
		const { textRun } = new Function( `${ src }; return { textRun };` )();
		const els = window.__crEls;
		const lca = ( list ) => list.reduce( ( a, b ) => {
			let x = a;
			while ( x && ! x.contains( b ) ) {
				x = x.parentElement;
			}
			return x;
		} );
		const depth = ( e ) => {
			let n = 0;
			for ( let a = e; a; a = a.parentElement ) {
				n++;
			}
			return n;
		};
		const pathOf = ( el ) => {
			const steps = [];
			for ( let a = el; a && a !== document.body; a = a.parentElement ) {
				steps.unshift( `${ a.tagName.toLowerCase() }:nth-child(${ [ ...a.parentElement.children ].indexOf( a ) + 1 })` );
			}
			return [ 'body', ...steps ].join( ' > ' );
		};
		const boxOf = ( el ) => {
			const b = el.getBoundingClientRect();
			const cs = getComputedStyle( el );
			const px = ( p ) => parseFloat( cs[ p ] ) || 0;
			return { box: { w: Math.round( b.width ), h: Math.round( b.height ) }, content: { w: Math.round( b.width - px( 'paddingLeft' ) - px( 'paddingRight' ) ), h: Math.round( b.height - px( 'paddingTop' ) - px( 'paddingBottom' ) ) } };
		};
		const out = {};
		for ( const [ ref, { sure, repeated, anchor } ] of Object.entries( w ) ) {
			const anchorEl = sure.length ? lca( [ ...new Set( sure ) ].map( ( i ) => els[ i ] ) ) : ( anchor && document.querySelector( anchor ) );
			const chosen = sure.map( ( i ) => els[ i ] );
			for ( const cands of repeated ) {
				const pick = anchorEl && cands.map( ( i ) => els[ i ] ).sort( ( a, b ) => depth( lca( [ anchorEl, b ] ) ) - depth( lca( [ anchorEl, a ] ) ) )[ 0 ];
				pick && chosen.push( pick );
			}
			const p = chosen.length ? lca( [ ...new Set( chosen ) ] ) : null;
			if ( ! p || p === document.body || p === document.documentElement ) {
				out[ ref ] = null;
				continue;
			}
			const own = chosen.every( ( e ) => e === p );
			const run = textRun( p, own, rx[ ref ] );
			out[ ref ] = [];
			for ( let a = p; a && a !== document.body; a = a.parentElement ) {
				out[ ref ].push( { path: pathOf( a ), ...boxOf( a ), inside: wEls.map( ( e, j ) => ( a.contains( els[ e ] ) ? j : -1 ) ).filter( ( j ) => j >= 0 ) } );
			}
			out[ ref ][ 0 ].own = own;
			out[ ref ][ 0 ].run = run ? { w: run.box.w, h: run.box.h } : null;
		}
		return out;
	}, [ want, wordEls, match, PAINT_SRC ] );
}

// Form controls (blocks with no painted words: a text field, a select). A control's identity is its name, else its id,
// else its placeholder, else its accessible label, else a select's first option (a draft built from mock markup carries
// placeholders only). Live: ref -> the identity of the first visible control in the block. Draft: identity -> the chain
// from the visible control with that identity up through every ancestor holding no other control, nearest first (path,
// border box). Hidden controls (a honeypot) never count.
export function formControls( page, prefix, side, idents = null ) {
	return page.evaluate( ( [ pre, sd, ids ] ) => {
		const SEL = 'input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea';
		const shown = ( e ) => e.getClientRects().length && 'hidden' !== getComputedStyle( e ).visibility;
		const ident = ( e ) => e.name || e.id || e.placeholder || e.getAttribute( 'aria-label' ) || e.labels?.[ 0 ]?.innerText.trim() || ( 'SELECT' === e.tagName ? e.options[ 0 ]?.text.trim() : '' ) || '';
		const pathOf = ( el ) => {
			const steps = [];
			for ( let a = el; a && a !== document.body; a = a.parentElement ) {
				steps.unshift( `${ a.tagName.toLowerCase() }:nth-child(${ [ ...a.parentElement.children ].indexOf( a ) + 1 })` );
			}
			return [ 'body', ...steps ].join( ' > ' );
		};
		const controls = [ ...document.querySelectorAll( SEL ) ].filter( shown );
		if ( 'live' === sd ) {
			const out = {};
			for ( const c of controls ) {
				const holder = [ ...document.querySelectorAll( `[class*="${ pre }"]` ) ].filter( ( b ) => b.contains( c ) ).pop();
				const ref = holder && [ ...holder.classList ].find( ( x ) => x.startsWith( pre ) && /^\d+$/.test( x.slice( pre.length ) ) );
				ref && ! out[ ref ] && ( out[ ref ] = { tag: c.tagName, id: ident( c ), name: c.name, idAttr: c.id, ph: c.placeholder || '', only: 1 === controls.filter( ( x ) => x.tagName === c.tagName ).length } );
			}
			return out;
		}
		const out = {};
		for ( const [ ref, want ] of Object.entries( ids ) ) {
			const sameTag = controls.filter( ( x ) => x.tagName === want.tag );
			const c = sameTag.find( ( x ) => [ x.name, x.id, x.placeholder ].some( ( v ) => v && [ want.name, want.idAttr, want.ph ].includes( v ) ) )
				|| sameTag.find( ( x ) => ident( x ) && ident( x ) === want.id )
				// The only control of its kind on both pages is the same control (a select whose first options differ).
				|| ( want.only && 1 === sameTag.length ? sameTag[ 0 ] : null );
			if ( ! c ) {
				out[ ref ] = null;
				continue;
			}
			out[ ref ] = [];
			for ( let a = c; a && a !== document.body && controls.filter( ( x ) => a.contains( x ) ).length === 1; a = a.parentElement ) {
				const b = a.getBoundingClientRect();
				out[ ref ].push( { path: pathOf( a ), box: { w: Math.round( b.width ), h: Math.round( b.height ) } } );
			}
		}
		return out;
	}, [ prefix, side, idents ] );
}

// Draft groups: ref -> the union box ({ w, h }) of the elements at its paths (paint.mjs::groupBox), or null.
export function groupBoxes( page, groups ) {
	return page.evaluate( ( [ g, src ] ) => {
		// eslint-disable-next-line no-new-func
		const { groupBox } = new Function( `${ src }; return { groupBox };` )();
		return Object.fromEntries( Object.entries( g ).map( ( [ ref, paths ] ) => {
			const b = groupBox( paths );
			return [ ref, b ? { w: b.box.w, h: b.box.h } : null ];
		} ) );
	}, [ groups, PAINT_SRC ] );
}

// Each hand pair's element on one side. Draft: its CSS path from <body> (as draftChains writes it). Live: the nearest
// block ref at or above it and whether it is that ref's own element.
export function handElements( page, finders, side, prefix ) {
	return page.evaluate( ( [ list, src, sd, pre ] ) => {
		// eslint-disable-next-line no-new-func
		const resolve = new Function( `return (${ src });` )();
		const pathOf = ( el ) => {
			const steps = [];
			for ( let a = el; a && a !== document.body; a = a.parentElement ) {
				steps.unshift( `${ a.tagName.toLowerCase() }:nth-child(${ [ ...a.parentElement.children ].indexOf( a ) + 1 })` );
			}
			return [ 'body', ...steps ].join( ' > ' );
		};
		return list.map( ( f ) => {
			let el = null;
			try {
				el = f ? resolve( f ) : null;
			} catch {
				el = null;
			}
			if ( ! el ) {
				return null;
			}
			if ( 'draft' === sd ) {
				return pathOf( el );
			}
			for ( let a = el; a; a = a.parentElement ) {
				const r = [ ...a.classList ].find( ( c ) => c.startsWith( pre ) );
				if ( r ) {
					return { liveRef: r, liveIsRoot: a === el };
				}
			}
			return null;
		} );
	}, [ finders, resolveFinder.toString(), side, prefix ] );
}

// Opens the surface's draft at a width, through its navigation, with every scroll reveal fired.
export async function openDraft( browser, cfg, width, state = null ) {
	const page = await browser.newPage( { viewport: { width, height: 900 } } );
	const RESOLVE = resolveFinder.toString();
	const h = makeHelpers( page, 'draft', { cb: ( u ) => u.replace( '{cb}', String( Date.now() ) ), RESOLVE, onAction: null } );
	h.log = [];
	await page.goto( cfg.draft.url.replace( '{cb}', String( Date.now() ) ), { waitUntil: 'networkidle', timeout: 90000 } ).catch( () => {} );
	await page.waitForTimeout( 1500 );
	await waitOutHostCheck( page );
	if ( cfg.draft.open ) {
		await cfg.draft.open( h );
	}
	await page.evaluate( async () => {
		for ( let y = 0; y < document.body.scrollHeight; y += 600 ) {
			window.scrollTo( 0, y );
			await new Promise( ( r ) => setTimeout( r, 120 ) );
		}
		window.scrollTo( 0, 0 );
	} );
	await page.waitForTimeout( 1500 );
	if ( state ) {
		await state.draft( h );
		await page.waitForTimeout( 700 );
	}
	return page;
}

// A live page that cannot be opened is a failure, never an empty report (lib/pairs.mjs::assertReachable). Only a
// networkidle timeout is tolerated (a page with a long-poll still paints).
export async function openLive( browser, cfg, width, state = null ) {
	assertReachable( { url: cfg.live?.url, blocks: 1 } );
	const page = await browser.newPage( { viewport: { width, height: 900 } } );
	await page.goto( cfg.live.url.replace( '{cb}', String( Date.now() ) ), { waitUntil: 'networkidle', timeout: 90000 } ).catch( ( e ) => {
		if ( 'TimeoutError' !== e?.name ) {
			throw new Error( `the live page ${ cfg.live.url } did not open: ${ e.message }` );
		}
	} );
	await page.waitForTimeout( 2500 );
	await waitOutHostCheck( page );
	const h = makeHelpers( page, 'live', { cb: ( u ) => u.replace( '{cb}', String( Date.now() ) ), RESOLVE: resolveFinder.toString(), onAction: null } );
	h.log = [];
	// The live side's own navigation (a pop-up opened from its page), as the walker runs it.
	if ( cfg.live.open ) {
		await cfg.live.open( h );
	}
	if ( state ) {
		await state.live( h );
		await page.waitForTimeout( 700 );
	}
	return page;
}

// What the live page shows about being the right page: whether its `live.requires` element exists (null when the
// config sets none) and the text of any order notice (a failed or cancelled order has no confirmation to pair).
export function liveReach( page, cfg ) {
	return page.evaluate( ( req ) => ( {
		requiresFound: req ? !! document.querySelector( req ) : null,
		notice: [ ...document.querySelectorAll( '.woocommerce-thankyou-order-failed, .woocommerce-notice, .woocommerce-error, .woocommerce-message, .woocommerce-info' ) ].map( ( e ) => e.textContent.replace( /\s+/g, ' ' ).trim() ).join( ' | ' ),
	} ), cfg.live?.requires || null );
}

// Media (an image, an icon, a video) for blocks with no painted words. `want`: ref -> { anchor: the ancestor's live ref
// (live) or draft path (draft), kind, index }. Live returns ref -> { kind, index, count }: the block's first media among
// its ancestor's visible media of that kind (null for a block holding none). Draft returns ref -> { count, chain } for
// the ancestor's media at that index: the media then every ancestor up to the anchor holding no other of them, nearest
// first ({ path, box }); chain null when the index is past the end.
export function mediaPartners( page, side, want ) {
	return page.evaluate( ( [ sd, w ] ) => {
		const MEDIA = 'img, svg, video, picture, canvas';
		const shown = ( e ) => e.getClientRects().length && e.getBoundingClientRect().width > 0 && 'hidden' !== getComputedStyle( e ).visibility;
		// Top-level media only: an <img> inside a <picture>, or a shape inside an <svg>, is part of its parent.
		const mediaIn = ( root, kind ) => [ ...root.querySelectorAll( MEDIA ) ].filter( ( m ) => shown( m ) && kind === m.tagName.toLowerCase() && ! m.parentElement.closest( 'picture, svg' ) );
		const pathOf = ( el ) => {
			const steps = [];
			for ( let a = el; a && a !== document.body; a = a.parentElement ) {
				steps.unshift( `${ a.tagName.toLowerCase() }:nth-child(${ [ ...a.parentElement.children ].indexOf( a ) + 1 })` );
			}
			return [ 'body', ...steps ].join( ' > ' );
		};
		const out = {};
		for ( const [ ref, spec ] of Object.entries( w ) ) {
			if ( 'live' === sd ) {
				const block = [ ...document.querySelectorAll( `.${ ref }` ) ].find( shown );
				const anchor = [ ...document.querySelectorAll( `.${ spec.anchor }` ) ].find( shown );
				const own = block && [ ...( block.matches( MEDIA ) ? [ block ] : [] ), ...block.querySelectorAll( MEDIA ) ].find( ( m ) => shown( m ) && ! m.parentElement.closest( 'picture, svg' ) );
				if ( ! own || ! anchor ) {
					out[ ref ] = null;
					continue;
				}
				const kind = own.tagName.toLowerCase();
				const list = mediaIn( anchor, kind );
				out[ ref ] = list.includes( own ) ? { kind, index: list.indexOf( own ), count: list.length } : null;
				continue;
			}
			const anchor = document.querySelector( spec.anchor );
			const list = anchor ? mediaIn( anchor, spec.kind ) : [];
			const m = list[ spec.index ];
			out[ ref ] = { count: list.length, chain: null };
			if ( m ) {
				out[ ref ].chain = [];
				for ( let a = m; a && a !== document.body && anchor.contains( a ) && ( a === m || list.filter( ( x ) => a.contains( x ) ).length === 1 ); a = a.parentElement ) {
					const b = a.getBoundingClientRect();
					out[ ref ].chain.push( { path: pathOf( a ), box: { w: Math.round( b.width ), h: Math.round( b.height ) } } );
				}
			}
		}
		return out;
	}, [ side, want ] );
}

// The automatic check's exclusions (AUTO_EXCLUDE) whose live element holds one of this surface's blocks
// (lib/pairs.mjs::liftExclusions).
export async function liftedExclusions( page, prefix ) {
	const holding = await page.evaluate( ( [ sels, pre ] ) => sels.filter( ( sel ) => [ ...document.querySelectorAll( sel ) ].some( ( el ) => [ el, ...el.querySelectorAll( `[class*="${ pre }"]` ) ].some( ( e ) => [ ...e.classList ].some( ( c ) => c.startsWith( pre ) && /^\d+$/.test( c.slice( pre.length ) ) ) ) ) ), [ AUTO_EXCLUDE, prefix ] );
	return liftExclusions( AUTO_EXCLUDE, ( sel ) => holding.includes( sel ) );
}
