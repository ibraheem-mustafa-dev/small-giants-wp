// Session C W2 pre-dispatch check: no two per-block queues may edit the same block.
//
// Why: the block a sweep row is filed under is often not the block the fix edits (sgs/accordion-item's gap fix lands
// on sgs/accordion, sgs/buybox's pill border on sgs/option-picker). Several fix shapes also offer a choice of target
// block, so the collision set depends on which shape each agent picks. Run this before dispatching W2, and again if
// any agent changes its chosen shape.
//
//   node .claude/reports/2026-10-05-session-b/check-queue-collisions.mjs
//
// Exits 1 on a collision or an unowned edit target, 0 when the partition is safe.
import fs from 'node:fs';

// The W2 partition from .claude/plans/2026-10-05-eye-care-session-c2-finding-assessment.md
// (written for Session B's 163 rows; rebuild the queues from Bean-approved items and re-run this).
const QUEUES = {
	Q1: [ 'sgs/social-icons' ],
	Q2: [ 'sgs/choice-flow-question', 'sgs/choice-flow', 'sgs/choice-flow-result' ],
	Q3: [ 'sgs/mega-group', 'sgs/mega-panel', 'sgs/media', 'sgs/card-grid' ],
	Q4: [ 'sgs/buybox', 'sgs/option-picker', 'sgs/product-card', 'sgs/tabs' ],
	Q5: [ 'sgs/accordion-item', 'sgs/accordion', 'sgs/business-info', 'sgs/process-steps', 'sgs/brand-strip',
		'sgs/trust-bar', 'sgs/button', 'sgs/container', 'sgs/site-footer' ],
	Q6: [ 'sgs/form-field-text', 'sgs/form-field-email', 'sgs/form-field-phone', 'sgs/form-field-select',
		'sgs/form-field-textarea', 'sgs/form' ],
};
// Owned elsewhere, deliberately in no queue.
const OUT_OF_SCOPE = [ 'sgs/google-reviews' ];
// Files whose rows stay in the main thread (W1), so a queue naming them is not a collision.
const SHARED_W1 = [ 'form/style.css', 'media-element.css', 'woocommerce.css', 'image-controls.php' ];
// A block name in a fix shape is either an EDIT TARGET ("add X to sgs/foo") or a PRECEDENT to copy
// ("copying sgs/form::submitPadding", "as sgs/trust-bar already does"). Matching the bare name conflates the two and
// reports a collision for every precedent, so read the words immediately before the name instead. sgs/form is both,
// on different rows, which is why a blanket allow-list cannot work here.
const PRECEDENT_CUE = /(?:copying|copy|as|like|precedent|already|mirror(?:s|ing)?|same as|per|beside|cf\.?|exactly as)\s+$/i;
const EDIT_CUE = /(?:\b(?:to|on|onto|in|for)\s+|^)$/i;

// Whether `name` at index `i` of `text` reads as a block to edit rather than a pattern to copy.
function isEditTarget( text, i ) {
	const before = text.slice( Math.max( 0, i - 40 ), i );
	if ( PRECEDENT_CUE.test( before ) ) {
		return false;
	}
	return EDIT_CUE.test( before );
}

const dir = '.claude/reports/2026-10-05-session-b/b2/';
const verdicts = fs.readdirSync( dir ).filter( ( f ) => f.endsWith( '-verdicts.json' ) )
	.flatMap( ( f ) => {
		const j = JSON.parse( fs.readFileSync( dir + f, 'utf8' ) );
		return Array.isArray( j ) ? j : ( j.verdicts || [] );
	} );
const F = verdicts.filter( ( v ) => 'F' === v.verdict );

const ownerOf = new Map();
for ( const [ q, blocks ] of Object.entries( QUEUES ) ) {
	for ( const b of blocks ) {
		if ( ownerOf.has( b ) ) {
			console.error( `COLLISION: ${ b } is in both ${ ownerOf.get( b ) } and ${ q }` );
		}
		ownerOf.set( b, q );
	}
}

const problems = [];

// 1. Every block carrying an F row has an owner, or is deliberately out of scope.
for ( const v of F ) {
	const b = v.block;
	if ( ! b || OUT_OF_SCOPE.includes( b ) || ownerOf.has( b ) || b.startsWith( 'woocommerce/' ) ) {
		continue;
	}
	problems.push( `${ b } carries F rows but no queue owns it (e.g. ${ v.property })` );
}

// 2. Every sgs block a fix shape names AS AN EDIT TARGET is owned by the same queue as the row, out of scope, or
//    fixed in a W1 shared file.
let precedentMentions = 0;
for ( const v of F ) {
	const home = ownerOf.get( v.block );
	const text = String( v.fixShape || '' );
	if ( SHARED_W1.some( ( f ) => text.includes( f ) ) ) {
		continue;
	}
	const seen = new Set();
	for ( const m of text.matchAll( /sgs\/[a-z0-9-]+/g ) ) {
		const b = m[ 0 ];
		if ( b === v.block || OUT_OF_SCOPE.includes( b ) || seen.has( b ) ) {
			continue;
		}
		seen.add( b );
		if ( ! isEditTarget( text, m.index ) ) {
			precedentMentions++;
			continue;
		}
		const owner = ownerOf.get( b );
		if ( ! owner ) {
			problems.push( `${ v.block }::${ v.property } would edit ${ b }, which no queue owns` );
		} else if ( owner !== home ) {
			problems.push( `${ v.block }::${ v.property } (${ home }) would edit ${ b } (owned by ${ owner })` );
		}
	}
}

const unique = [ ...new Set( problems ) ];
console.log( `queues ${ Object.keys( QUEUES ).length }, blocks owned ${ ownerOf.size }, F rows ${ F.reduce( ( s, v ) => s + v.rows, 0 ) }, precedent mentions skipped ${ precedentMentions }` );
if ( unique.length ) {
	console.error( `\n${ unique.length } problem(s):` );
	for ( const p of unique ) {
		console.error( `  - ${ p }` );
	}
	process.exit( 1 );
}
console.log( 'PASS: no two queues edit the same block, and every edit target has an owner.' );
