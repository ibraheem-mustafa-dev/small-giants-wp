// A hero's collage: a positioned stage whose pictures the draft pins over one another (a pile of tilted photo frames, a sticker
// and a tag). The hero's split media holds one picture, so a pile cannot be it: the stage stays a container that sets the layers'
// space, and each absolutely placed child of it is a layer (rules.heroCollage). A hero with one picture beside its content has
// no stage and stays a split hero. Pure: reads the inventory's boxes and positions at the hero's widest shown width.
// Mutation list: tests/skeleton-hero-collage.mutations.json.

// The widest width of the inventory the hero shows at, or null.
const widthOf = ( hero ) => [ 1440, 768, 375 ].find( ( x ) => hero?.visible?.[ x ] ) ?? null;

// The collage stages of `hero`: { stages: Map<stageKey, layerKeys[]>, layerOf: Map<elementKey, layerKey> }. `layerOf` maps every
// element at or below a layer to that layer, so a rule can tell that an element sits in a collage.
// m: the inventory model (byKey, blockKids, words), desc: an element's descendants, isMedia: whether an element is a picture,
// minPictureLayers: how many absolutely placed children must hold a picture for the stage to be a collage.
export function heroCollage( { hero, m, desc, isMedia, minPictureLayers = 2 } ) {
	const stages = new Map();
	const layerOf = new Map();
	const w = widthOf( hero );
	if ( null === w ) {
		return { stages, layerOf };
	}
	const placed = ( x ) => 'absolute' === x.position?.[ w ];
	for ( const s of desc( hero ) ) {
		if ( layerOf.has( s.key ) || isMedia( s ) || m.words( s ) || ! s.position?.[ w ] || 'static' === s.position[ w ] ) {
			continue;
		}
		const layers = m.blockKids( s ).filter( ( k ) => placed( k ) && ! isMedia( k ) );
		const pictured = layers.filter( ( k ) => desc( k ).some( isMedia ) );
		if ( pictured.length < minPictureLayers || desc( s ).some( ( k ) => 'h1' === k.tag ) ) {
			continue;
		}
		stages.set( s.key, layers.map( ( k ) => k.key ) );
		for ( const l of layers ) {
			[ l, ...desc( l ) ].forEach( ( k ) => layerOf.set( k.key, l.key ) );
		}
	}
	return { stages, layerOf };
}
