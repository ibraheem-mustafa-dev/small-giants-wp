// Spec 49 §11: the media at 375, 768 and 1440, classified per width, written as per-device Source kinds (FR-49-16 width,
// height and mime; Decorative for `alt=""`). Pure; not wired until Stage B.
//
// Reads: { 375: visible, 768: visible, 1440: visible }; `visible` is the element showing at that width, or null:
//   { tag, src, poster, alt, natural: { w, h } | null }   (`picture` reads as the image it resolves to)
export const WIDTH_TIER = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };
const ORDER = [ [ 1440, 'desktop', null ], [ 768, 'tablet', 'desktop' ], [ 375, 'mobile', 'tablet' ] ];
const KIND_OF_TAG = { img: 'image', picture: 'image', video: 'video', iframe: 'embed', svg: 'svg', 'image-slot': 'image' };
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', ogv: 'video/ogg' };

/** @param {string} src File address. @return {string|null} MIME type from the extension, or null. */
export function mimeOf( src ) {
	const ext = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec( String( src || '' ) )?.[ 1 ]?.toLowerCase();
	return ( ext && MIME[ ext ] ) || null;
}

/** @param {string} tag Tag name. @return {string|null} Kind, or null when the tag is no media. */
export const kindOfTag = ( tag ) => KIND_OF_TAG[ String( tag ).toLowerCase() ] || null;

function sourceOf( v ) {
	const kind = kindOfTag( v.tag );
	if ( ! kind ) {
		return null;
	}
	const out = { kind };
	if ( v.src ) {
		out.url = v.src;
	}
	if ( 'image' === kind || 'video' === kind ) {
		const mime = mimeOf( v.src );
		mime && ( out.mime = mime );
	}
	if ( 'image' === kind && v.natural?.w > 0 && v.natural?.h > 0 ) {
		out.width = Math.round( v.natural.w );
		out.height = Math.round( v.natural.h );
	}
	if ( 'video' === kind && v.poster ) {
		out.poster = { url: v.poster };
	}
	return out;
}

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

/**
 * @param {Object} reads Visible element per width.
 * @return {{source:Object, alt?:string, decorative?:boolean, notes:string[]}} `source` holds a tier only where it differs
 *         from what the device would inherit; a width showing nothing after a wider one did writes `{kind:'none'}`. A tier's
 *         own `alt` is written only when its file differs and its words differ from the slot's.
 */
export function kindPerWidth( reads ) {
	const source = {};
	const notes = [];
	const resolved = {};
	for ( const [ width, tier, from ] of ORDER ) {
		const v = reads?.[ width ] || null;
		const own = v ? sourceOf( v ) : null;
		if ( v && ! own ) {
			notes.push( `${ width }px shows a <${ v.tag }>, which is no media kind` );
		}
		resolved[ tier ] = own;
		if ( ! same( own, from ? resolved[ from ] : null ) ) {
			source[ tier ] = own ? { ...own } : { kind: 'none' };
		}
	}
	const out = { source, notes };
	const first = ORDER.map( ( [ w ] ) => reads?.[ w ] ).find( ( v ) => v && kindOfTag( v.tag ) && 'string' === typeof v.alt );
	if ( first ) {
		const text = first.alt.trim();
		'' === text ? ( out.decorative = true ) : ( out.alt = text );
	}
	for ( const [ width, tier ] of ORDER ) {
		const v = reads?.[ width ];
		const text = 'string' === typeof v?.alt ? v.alt.trim() : '';
		if ( source[ tier ]?.url && text && out.alt && text !== out.alt ) {
			source[ tier ].alt = text;
		}
	}
	return out;
}
