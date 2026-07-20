/**
 * Normal / Hover (state) switch for block sidebar colour controls.
 *
 * A panel-level segmented toggle — the Kadence/Spectra pattern converged on by
 * the 2026-07-18 inspector-design research council: ONE switch pinned to an
 * element panel scopes every colour control beneath it, rather than a separate
 * toggle per control or a duplicate "Hover" panel.
 *
 * Passes the active state key to the child render function so the consumer can
 * show that state's controls in-place:
 *
 *   <StateToggleControl
 *       label={ __( 'Colours', 'sgs-blocks' ) }
 *       swatches={ [
 *           { label: 'Normal bg', value: tileBg },
 *           { label: 'Hover bg', value: hoverBg },
 *       ] }
 *   >
 *       { ( state ) => state === 'normal'
 *           ? <NormalColourControls />
 *           : <HoverColourControls /> }
 *   </StateToggleControl>
 *
 * The `swatches` legend stays visible in BOTH states, so a hidden hover value is
 * never invisible (the discoverability mitigation from the council sceptic) —
 * the client always sees that a hover colour exists even while editing Normal.
 *
 * Mirrors the ResponsiveControl idiom (local useState, render-prop child) so the
 * state is editor-only UI and never persisted as an attribute.
 *
 * @package SGS\Blocks
 */
import { useState } from '@wordpress/element';
import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useSettings } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { resolveColorToken } from './DesignTokenPicker';

/**
 * Flatten WordPress's colour palette to a single array of { slug, color }.
 *
 * useSettings( 'color.palette' ) may hand back either a flat array OR an
 * origin-keyed object ({ default, theme, custom }) depending on WP version and
 * how the setting was resolved — the same shape difference that crashed
 * ShadowControl on its first live render (Spec 35 Task 2, 2026-07-20). Handle
 * both rather than assuming, and de-duplicate by slug so a theme override wins
 * over the core default of the same name.
 *
 * @param {Array|Object|undefined} palette Raw palette from useSettings.
 * @return {Array} Flat array of palette entries.
 */
function flattenPalette( palette ) {
	if ( ! palette ) {
		return [];
	}
	const list = Array.isArray( palette )
		? palette
		: [
			...( palette.custom || [] ),
			...( palette.theme || [] ),
			...( palette.default || [] ),
		];

	const seen = new Set();
	return list.filter( ( entry ) => {
		if ( ! entry?.slug || seen.has( entry.slug ) ) {
			return false;
		}
		seen.add( entry.slug );
		return true;
	} );
}

const DEFAULT_STATES = [
	{ key: 'normal', label: __( 'Normal', 'sgs-blocks' ) },
	{ key: 'hover', label: __( 'Hover', 'sgs-blocks' ) },
];

export default function StateToggleControl( {
	label,
	states = DEFAULT_STATES,
	swatches = [],
	children,
} ) {
	const [ state, setState ] = useState( states[ 0 ].key );
	const [ rawPalette ] = useSettings( 'color.palette' );
	const palette = flattenPalette( rawPalette );

	return (
		<div className="sgs-state-toggle">
			<ToggleGroupControl
				label={ label }
				value={ state }
				onChange={ ( val ) => setState( val || states[ 0 ].key ) }
				isBlock
				__nextHasNoMarginBottom
			>
				{ states.map( ( s ) => (
					<ToggleGroupControlOption
						key={ s.key }
						value={ s.key }
						label={ s.label }
					/>
				) ) }
			</ToggleGroupControl>

			{ swatches.length > 0 && (
				<ul
					className="sgs-state-toggle__swatches"
					style={ {
						display: 'flex',
						flexWrap: 'wrap',
						gap: '4px 12px',
						listStyle: 'none',
						margin: '6px 0 10px',
						padding: 0,
						fontSize: '11px',
						color: 'var(--wp-admin-theme-color, #757575)',
					} }
				>
					{ swatches.map( ( sw ) => (
						<li
							key={ sw.label }
							style={ {
								display: 'flex',
								alignItems: 'center',
								gap: '5px',
							} }
						>
							<span
								aria-hidden="true"
								style={ {
									display: 'inline-block',
									width: '12px',
									height: '12px',
									borderRadius: '2px',
									border: '1px solid rgba(0,0,0,0.2)',
									// resolveColorToken, not colourVar: a raw hex from
									// the custom colour picker must pass through
									// untouched. colourVar() blindly wrapped every
									// value as var(--wp--preset--color--{value}),
									// which for '#111111' is an INVALID custom-property
									// name — the browser silently drops the whole
									// declaration and the swatch keeps its previous
									// colour, showing the client a colour they did not
									// choose. No console error, no build failure.
									backgroundColor: sw.value
										? resolveColorToken( sw.value, palette )
										: 'transparent',
								} }
							/>
							<span>{ sw.label }</span>
						</li>
					) ) }
				</ul>
			) }

			{ children( state ) }
		</div>
	);
}
