// A framework DB for the motion writer's tests, built from the committed motion schema the way the seeder fills it
// (lib/motion-schema.mjs::enumerateFields for the fields, the schema's `x-sgs-effects` for the effect registry), so a
// test never needs Bean's DB. `blocks` names the blocks that get a root target and, optionally, parts.
import { loadMotionSchema, enumerateFields } from '../../lib/motion-schema.mjs';
import { fixtureDb } from './framework-db.mjs';

// The triggers the framework DB's fx_effects rows hold for the effects the recogniser writes; any other effect gets the loop triggers.
const TRIGGERS = { magnet: 'hover', sheen: 'hover', glare: 'hover', 'follow-pointer': 'hover', 'cursor-field': 'hover', ripple: 'pointerdown,click', parallax: 'scroll', 'scroll-progress': 'scroll' };

// The channels the framework DB's fx_effects rows own for the effects the loop writer chooses between.
const OWNED = { 'ambient-float': [ 'translate' ], 'ken-burns': [ 'translate', 'scale' ], 'svg-loop': [ 'rotate', 'scale', 'opacity' ], magnet: [ 'translate' ], parallax: [ 'translate', 'background-position' ], 'scroll-progress': [ 'scale' ] };

// blocks: { 'sgs/x': [ { target, css_element } ] } (the root is always added).
export function motionFixtureDb( blocks = { 'sgs/container': [] } ) {
	const schema = loadMotionSchema();
	const fields = enumerateFields( schema ).filter( ( f ) => [ 'hover', 'entrance', 'effects' ].includes( f.layer.split( '.' )[ 0 ] ) ).map( ( f ) => ( {
		def_name: f.node,
		field: f.path.split( '.' ).pop(),
		panel: f.layer.split( '.' )[ 0 ],
		layer: f.layer,
		effect: f.effect,
		field_path: `elements.<target>.${ f.layer }${ f.effect ? `[effect=${ f.effect }]` : '' }.${ f.path.replace( '[]', '' ) }`,
		field_type: f.fieldType,
		css_property: f.cssProperty,
		state: f.state,
		per_device: f.perDevice ? 1 : 0,
	} ) );
	const fx = Object.entries( schema[ 'x-sgs-effects' ] ).map( ( [ effect, meta ] ) => ( {
		effect, tier: 'vanilla', plugin_set: 'none', reduced_motion: 'off', editor_story: 'static',
		triggers: TRIGGERS[ effect ] || 'load,visible', owned_properties: JSON.stringify( { channels: OWNED[ effect ] || [], properties: [], slots: [] } ), panels: JSON.stringify( meta.panels ),
	} ) );
	// A part named `root` adds fields to the root row (a block that opens: { target: 'root', motion_support: '{"opens":["root"]}' }).
	const targets = Object.entries( blocks ).flatMap( ( [ slug, parts ] ) => [ { block_slug: slug, target: 'root', css_element: 'root', kind: 'root', ...( parts.find( ( p ) => 'root' === p.target ) || {} ) }, ...parts.filter( ( p ) => 'root' !== p.target ).map( ( p ) => ( { block_slug: slug, kind: 'part', ...p } ) ) ] );
	return fixtureDb( { motion_fields: fields, fx_effects: fx, motion_targets: targets } );
}
