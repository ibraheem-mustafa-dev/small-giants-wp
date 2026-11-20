// The one visible card of a current-item slider (data/skeleton-decisions.json `rules.slider`). A draft that shows one review at a
// time (a card printing `cur.text`, `cur.name`, the code moving the index) has no list of slides in its markup, so the slider is
// a client decision with no `slides` and its slide block was placed by Fill with words only: the card's own look (its colour,
// corners, padding) and each part's look was read nowhere, and the block's default card stood in its place. The card is the
// slide's wrapper: the lowest element that holds every element printing a field of the current item
// (lib/fill-list-items.mjs::currentFieldElements). It is read once and stands for every item (the slide node carries
// `itemTemplate`, and Fill gives each item a copy, lib/fill-list-content.mjs::expandTemplate).
import { currentFieldElements } from './fill-list-items.mjs';
import { matchFields } from './fill-list-content.mjs';

// Returns { card: the inventory element that is the slide's wrapper, slideFields: [ { key: the slide block's content setting the
// field fills, element: the template key of the element printing it } ] } or null. facts: the skeleton facts (`q`); factRecord:
// the draft's fact record; entry( element ): the record's entry of an inventory element (lib/skeleton-record.mjs::recordView);
// slideBlock: the slider's one child block.
export function currentSlide( { facts, factRecord, inventory, rootKey, rootComponent = null, slideBlock, entry } ) {
	const cur = slideBlock && factRecord ? currentFieldElements( { inventory, facts: factRecord, rootKey, rootComponent } ) : null;
	if ( ! cur ) {
		return null;
	}
	const keys = facts.q( "SELECT attr_name, attr_type, role FROM block_attributes WHERE block_slug = ? AND role IN ( 'text-content', 'content', 'image-object' ) AND ( css_property IS NULL OR css_property = '' ) ORDER BY rowid", slideBlock )
		.map( ( r ) => ( { key: r.attr_name, type: r.attr_type, role: r.role } ) );
	const { map } = matchFields( cur.fields.map( ( f ) => ( { name: f.name, image: f.image } ) ), keys );
	const slideFields = cur.fields.filter( ( f ) => ! f.image && map[ f.name ] && entry( f.element )?.template?.key )
		.map( ( f ) => ( { key: map[ f.name ], element: entry( f.element ).template.key } ) );
	return { card: cur.card, slideFields };
}
