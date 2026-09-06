/**
 * Normalise a `useSettings()` preset list to a flat, de-duplicated array.
 *
 * ── The problem this exists to end ──────────────────────────────────────
 * `useSettings( '<feature>.<presets>' )` resolves to EITHER a flat array
 * (already merged) OR WordPress's raw origin-keyed object
 * `{ default: [...], theme: [...], custom: [...] }`, depending on the feature
 * and how the setting was resolved. Measured live on the sandybrown canary,
 * WP 7.0.x, 2026-08-19:
 *
 *   typography.fontFamilies  -> OBJECT, keys [ theme, custom ]
 *   typography.fontSizes     -> OBJECT, keys [ default, theme, custom ]
 *   color.palette            -> flat ARRAY
 *
 * So the shape genuinely varies per feature on ONE site — it is not a
 * WP-version question you can settle once and hardcode.
 *
 * ⛔ `( setting ?? [] ).map( … )` DOES NOT GUARD THIS. The nullish default only
 * fires on null/undefined; an origin-keyed object is truthy, sails through the
 * guard, and throws `(o ?? []).map is not a function` — which unmounts the
 * whole inspector, not just the one control.
 *
 * ⚠ This is the THIRD recurrence of one bug class. `ShadowControl.js` hit it
 * live on 2026-07-20 (Spec 35 Task 2) and `StateToggleControl.js` documented it
 * again for `color.palette`; both hand-rolled their own local fix, so the next
 * component written from scratch — `TypographyControls.js`, 2026-08-19 — met it
 * a third time and crashed `sgs/heading`'s inspector on the canary. Fixing one
 * instance does not immunise the class; a shared function is the fix that does.
 * Call this instead of writing a fourth local normaliser.
 *
 * ── Precedence ──────────────────────────────────────────────────────────
 * custom -> theme -> default, matching WordPress's own origin precedence, then
 * de-duplicated by `slug` keeping the FIRST occurrence, so a theme preset that
 * re-declares a default slug appears once rather than twice.
 *
 * @param {Array|Object|null|undefined} setting Raw value from `useSettings()`.
 * @return {Array} Flat, de-duplicated preset array. Always an array — an
 *                 unrecognised shape yields `[]` rather than throwing, so a
 *                 caller can safely `.length`/`.map` the result unguarded.
 */
export function flattenPresetSetting( setting ) {
	if ( Array.isArray( setting ) ) {
		return dedupeBySlug( setting );
	}
	if ( ! setting || typeof setting !== 'object' ) {
		return [];
	}
	return dedupeBySlug( [
		...( Array.isArray( setting.custom ) ? setting.custom : [] ),
		...( Array.isArray( setting.theme ) ? setting.theme : [] ),
		...( Array.isArray( setting.default ) ? setting.default : [] ),
	] );
}

/**
 * Keep the first entry for each `slug`. Entries with no `slug` are all kept —
 * `typography.fontFamilies` identifies by `fontFamily`, not every preset family
 * carries a slug, and silently collapsing them all into one under a shared
 * `undefined` key would delete real options.
 *
 * @param {Array} list Preset entries.
 * @return {Array} De-duplicated entries, original order preserved.
 */
function dedupeBySlug( list ) {
	const seen = new Set();
	return list.filter( ( entry ) => {
		const slug = entry?.slug;
		if ( ! slug ) {
			return true;
		}
		if ( seen.has( slug ) ) {
			return false;
		}
		seen.add( slug );
		return true;
	} );
}
