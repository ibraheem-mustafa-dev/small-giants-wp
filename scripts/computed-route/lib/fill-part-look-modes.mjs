// The part-look mode rules in Fill's output (RF7; Spec 48 FR-48-60 and FR-48-87): the content and mode settings of a shop block
// that choose what a part shows (a card's wishlist heart, brand overlay and saving badge, its pickers and button words; the buy box's
// add-to-basket words; data/part-look-modes.json) have no CSS property, so the look pairing never places them. Fill runs part-look's
// draft read (part-look.mjs::runPartLook, offline: it serves the draft itself and touches no site) for the part-look surfaces whose
// block this surface's tree holds, and writes their mode rules' values onto every node of that block, so a site build writes them.
// - A part-look surface applies when its page template (data/part-locators.json `template`) is this surface's target template.
// - A card standing for every item of a loop (`itemTemplate`, the related products' cards on a product page) takes its block's rules
//   from any part-look surface of that block, read on this surface's own draft page: the related cards are read where they are drawn.
// - A part-look surface with no page template (the header's basket drawer, the account page and its signed-in views) applies to the
//   surface part-look reads it on (its `entryOf`, else its own name: `header`, `my-account`), and part-look opens it from the draft's
//   own facts (`derive`, lib/part-look-opening.mjs), so no client file is needed. Its live `--verify` against a scratch copy stays the
//   standalone command (`node scripts/computed-route/part-look.mjs`).
// A setting the block lacks, a value the node already holds differently, a rule part-look leaves as a gap and a surface it refuses
// are rows or notes, never written silently.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setAttr } from './tree.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const json = ( v ) => JSON.stringify( v ?? null );
const readData = ( name ) => JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', name ), 'utf8' ) );
export const readLocators = () => readData( 'part-locators.json' );
// The settings the mode rules of a block decide (data/part-look-modes.json): only their gaps are this writer's rows.
export const ruleSettingsOf = ( modes, block ) => new Set( ( modes?.blocks?.[ block ]?.rules || [] ).map( ( r ) => r.setting ) );

// The part-look surfaces a Fill surface reads: [ { surface, block, cross } ] (`cross`: read for the loop cards of a block whose own
// page is another template). nodes: lib/fill-skeleton.mjs::skeletonNodes; template: the surface's target template; surfaceKey:
// its surfaces.json key.
export function partLookSurfacesFor( { locators, template, nodes, surfaceKey = null } ) {
	const out = [];
	for ( const [ surface, loc ] of Object.entries( locators?.surfaces || {} ) ) {
		const of = loc.block ? nodes.filter( ( r ) => r.name === loc.block ) : [];
		if ( ! of.length ) {
			continue;
		}
		if ( ! loc.template ) {
			surfaceKey && ( loc.entryOf || surface ) === surfaceKey && out.push( { surface, block: loc.block, cross: false } );
			continue;
		}
		if ( template && loc.template === template ) {
			out.push( { surface, block: loc.block, cross: false } );
		} else if ( of.some( ( r ) => r.node?.itemTemplate ) && ! out.some( ( s ) => s.block === loc.block ) && ! Object.values( locators.surfaces ).some( ( o ) => o.block === loc.block && o.template === template ) ) {
			out.push( { surface, block: loc.block, cross: true } );
		}
	}
	return out;
}

// The mode writes of part-look's surfaces onto the tree. results: runPartLook's report surfaces ({ [surface]: { block, build } });
// wanted: partLookSurfacesFor's list. Writes into the tree; returns { writes, unmapped, notes }.
export function modeWrites( { results, wanted, nodes, flat, refOf, attrExists, modes = readData( 'part-look-modes.json' ) } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	for ( const { surface, block, cross } of wanted ) {
		const r = results?.[ surface ];
		if ( ! r?.build ) {
			continue;
		}
		const recs = nodes.filter( ( n ) => n.name === block && ( ! cross || n.node?.itemTemplate ) );
		// The rules' values only: the look writes are Fill's own pairing's, and a built-in button preset is lib/fill-preset.mjs's.
		const decided = ( r.build.writes || [] ).filter( ( w ) => w.mode && ! w.preset );
		for ( const rec of recs ) {
			const node = flat[ rec.index ];
			const ref = refOf( node );
			for ( const w of decided ) {
				const row = { node: ref, block, slot: '', property: w.property || '(mode)', value: json( w.value ), state: null };
				// A write to one key of an object setting (`strings.orders`, the account's tab words) is that key of the setting, merged
				// into what the node holds of it (part-look.mjs::mergeKeyWrites does the same for a site write).
				const dot = w.attr.indexOf( '.' );
				const top = dot < 0 ? w.attr : w.attr.slice( 0, dot );
				const key = dot < 0 ? null : w.attr.slice( dot + 1 );
				if ( ! attrExists( block, top ) ) {
					out.unmapped.push( { ...row, reason: `part-look ${ surface }: ${ block } has no ${ top } setting (${ w.evidence || 'mode rule' })` } );
					continue;
				}
				const whole = node.attributes?.[ top ];
				if ( null !== key && undefined !== whole && ( null === whole || 'object' !== typeof whole || Array.isArray( whole ) ) ) {
					out.unmapped.push( { ...row, reason: `conflict: ${ top } holds ${ json( whole ) }, not an object to set ${ key } in; part-look ${ surface } reads ${ json( w.value ) }` } );
					continue;
				}
				const held = null === key ? whole : whole?.[ key ];
				if ( undefined !== held && json( held ) !== json( w.value ) ) {
					out.unmapped.push( { ...row, reason: `conflict: ${ w.attr } already holds ${ json( held ) }; part-look ${ surface } reads ${ json( w.value ) } (${ w.evidence || 'mode rule' })` } );
					continue;
				}
				if ( undefined !== held ) {
					continue;
				}
				const { before, after } = setAttr( node, { attr: top, value: null === key ? w.value : { ...( whole || {} ), [ key ]: w.value }, merge: 'replace' } );
				out.writes.push( { node: ref, index: rec.index, block, slot: '', prop: row.property, attr: top, ...( null === key ? {} : { key } ), before, after, widths: [], how: 'part-look-mode', note: `part-look ${ surface }${ cross ? ' (read on this page\'s loop cards)' : '' }: ${ w.evidence || 'mode rule' }` } );
			}
			for ( const g of ( r.build.gaps || [] ).filter( ( x ) => ruleSettingsOf( modes, block ).has( x.setting ) ) ) {
				out.unmapped.push( { node: ref, block, slot: '', property: `(mode) ${ g.setting }`, value: json( g.evidence ?? null ), state: null, reason: `part-look ${ surface }: ${ g.what }` } );
			}
		}
	}
	return out;
}

// Runs part-look's draft read for the surfaces this Fill surface reads and writes their mode rules (modeWrites). o: { client, repo,
// entry (the surface's surfaces.json entry), nodes, flat, refOf, attrExists, out (part-look's report folder), log, run
// (runPartLook; a stand-in in tests), locators }. A read that throws, a refusal and a verify failure are notes, and nothing of that
// surface is written.
export async function partLookModeWrites( o ) {
	const wanted = partLookSurfacesFor( { locators: o.locators ?? readLocators(), template: o.entry?.target?.template ?? null, nodes: o.nodes, surfaceKey: o.surfaceKey ?? null } );
	const empty = { writes: [], unmapped: [], notes: [], surfaces: wanted.map( ( w ) => w.surface ) };
	if ( ! wanted.length || o.entry?.noDraft ) {
		return empty;
	}
	const locators = o.locators ?? readLocators();
	const keys = [ ...new Set( wanted.map( ( w ) => locators.surfaces[ w.surface ].entryOf || w.surface ) ) ];
	let report;
	try {
		const run = o.run ?? ( await import( '../part-look.mjs' ) ).runPartLook;
		( { report } = await run( { client: o.client, repo: o.repo, derive: true, entries: Object.fromEntries( keys.map( ( k ) => [ k, o.entry ] ) ), surfaces: wanted.map( ( w ) => w.surface ), out: o.out, shots: false, log: o.log ?? ( () => {} ) } ) );
	} catch ( e ) {
		return { ...empty, notes: [ `part-look (${ wanted.map( ( w ) => w.surface ).join( ', ' ) }): the draft read failed, so no mode setting is written: ${ String( e.message || e ).split( '\n' )[ 0 ] }` ] };
	}
	const refused = [ ...( report.refusals || [] ), ...( report.failures || [] ) ];
	// A refused surface's read is not evidence: its rules are not written.
	const ok = wanted.filter( ( w ) => ! refused.some( ( f ) => f.startsWith( `${ w.surface }:` ) ) );
	const got = modeWrites( { results: report.surfaces, wanted: ok, nodes: o.nodes, flat: o.flat, refOf: o.refOf, attrExists: o.attrExists } );
	return { ...got, notes: [ ...refused.map( ( f ) => `part-look refused ${ f }` ), ...( report.notes || [] ).map( ( n ) => `part-look ${ n }` ), ...got.notes ], surfaces: empty.surfaces };
}
