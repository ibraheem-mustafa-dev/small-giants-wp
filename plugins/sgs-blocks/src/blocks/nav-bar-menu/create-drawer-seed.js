/**
 * SGS Nav Bar Menu — pure helpers for creating a `sgs_drawer` post inline
 * (Spec 37 FR-37-43 "inline creation" clause / FR-37-49).
 *
 * Kept free of every `@wordpress/*` import so the rules below are testable with
 * plain node (`scripts/tests/test-create-drawer-seed.mjs`) rather than only in a
 * live editor.
 *
 * @package SGS\Blocks
 */

/** The `sgs_drawer` post type slug. */
export const DRAWER_POST_TYPE = 'sgs_drawer';

/**
 * The picker's list query, shared so the create action can invalidate EXACTLY
 * the resolution `DropdownSettingsPanel` reads. `core-data` keys its resolution
 * cache on the query arguments, so a query that differs by one key would
 * invalidate nothing and the new drawer would not appear until a reload.
 *
 * A module-level constant (not a literal at each call site) also keeps
 * `useEntityRecords`'s memoisation stable across renders.
 */
export const DRAWER_QUERY = Object.freeze( {
	per_page: -1,
	status: [ 'publish' ],
	context: 'edit',
} );

/**
 * Seed patterns in preference order: the blank starter, then the framework
 * default. A new drawer never arrives wearing a look the operator did not
 * choose, so no other pattern is ever picked.
 */
const PREFERRED_SEED_SLUGS = [ 'sgs/drawer-scratch', 'sgs/framework-drawer-default' ];

/**
 * Patterns registered for the drawer CPT, using the same qualification rule as
 * `components/StarterLookPresetControl.js`: scoped to the post type AND usable
 * as post content. A pattern that declares no post type targets an ordinary
 * page and must never seed a drawer.
 *
 * @param {Array} patterns `select( 'core' ).getBlockPatterns()` output.
 * @return {Array} The qualifying patterns, registry order preserved.
 */
export function qualifyingDrawerPatterns( patterns ) {
	if ( ! Array.isArray( patterns ) ) {
		return [];
	}
	return patterns.filter( ( pattern ) => {
		if ( ! pattern || pattern.inserter === false ) {
			return false;
		}
		const scopedToPostType =
			Array.isArray( pattern.postTypes ) &&
			pattern.postTypes.includes( DRAWER_POST_TYPE );
		const scopedToPostContent =
			! pattern.blockTypes || pattern.blockTypes.includes( 'core/post-content' );
		return scopedToPostType && scopedToPostContent;
	} );
}

/**
 * The one pattern a newly-created drawer is seeded from.
 *
 * @param {Array} patterns `select( 'core' ).getBlockPatterns()` output.
 * @return {Object|null} The chosen pattern, or null when neither the blank
 *                        starter nor the framework default is registered.
 */
export function pickDrawerSeedPattern( patterns ) {
	const qualifying = qualifyingDrawerPatterns( patterns );
	for ( const slug of PREFERRED_SEED_SLUGS ) {
		const preferred = qualifying.find( ( pattern ) => pattern.name === slug );
		if ( preferred ) {
			return preferred;
		}
	}
	return null;
}

/**
 * The block markup a new drawer post is created with.
 *
 * Returns the pattern's raw `content` string rather than a re-serialised parse:
 * the pattern source IS the framework's blank-drawer definition, so there is no
 * second copy of drawer markup to drift (FR-37-49's "the patterns already are
 * the source of truth").
 *
 * An empty string is a real answer — the caller must treat it as "no starter is
 * registered" and say so, never create a silently empty drawer.
 *
 * @param {Object|null} pattern A pattern from {@link pickDrawerSeedPattern}.
 * @return {string} Block markup, or '' when there is none.
 */
export function drawerSeedContent( pattern ) {
	const content = pattern && typeof pattern.content === 'string' ? pattern.content.trim() : '';
	return content;
}

/**
 * Normalises the inline name field into the title actually saved.
 *
 * @param {string} raw      The field value.
 * @param {string} fallback The (translated) title used when the field is blank.
 * @return {string} A non-empty title.
 */
export function drawerTitleFrom( raw, fallback ) {
	const trimmed = typeof raw === 'string' ? raw.trim() : '';
	return '' !== trimmed ? trimmed : fallback;
}

/**
 * Admin edit-screen URL for a drawer post.
 *
 * Relative to the current admin page on purpose: every editor that mounts this
 * control (`post.php`, `site-editor.php`) lives in `wp-admin/`, so a relative
 * path resolves correctly without the block needing an admin URL published from
 * PHP. Both values are integers/literals, so there is nothing to escape.
 *
 * @param {number} postId The `sgs_drawer` post id.
 * @return {string} The URL, or '' for a non-positive id.
 */
export function drawerEditUrl( postId ) {
	const id = Number( postId );
	if ( ! Number.isInteger( id ) || id <= 0 ) {
		return '';
	}
	return `post.php?post=${ id }&action=edit`;
}

/**
 * Flattens whatever `saveEntityRecord` rejected with into something an operator
 * can act on. core-data rejects with a `WP_Error`-shaped object (`.message`),
 * apiFetch with a `TypeError` on a network failure, and a REST 403 from
 * `Sgs_Cpt_Rest_Gate` with `{ code: 'rest_forbidden', message }` — a silent
 * no-op for any of them would leave the operator clicking a dead button.
 *
 * @param {*}      error    The rejection value.
 * @param {string} fallback Translated text for a rejection carrying no message
 *                          of its own. Passed in so this module stays free of
 *                          `@wordpress/i18n` and remains node-testable.
 * @return {string} A human-readable message; never empty.
 */
export function createDrawerErrorMessage( error, fallback ) {
	if ( error && typeof error.message === 'string' && '' !== error.message.trim() ) {
		return error.message.trim();
	}
	if ( typeof error === 'string' && '' !== error.trim() ) {
		return error.trim();
	}
	return fallback;
}
