#!/usr/bin/env node
// Block pairing command (plan .claude/plans/2026-10-04-spec47-full-coverage.md).
//   node scripts/computed-route/pairs.mjs --client eye-care-ward-end --surface about
// Opens the surface's draft (its walker config's draft url and navigation) and live page at 1440, collects every
// painted word with the element painting it (scripts/parity/lib/auto-collect.mjs, tagEls), pairs the words with the
// walker's own matcher (auto-compare.mjs::matchWords), and pairs each live block (cr-ref-<surface>-<n>) with the
// smallest draft element holding its words' twins (lib/pairs.mjs; the in-page collectors are lib/pairs-page.mjs).
// A repeated draft word takes the occurrence nearest the block's sure words, or its parent block's partner; a block
// whose draft text has no element of its own is paired as a text run. Doubtful pairings are left out with their reason.
// A kept draft finder is re-checked at 375, 768 and 1920 (it must still hold the block's first and last matched words).
// A block that fails at a width is paired again at that width and keeps one joined finder (the partner at every
// width as one selector list) when that list resolves to each width's own element (lib/pairs.mjs::mergeWidthFinders).
// A panel surface (a mega panel, the drawer, a modal) is paired with its walker state open on both sides:
//   node scripts/computed-route/pairs.mjs --client eye-care-ward-end --surface mobile-menu --state drawer-open --width 375 --recheck 768
// --state a,b,c pairs once per state and scopes each pair to its state (`rest` is the page at rest, scoped to `opening`):
//   node scripts/computed-route/pairs.mjs --client eye-care-ward-end --surface product --state rest,tab-details,tab-sizing
// A state whose panel leaves the landmark it opens from names its own root in the hand config (`pairRoot`).
// With an origin (`<surface>.origin.json`, origin.mjs), each block in it is paired by exact draft identity and the word
// pairing is checked against it; a disagreement is listed as `mispaired` (identityPass).
// Writes sites/<client>/build/qa/parity/<surface>.full.mjs and sites/<client>/build/qa/pairs/<surface>.json.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { matchWords } from '../parity/lib/auto-compare.mjs';
import { wordsByBlock, twinsByBlock, twinPlan, commonPath, wordMatch, choosePartner, chooseControlPartner, chooseGroupPartner, chooseMediaPartner, reconcileHandPairs, configText, pairingStates, mergeWidthFinders, joinFinders, assertReachable, rootFor, collectContext, RECHECK_WIDTHS } from './lib/pairs.mjs';
import { judgePairScope } from './lib/pair-scope.mjs';
import { identityAgrees, mispairWhy, relateInPage, fingerprintAgrees, innerVerdicts, identityStates, unalignedRefs } from './lib/identity.mjs';
import { resolveFinder } from '../parity/lib/collect.mjs';
import { collectTagged, handScopes, liveBlocks, draftChains, formControls, groupBoxes, handElements, openDraft, openLive, liftedExclusions, liveReach, mediaPartners } from './lib/pairs-page.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );

// One pairing run: the surface opened on both sides at one width (with its state open), every live block paired with
// its draft element. check: refuse a live page that cannot be paired (lib/pairs.mjs::assertReachable).
// Returns { kept, left, unworded, retarget, duplicate, measured, boxes, lifted, handScope, handByRef }: handScope is each
// resolvable hand pair's twin-containment verdict (lib/pair-scope.mjs::judgePairScope); handByRef the draft finder of each
// hand pair measuring a block's root, by block ref.
export async function runPairing( { browser, cfg, prefix, width, state = null, check = false } ) {
	const draft = await openDraft( browser, cfg, width, state );
	const live = await openLive( browser, cfg, width, state );
	try {
		// A surface inside the header or footer landmark pairs its own words there (lib/pairs.mjs::liftExclusions).
		const lifted = await liftedExclusions( live, prefix );
		// collectTagged runs in the page and cannot name which side, width or state it was reading, so a missing
		// pair root arrived as a bare page.evaluate error four frames from its cause. runPairing knows all three.
		const tagged = async ( page, side ) => {
			try {
				return await collectTagged( page, side, cfg, lifted, state );
			} catch ( e ) {
				throw new Error( collectContext( { side, width, state: state?.name ?? null, root: rootFor( cfg, side, state ), message: e.message } ) );
			}
		};
		const dWords = await tagged( draft, 'draft' );
		const lWords = await tagged( live, 'live' );
		const { refs: liveRefs, boxes, parents } = await liveBlocks( live, prefix );
		if ( check ) {
			assertReachable( { url: cfg.live?.url, blocks: Object.keys( boxes ).length, words: lWords.length, requires: cfg.live?.requires, ...( await liveReach( live, cfg ) ) } );
		}
		const matches = matchWords( dWords, lWords ) || [];
		const lRefsOfWord = lWords.map( ( w ) => liveRefs[ w.e ] || [] );
		const twins = twinsByBlock( matches, wordsByBlock( lRefsOfWord ) );
		const liveRefsOfDraft = new Map( matches.map( ( [ d, l ] ) => [ d, lRefsOfWord[ l ] ] ) );
		const wordEls = dWords.map( ( w ) => w.e );
		// Pass 1: blocks with at least one sure (unrepeated) draft word; pass 2: blocks of repeated words only, anchored on
		// their parent block's partner.
		const plans = new Map( [ ...twins ].filter( ( [ , t ] ) => t.draft.length ).map( ( [ ref, t ] ) => [ ref, twinPlan( t.draft, dWords ) ] ) );
		const match = Object.fromEntries( [ ...twins ].map( ( [ ref, t ] ) => [ ref, wordMatch( t.draft.map( ( j ) => dWords[ j ].t ) ) ] ) );
		const results = {};
		const decide = ( chains ) => {
			for ( const [ ref, chain ] of Object.entries( chains ) ) {
				const block = { ref, ...twins.get( ref ), liveBox: boxes[ ref ] || { w: 0, h: 0 } };
				results[ ref ] = chain ? choosePartner( chain, block, liveRefsOfDraft ) : { partner: null, verdict: { ok: false, why: 'no draft element holds its words' } };
			}
		};
		decide( await draftChains( draft, Object.fromEntries( [ ...plans ].filter( ( [ , p ] ) => p.sure.length ).map( ( [ ref, p ] ) => [ ref, { ...p, anchor: null } ] ) ), wordEls, match ) );
		// Hand pairs' elements (also read for reconcileHandPairs below).
		const handPairs = ( cfg.pairs || [] ).filter( ( p ) => p && p.name );
		const serial = ( f ) => ( 'function' === typeof f ? null : f );
		const hDraft = await handElements( draft, handPairs.map( ( p ) => serial( p.draft ) ), 'draft', prefix );
		const hLive = await handElements( live, handPairs.map( ( p ) => serial( p.live ) ), 'live', prefix );
		// Each hand pair's two elements must hold the same words: a matched word inside one with its twin outside the other is a mispair.
		const dIn = await handScopes( draft, handPairs.map( ( p ) => serial( p.draft ) ), wordEls );
		const lIn = await handScopes( live, handPairs.map( ( p ) => serial( p.live ) ), lWords.map( ( w ) => w.e ) );
		const dTexts = dWords.map( ( w ) => w.t );
		const lTexts = lWords.map( ( w ) => w.t );
		// A pair declaring `text: false` is never judged on word containment: its author has said the two sides are not
		// expected to hold the same words, and several legitimately do not (shop's card-7 pairs the draft's made-up
		// stars against live's "No reviews yet"). Judging those refuses a correct config before a browser opens.
		const handScope = handPairs.map( ( p, i ) => {
			if ( ! ( dIn[ i ] && lIn[ i ] ) ) {
				return null;
			}
			if ( false === p.text ) {
				return { name: p.name, ok: true, judged: false, why: 'not judged: the config declares text: false, so its two sides are not expected to hold the same words' };
			}
			return { name: p.name, ...judgePairScope( { draftIn: dIn[ i ], liveIn: lIn[ i ], matches, dTexts, lTexts } ) };
		} ).filter( Boolean );
		// For anchoring, a hand pair measuring any element of a block stands for that block (a field's input for the field).
		const partnerPath = Object.fromEntries( handPairs.map( ( p, i ) => ( hLive[ i ]?.liveRef && hDraft[ i ] ? [ hLive[ i ].liveRef, hDraft[ i ] ] : null ) ).filter( Boolean ) );
		Object.entries( results ).forEach( ( [ ref, r ] ) => r.verdict.ok && ( partnerPath[ ref ] = r.partner.path ) );
		// A block of repeated words only anchors on its parent block's partner, else on its child blocks' partners' common ancestor.
		const anchorOf = ( ref ) => partnerPath[ parents[ ref ] ] || commonPath( Object.keys( parents ).filter( ( c ) => parents[ c ] === ref ).map( ( c ) => partnerPath[ c ] ) );
		const second = [ ...plans ].filter( ( [ , p ] ) => ! p.sure.length ).map( ( [ ref, p ] ) => [ ref, { ...p, anchor: anchorOf( ref ) } ] );
		decide( await draftChains( draft, Object.fromEntries( second ), wordEls, match ) );
		const kept = [];
		const left = [];
		for ( const [ ref, t ] of twins ) {
			const { partner, verdict } = results[ ref ] || { partner: null, verdict: { ok: false, why: 'no matched words' } };
			const textRun = partner?.textRun ? { ...partner.textRun, match: match[ ref ] } : null;
			( verdict.ok ? kept : left ).push( { ref, draft: partner?.path || null, ...( textRun ? { textRun } : {} ), why: verdict.why, words: t.live.length, matched: t.draft.length, first: t.draft.length ? dWords[ Math.min( ...t.draft ) ].t : null, last: t.draft.length ? dWords[ Math.max( ...t.draft ) ].t : null } );
		}
		// Form-control blocks (no painted words) pair by their control's name, id, placeholder or label.
		const liveControls = await formControls( live, prefix, 'live' );
		const controlRefs = Object.keys( boxes ).filter( ( r ) => ! twins.has( r ) && liveControls[ r ] );
		const controlChains = controlRefs.length ? await formControls( draft, prefix, 'draft', Object.fromEntries( controlRefs.map( ( r ) => [ r, liveControls[ r ] ] ) ) ) : {};
		for ( const ref of controlRefs ) {
			const { partner, verdict } = chooseControlPartner( controlChains[ ref ], boxes[ ref ] );
			// Paired with the draft control itself, the block is measured at its own control (not its label and wrapper).
			const liveControl = !! partner && partner === controlChains[ ref ]?.[ 0 ];
			( verdict.ok ? kept : left ).push( { ref, draft: partner?.path || null, control: liveControls[ ref ].id, ...( liveControl ? { liveControl } : {} ), why: verdict.why, words: 0, matched: 0, first: null, last: null } );
		}
		// A block left out for sharing its draft element with other blocks' words, or for a box far from its own, whose
		// children are paired, is paired as the group of its children's partners (box only; the group box is judged).
		kept.forEach( ( k ) => ( partnerPath[ k.ref ] = partnerPath[ k.ref ] || k.draft ) );
		const childPaths = ( ref ) => Object.keys( parents ).filter( ( c ) => parents[ c ] === ref ).map( ( c ) => partnerPath[ c ] );
		const grouped = left.filter( ( l ) => /belong outside|no draft element holds|its (width|height) is/.test( l.why || '' ) && childPaths( l.ref ).filter( Boolean ).length > 1 );
		const gBoxes = grouped.length ? await groupBoxes( draft, Object.fromEntries( grouped.map( ( l ) => [ l.ref, childPaths( l.ref ).filter( Boolean ) ] ) ) ) : {};
		for ( const l of grouped ) {
			const { partner, verdict } = chooseGroupPartner( childPaths( l.ref ), gBoxes[ l.ref ], boxes[ l.ref ] || { w: 0, h: 0 } );
			left.splice( left.indexOf( l ), 1 );
			( verdict.ok ? kept : left ).push( { ...l, draft: partner?.path || l.draft, ...( partner ? { group: partner.group } : {} ), why: verdict.ok ? null : `${ l.why }; ${ verdict.why }`, first: verdict.ok ? null : l.first, last: verdict.ok ? null : l.last } );
		}
		// Blocks with no painted words and no control (an icon, an image) pair by their media's place among the media of
		// their nearest paired ancestor (lib/pairs.mjs::chooseMediaPartner).
		const unworded = [];
		const pathOfRef = ( r ) => kept.find( ( k ) => k.ref === r )?.draft || partnerPath[ r ];
		const mediaWant = {};
		for ( const ref of Object.keys( boxes ).filter( ( r ) => ! twins.has( r ) && ! liveControls[ r ] ) ) {
			let up = parents[ ref ];
			while ( up && ! pathOfRef( up ) ) {
				up = parents[ up ];
			}
			up ? ( mediaWant[ ref ] = { anchor: up } ) : unworded.push( { ref, why: 'no painted words (an image, an icon or an empty wrapper)' } );
		}
		const liveMedia = await mediaPartners( live, 'live', mediaWant );
		const draftWant = Object.fromEntries( Object.entries( mediaWant ).filter( ( [ ref ] ) => liveMedia[ ref ] ).map( ( [ ref, w ] ) => [ ref, { anchor: pathOfRef( w.anchor ), kind: liveMedia[ ref ].kind, index: liveMedia[ ref ].index } ] ) );
		const draftMedia = Object.keys( draftWant ).length ? await mediaPartners( draft, 'draft', draftWant ) : {};
		for ( const ref of Object.keys( mediaWant ) ) {
			const { partner, verdict } = chooseMediaPartner( liveMedia[ ref ], draftMedia[ ref ], boxes[ ref ] );
			verdict.ok
				? kept.push( { ref, draft: partner.path, media: liveMedia[ ref ].kind, why: null, words: 0, matched: 0, first: null, last: null } )
				: unworded.push( { ref, why: liveMedia[ ref ] ? verdict.why : 'no painted words (an image, an icon or an empty wrapper)' } );
		}
		// Hand pairs measuring a kept block's draft element on an element inside the block move to the block root, and
		// the generated pair they then duplicate is dropped (lib/pairs.mjs::reconcileHandPairs).
		const { retarget, duplicate, measured } = reconcileHandPairs( handPairs.map( ( p, i ) => ( { name: p.name, draft: hDraft[ i ], liveRef: hLive[ i ]?.liveRef || null, liveIsRoot: !! hLive[ i ]?.liveIsRoot } ) ), kept.filter( ( k ) => ! k.textRun && ! k.group ) );
		for ( let i = kept.length - 1; i >= 0; i-- ) {
			duplicate.has( kept[ i ].ref ) && kept.splice( i, 1 );
		}
		// The draft finder of each hand pair measuring a block's own root, by that block (the identity cross-check reads it).
		const handByRef = Object.fromEntries( handPairs.map( ( p, i ) => ( hLive[ i ]?.liveRef && hLive[ i ].liveIsRoot && serial( p.draft ) ? [ hLive[ i ].liveRef, p.draft ] : null ) ).filter( Boolean ) );
		// Each hand pair measuring an element inside a block, with the block that owns its live element (identity checks
		// its draft element lies inside that block's identity element, lib/identity.mjs::innerVerdicts).
		const handInner = handPairs.map( ( p, i ) => ( hLive[ i ]?.liveRef && ! hLive[ i ].liveIsRoot && serial( p.draft ) && ! retarget.has( p.name ) ? { name: p.name, ref: hLive[ i ].liveRef, draft: p.draft } : null ) ).filter( Boolean );
		return { kept, left, unworded, retarget, duplicate, measured, boxes, lifted, handScope, handByRef, handInner };
	} finally {
		await draft.close();
		await live.close();
	}
}

// A kept finder must hold the block's first and last matched words at the re-check widths too (a control's, just exist).
// A block that fails at a width is paired again there; with a partner at every width it keeps one joined finder when
// the joined selector resolves to each width's own element (lib/pairs.mjs::mergeWidthFinders), else it is left out.
// Mutates run.kept / run.left.
export async function recheckWidths( { browser, cfg, prefix, width, recheck, state }, run ) {
	const { kept, left } = run;
	const widths = [ width, ...recheck ];
	const pages = {};
	const perWidth = new Map( kept.map( ( k ) => [ k.ref, { [ width ]: k.draft } ] ) );
	const failed = new Map();
	const reruns = {};
	try {
		for ( const w of widths ) {
			pages[ w ] = await openDraft( browser, cfg, w, state );
		}
		for ( const w of recheck ) {
			const texts = await pages[ w ].evaluate( ( paths ) => paths.map( ( p ) => document.querySelector( p )?.textContent.toLowerCase() ?? null ), kept.map( ( k ) => k.draft ) );
			for ( const [ i, k ] of kept.entries() ) {
				const t = texts[ i ];
				if ( null !== t && ( null === k.first || ( t.includes( k.first ) && t.includes( k.last ) ) ) ) {
					perWidth.get( k.ref )[ w ] = k.draft;
					continue;
				}
				failed.set( k.ref, failed.get( k.ref ) || w );
				const alt = k.group ? null : ( ( reruns[ w ] ||= await runPairing( { browser, cfg, prefix, width: w, state } ) ).kept.find( ( x ) => x.ref === k.ref ) );
				perWidth.get( k.ref )[ w ] = alt && ! alt.group && !! alt.textRun === !! k.textRun ? alt.draft : null;
			}
		}
		const joined = new Map();
		for ( const k of kept.filter( ( x ) => failed.has( x.ref ) ) ) {
			joined.set( k.ref, widths.every( ( w ) => perWidth.get( k.ref )[ w ] ) ? joinFinders( perWidth.get( k.ref ) ) : null );
		}
		// What each joined selector resolves to at each width (the first visible match, as resolveFinder takes it).
		const resolved = new Map();
		const sels = [ ...new Set( [ ...joined.values() ].filter( Boolean ) ) ];
		for ( const w of widths ) {
			const paths = await pages[ w ].evaluate( ( list ) => {
				const shown = ( e ) => ( null !== e.offsetParent || 'fixed' === getComputedStyle( e ).position ) && e.getClientRects().length > 0;
				const pathOf = ( el ) => {
					const steps = [];
					for ( let a = el; a && a !== document.body; a = a.parentElement ) {
						steps.unshift( `${ a.tagName.toLowerCase() }:nth-child(${ [ ...a.parentElement.children ].indexOf( a ) + 1 })` );
					}
					return [ 'body', ...steps ].join( ' > ' );
				};
				return list.map( ( sel ) => {
					try {
						const el = [ ...document.querySelectorAll( sel ) ].find( shown );
						return el ? pathOf( el ) : null;
					} catch {
						return null;
					}
				} );
			}, sels );
			sels.forEach( ( s, i ) => resolved.set( `${ w }|${ s }`, paths[ i ] ) );
		}
		for ( let i = kept.length - 1; i >= 0; i-- ) {
			const k = kept[ i ];
			if ( ! failed.has( k.ref ) ) {
				continue;
			}
			const m = mergeWidthFinders( perWidth.get( k.ref ), ( sel, w ) => resolved.get( `${ w }|${ sel }` ) ?? null, widths );
			if ( m.ok ) {
				k.drafts = m.drafts;
				continue;
			}
			left.push( { ...k, why: `its draft element at ${ failed.get( k.ref ) } does not hold the same words (${ m.why })` } );
			kept.splice( i, 1 );
		}
	} finally {
		await Promise.all( Object.values( pages ).map( ( p ) => p.close() ) );
	}
}

// Exact identity (route-accuracy R4): each block in the surface's origin (`<surface>.origin.json`, cr-ref to a tpl key)
// is paired with its identity element, and the word matcher's element for it (a generated pair's, or a hand pair's whose
// live finder is the block root, after the `retarget` move) is checked against it on the draft at `width`. A generated
// pair of an origin block takes the tpl finder, a disagreement recorded in `replaced`; a hand pair that disagrees still
// measures the words' element, so it is listed in `mispaired` (the walker flags the block's rows and Solve never writes
// through them). An origin block no pair measures (none generated, none by hand: `covered`) is added with its tpl
// finder, unless the width re-check refused it (its element differs at another width, which one width cannot judge).
// A hand pair measuring inside a block (`handInner`) is checked by containment (lib/identity.mjs::innerVerdicts). An
// identity element whose tag is not the skeleton fingerprint's is not trusted (`tagMismatch`): the draft changed under
// the tpl number, so the block is neither replaced nor added. `add` false (a later pairing state) checks only.
// Mutates kept and left. Returns { counts, mispaired, replaced, uncheckedHand, tagMismatch }.
export async function identityPass( { browser, cfg, width, state, origin, kept, left, retarget = new Map(), covered = new Set(), handByRef = new Map(), handInner = [], add = true } ) {
	// A hand pair measuring the block's root: found in the page (runPairing's handByRef), or by its live finder after
	// reconcileHandPairs moved it there (`retarget`, the config's `moved`).
	const handWord = ( ref ) => handByRef.get( ref ) || ( cfg.pairs || [] ).find( ( p ) => p && `.${ ref }` === ( retarget.get( p.name ) ?? p.live ) && 'function' !== typeof p.draft )?.draft || null;
	const genWord = ( k ) => ( k.group ? null : ( k.textRun ? k.textRun.within || k.draft : k.draft ) );
	const items = Object.entries( origin ).map( ( [ ref, o ] ) => {
		const k = kept.find( ( x ) => x.ref === ref );
		return { ref, tpl: o.tpl, word: ( k && genWord( k ) ) || handWord( ref ), inner: handInner.filter( ( h ) => h.ref === ref ).map( ( h ) => ( { name: h.name, draft: h.draft } ) ) };
	} );
	const page = await openDraft( browser, cfg, width, state );
	let rel;
	try {
		rel = await page.evaluate( relateInPage, [ resolveFinder.toString(), items ] );
	} finally {
		await page.close();
	}
	const mispaired = [];
	const replaced = [];
	const tagMismatch = [];
	const counts = { checked: rel.length, agree: 0, mispaired: 0, replaced: 0, unresolved: 0, noWordPair: 0, added: 0, tagMismatch: 0, innerChecked: 0, uncheckedHand: 0 };
	for ( const r of rel ) {
		const word = items.find( ( i ) => i.ref === r.ref ).word;
		if ( r.unresolved ) {
			counts.unresolved++;
			continue;
		}
		if ( ! fingerprintAgrees( origin[ r.ref ]?.fingerprint, r.idTag ) ) {
			counts.tagMismatch++;
			tagMismatch.push( { ref: r.ref, why: `identity ${ r.tpl } is <${ r.idTag }>; the skeleton stamped <${ origin[ r.ref ].fingerprint.tag }>` } );
			continue;
		}
		const k = kept.find( ( x ) => x.ref === r.ref );
		if ( ! word ) {
			counts.noWordPair++;
		} else if ( identityAgrees( r ) ) {
			counts.agree++;
		} else if ( k ) {
			// The generated pair now measures the identity element: the word matcher's choice is recorded, not measured.
			counts.replaced++;
			replaced.push( { ref: r.ref, why: mispairWhy( r ) } );
		} else {
			// A hand pair still measures the element the words chose: its rows compare two different elements.
			counts.mispaired++;
			mispaired.push( { ref: r.ref, why: mispairWhy( r ) } );
		}
		if ( k ) {
			for ( const key of [ 'textRun', 'group', 'drafts' ] ) {
				delete k[ key ];
			}
			Object.assign( k, { draft: { tpl: r.tpl }, identity: true } );
		} else if ( add && ! handWord( r.ref ) && ! covered.has( r.ref ) && ! /^its (draft element at|width is|height is)|no partner at/.test( left.find( ( l ) => l.ref === r.ref )?.why || '' ) ) {
			kept.push( { ref: r.ref, draft: { tpl: r.tpl }, identity: true, why: null, words: 0, matched: 0, first: null, last: null } );
			counts.added++;
			const at = left.findIndex( ( l ) => l.ref === r.ref );
			at >= 0 && left.splice( at, 1 );
		}
	}
	// Hand pairs inside a block: their draft element must lie inside the block's identity element.
	const inner = innerVerdicts( { handInner, origin, rel: rel.filter( ( r ) => ! tagMismatch.some( ( t ) => t.ref === r.ref ) ) } );
	counts.innerChecked = handInner.length - inner.uncheckedHand.length;
	counts.uncheckedHand = inner.uncheckedHand.length;
	for ( const m of inner.mispaired.filter( ( x ) => ! mispaired.some( ( y ) => y.ref === x.ref ) ) ) {
		counts.mispaired++;
		mispaired.push( m );
	}
	return { counts, mispaired, replaced, uncheckedHand: inner.uncheckedHand, tagMismatch };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const client = flag( '--client' );
	const surface = flag( '--surface' );
	const buildDir = path.join( REPO, 'sites', client, 'build' );
	const s = JSON.parse( fs.readFileSync( path.join( buildDir, 'surfaces.json' ), 'utf8' ) )[ surface ];
	const handPath = path.join( buildDir, s.walker );
	const cfg = ( await import( pathToFileURL( handPath ).href ) ).default;
	const prefix = `${ cfg.refPrefix || 'cr-ref-' }${ surface }-`;
	// A panel surface: --state names the walker state that opens it on both sides (a list pairs each in turn), --width
	// the width it opens at, and --recheck the widths its finders are re-checked at (the panel opened there too; "none"
	// for a panel that opens at one width only).
	const runs = pairingStates( cfg, flag( '--state' ) );
	const width = Number( flag( '--width' ) || 1440 );
	const recheck = 'none' === flag( '--recheck' ) ? [] : ( flag( '--recheck' )?.split( ',' ).map( Number ) || RECHECK_WIDTHS.filter( ( w ) => w !== width ) );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	// SGS_HEADED=1 runs headed (Hostinger's edge challenges a headless browser under load); scrollbars hidden as the walker hides them,
	// or a headed window lays the page out about 15px narrower than its viewport.
	const browser = await chromium.launch( { headless: ! process.env.SGS_HEADED, args: [ '--hide-scrollbars' ] } );
	const kept = [];
	const leftBy = new Map();
	const retarget = new Map();
	const duplicate = new Set();
	const measured = new Set();
	const allRefs = new Set();
	const scopeBy = new Map();
	let lifted = [];
	let identity = null;
	const handByRef = new Map();
	const handInner = [];
	try {
		for ( const { state, scope } of runs ) {
			const ctx = { browser, cfg, prefix, width, recheck, state };
			const run = await runPairing( { ...ctx, check: true } );
			await recheckWidths( ctx, run );
			scope && run.kept.forEach( ( k ) => ( k.scope = scope ) );
			kept.push( ...run.kept );
			[ ...run.left, ...run.unworded ].forEach( ( l ) => leftBy.set( l.ref, { ...l, ...( scope ? { state: scope } : {} ) } ) );
			run.retarget.forEach( ( v, k ) => retarget.set( k, v ) );
			run.duplicate.forEach( ( r ) => duplicate.add( r ) );
			run.measured.forEach( ( r ) => measured.add( r ) );
			Object.entries( run.handByRef ).forEach( ( [ r, f ] ) => handByRef.has( r ) || handByRef.set( r, f ) );
			run.handInner.filter( ( h ) => ! handInner.some( ( x ) => x.name === h.name ) ).forEach( ( h ) => handInner.push( { ...h, state: scope || null } ) );
			// A pair judged in several states is a mispair when any state says so. A pair the config declares `text: false`
			// is never judged, so its verdict carries no counts or split list.
			run.handScope.forEach( ( v ) => {
				const prev = scopeBy.get( v.name );
				scopeBy.set( v.name, prev ? { ...prev, ok: prev.ok && v.ok, checked: ( prev.checked || 0 ) + ( v.checked || 0 ), split: [ ...( prev.split || [] ), ...( v.split || [] ) ], why: prev.why || v.why } : v );
			} );
			Object.keys( run.boxes ).filter( ( r ) => r.startsWith( prefix ) ).forEach( ( r ) => allRefs.add( r ) );
			lifted = run.lifted;
		}
		// Exact identity, when the surface has an origin: checked in every pairing state on that state's pairs, blocks
		// added in the first state only (lib/identity.mjs::identityStates). A block mispaired in any state is mispaired.
		const originFile = path.join( buildDir, `${ surface }.origin.json` );
		if ( fs.existsSync( originFile ) ) {
			const origin = JSON.parse( fs.readFileSync( originFile, 'utf8' ) );
			const leftList = [ ...leftBy.values() ];
			const once = ( list, x ) => list.some( ( y ) => y.ref === x.ref && ( y.name || null ) === ( x.name || null ) ) || list.push( x );
			identity = { counts: {}, mispaired: [], replaced: [], uncheckedHand: [], tagMismatch: [] };
			for ( const st of identityStates( runs, kept ) ) {
				const before = st.kept.length;
				const one = await identityPass( { browser, cfg, width, state: st.state, origin, kept: st.kept, left: leftList, retarget, covered: new Set( [ ...duplicate, ...measured ] ), handByRef, handInner: handInner.filter( ( h ) => h.state === st.scope ), add: st.add } );
				st.kept.slice( before ).forEach( ( k ) => kept.push( st.scope ? { ...k, scope: st.scope } : k ) );
				Object.entries( one.counts ).forEach( ( [ k, v ] ) => ( identity.counts[ k ] = ( identity.counts[ k ] || 0 ) + v ) );
				[ 'mispaired', 'replaced', 'uncheckedHand', 'tagMismatch' ].forEach( ( k ) => one[ k ].forEach( ( x ) => once( identity[ k ], x ) ) );
			}
			identity.counts.states = runs.length;
			identity.counts.mispaired = identity.mispaired.length;
			identity.unaligned = unalignedRefs( allRefs, origin );
			leftBy.clear();
			leftList.forEach( ( l ) => leftBy.set( l.ref, l ) );
		}
	} finally {
		await browser.close();
	}
	// A block paired in any state is not left out.
	const keptRefs = new Set( kept.map( ( k ) => k.ref ) );
	const left = [ ...leftBy.values() ].filter( ( l ) => ! keptRefs.has( l.ref ) );
	const handFile = path.basename( s.walker );
	// Named after the surface: two surfaces can share one hand config (a page and the form post it embeds).
	const fullFile = `${ surface }.full.mjs`;
	fs.writeFileSync( path.join( path.dirname( handPath ), fullFile ), configText( handFile, surface, kept, retarget ) );
	fs.mkdirSync( path.join( buildDir, 'qa', 'pairs' ), { recursive: true } );
	const stateNames = runs.map( ( r ) => r.scope || r.state?.name ).filter( Boolean );
	// `handMeasured`: the block ref of every hand pair whose draft and live both resolve (read by lib/register-sweep.mjs).
	const report = { surface, when: new Date().toISOString(), ...( 1 === runs.length && runs[ 0 ].state ? { state: runs[ 0 ].state.name } : {} ), ...( runs.length > 1 ? { states: stateNames } : {} ), width, recheck, lifted, blocks: allRefs.size, kept: kept.length, coveredByHand: [ ...duplicate ], handMeasured: [ ...measured ], handScope: [ ...scopeBy.values() ], retargeted: Object.fromEntries( retarget ), ...( identity ? { identity: identity.counts, mispaired: identity.mispaired, replaced: identity.replaced, uncheckedHand: identity.uncheckedHand, tagMismatch: identity.tagMismatch, unaligned: identity.unaligned } : {} ), left, keptPairs: kept };
	fs.writeFileSync( path.join( buildDir, 'qa', 'pairs', `${ surface }.json` ), JSON.stringify( report, null, 1 ) );
	console.log( JSON.stringify( { surface, blocks: allRefs.size, kept: kept.length, left: left.length, ...( identity ? { identity: identity.counts } : {} ), config: path.join( path.dirname( s.walker ), fullFile ) } ) );
}
