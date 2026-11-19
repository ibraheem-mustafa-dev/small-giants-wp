// A split hero's order per device (Spec 48 FR-48-6, rules.hero.splitOrder in data/skeleton-decisions.json): whether the
// draft draws the hero's picture before or after its words at each device's width. The hero renders its content column
// first in its markup and places its media by its order setting, whose unset phone tier puts the media on top, so a draft
// whose words come first on a phone needs the order written.
// Pure: boxes in, setting value out.

const TIER = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };

// The smallest box holding every box given, or null.
function union( boxes ) {
	const list = boxes.filter( ( b ) => b && ( b.w > 0 || b.h > 0 ) );
	if ( ! list.length ) {
		return null;
	}
	const x = Math.min( ...list.map( ( b ) => b.x ) );
	const y = Math.min( ...list.map( ( b ) => b.y ) );
	return { x, y, w: Math.max( ...list.map( ( b ) => b.x + b.w ) ) - x, h: Math.max( ...list.map( ( b ) => b.y + b.h ) ) - y };
}

// Whether the media comes first beside or above the words: side by side (their rows overlap) it is the one whose centre
// is further left; stacked, the one higher up.
export function mediaFirst( media, words ) {
	const sideBySide = media.y < words.y + words.h && words.y < media.y + media.h;
	return sideBySide ? media.x + media.w / 2 < words.x + words.w / 2 : media.y < words.y;
}

// The picture's own inline alignment in its column, from the draft's declared style (`style`, property -> value): its
// `justify-self` keyword, else auto side margins (centred). rule: rules.hero.splitAlignment { setting, keywords: { CSS
// keyword: setting value } }. Returns the tier object to write ({ desktop: value }, the smaller devices inheriting it) or
// null. The hero's media cell spans its column, so a picture narrower than the column sits at its start until this is set.
export function heroMediaAlignment( { style = {}, rule } ) {
	if ( ! rule?.setting ) {
		return null;
	}
	const margins = String( style.margin ?? '' ).trim().split( /\s+/ );
	const autoSides = ( 'auto' === style[ 'margin-left' ] && 'auto' === style[ 'margin-right' ] ) || 'auto' === style[ 'margin-inline' ] || ( margins.length >= 2 && margins.length <= 3 && 'auto' === margins[ 1 ] ) || ( 4 === margins.length && 'auto' === margins[ 1 ] && 'auto' === margins[ 3 ] ) || ( 1 === margins.length && 'auto' === margins[ 0 ] );
	const keyword = String( style[ 'justify-self' ] ?? '' ).trim() || ( autoSides ? 'center' : '' );
	const v = rule.keywords?.[ keyword ];
	return undefined === v ? null : { desktop: v };
}

// media: the hero's picture element; words: its worded elements outside the picture (inventory elements with `box` and
// `visible` per width); rule: rules.hero.splitOrder; allowed: the setting's stored values (the framework database's
// enum_values) or null when it stores none. Returns { value, problems }: value is the tier object to write (a tier whose
// value is empty is left out, so it renders the block's own way for that order) or null; problems names each tier whose
// value the setting does not store, which is then not written.
export function heroSplitOrder( { media, words = [], rule, allowed = null } ) {
	const out = { value: null, problems: [] };
	if ( ! media || ! rule?.setting ) {
		return out;
	}
	const value = {};
	for ( const [ w, tier ] of Object.entries( TIER ) ) {
		const mb = media.visible?.[ w ] ? media.box?.[ w ] : null;
		const wb = union( words.filter( ( k ) => k.visible?.[ w ] ).map( ( k ) => k.box?.[ w ] ) );
		if ( ! mb || ! wb || ! ( mb.w > 0 || mb.h > 0 ) ) {
			continue;
		}
		const v = ( mediaFirst( mb, wb ) ? rule.mediaFirst : rule.contentFirst )?.[ tier ];
		if ( undefined === v || '' === v ) {
			continue;
		}
		if ( Array.isArray( allowed ) && ! allowed.includes( v ) ) {
			out.problems.push( `${ rule.setting } stores no value "${ v }" (its values: ${ JSON.stringify( allowed ) }), so the ${ tier } order is not written` );
			continue;
		}
		value[ tier ] = v;
	}
	Object.keys( value ).length && ( out.value = value );
	return out;
}
