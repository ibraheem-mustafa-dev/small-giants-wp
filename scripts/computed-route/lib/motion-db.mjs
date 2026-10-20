// The motion facts the cloning writer reads from the framework DB (Spec 38A §6.4, decision 3 option B), read-only: the
// targets each block offers (`motion_targets`: its root and every declared part), the fields each motion layer takes
// (`motion_fields`: field type, per-device flag, unit), the presets (`motion_presets`) and the effect registry
// (`fx_effects`). No field, target, preset or effect is named in code (FP-1).

const parse = ( text, fallback ) => {
	try {
		return null === text || undefined === text ? fallback : JSON.parse( text );
	} catch {
		return fallback;
	}
};

// A field row's path after its layer: `elements.<target>.entrance.base.values.from.translateX` in layer `entrance.base`
// is `values.from.translateX`; `elements.<target>.effects[effect=marquee].values.speed` in layer `effects` is effect
// `marquee`, path `values.speed`. Returns { effect, path } or null when the row does not start with its layer.
export function fieldKey( layer, fieldPath ) {
	const head = `elements.<target>.${ layer }`;
	if ( ! fieldPath.startsWith( head ) ) {
		return null;
	}
	const m = /^(?:\[effect=([a-z0-9-]+)\])?\.(.+)$/.exec( fieldPath.slice( head.length ) );
	return m ? { effect: m[ 1 ] || null, path: m[ 2 ] } : null;
}

// One object over the four tables. `db` is a node:sqlite handle from lib/db.mjs::openDb.
export function motionDb( db ) {
	const targets = new Map();
	for ( const r of db.prepare( 'SELECT block_slug, target, css_element, kind, is_wrapper, motion_support FROM motion_targets ORDER BY block_slug, target' ).all() ) {
		if ( ! targets.has( r.block_slug ) ) {
			targets.set( r.block_slug, [] );
		}
		targets.get( r.block_slug ).push( { target: r.target, cssElement: r.css_element, kind: r.kind, isWrapper: !! r.is_wrapper, support: parse( r.motion_support, null ) } );
	}
	const fields = new Map();
	for ( const r of db.prepare( 'SELECT layer, field_path, field_type, per_device, unit FROM motion_fields' ).all() ) {
		const key = fieldKey( r.layer, r.field_path );
		if ( key ) {
			fields.set( `${ r.layer }|${ key.effect || '' }|${ key.path }`, { fieldType: r.field_type, perDevice: !! r.per_device, unit: r.unit } );
		}
	}
	const presets = db.prepare( 'SELECT slug, panel, effect, trigger, kind, values_json FROM motion_presets ORDER BY slug' ).all()
		.map( ( r ) => ( { slug: r.slug, panel: r.panel, effect: r.effect, trigger: r.trigger, kind: r.kind, values: parse( r.values_json, {} ) } ) );
	const effects = new Map( db.prepare( 'SELECT effect, triggers, owned_properties, panels FROM fx_effects' ).all()
		.map( ( r ) => [ r.effect, { triggers: String( r.triggers || '' ).split( ',' ).map( ( s ) => s.trim() ).filter( Boolean ), owned: parse( r.owned_properties, { channels: [], properties: [], slots: [] } ), panels: parse( r.panels, [] ) } ] ) );
	return {
		// The block's motion targets, [] when the block has no motion support.
		targetsOf: ( block ) => targets.get( block ) || [],
		// The named motion states a block publishes (`supports.sgs.motion.states`, data-sgs-motion-state tokens) and
		// whether it opens a panel (`opens` is non-empty): what a `state` or `open` entrance can name on it.
		statesOf: ( block ) => [ ...new Set( ( targets.get( block ) || [] ).flatMap( ( t ) => ( Array.isArray( t.support?.states ) ? t.support.states : [] ) ) ) ],
		opensOf: ( block ) => [ ...new Set( ( targets.get( block ) || [] ).flatMap( ( t ) => ( Array.isArray( t.support?.opens ) ? t.support.opens : [] ) ) ) ],
		// The field a layer takes at `path` ('values.from.translateX'; a keyframe field as 'values.keyframes.opacity'),
		// or null when the layer has no such field.
		field: ( layer, path, effect = null ) => fields.get( `${ layer }|${ effect || '' }|${ path }` ) || null,
		presets: ( panel ) => presets.filter( ( p ) => p.panel === panel ),
		effect: ( slug ) => effects.get( slug ) || null,
		effects: () => [ ...effects.keys() ],
	};
}
