/**
 * Button preset names in the editor.
 *
 * The names are the framework's three starters plus, on a site that opted in (`settings.custom.namedButtonPresets`), the keys
 * of its snapshot's `buttonPresets`. PHP resolves them once (`includes/helpers-button-preset-names.php::sgs_button_preset_names`)
 * and publishes the names beyond the starters as `window.sgsButtonPresetNames` (`sgs_button_preset_names_editor_data`), so the
 * editor never keeps a list of its own.
 */

/** The framework's starter preset names (the one list of them in the editor's JavaScript). */
export const STARTER_PRESETS = Object.freeze( [
	'primary',
	'secondary',
	'outline',
] );

/**
 * A preset name as a readable label: `gold-large` becomes `Gold large`.
 *
 * @param {string} name Preset slug.
 * @return {string} Label.
 */
export function presetLabel( name ) {
	const words = String( name ).replace( /[-_]+/g, ' ' ).trim();
	return words.charAt( 0 ).toUpperCase() + words.slice( 1 );
}

/**
 * Every preset name the editor offers: the starters, then the site's own.
 *
 * @return {string[]} Preset slugs.
 */
export function presetNames() {
	const extra =
		'undefined' !== typeof window &&
		Array.isArray( window.sgsButtonPresetNames )
			? window.sgsButtonPresetNames
			: [];
	return [
		...STARTER_PRESETS,
		...extra.filter(
			( n ) => 'string' === typeof n && ! STARTER_PRESETS.includes( n )
		),
	];
}

/**
 * Select options for the preset names, each labelled.
 *
 * @param {Object} [labels] Labels for names that have one of their own (the starters' translated labels).
 * @return {{label: string, value: string}[]} Options.
 */
export function presetOptions( labels = {} ) {
	return presetNames().map( ( name ) => ( {
		value: name,
		label: labels[ name ] || presetLabel( name ),
	} ) );
}
