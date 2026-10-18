// The sgsMotion refusal evaluator (Spec 38A §10 and §5.2): reads the pairwise refusal table and the limits from
// `motion.schema.json` (`x-sgs-refusals`) and applies them to one element's layers, returning each refusal's exact text.
// Rules are data: a pair fires when one layer matches side `a` and a different layer matches side `b`; a limit counts
// effect slugs per list, layer ids per element or paint-slot claims per element, compares one value across two layers
// (`same-value`, the transform channel's one perspective) or refuses one value (`refused-value`, a parent perspective).
// The PHP renderer mirrors this file over the same table.

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

// A zero amount (0, 0.0, '0deg', '-0turn').
const isZero = ( v ) =>
	( typeof v === 'number' && v === 0 ) || ( typeof v === 'string' && /^-?(?:0+(?:\.0*)?|\.0+)(?:deg|turn|rad|grad|px)?$/.test( v ) );

// The side's value paths this layer sets (in values or a device override); with `nonZero`, a zero amount is unset.
export function matchedValues( entry, m ) {
	const sources = valueSources( entry.layer );
	return ( m.values || [] ).filter( ( p ) =>
		sources.some( ( src ) => valuesAt( src, p ).some( ( v ) => isOn( v ) && ! ( m.nonZero && isZero( v ) ) ) )
	);
}

// The label a refusal names a layer by for one rule side: a `valueLabels` label when every matched value maps to it.
export function sideLabel( schema, entry, m ) {
	if ( m.values && m.valueLabels ) {
		const labels = [ ...new Set( matchedValues( entry, m ).map( ( p ) => m.valueLabels[ p ] ?? null ) ) ];
		if ( labels.length === 1 && typeof labels[ 0 ] === 'string' ) {
			return labels[ 0 ];
		}
	}
	return layerLabel( schema, entry );
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
	if ( m.values && ! matchedValues( entry, m ).length ) {
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

// A layer's value sources by tier position (values, then the Tablet and Mobile overrides); a missing one is null.
function tierSources( layer ) {
	const devices = layer.devices || {};
	return [ layer.values, devices.tablet, devices.mobile ].map( ( v ) => ( v && typeof v === 'object' ? v : null ) );
}

// A length in comparable form: a number or a px string as a number (800, '800px' and 800.0 are equal); else a string.
function normaliseLength( v ) {
	if ( typeof v === 'number' ) {
		return v;
	}
	const m = typeof v === 'string' ? /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/.exec( v ) : null;
	return m ? Number( m[ 1 ] ) : typeof v === 'string' ? v : JSON.stringify( v );
}

// One value's effective, normalised value on each device tier: a tier's own override, else the wider tier's.
function effectiveTiers( layer, key ) {
	let current = null;
	return tierSources( layer ).map( ( src ) => {
		const v = src ? src[ key ] : undefined;
		if ( isOn( v ) ) {
			current = normaliseLength( v );
		}
		return current;
	} );
}

// A `same-value` limit's refusals (two layers in its lists set its value differently at one tier position) or a
// `refused-value` limit's (a layer in its lists sets its value to `equals`).
function valueRefusals( schema, limit, layers, context = {} ) {
	const key = limit.value;
	const holders = layers.filter( ( l ) => limit.lists.includes( l.list ) );
	const out = [];
	if ( limit.kind === 'refused-value' ) {
		if ( limit.unless && context[ limit.unless ] ) {
			return out;
		}
		for ( const entry of holders ) {
			if ( tierSources( entry.layer ).some( ( src ) => src && src[ key ] === limit.equals ) ) {
				out.push( { id: limit.id, text: fill( limit.text, limit.placeholders, {} ), layers: [ entry.path ] } );
			}
		}
		return out;
	}
	holders.forEach( ( a, i ) => {
		for ( const b of holders.slice( i + 1 ) ) {
			const ea = effectiveTiers( a.layer, key );
			const eb = effectiveTiers( b.layer, key );
			const differs = ea.some( ( va, pos ) => va !== null && eb[ pos ] !== null && va !== eb[ pos ] );
			if ( differs ) {
				const labels = { first: layerLabel( schema, a ), second: layerLabel( schema, b ) };
				out.push( { id: limit.id, text: fill( limit.text, limit.placeholders, labels ), layers: [ a.path, b.path ] } );
			}
		}
	} );
	return out;
}

// Every refusal on one element: [{ id, text, layers }], pairs first in table order, then limits.
export function elementRefusals( schema, element, context = {} ) {
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
				const labels = { a: sideLabel( schema, a, rule.a ), b: sideLabel( schema, b, rule.b ) };
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
		} else if ( limit.kind === 'same-value' || limit.kind === 'refused-value' ) {
			out.push( ...valueRefusals( schema, limit, layers, context ) );
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
