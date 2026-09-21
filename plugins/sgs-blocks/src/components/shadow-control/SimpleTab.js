/**
 * The Simple tab. Two separate things:
 *
 * 1. Theme styles: finished shadows saved BY NAME. Change the theme once and every block using
 *    the name updates.
 * 2. The Elevation builder: elevation 0 to 6, a look, a colour and an intensity, written as the
 *    block's OWN copy of the layers (live in the editor). The panel recognises its own output
 *    by regenerating it, so reopening shows "Elevation 3, Soft"; anything hand-edited is
 *    "Custom" and is never overwritten without a confirm.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';
import { Button, RangeControl } from '@wordpress/components';
import { generate, LOOKS } from '../../utils/shadow-model';
import { previewCss } from './preview';
import ColourOpacity from './ColourOpacity';

const LOOK_NAMES = {
	soft: __( 'Soft', 'sgs-blocks' ),
	crisp: __( 'Crisp', 'sgs-blocks' ),
	long: __( 'Long', 'sgs-blocks' ),
	glow: __( 'Glow', 'sgs-blocks' ),
	hard: __( 'Hard', 'sgs-blocks' ),
};

/**
 * @param {Object}   props
 * @param {Object}   props.parsed      Result of parseStored().
 * @param {Object|null} props.rec      Result of recognise() for the current layers.
 * @param {Object}   props.prefs       Builder settings `{ look, intensity, colour }`.
 * @param {Array}    props.presets     Theme presets `[ { slug, name, preview } ]`.
 * @param {Function} props.onPreset    Receives a preset object.
 * @param {Function} props.onNone      Called when None is chosen.
 * @param {Function} props.onBuild     Receives `( n, prefs )` to write a generated stack.
 * @param {Function} props.setPrefs    Updates the builder settings without writing.
 * @param {Function} props.resolveHex  Colour token resolver.
 */
export default function SimpleTab( { parsed, rec, prefs, presets, onPreset, onNone, onBuild, setPrefs, resolveHex } ) {
	const currentN = 'none' === parsed.kind ? 0 : rec && 'layers' === parsed.kind ? rec.n : null;
	const update = ( patch ) => {
		const next = { ...prefs, ...patch };
		setPrefs( next );
		if ( null !== currentN && currentN > 0 ) {
			onBuild( currentN, next );
		}
	};
	return (
		<>
			{ 'default' === parsed.kind && (
				<p className="sgs-shadow-control__note">{ __( "Using this block's own default shadow. Pick anything below to change it.", 'sgs-blocks' ) }</p>
			) }
			<div className="sgs-shadow-control__section">
				<strong>{ __( 'Theme styles', 'sgs-blocks' ) }</strong>
				<p className="sgs-shadow-control__note">{ __( 'Saved by name: change the theme once and every block using it updates.', 'sgs-blocks' ) }</p>
				<div className="sgs-shadow-control__presets">
					<button
						type="button"
						className="sgs-shadow-control__card"
						aria-pressed={ 'none' === parsed.kind }
						onClick={ onNone }
					>
						{ __( 'None', 'sgs-blocks' ) }
					</button>
					{ presets.map( ( preset ) => (
						<button
							type="button"
							key={ preset.slug }
							className="sgs-shadow-control__card"
							aria-pressed={ 'preset' === parsed.kind && parsed.slug === preset.slug }
							onClick={ () => onPreset( preset ) }
						>
							<span className="sgs-shadow-control__card-swatch" style={ { boxShadow: preset.preview } } aria-hidden="true" />
							{ preset.name }
						</button>
					) ) }
				</div>
			</div>

			<div className="sgs-shadow-control__section">
				<strong>{ __( 'Build your own', 'sgs-blocks' ) }</strong>
				<p className="sgs-shadow-control__note">
					{ rec && 'layers' === parsed.kind && rec.n > 0
						? sprintf( /* translators: 1: elevation number, 2: look name. */ __( 'Elevation %1$d, %2$s.', 'sgs-blocks' ), rec.n, LOOK_NAMES[ rec.look ] )
						: 'layers' === parsed.kind
							? __( 'Custom shadow. Choosing an elevation replaces it.', 'sgs-blocks' )
							: __( "The block keeps its own copy, so a later theme change won't move it.", 'sgs-blocks' ) }
				</p>
				<div className="sgs-shadow-control__elevation" role="group" aria-label={ __( 'Elevation', 'sgs-blocks' ) }>
					{ [ 0, 1, 2, 3, 4, 5, 6 ].map( ( n ) => (
						<button
							type="button"
							key={ n }
							aria-pressed={ currentN === n }
							aria-label={ 0 === n ? __( 'No elevation', 'sgs-blocks' ) : sprintf( /* translators: %d: elevation. */ __( 'Elevation %d', 'sgs-blocks' ), n ) }
							onClick={ () => ( 0 === n ? onNone() : onBuild( n, prefs ) ) }
						>
							<span
								className="sgs-shadow-control__elevation-swatch"
								style={ { boxShadow: previewCss( generate( n, prefs.look, prefs.intensity, prefs.colour ), resolveHex ) } }
								aria-hidden="true"
							/>
							{ n }
						</button>
					) ) }
				</div>
				<div className="sgs-shadow-control__section" role="group" aria-label={ __( 'Look', 'sgs-blocks' ) }>
					{ LOOKS.map( ( look ) => (
						<Button
							key={ look }
							variant={ prefs.look === look ? 'primary' : 'secondary' }
							aria-pressed={ prefs.look === look }
							onClick={ () => update( { look } ) }
							size="compact"
						>
							{ LOOK_NAMES[ look ] }
						</Button>
					) ) }
				</div>
				<div className="sgs-shadow-control__section">
					<RangeControl
						label={ __( 'Intensity', 'sgs-blocks' ) }
						value={ Math.round( prefs.intensity * 100 ) }
						min={ 20 }
						max={ 100 }
						onChange={ ( v ) => update( { intensity: ( v ?? 50 ) / 100 } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</div>
				<div className="sgs-shadow-control__section">
					<ColourOpacity label={ __( 'Shadow colour', 'sgs-blocks' ) } colour={ prefs.colour } alpha={ 100 } noOpacity onChange={ ( patch ) => update( patch ) } />
				</div>
			</div>
		</>
	);
}
