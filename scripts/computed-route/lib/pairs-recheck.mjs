// The width re-check of a pairing run (pairs.mjs): each kept draft finder is read again at the re-check widths, and a
// block whose finder fails at one is paired again there (pairs.mjs::runPairing) and keeps one joined finder or is left out.
import { mergeWidthFinders, joinFinders } from './pairs.mjs';
import { openDraft } from './pairs-page.mjs';
import { runPairing } from '../pairs.mjs';

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
