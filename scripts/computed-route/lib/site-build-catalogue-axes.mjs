// The choices (variation axes) a product the route made gains when the catalogue adds one (Spec 48 FR-48-92): the catalogue
// step only filled in a product's attributes while it had none, so a product that already existed (planned `complete`)
// never took an axis the catalogue gained later (a picker the draft's basket line omits, lib/catalogue-omitted.mjs), and its variations, made for the old axes
// alone, no longer matched the catalogue's. For a product the route made (its SKU is the catalogue's own, `sgs-draft-*`)
//   - a catalogue attribute the product does not hold as a variation attribute is added with its terms and set as a
//     variation (a filter-only attribute of the same slug, which the old catalogue made, becomes the choice, keeping its terms);
//   - a term the catalogue's choice has and the product's attribute lacks is added;
//   - a variation the catalogue holds and the product lacks (by SKU) is created, as before;
//   - an old variation that does not cover every choice (no value for one of them) is trashed, unless an order holds it,
//     which is set private and reported (the order keeps its line); a variation already private is left as it is.
// A product the route did not make is never changed this way: its missing choices are a note. Pure: the catalogue's product
// and the site's read of it in, what it lacks and what is done out. The write is lib/site-build-catalogue-php.mjs.
import { SKU_PREFIX } from './catalogue-read.mjs';
import { decodeName } from './site-build-catalogue-facets.mjs';

const taxOf = ( slug ) => `pa_${ slug }`;
const skuList = ( rows ) => rows.map( ( r ) => r.sku || `#${ r.id }` ).join( ', ' );

// Whether the found product is the route's own: its SKU is the catalogue product's and carries the route's prefix.
export const routeMade = ( p, s ) => Boolean( s.sku ) && s.sku === p.sku && s.sku.startsWith( SKU_PREFIX );

// What a found variable product lacks of the catalogue product's choices, or null when the read gave no attribute detail
// (a state from before the read gathered it) or the product is no variable product on both sides:
// { axes: [ { slug, label, all (every term the choice has) } ] (choices to add), terms: [ { slug, label, names } ] (terms to add to a choice it has),
//   trash, priv (old variations to trash, to set private: an order holds them), kept (old variations already private) }.
export function axisChanges( p, s ) {
	if ( 'variable' !== p.type || 'variable' !== s.type || ! Array.isArray( s.variationAttributes ) || ! p.attributes.length ) {
		return null;
	}
	const have = new Set( s.variationAttributes );
	const held = s.attributeTerms || {};
	const names = ( a ) => a.options.map( ( o ) => o.term );
	const axes = p.attributes.filter( ( a ) => ! have.has( taxOf( a.slug ) ) ).map( ( a ) => ( { slug: a.slug, label: a.label, all: names( a ) } ) );
	const terms = p.attributes.filter( ( a ) => have.has( taxOf( a.slug ) ) ).map( ( a ) => ( { slug: a.slug, label: a.label, names: names( a ).filter( ( n ) => ! ( held[ taxOf( a.slug ) ] || [] ).map( decodeName ).includes( decodeName( n ) ) ) } ) ).filter( ( x ) => x.names.length );
	// Only with a variation the catalogue holds: a product left with none of the catalogue's is never swept bare.
	const old = p.variations.length ? ( s.variationRows || [] ).filter( ( r ) => ! p.attributes.every( ( a ) => r.options?.[ taxOf( a.slug ) ] ) ) : [];
	return { axes, terms, trash: old.filter( ( r ) => 'private' !== r.status && ! r.ordered ), priv: old.filter( ( r ) => 'private' !== r.status && r.ordered ), kept: old.filter( ( r ) => 'private' === r.status ) };
}

// The plan line's "lacks" parts for a route-made product's choices.
export const axisLacks = ( c ) => [
	...c.axes.map( ( a ) => `the choice ${ a.label } (${ a.all.join( '/' ) })` ),
	...c.terms.map( ( t ) => `${ t.names.join( '/' ) } on its ${ t.label } choice` ),
];

// The plan line's actions on the product's old variations.
export const axisActs = ( c ) => [
	c.trash.length && `trashes ${ c.trash.length } old variation(s) that miss a choice (${ skuList( c.trash ) })`,
	c.priv.length && `sets ${ c.priv.length } old variation(s) that miss a choice private, an order holds ${ c.priv.length > 1 ? 'them' : 'it' } (${ skuList( c.priv ) })`,
].filter( Boolean );

// The notes for one found product: its missing choices when it is not the route's own, and its old variations kept private.
export function axisNotes( p, s, c, route ) {
	const out = [];
	if ( c && ! route && c.axes.length ) {
		out.push( `${ p.draftId }: product ${ s.id } (SKU ${ s.sku || 'none' }) was not made by the route, so its missing choice(s) ${ c.axes.map( ( a ) => a.label ).join( ', ' ) } are left as they are` );
	}
	if ( c && route && c.kept.length ) {
		out.push( `${ p.draftId }: ${ c.kept.length } old variation(s) that miss a choice stay private (${ skuList( c.kept ) })` );
	}
	return out;
}
