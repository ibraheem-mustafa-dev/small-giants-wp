// A hero's collage: a positioned stage whose pictures the draft pins over one another (a pile of tilted photo frames, a sticker
// and a tag). The hero's split media holds one picture, so a pile cannot be it: the stage stays a container that sets the layers'
// space, and each absolutely placed child of it is a layer (rules.heroCollage). A hero with one picture beside its content has
// no stage and stays a split hero. Pure: reads the inventory's boxes and positions at the hero's widest shown width.
// Mutation list: tests/skeleton-hero-collage.mutations.json.

// The widest width of the inventory the hero shows at, or null.
const widthOf = ( hero ) => [ 1440, 768, 375 ].find( ( x ) => hero?.visible?.[ x ] ) ?? null;

// The collage stages of `hero`: { stages: Map<stageKey, layerKeys[]>, layerOf: Map<elementKey, layerKey>, rows: Set<elementKey> }.
// `layerOf` maps every element at or below a layer to that layer, so a rule can tell that an element sits in a collage. `rows`
// holds the wrappers that set the stage beside the hero's words (the stage's ancestors below the hero that lay two or more
// children side by side, and each other child of such a wrapper that holds two or more blocks of its own: the content column);
// a hero with a split media lays its columns out itself, but a hero holding a collage does not, so these stay containers.
// m: the inventory model (byKey, blockKids, words, stacked), desc: an element's descendants, isMedia: whether an element is a
// picture, minPictureLayers: how many absolutely placed children must hold a picture for the stage to be a collage.
export function heroCollage( { hero, m, desc, isMedia, minPictureLayers = 2 } ) {
	const stages = new Map();
	const layerOf = new Map();
	const rows = new Set();
	const w = widthOf( hero );
	if ( null === w ) {
		return { stages, layerOf, rows };
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
		for ( let up = m.byKey[ s.parentKey ], on = s; up && up !== hero; on = up, up = m.byKey[ up.parentKey ] ) {
			const kids = m.blockKids( up );
			if ( kids.length >= 2 && ! m.stacked( kids ) ) {
				rows.add( up.key );
				kids.filter( ( k ) => k !== on && ! isMedia( k ) && m.blockKids( k ).length >= 2 ).forEach( ( k ) => rows.add( k.key ) );
			}
		}
		for ( const l of layers ) {
			[ l, ...desc( l ) ].forEach( ( k ) => layerOf.set( k.key, l.key ) );
		}
	}
	return { stages, layerOf, rows };
}
