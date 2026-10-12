// The sgsMotion refusal evaluator (Spec 38A §10 and §5.2): reads the pairwise refusal table and the limits from
// `motion.schema.json` (`x-sgs-refusals`) and applies them to one element's layers, returning each refusal's exact text.
// Rules are data: a pair fires when one layer matches side `a` and a different layer matches side `b`; a limit counts
// effect slugs per list, layer ids per element or paint-slot claims per element. The PHP renderer mirrors this file
// over the same table.

// Every layer list of an element, in paint order, with the path the inspector and the renderer name it by.
const LISTS = [
	[ 'hover.state', ( el ) => ( el.hover && el.hover.state ? [ el.hover.state ] : [] ) ],
	[ 'hover.effects', ( el ) => ( el.hover && Array.isArray( el.hover.effects ) ? el.hover.effects : [] ) ],
	[ 'entrance.base', ( el ) => ( el.entrance && el.entrance.base ? [ el.entrance.base ] : [] ) ],
	[ 'entrance.text', ( el ) => ( el.entrance && Array.isArray( el.entrance.text ) ? el.entrance.text : [] ) ],
	[ 'effects', ( el ) => ( Array.isArray( el.effects ) ? el.effects : [] ) ],
];
const SINGLE = new Set( [ 'hover.state', 'entrance.base' ] );

// One element's layers: { list, path, effect, layer }.
export function elementLayers( element ) {
	const out = [];
	for ( const [ list, read ] of LISTS ) {
		read( element || {} ).forEach( ( layer, i ) => {
			out.push( {
				list,
				path: SINGLE.has( list ) ? list : `${ list }[${ i }]`,
				effect: typeof layer.effect === 'string' ? layer.effect : null,
				layer,
			} );
		} );
	}
	return out;
}

export function layerLabel( schema, entry ) {
	if ( entry.effect ) {
		const def = schema[ 'x-sgs-effects' ][ entry.effect ];
		return def ? def.label : entry.effect;
	}
	return schema[ 'x-sgs-layer-labels' ][ entry.list ] || entry.list;
}

const layerId = ( entry ) => entry.layer.id;

const isOn = ( v ) => v !== undefined && v !== null && v !== false;

// Every value at a dot path; a list on the way fans out to each item.
function valuesAt( obj, dotted ) {
	let current = [ obj ];
	for ( const key of dotted.split( '.' ) ) {
		const next = [];
		for ( const c of current ) {
			if ( Array.isArray( c ) ) {
				for ( const item of c ) {
					if ( item && typeof item === 'object' && key in item ) {
						next.push( item[ key ] );
					}
				}
			} else if ( c && typeof c === 'object' && key in c ) {
				next.push( c[ key ] );
			}
		}
		current = next;
	}
	return current;
}

// The layer's values and each device override (overrides mirror `values`).
function valueSources( layer ) {
	const devices = layer.devices || {};
	return [ layer.values, devices.tablet, devices.mobile ].filter( ( v ) => v && typeof v === 'object' );
}

// The paint slots a layer claims: its effect's `slots`, a `when` slot only while that value is on.
export function slotClaims( schema, entry ) {
	if ( ! entry.effect || ! schema[ 'x-sgs-effects' ][ entry.effect ] ) {
		return [];
	}
	return schema[ 'x-sgs-effects' ][ entry.effect ].slots.filter(
		( s ) => ! s.when || valueSources( entry.layer ).some( ( src ) => isOn( src[ s.when ] ) )
	);
}

export function matches( schema, entry, m ) {
	if ( m.layers && ! m.layers.includes( entry.list ) ) {
		return false;
	}
	if ( m.effects && ! m.effects.includes( entry.effect ) ) {
		return false;
	}
	if ( m.excludeEffects && m.excludeEffects.includes( entry.effect ) ) {
		return false;
	}
	if ( m.triggers && ! m.triggers.includes( entry.layer.trigger ) ) {
		return false;
	}
	if ( m.slot && ! slotClaims( schema, entry ).some( ( s ) => s.slot === m.slot ) ) {
		return false;
	}
	const sources = valueSources( entry.layer );
	if ( m.values && ! m.values.some( ( p ) => sources.some( ( src ) => valuesAt( src, p ).some( isOn ) ) ) ) {
		return false;
	}
	if ( m.rows ) {
		const rows = sources.flatMap( ( src ) => ( Array.isArray( src.rows ) ? src.rows : [] ) );
		if ( ! rows.some( ( r ) => r && m.rows.includes( r.property ) ) ) {
			return false;
		}
	}
	return true;
}

function fill( text, placeholders, labels ) {
	let out = text;
	for ( const [ token, from ] of Object.entries( placeholders || {} ) ) {
		out = out.split( token ).join( labels[ from ] );
	}
	return out;
}

// Every refusal on one element: [{ id, text, layers }], pairs first in table order, then limits.
export function elementRefusals( schema, element ) {
	const table = schema[ 'x-sgs-refusals' ];
	const layers = elementLayers( element );
	const out = [];
	for ( const rule of table.pairs ) {
		const seen = new Set();
		for ( const a of layers ) {
			for ( const b of layers ) {
				if ( a === b || ! matches( schema, a, rule.a ) || ! matches( schema, b, rule.b ) ) {
					continue;
				}
				const key = [ a.path, b.path ].sort().join( '|' );
				if ( seen.has( key ) ) {
					continue;
				}
				seen.add( key );
				const labels = { a: layerLabel( schema, a ), b: layerLabel( schema, b ) };
				out.push( { id: rule.id, text: fill( rule.text, rule.placeholders, labels ), layers: [ a.path, b.path ] } );
			}
		}
	}
	for ( const limit of table.limits ) {
		if ( limit.kind === 'unique-effect' ) {
			for ( const list of limit.lists ) {
				const seen = new Map();
				for ( const entry of layers.filter( ( l ) => l.list === list && l.effect ) ) {
					if ( seen.has( entry.effect ) ) {
						const labels = { effect: layerLabel( schema, entry ) };
						out.push( { id: limit.id, text: fill( limit.text, limit.placeholders, labels ), layers: [ seen.get( entry.effect ), entry.path ] } );
					} else {
						seen.set( entry.effect, entry.path );
					}
				}
			}
		} else if ( limit.kind === 'unique-id' ) {
			const seen = new Map();
			for ( const entry of layers.filter( ( l ) => limit.lists.includes( l.list ) && typeof layerId( l ) === 'string' ) ) {
				const id = layerId( entry );
				if ( seen.has( id ) ) {
					out.push( { id: limit.id, text: fill( limit.text, limit.placeholders, { id } ), layers: [ seen.get( id ), entry.path ] } );
				} else {
					seen.set( id, entry.path );
				}
			}
		} else if ( limit.kind === 'slot-max' ) {
			const claims = layers.flatMap( ( entry ) =>
				slotClaims( schema, entry ).filter( ( s ) => s.slot === limit.slot ).map( ( s ) => ( { label: s.label, path: entry.path } ) )
			);
			for ( let i = limit.max; i < claims.length; i++ ) {
				const labels = { first: claims[ 0 ].label, second: claims[ 1 ].label, extra: claims[ i ].label };
				out.push( { id: limit.id, text: fill( limit.text, limit.placeholders, labels ), layers: [ claims[ 0 ].path, claims[ 1 ].path, claims[ i ].path ] } );
			}
		} else {
			throw new Error( `motion refusals: unknown limit kind "${ limit.kind }" in ${ limit.id }` );
		}
	}
	return out;
}

// Every refusal in one sgsMotion document: [{ target, id, text, layers }].
export function motionRefusals( schema, doc ) {
	const out = [];
	for ( const [ target, element ] of Object.entries( ( doc && doc.elements ) || {} ) ) {
		for ( const r of elementRefusals( schema, element ) ) {
			out.push( { target, ...r } );
		}
	}
	return out;
}
