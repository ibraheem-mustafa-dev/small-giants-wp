/**
 * The theme's shadow presets (`theme.json` `settings.shadow.presets`) as the editor sees them.
 * Every control that offers a theme shadow reads this ONE list, so a preset added or renamed in
 * the theme shows up everywhere with no block edit and no second list to keep in step.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useSettings } from '@wordpress/block-editor';

/**
 * `useSettings()` returns either a flat list or WordPress's origin-keyed object
 * (`{ custom, theme, default }`). Flatten it (custom, then theme, then default) and keep the
 * first entry of each slug, which is WordPress's own origin precedence.
 *
 * @param {Array|Object} setting Raw settings value.
 * @return {Array} Flat list of `{ slug, name, ... }`.
 */
export function flattenSettingList( setting ) {
	const list = Array.isArray( setting ) ? setting : [ ...( setting?.custom || [] ), ...( setting?.theme || [] ), ...( setting?.default || [] ) ];
	return list.filter( ( item, i ) => list.findIndex( ( other ) => other.slug === item.slug ) === i );
}

/**
 * @return {Array} The theme's shadow presets `[ { slug, name, shadow } ]`.
 */
export function useShadowPresets() {
	const [ presets ] = useSettings( 'shadow.presets' );
	return flattenSettingList( presets );
}

/**
 * Options for a plain `SelectControl` of theme shadows, with a leading "None".
 *
 * @return {Array} `[ { label, value } ]`.
 */
export function useShadowPresetOptions() {
	return [ { label: __( 'None', 'sgs-blocks' ), value: '' }, ...useShadowPresets().map( ( p ) => ( { label: p.name, value: p.slug } ) ) ];
}
