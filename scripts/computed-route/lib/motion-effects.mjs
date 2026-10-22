// The one effect writer of the motion cloning writer (Spec 48 FR-48-78; Spec 38A FR-38A-33): every effect layer goes
// through `writeEffect` (this writer's loops in lib/motion-loops.mjs, and the behaviour recognisers of FR-48-77 later).
// An effect slug and its values become a layer of the list its panel names, placed where the editor's Effects panel
// would offer it (src/blocks/extensions/motion/effect-options.js::effectOptions), with every value checked against the
// framework DB's fields for that effect.
import fs from 'fs';
import path from 'path';
import { REPO } from './motion-schema.mjs';

export const COVERAGE_WRITES = [
	'css-function:scroll',
	'css-function:view',
	'css-group:motion-path',
	'css-group:scroll-driven-animations',
	'fx:ambient-float',
	'fx:cursor-field',
	'fx:curtain',
	'fx:draggable',
	'fx:draw',
	'fx:flip',
	'fx:follow-pointer',
	'fx:generative-background',
	'fx:glare',
	'fx:grid-dots',
	'fx:horizontal-panel',
	'fx:image-sequence',
	'fx:ken-burns',
	'fx:lottie',
	'fx:magnet',
	'fx:marquee',
	'fx:morph',
	'fx:motion-path',
	'fx:parallax',
	'fx:particles',
	'fx:pin-scrub',
	'fx:ripple',
	'fx:scramble',
	'fx:scroll-progress',
	'fx:scrub',
	'fx:sheen',
	'fx:split-reveal',
	'fx:surface-treatment',
	'fx:svg-loop',
	'fx:wave-gradient',
	'html:marquee',
	'svg:animateMotion',
	'svg:mpath',
];

const BLOCKS_DIR = path.join( REPO, 'plugins', 'sgs-blocks', 'src', 'blocks' );

// The editor's offer data: which effects each block qualifies for (generated-fx-qualifying-blocks.json) and each
// block's declared parts (`supports.sgs.elements`, read from its block.json).
export function loadEffectOffers( blocksDir = BLOCKS_DIR ) {
	const qualifying = JSON.parse( fs.readFileSync( path.join( blocksDir, 'extensions', 'generated-fx-qualifying-blocks.json' ), 'utf8' ) );
	const elements = {};
	for ( const dir of fs.readdirSync( blocksDir ) ) {
		const f = path.join( blocksDir, dir, 'block.json' );
		if ( fs.existsSync( f ) ) {
			const j = JSON.parse( fs.readFileSync( f, 'utf8' ) );
			elements[ j.name ] = j.supports?.sgs?.elements || null;
		}
	}
	return { qualifying, elementsOf: ( block ) => elements[ block ] || null };
}

// The target levels a target offers and whether it is of the part kind an effect needs, as
// src/blocks/extensions/motion/layers/refusal-match.js::levelsForTarget and ::kindsFit decide them (the editor's
// modules import JSON through webpack, so they are not loadable here).
export function levelsForTarget( target, elements = null ) {
	if ( 'root' === target ) {
		return [ 'block', 'surface', 'part' ];
	}
	return true === elements?.[ target ]?.surface ? [ 'surface', 'part' ] : [ 'part' ];
}

export function kindsFit( meta, target, elements = null ) {
	const kinds = meta?.[ 'x-part-kinds' ];
	if ( ! Array.isArray( kinds ) || 'root' === target || String( target ).startsWith( 'custom:' ) ) {
		return true;
	}
	return kinds.some( ( kind ) => true === elements?.[ target ]?.[ kind ] );
}

// The list and the DB layer each panel's effects are stored in, and the schema layer that names their triggers.
export const PANEL_LISTS = {
	effects: { list: 'effects', layer: 'effects', def: 'EffectLayer' },
	hover: { list: 'hover.effects', layer: 'hover.effects', def: 'HoverEffect' },
	entrance: { list: 'entrance.text', layer: 'entrance.text', def: 'EntranceTextEffect' },
};

// Where an effect goes on a block: the target itself when the editor would offer the effect there, the block's root
// when the effect only fits a block (a marquee drives the block's own lane, so a draft that moves the lane's track is
// the block's marquee). Returns { target } or { refused }.
export function placeEffect( { block, target, effect }, { schema, offers } ) {
	const meta = schema[ 'x-sgs-effects' ]?.[ effect ];
	if ( ! meta ) {
		return { refused: `${ effect } is not an effect of the motion schema` };
	}
	if ( ! ( offers.qualifying[ block ] || [] ).includes( effect ) ) {
		return { refused: `${ block } does not offer ${ effect } (generated-fx-qualifying-blocks.json)` };
	}
	const elements = offers.elementsOf( block );
	const levels = meta[ 'x-target-level' ] || [];
	if ( levels.some( ( l ) => levelsForTarget( target, elements ).includes( l ) ) && kindsFit( meta, target, elements ) ) {
		return { target };
	}
	if ( 'root' !== target && levels.every( ( l ) => 'block' === l ) ) {
		return { target: 'root' };
	}
	return { refused: `${ effect } sits at the ${ levels.join( ' or ' ) } level, which the ${ target } target of ${ block } does not offer` };
}

// The one effect writer: { block, target, effect, panel, trigger, values, devices, id } as a layer of the panel's
// list. Checks the effect's registry row (`fx_effects`: the panel and the trigger), places it (placeEffect), and keeps
// only the values and per-device values the DB lists for that effect. Returns { target, list, layer, dropped } or
// { refused }.
export function writeEffect( { block, target, effect, panel = 'effects', trigger = null, values = {}, devices = null, id = null }, { mdb, schema, offers } ) {
	const row = mdb.effect( effect );
	const where = PANEL_LISTS[ panel ];
	if ( ! row || ! where ) {
		return { refused: row ? `no ${ panel } panel` : `${ effect } has no fx_effects row` };
	}
	if ( ! row.panels.includes( panel ) ) {
		return { refused: `${ effect } is not offered in the ${ panel } panel (fx_effects.panels: ${ row.panels.join( ', ' ) || 'none' })` };
	}
	const placed = placeEffect( { block, target, effect }, { schema, offers } );
	if ( placed.refused ) {
		return placed;
	}
	const accepted = schema.$defs[ where.def ]?.properties?.trigger?.enum || [];
	const offered = row.triggers.filter( ( t ) => accepted.includes( t ) );
	if ( trigger && ! offered.includes( trigger ) ) {
		return { refused: `${ effect } runs on ${ offered.join( ', ' ) }, not ${ trigger }` };
	}
	const dropped = [];
	const keep = ( obj, perDevice ) => Object.fromEntries( Object.entries( obj || {} ).filter( ( [ k ] ) => {
		const f = mdb.field( where.layer, `values.${ k }`, effect );
		const ok = f && ( ! perDevice || f.perDevice );
		if ( ! ok ) {
			dropped.push( perDevice ? `${ k } (per device)` : k );
		}
		return ok;
	} ) );
	const layer = { id: id || `${ effect }-1`, effect, trigger: trigger || offered[ 0 ], values: keep( values, false ) };
	const tiers = Object.fromEntries( Object.entries( devices || {} ).map( ( [ tier, v ] ) => [ tier, keep( v, true ) ] ).filter( ( [ , v ] ) => Object.keys( v ).length ) );
	if ( Object.keys( tiers ).length ) {
		layer.devices = tiers;
	}
	return { target: placed.target, list: where.list, layer, dropped };
}
