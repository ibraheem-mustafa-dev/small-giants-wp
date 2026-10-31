// Identification by elimination (Spec 48 §3.4, FR-48-6; plan F1): which block a draft element is, from the facts it shows
// (lib/skeleton-identity-draft.mjs) against every block's identification facts (lib/skeleton-identity-table.mjs). No single
// fact names a block; each fact rules blocks out, and only a proven absence does:
//   1. the candidates are every block whose `context` fits the surface (header, footer, drawer, form, a commerce role, or
//      any), and the blocks the database scoring already proposes;
//   2. a candidate is ruled out when the element's region shows a meaning (a role, written or implied by its tag, through
//      lib/skeleton-identity-roles.mjs) or an aria state the block, and every block it can hold, says `no` for (no row is
//      unknown, and an unknown never rules a block out). A block holding any block (a wrapper shell, a free content holder)
//      is never ruled out: it stays with fewer matched facts. Open state, motion, held values, parts and platform only rank;
//   3. the survivors are ranked by the facts both the region and the block show as yes (a role, an aria state, a tab set's
//      open state and panel, a held value, a timer), counting only facts that name few blocks (shown by at most
//      `rules.identity.maxShare` of the blocks with rows), and only when the element is the smallest one holding all of
//      that block's matched facts; then by the database scoring;
//   4. a platform separates only a look-alike family: the leaders whose matched facts are the same and of which one at
//      least belongs to a platform. The region's platform keeps the members of that platform, or with none named the members
//      of no platform;
//   5. one clear leader (more matched facts than the next) wins; leaders the facts cannot separate fall to the scoring, and a
//      review row only when the scoring cannot separate them either (`rules.identity.reviewConfidence`) or when the scoring's
//      own pick was ruled out and nothing is left. Facts several blocks share equally never displace the scoring's pick.
// Authority: a client decision, a finaliser pick, a standing decision and a structural rule are never touched; another rule
// whose block the facts rule out keeps its block as a low-confidence review row with the evidence, never a silent swap.
import { identityTable } from './skeleton-identity-table.mjs';
import { makeDraftFacts, RANKING_FACTS } from './skeleton-identity-draft.mjs';
import { paletteBrands } from './brand-registry.mjs';

// The facts that rule a block out: a meaning (a role, written or implied by the tag) or an aria state or property the block
// can never show (Bean 2026-10-30), and a kind of value (an emoji, a stroke-drawn icon) no field of a restricted block accepts;
// an emoji never rules out a block with a text setting, which prints it as text. Open state, motion, held values, parts and
// platform only rank.
const MEANING = new Set( [ 'renders-role', 'implied-role', 'renders-aria' ] );
const fmt = ( f ) => `${ f.fact } ${ f.value }`;
const at = ( f, n = 3 ) => [ ...f.at ].slice( 0, n ).join( ', ' ) + ( f.at.size > n ? ` (+${ f.at.size - n })` : '' );

// The surface's context value in the database's `context` vocabulary.
export function contextOf( surface = {} ) {
	if ( surface.commerce?.role ) {
		return `commerce:${ surface.commerce.role }`;
	}
	return [ 'header', 'footer', 'drawer', 'form' ].includes( surface.kind ) ? surface.kind : 'any';
}

// o: { m, read (m.read), facts (lib/skeleton-facts.mjs::loadFacts), surface, logicOf, carousels, owned }. Returns
// { region, ruledOut( block, e ), match( e, result ) → null | result, check( e, result ) → result, table }.
export function makeIdentity( { m, facts, surface = {}, logicOf = () => null, carousels = new Set(), owned = new Set() } ) {
	const R = facts.decisions.rules?.identity;
	const table = identityTable( facts.q, facts.codeRepo );
	if ( ! R || ! table.blocks.length ) {
		return null;
	}
	const ctxValue = contextOf( surface );
	const candidates = table.blocks.filter( ( b ) => 'no' !== table.state( b, 'context', ctxValue ) );
	const maxShare = R.maxShare ?? 0.5;
	const naming = ( f ) => RANKING_FACTS.has( f.fact ) && 'platform' !== f.fact && table.yesShare( f.fact, f.value ) <= maxShare;
	const draft = makeDraftFacts( { m, read: m.read, logicOf, brands: paletteBrands( facts.brands, table.blocks.filter( ( b ) => /^sgs\/[a-z0-9]+-reviews$/.test( b ) ) ), platforms: table.platforms, divider: facts.decisions.rules?.typedDivider, carousels, owned, kinds: table.kinds, keepAll: ( fact, value ) => [ 'platform', 'shows-part' ].includes( fact ) || naming( { fact, value } ) } );
	// Per fact and value, the candidates that cannot show it and those that show it as yes (read once per surface).
	const pool = new Set( candidates );
	const cannot = new Map();
	const showing = new Map();
	const cannotShow = ( f ) => {
		const k = `${ f.fact }\u0000${ f.value }`;
		return cannot.get( k ) ?? cannot.set( k, new Set( 'platform' === f.fact ? [] : candidates.filter( ( b ) => ! table.canShow( b, f.fact, f.value ) ) ) ).get( k );
	};
	const yesTo = ( f ) => {
		const k = `${ f.fact }\u0000${ f.value }`;
		return showing.get( k ) ?? showing.set( k, new Set( candidates.filter( ( b ) => 'yes' === table.state( b, f.fact, f.value ) ) ) ).get( k );
	};
	const factsOf = new Map();
	const listOf = ( e ) => factsOf.get( e.key ) ?? factsOf.set( e.key, [ ...draft.region( e ).values() ] ).get( e.key );

	// What rules a block out at an element: the first fact its region shows that the block cannot show, or null.
	const ruledOut = ( block, e ) => {
		for ( const f of listOf( e ) ) {
			const kind = 'accepts-kind' === f.fact && ! ( /icon:emoji$/.test( f.value ) && table.hasText( block ) );
			if ( ( MEANING.has( f.fact ) || kind ) && ( pool.has( block ) ? cannotShow( f ).has( block ) : ! table.canShow( block, f.fact, f.value ) ) ) {
				return { block, fact: f.fact, value: f.value, at: [ ...f.at ], why: `${ block } never shows ${ fmt( f ) } (shown at ${ at( f ) })` };
			}
		}
		return null;
	};
	// The ranking facts a block shows as yes at an element, when the element is the smallest one holding them all.
	const tagBlock = ( tag ) => {
		const core = facts.tagMap?.[ tag ]?.core_block_slug ?? null;
		return core ? facts.replacedBy?.[ core ] ?? core : null;
	};
	const shownBy = ( block, f ) => ( pool.has( block ) ? yesTo( f ).has( block ) : 'yes' === table.state( block, f.fact, f.value ) );
	const matched = ( block, e ) => {
		let list = listOf( e ).filter( ( f ) => naming( f ) && shownBy( block, f ) );
		// A `ul` or `ol` is the author's choice of a list: its implied `list` role on the element itself ranks the block the
		// framework DB's tag map gives that tag (every other implied role only rules out), unless its rows hold controls (a
		// group of buttons or form fields is no list).
		const own = listOf( e ).find( ( f ) => 'implied-role' === f.fact && 'list' === f.value && f.at.has( e.key ) );
		const controls = ( x ) => [ 'button', 'input', 'select', 'textarea', 'label', 'form' ].includes( x.tag ) || !! m.read.handler( x ) || m.kids( x ).some( controls );
		own && block === tagBlock( e.tag ) && ! m.blockKids( e ).some( controls ) && list.push( own );
		// A tab set's panel is one with its open state: a block draws that panel only when it also holds the tab set's state.
		if ( list.some( ( f ) => 'has-part' === f.fact && 'panel' === f.value ) && ! list.some( ( f ) => 'open-state' === f.fact ) ) {
			list = list.filter( ( f ) => ! ( 'has-part' === f.fact && 'panel' === f.value ) );
		}
		// A value a setting may hold (a separator glyph) says what a block can show, never what it is: it counts only beside the
		// element's own meaning (its role, written or implied by its tag) shown by the same block.
		if ( list.some( ( f ) => 'accepts-value' === f.fact ) && ! listOf( e ).some( ( f ) => [ 'renders-role', 'implied-role' ].includes( f.fact ) && f.at.has( e.key ) && 'yes' === table.state( block, f.fact, f.value ) ) ) {
			list = list.filter( ( f ) => 'accepts-value' !== f.fact );
		}
		if ( ! list.length ) {
			return [];
		}
		const holder = draft.holderOf( [ ...new Set( list.flatMap( ( f ) => [ ...f.at ] ) ) ].map( ( k ) => m.byKey[ k ] ).filter( Boolean ) );
		return holder === e ? list : [];
	};
	// The candidates showing a ranking fact at the element (only these can rank there), and the tag map's block of an
	// element that is the author's own list.
	const rankable = ( e ) => new Set( [ ...listOf( e ).filter( naming ).flatMap( ( f ) => [ ...yesTo( f ) ] ), ...( listOf( e ).some( ( f ) => 'implied-role' === f.fact && 'list' === f.value && f.at.has( e.key ) ) && tagBlock( e.tag ) ? [ tagBlock( e.tag ) ] : [] ) ] );
	const regionPlatforms = ( e ) => [ ...draft.region( e ).values() ].filter( ( f ) => 'platform' === f.fact );

	// A look-alike family among the leaders (same matched facts, one at least bound to a platform), decided by the platform.
	const byPlatform = ( e, leaders ) => {
		const sig = ( x ) => x.matched.map( fmt ).sort().join( '|' );
		const family = leaders.filter( ( x ) => sig( x ) === sig( leaders[ 0 ] ) );
		if ( family.length < 2 || ! family.some( ( x ) => table.platformsOf( x.block ).length ) ) {
			return { kept: leaders, out: [] };
		}
		const shownP = regionPlatforms( e );
		const names = shownP.map( ( f ) => f.value );
		const own = family.filter( ( x ) => table.platformsOf( x.block ).some( ( p ) => names.includes( p ) ) );
		const neutral = family.filter( ( x ) => ! table.platformsOf( x.block ).length );
		const keep = names.length && own.length ? own : neutral.length ? neutral : family;
		const out = family.filter( ( x ) => ! keep.includes( x ) ).map( ( x ) => ( { block: x.block, fact: 'platform', why: names.length ? `${ x.block } belongs to ${ table.platformsOf( x.block ).join( ', ' ) }, and the region names ${ names.join( ', ' ) } (${ shownP.map( at ).join( '; ' ) })` : `${ x.block } belongs to ${ table.platformsOf( x.block ).join( ', ' ) }, and the region names no platform (its words, links and image labels)` } ) );
		return { kept: leaders.filter( ( x ) => ! out.some( ( o ) => o.block === x.block ) ), out };
	};

	const confidence = ( a, b ) => +( Math.min( 1, a ) * ( a / ( a + ( b || 0 ) ) ) ).toFixed( 2 );
	const evidenceOf = ( x ) => x.matched.map( ( f ) => ( { kind: 'identity', w: 1, text: `block_identity_facts: ${ x.block } shows ${ fmt( f ) }; the draft shows it at ${ at( f ) }` } ) );

	// The matcher over one element the database scoring settled (`result`, sgsOnly's). null leaves the result as it is.
	const match = ( e, result ) => {
		const db = new Map( ( result.candidates || [] ).map( ( c ) => [ c.block, c ] ) );
		const ranks = rankable( e );
		const dbTop0 = result.candidates?.[ 0 ]?.block ?? null;
		if ( ! ranks.size && ! ( dbTop0 && ruledOut( dbTop0, e ) ) ) {
			return null;
		}
		const out = [];
		const alive = [];
		for ( const block of new Set( [ ...ranks, ...db.keys() ] ) ) {
			const why = ruledOut( block, e );
			if ( why ) {
				out.push( why );
				continue;
			}
			const list = ranks.has( block ) ? matched( block, e ) : [];
			( list.length || db.has( block ) ) && alive.push( { block, matched: list, score: db.get( block )?.score ?? 0 } );
		}
		const dbTop = result.candidates?.[ 0 ]?.block ?? null;
		const topOut = dbTop ? out.find( ( x ) => x.block === dbTop ) : null;
		alive.sort( ( a, b ) => b.matched.length - a.matched.length || b.score - a.score );
		const most = alive[ 0 ]?.matched.length ?? 0;
		if ( ! most && ! topOut ) {
			return null;
		}
		const fam = most ? byPlatform( e, alive.filter( ( x ) => x.matched.length === most ) ) : { kept: [], out: [] };
		out.push( ...fam.out );
		const ranked = alive.filter( ( x ) => ! fam.out.some( ( o ) => o.block === x.block ) );
		const [ first, second ] = ranked;
		const outNote = out.filter( ( x ) => db.has( x.block ) || x.fact === 'platform' || ranked.length < 2 ).slice( 0, 6 ).map( ( x ) => x.why );
		const identity = { matched: first ? first.matched.map( ( f ) => ( { fact: f.fact, value: f.value, at: [ ...f.at ] } ) ) : [], ruledOut: out.map( ( x ) => ( { block: x.block, fact: x.fact, why: x.why } ) ), survivors: ranked.slice( 0, 6 ).map( ( x ) => ( { block: x.block, matched: x.matched.length, score: x.score } ) ) };
		const candidate = ( x, share ) => ( { ...( db.get( x.block ) || {} ), block: x.block, score: +( x.matched.length + x.score ).toFixed( 3 ), share, evidence: [ ...( db.get( x.block )?.evidence || [] ), ...evidenceOf( x ) ] } );
		if ( ! first ) {
			return { ...result, rule: null, source: 'identity matcher', confidence: R.reviewConfidence, identity, reason: `${ R.reason }: no block is left (${ outNote.join( '; ' ) || 'every candidate was ruled out' })` };
		}
		const lead = first.matched.length - ( second?.matched.length ?? 0 );
		// Leaders the facts name equally: the scoring decides, and only its pick (or a pick of the facts it cannot separate) is kept.
		if ( ! lead ) {
			const tied = ranked.filter( ( x ) => x.matched.length === first.matched.length );
			if ( first.matched.length && ! topOut && dbTop && ! tied.some( ( x ) => x.block === dbTop ) ) {
				return null;
			}
			const conf = first.score > 0 ? confidence( first.score, second?.score ?? 0 ) : 0;
			const sure = conf >= 0.7;
			return {
				...result, rule: null, source: 'identity matcher', identity,
				confidence: sure ? conf : R.reviewConfidence,
				candidates: ranked.slice( 0, 5 ).map( ( x, i ) => candidate( x, i ? 0 : 1 ) ),
				reason: sure ? `${ R.reason }: ${ first.block } (${ topOut ? `the scoring's ${ dbTop } is ruled out: ${ topOut.why }` : 'the scoring separates the leaders' })` : `${ R.reason }: the facts and the scoring cannot separate ${ tied.slice( 0, 4 ).map( ( x ) => x.block ).join( ', ' ) }${ outNote.length ? `; ruled out: ${ outNote.join( '; ' ) }` : '' }`,
			};
		}
		if ( first.block === dbTop ) {
			return null;
		}
		const sep = first.matched.filter( ( f ) => ! second?.matched.some( ( g ) => fmt( g ) === fmt( f ) ) ).length;
		const rest = second ? second.matched.filter( ( g ) => ! first.matched.some( ( f ) => fmt( g ) === fmt( f ) ) ).length : 0;
		const conf = confidence( sep, rest );
		const held = table.holds( first.block );
		// A block holding exactly one kind of item block (the tab set's tabs) takes one item per control of the tab set its region
		// holds, labelled with the control's words, the rendered panel inside the item its control opens.
		let accepts = [];
		try {
			accepts = JSON.parse( table.composition.get( first.block )?.accepts_allowed_blocks || '[]' );
		} catch {
			accepts = [];
		}
		const set = 1 === accepts.length ? draft.tabSets.find( ( s ) => s.holder === e ) : null;
		const labelAttr = set ? facts.firstAttrByRole( accepts[ 0 ], 'text-content' ) : null;
		const items = set && labelAttr ? { block: accepts[ 0 ], labelAttr, controls: set.controls.map( ( c ) => c.key ), panels: set.panels.map( ( p ) => p.key ), literals: set.literals } : null;
		return {
			...( items ? { items } : {} ),
			...result, rule: 'identity', source: 'identity matcher', identity, confidence: conf,
			candidates: ranked.slice( 0, 5 ).map( ( x, i ) => candidate( x, i ? 0 : 1 ) ),
			// A block that holds no blocks draws everything in its region.
			absorb: ! ( 'any' === held || held.size ),
			reason: `${ R.reason }: ${ first.block } shows ${ first.matched.map( fmt ).join( ', ' ) }${ second ? `; the next, ${ second.block }, shows ${ second.matched.length }` : '' }${ outNote.length ? `; ruled out: ${ outNote.join( '; ' ) }` : '' }`,
		};
	};

	// A standing rule's block the facts rule out keeps its block as a low-confidence review row with the evidence. So does one
	// the region's platform proves wrong inside its look-alike family: another block showing the same ranking facts in the
	// region (one at least) belongs to the platform the region names, and the rule's block does not.
	const shows = ( block, e ) => listOf( e ).filter( ( f ) => naming( f ) && 'yes' === table.state( block, f.fact, f.value ) ).map( fmt ).sort().join( '|' );
	const check = ( e, result ) => {
		const block = result.candidates?.[ 0 ]?.block;
		if ( ! block ) {
			return result;
		}
		let why = ruledOut( block, e )?.why ?? null;
		const shownP = regionPlatforms( e );
		const names = shownP.map( ( f ) => f.value );
		const sig = why || ! names.length || table.platformsOf( block ).some( ( p ) => names.includes( p ) ) ? '' : shows( block, e );
		const rival = sig ? candidates.find( ( c ) => c !== block && table.platformsOf( c ).some( ( p ) => names.includes( p ) ) && shows( c, e ) === sig && ! ruledOut( c, e ) ) : null;
		rival && ( why = `the region names ${ names.join( ', ' ) } (${ shownP.map( ( f ) => at( f ) ).join( '; ' ) }), the platform of ${ rival }, which shows the same facts (${ sig.split( '|' ).join( ', ' ) }); ${ block } belongs to ${ table.platformsOf( block ).join( ', ' ) || 'no platform' }` );
		return why ? { ...result, confidence: Math.min( result.confidence ?? 1, R.reviewConfidence ), identity: { ruleBlock: block, why, ...( rival ? { rival } : {} ) }, reason: `${ result.reason }; ${ R.ruleReason }: ${ why }`, ...( rival && ! ( result.candidates || [] ).some( ( c ) => c.block === rival ) ? { candidates: [ ...result.candidates, { block: rival, score: 0, share: 0, evidence: [ { kind: 'identity', w: 0, text: why } ] } ] } : {} ) } : result;
	};
	return { region: draft.region, tabSets: draft.tabSets, holderOf: draft.holderOf, ruledOut, matched, match, check, table, naming, regionPlatforms };
}
