/**
 * Data layer for the shared IconPicker.
 *
 * Lucide (1,917), emoji (1,914) and WordPress-icon datasets are static JSON
 * assets fetched on demand — editor-only, never inlined into the JS bundle,
 * never enqueued on the frontend. The frontend renders from the PHP maps
 * (lucide-icons.php / wp-icons.php) so these JSON files are a preview mirror,
 * not a second source of truth (they are generated from the same source by
 * scripts/generate-icons.js).
 *
 * Asset URLs are provided by PHP via window.sgsBlocksData.iconAssets
 * (see includes/class-sgs-blocks.php).
 *
 * @package SGS\Blocks
 */

const ASSETS =
	( typeof window !== 'undefined' &&
		window.sgsBlocksData &&
		window.sgsBlocksData.iconAssets ) ||
	{};

// Module-scope promise caches — each dataset is fetched at most once per
// editor session, then reused across every block instance and re-open.
let lucidePromise = null;
let emojiPromise = null;
let wpIconPromise = null;

/**
 * Fetch and parse a JSON asset.
 *
 * @param {string} url Absolute asset URL.
 * @return {Promise<any>} Parsed JSON.
 */
async function fetchJson( url ) {
	if ( ! url ) {
		throw new Error( 'Icon asset URL not configured' );
	}
	const res = await fetch( url );
	if ( ! res.ok ) {
		throw new Error( `HTTP ${ res.status }` );
	}
	return res.json();
}

/**
 * Load the Lucide SVG map + search aliases.
 *
 * @return {Promise<{map:Object, tags:Object, names:string[]}>} Lucide dataset.
 */
export function loadLucide() {
	if ( ! lucidePromise ) {
		lucidePromise = Promise.all( [
			fetchJson( ASSETS.lucide ),
			fetchJson( ASSETS.lucideTags ).catch( () => ( {} ) ),
		] )
			.then( ( [ map, tags ] ) => ( {
				map,
				tags,
				names: Object.keys( map ),
			} ) )
			.catch( ( err ) => {
				lucidePromise = null; // allow retry on next open
				throw err;
			} );
	}
	return lucidePromise;
}

/**
 * Load the flattened emoji dataset [{ c, n, g, k }].
 *
 * @return {Promise<Array>} Emoji list.
 */
export function loadEmoji() {
	if ( ! emojiPromise ) {
		emojiPromise = fetchJson( ASSETS.emoji ).catch( ( err ) => {
			emojiPromise = null;
			throw err;
		} );
	}
	return emojiPromise;
}

/**
 * Load the WordPress-icon SVG map { slug: svg }.
 *
 * @return {Promise<Object>} WordPress-icon map.
 */
export function loadWpIcons() {
	if ( ! wpIconPromise ) {
		wpIconPromise = fetchJson( ASSETS.wpIcons ).catch( ( err ) => {
			wpIconPromise = null;
			throw err;
		} );
	}
	return wpIconPromise;
}

/**
 * Icon sources offered by the picker, in tab order.
 * `key` matches the sgs/icon block's `iconSource` enum.
 */
export const ICON_SOURCES = [
	{ key: 'lucide', label: 'Lucide' },
	{ key: 'emoji', label: 'Emoji' },
	{ key: 'wp-icon', label: 'WordPress' },
	{ key: 'dashicon', label: 'Dashicons' },
];

/**
 * Curated Dashicons slugs (font-rendered in admin — no SVG payload needed).
 * Dashicons are a legacy source; this covers the common business set. The
 * three big browsable libraries are Lucide + emoji + WordPress icons.
 */
export const DASHICONS = [
	'admin-home', 'admin-users', 'admin-settings', 'admin-tools', 'admin-site',
	'awards', 'bell', 'book', 'businessman', 'businesswoman', 'calendar',
	'calendar-alt', 'camera', 'cart', 'chart-area', 'chart-bar', 'chart-line',
	'chart-pie', 'clipboard', 'clock', 'cloud', 'coffee', 'controls-play',
	'desktop', 'download', 'edit', 'email', 'email-alt', 'external', 'facebook',
	'flag', 'format-image', 'format-quote', 'format-video', 'groups', 'heart',
	'id', 'index-card', 'info', 'instagram', 'laptop', 'lightbulb', 'location',
	'location-alt', 'lock', 'megaphone', 'money-alt', 'nametag', 'no', 'palmtree',
	'performance', 'phone', 'pressthis', 'products', 'shield', 'shield-alt',
	'smartphone', 'smiley', 'star-filled', 'star-half', 'star-empty', 'sos',
	'tablet', 'tag', 'thumbs-up', 'thumbs-down', 'tickets-alt', 'twitter',
	'unlock', 'update', 'visibility', 'warning', 'welcome-learn-more', 'yes',
	'yes-alt',
];
