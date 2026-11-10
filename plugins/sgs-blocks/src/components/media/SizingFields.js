/**
 * The sizing fields of Spec 49 §9.2: Aspect ratio chips, Width, Height with Match its space, the collapsed
 * Smallest and largest size group, and the one-line result summary. Each is separate and always available; none
 * clears another. Props for every field: `{ attributes, setAttributes, prefix, slot }`.
 *
 * @package
 */
import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSettings } from '@wordpress/block-editor';
import ResponsiveOverride from '../ResponsiveOverride.js';
import SgsLengthControl from '../SgsLengthControl.js';
import Chips from './Chips.js';
import { slotAccess, slotKind, WIDTH_UNITS, HEIGHT_UNITS } from './fieldBase.js';
import { deviceName, useActiveDevice } from './deviceValues.js';
import { FILL, describeSizing, isLength, ratioOptions, resolveSizing } from './sizing.js';

const CUSTOM = '__custom__';

/** A length with keyword toggles (Auto, Match its space, None) beside it. */
function KeywordLength( { access, base, label, keywords, units, max, help, notes } ) {
	return (
		<ResponsiveOverride
			label={ label }
			value={ access.read( base ) }
			onChange={ ( next ) => access.write( { [ base ]: next } ) }
		>
			{ ( { tier, ownValue, placeholder, setOwnValue } ) => {
				const active = keywords.find( ( k ) => k.value === ownValue );
				return (
					<div className="sgs-media-length">
						<div className="sgs-media-length__keywords">
							{ keywords.map( ( keyword ) => (
								<button
									key={ keyword.value }
									type="button"
									className="sgs-media-length__keyword"
									aria-pressed={ ownValue === keyword.value }
									aria-label={ `${ deviceName( tier ) } ${ label }: ${ keyword.label }` }
									onClick={ () => setOwnValue( ownValue === keyword.value ? '' : keyword.value ) }
								>
									{ keyword.label }
								</button>
							) ) }
						</div>
						{ ! active && (
							<SgsLengthControl
								label={ label }
								hideLabelFromVision
								presets={ false }
								units={ units }
								max={ max }
								value={ ownValue }
								placeholder={ placeholder }
								onChange={ setOwnValue }
							/>
						) }
						{ help && <p className="sgs-media-length__help">{ help }</p> }
						{ notes }
					</div>
				);
			} }
		</ResponsiveOverride>
	);
}

/** Aspect ratio chips, merging the theme's `dimensions.aspectRatios`; Custom opens two number boxes. */
export function AspectRatioField( { attributes, setAttributes, prefix, slot } ) {
	const access = slotAccess( attributes, setAttributes, prefix );
	const [ themeRatios ] = useSettings( 'dimensions.aspectRatios' );
	const device = useActiveDevice();
	const [ customOpen, setCustomOpen ] = useState( false );
	const [ typed, setTyped ] = useState( { w: '', h: '' } );
	const sized = resolveSizing( access.read, device );
	const options = ratioOptions( Array.isArray( themeRatios ) ? themeRatios : [], slotKind( slot, access ) );
	options.push( { value: CUSTOM, label: __( 'Custom', 'sgs-blocks' ) } );
	if ( FILL === sized.height ) {
		return null;
	}
	const overruled = isLength( sized.width ) && isLength( sized.height );
	return (
		<ResponsiveOverride
			label={ __( 'Aspect ratio', 'sgs-blocks' ) }
			value={ access.read( 'Ratio' ) }
			onChange={ ( next ) => access.write( { Ratio: next } ) }
		>
			{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => {
				const shown = ownValue || effectiveValue;
				const known = options.some( ( o ) => o.value === shown && CUSTOM !== o.value );
				const [ storedW, storedH ] = String( shown || '' ).split( '/' ).map( ( n ) => n.trim() );
				const isCustom = customOpen || ( !! shown && ! known );
				const writeCustom = ( part, text ) => {
					const next = { w: typed.w || ( known ? '' : storedW || '' ), h: typed.h || ( known ? '' : storedH || '' ), [ part ]: text };
					setTyped( next );
					if ( Number( next.w ) > 0 && Number( next.h ) > 0 ) {
						setOwnValue( `${ next.w } / ${ next.h }` );
					}
				};
				return (
					<>
						<Chips
							label={ sprintf( /* translators: %s: device name. */ __( 'Aspect ratio on %s', 'sgs-blocks' ), deviceName( tier ) ) }
							options={ options }
							value={ isCustom ? CUSTOM : shown || '' }
							onChange={ ( value ) => {
								setCustomOpen( CUSTOM === value );
								if ( CUSTOM !== value ) {
									setOwnValue( value );
								}
							} }
						/>
						{ isCustom && (
							<div className="sgs-media-ratio-custom">
								<input
									type="number"
									min="0.1"
									step="any"
									aria-label={ __( 'Ratio width part', 'sgs-blocks' ) }
									value={ typed.w || ( known ? '' : storedW || '' ) }
									onChange={ ( e ) => writeCustom( 'w', e.target.value ) }
								/>
								<span aria-hidden="true">:</span>
								<input
									type="number"
									min="0.1"
									step="any"
									aria-label={ __( 'Ratio height part', 'sgs-blocks' ) }
									value={ typed.h || ( known ? '' : storedH || '' ) }
									onChange={ ( e ) => writeCustom( 'h', e.target.value ) }
								/>
							</div>
						) }
						{ overruled && (
							<p className="sgs-media-length__help">
								{ __( 'Not used while Width and Height are both set.', 'sgs-blocks' ) }
							</p>
						) }
					</>
				);
			} }
		</ResponsiveOverride>
	);
}

export function WidthField( { attributes, setAttributes, prefix } ) {
	const access = slotAccess( attributes, setAttributes, prefix );
	return (
		<KeywordLength
			access={ access }
			base="Width"
			label={ __( 'Width', 'sgs-blocks' ) }
			keywords={ [ { value: 'auto', label: __( 'Auto', 'sgs-blocks' ) } ] }
			units={ WIDTH_UNITS }
			max={ 5000 }
		/>
	);
}

export function HeightField( { attributes, setAttributes, prefix } ) {
	const access = slotAccess( attributes, setAttributes, prefix );
	const device = useActiveDevice();
	const sized = resolveSizing( access.read, device );
	const keepShape = isLength( sized.height ) && ! sized.width && ! sized.ratio;
	return (
		<KeywordLength
			access={ access }
			base="Height"
			label={ __( 'Height', 'sgs-blocks' ) }
			keywords={ [
				{ value: 'auto', label: __( 'Auto', 'sgs-blocks' ) },
				{ value: FILL, label: __( 'Match its space', 'sgs-blocks' ) },
			] }
			units={ HEIGHT_UNITS }
			help={
				FILL === sized.height
					? __( 'Makes the photo as tall as the space around it, such as a card stretched by the text beside it.', 'sgs-blocks' )
					: null
			}
			notes={
				keepShape ? (
					<>
						<p className="sgs-media-length__help">
							{ __( 'The photo is full width and cropped to this height.', 'sgs-blocks' ) }
						</p>
						<button
							type="button"
							className="sgs-media-length__keyword"
							onClick={ () => access.write( { Width: { ...asObject( access.read( 'Width' ) ), [ device ]: 'auto' } } ) }
						>
							{ __( "Keep the photo's shape", 'sgs-blocks' ) }
						</button>
					</>
				) : null
			}
		/>
	);
}

function asObject( stored ) {
	return stored && 'object' === typeof stored ? stored : {};
}

/** Min width, Max width, Min height and Max height in one collapsed group. */
export function LimitsGroup( { attributes, setAttributes, prefix } ) {
	const access = slotAccess( attributes, setAttributes, prefix );
	const none = [ { value: 'none', label: __( 'None', 'sgs-blocks' ) } ];
	const rows = [
		[ 'MinWidth', __( 'Min width', 'sgs-blocks' ), WIDTH_UNITS ],
		[ 'MaxWidth', __( 'Max width', 'sgs-blocks' ), WIDTH_UNITS ],
		[ 'MinHeight', __( 'Min height', 'sgs-blocks' ), HEIGHT_UNITS ],
		[ 'MaxHeight', __( 'Max height', 'sgs-blocks' ), HEIGHT_UNITS ],
	];
	return (
		<details className="sgs-media-limits">
			<summary>{ __( 'Smallest and largest size', 'sgs-blocks' ) }</summary>
			{ rows.map( ( [ base, label, units ] ) => (
				<KeywordLength key={ base } access={ access } base={ base } label={ label } keywords={ none } units={ units } max={ 5000 } />
			) ) }
		</details>
	);
}

/** One line stating the result at the active device, for example "Mobile: full width, square (1:1), cropped to fill". */
export function SizingSummary( { attributes, setAttributes, prefix } ) {
	const access = slotAccess( attributes, setAttributes, prefix );
	const device = useActiveDevice();
	return (
		<p className="sgs-media-summary" role="status">
			{ describeSizing( device, resolveSizing( access.read, device ) ) }
		</p>
	);
}
