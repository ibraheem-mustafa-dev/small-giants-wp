/**
 * sgs/nav-drawer-menu — Row extras: the ornament frame sequence controls.
 *
 * An ordered list of alternate glyph frames (each a custom SVG through the
 * shared IconPicker, which sanitises the paste client-side; the server
 * re-sanitises), a per-device on/off and a per-device frame duration. The
 * frames flash on row hover or keyboard focus before the ornament settles on
 * its own glyph. Reduced motion shows only the final glyph.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { Button, RangeControl } from '@wordpress/components';
import { IconPicker, ResponsiveOverride } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

const MAX_FRAMES = 8;
const DEFAULT_MS = 60;
const tierObject = ( value ) => ( value && typeof value === 'object' ? value : {} );

/**
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    Block attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 */
export default function OrnamentFramesControls( { attributes, setAttributes } ) {
	const frames = Array.isArray( attributes.itemOrnamentFrames ) ? attributes.itemOrnamentFrames : [];
	const setFrames = ( next ) => setAttributes( { itemOrnamentFrames: next } );

	const move = ( index, by ) => {
		const target = index + by;
		if ( target < 0 || target >= frames.length ) {
			return;
		}
		const next = [ ...frames ];
		[ next[ index ], next[ target ] ] = [ next[ target ], next[ index ] ];
		setFrames( next );
	};

	return (
		<>
			<p className="sgs-nav-panel__inspector-note">
				{ __(
					'Ornament frames flash in order on hover or keyboard focus, then the ornament settles on its own icon. Paste each frame as a custom SVG. With reduced motion on, only the final icon shows.',
					'sgs-blocks'
				) }
			</p>
			{ frames.map( ( frame, index ) => (
				<div key={ index } className="sgs-nav-ornament-frame-row">
					<IconPicker
						label={ `${ __( 'Frame', 'sgs-blocks' ) } ${ index + 1 }` }
						sources={ [ 'custom' ] }
						value={ frame || {} }
						onChange={ ( next ) => {
							const list = [ ...frames ];
							list[ index ] = next && next.svg ? next : { source: 'custom', svg: '' };
							setFrames( list );
						} }
					/>
					<Button
						variant="tertiary"
						size="small"
						disabled={ 0 === index }
						onClick={ () => move( index, -1 ) }
					>
						{ __( 'Move earlier', 'sgs-blocks' ) }
					</Button>
					<Button
						variant="tertiary"
						size="small"
						disabled={ index === frames.length - 1 }
						onClick={ () => move( index, 1 ) }
					>
						{ __( 'Move later', 'sgs-blocks' ) }
					</Button>
					<Button
						variant="link"
						isDestructive
						onClick={ () => setFrames( frames.filter( ( _, i ) => i !== index ) ) }
					>
						{ __( 'Remove frame', 'sgs-blocks' ) }
					</Button>
				</div>
			) ) }
			<Button
				variant="secondary"
				disabled={ frames.length >= MAX_FRAMES }
				onClick={ () => setFrames( [ ...frames, { source: 'custom', svg: '' } ] ) }
			>
				{ __( 'Add ornament frame', 'sgs-blocks' ) }
			</Button>
			{ frames.length > 0 && (
				<>
					<ResponsiveOverride
						label={ __( 'Play frame sequence', 'sgs-blocks' ) }
						value={ tierObject( attributes.itemOrnamentFramePlay ) }
						onChange={ ( obj ) => setAttributes( { itemOrnamentFramePlay: obj } ) }
					>
						{ ( { ownValue, effectiveValue, setOwnValue } ) => (
							<ToggleGroupControl
								label={ __( 'Play frame sequence', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || effectiveValue || 'on' }
								onChange={ ( val ) => setOwnValue( val || undefined ) }
								isBlock
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							>
								<ToggleGroupControlOption value="on" label={ __( 'On', 'sgs-blocks' ) } />
								<ToggleGroupControlOption value="off" label={ __( 'Off', 'sgs-blocks' ) } />
							</ToggleGroupControl>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						label={ __( 'Time per frame (ms)', 'sgs-blocks' ) }
						value={ tierObject( attributes.itemOrnamentFrameDuration ) }
						onChange={ ( obj ) => setAttributes( { itemOrnamentFrameDuration: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<RangeControl
								label={ __( 'Time per frame (ms)', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ typeof ownValue === 'number' ? ownValue : ( inherited && typeof effectiveValue === 'number' ? effectiveValue : DEFAULT_MS ) }
								min={ 10 }
								max={ 500 }
								step={ 10 }
								onChange={ ( val ) => setOwnValue( typeof val === 'number' ? val : undefined ) }
								allowReset
								resetFallbackValue={ undefined }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</>
			) }
		</>
	);
}
