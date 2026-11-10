/**
 * FocalField: choose the part of the photo that stays in view when it is cropped (Spec 49 §9.2, FR-49-4, FR-49-23).
 *
 * Shows the media resolved for the active device with its point. Drag or click the picture; or type X and Y as
 * percentages (0 to 100); or press the arrow keys on the picture (Shift moves 10); or use a quick pick. Stored as
 * `{x,y}` in 0 to 1. An unset point reads "Centre (default)" and nothing is written until one is chosen. Changes are
 * announced in a live region. Per device through `ResponsiveOverride`.
 *
 * @package
 */
import { __, sprintf } from '@wordpress/i18n';
import { useRef, useState } from '@wordpress/element';
import ResponsiveOverride from '../ResponsiveOverride.js';
import { slotAccess } from './fieldBase.js';
import { deviceName, resolveTierSource, useActiveDevice } from './deviceValues.js';
import './FocalField.css';

const CENTRE = { x: 0.5, y: 0.5 };

const QUICK_PICKS = [
	[ __( 'Top', 'sgs-blocks' ), { x: 0.5, y: 0 } ],
	[ __( 'Centre', 'sgs-blocks' ), CENTRE ],
	[ __( 'Bottom', 'sgs-blocks' ), { x: 0.5, y: 1 } ],
	[ __( 'Left', 'sgs-blocks' ), { x: 0, y: 0.5 } ],
	[ __( 'Right', 'sgs-blocks' ), { x: 1, y: 0.5 } ],
];

const clamp = ( n ) => Math.min( 1, Math.max( 0, Number.isFinite( n ) ? n : 0.5 ) );
const percent = ( n ) => Math.round( clamp( n ) * 100 );

/**
 * @param {*} value A stored focal point.
 * @return {boolean} True for a usable `{x,y}`.
 */
export function isPoint( value ) {
	return !! value && 'object' === typeof value && Number.isFinite( value.x ) && Number.isFinite( value.y );
}

/** The picture the picker draws: the device's file, or a video's cover image. */
function pictureFor( source ) {
	return source?.poster?.url || ( 'video' === source?.kind ? '' : source?.url ) || '';
}

export default function FocalField( { attributes, setAttributes, prefix } ) {
	const access = slotAccess( attributes, setAttributes, prefix );
	const device = useActiveDevice();
	const area = useRef( null );
	const dragging = useRef( false );
	const [ announcement, setAnnouncement ] = useState( '' );

	const media = resolveTierSource( access.read( 'Source' ), device, ( s ) => !! ( s?.url || s?.poster?.url ) );
	const picture = pictureFor( media.value );
	const ownFile = media.own && 'desktop' !== device;

	return (
		<ResponsiveOverride
			label={ __( 'Focal point', 'sgs-blocks' ) }
			value={ access.read( 'Focal' ) }
			onChange={ ( next ) => access.write( { Focal: next } ) }
			desktopReset
		>
			{ ( { tier, ownValue, effectiveValue, inherited, sourceTier, setOwnValue, resetTier } ) => {
				const point = isPoint( effectiveValue ) ? effectiveValue : CENTRE;
				const isDefault = ! isPoint( effectiveValue );
				const set = ( next ) => {
					const x = clamp( next.x );
					const y = clamp( next.y );
					setOwnValue( { x: Math.round( x * 100 ) / 100, y: Math.round( y * 100 ) / 100 } );
					setAnnouncement(
						sprintf( /* translators: 1: percent across, 2: percent down. */ __( 'Focal point %1$d%% across, %2$d%% down', 'sgs-blocks' ), percent( x ), percent( y ) )
					);
				};
				const fromPointer = ( event ) => {
					const box = area.current?.getBoundingClientRect();
					if ( box && box.width && box.height ) {
						set( { x: ( event.clientX - box.left ) / box.width, y: ( event.clientY - box.top ) / box.height } );
					}
				};
				const onKeyDown = ( event ) => {
					const step = event.shiftKey ? 0.1 : 0.01;
					const moves = { ArrowLeft: [ -step, 0 ], ArrowRight: [ step, 0 ], ArrowUp: [ 0, -step ], ArrowDown: [ 0, step ] };
					if ( moves[ event.key ] ) {
						event.preventDefault();
						set( { x: point.x + moves[ event.key ][ 0 ], y: point.y + moves[ event.key ][ 1 ] } );
					}
				};
				return (
					<div className="sgs-focal-field">
						<p className="sgs-focal-field__help">
							{ __( 'Choose the part of the photo that must stay in view when it is cropped.', 'sgs-blocks' ) }
						</p>
						<div
							ref={ area }
							className="sgs-focal-field__area"
							role="group"
							tabIndex={ 0 }
							aria-label={ sprintf( /* translators: %s: device name. */ __( 'Focal point picker on %s. Use the arrow keys to move the point.', 'sgs-blocks' ), deviceName( tier ) ) }
							onKeyDown={ onKeyDown }
							onPointerDown={ ( event ) => {
								dragging.current = true;
								event.currentTarget.setPointerCapture?.( event.pointerId );
								fromPointer( event );
							} }
							onPointerMove={ ( event ) => dragging.current && fromPointer( event ) }
							onPointerUp={ () => {
								dragging.current = false;
							} }
						>
							{ picture ? (
								<img className="sgs-focal-field__picture" src={ picture } alt="" draggable="false" />
							) : (
								<span className="sgs-focal-field__empty">{ __( 'Choose a photo to set its focal point.', 'sgs-blocks' ) }</span>
							) }
							<span
								className="sgs-focal-field__point"
								aria-hidden="true"
								style={ { left: `${ percent( point.x ) }%`, top: `${ percent( point.y ) }%` } }
							/>
						</div>
						<div className="sgs-focal-field__inputs">
							{ [ [ 'x', __( 'X', 'sgs-blocks' ) ], [ 'y', __( 'Y', 'sgs-blocks' ) ] ].map( ( [ axis, name ] ) => (
								<label key={ axis }>
									{ name }
									<input
										type="number"
										min="0"
										max="100"
										step="1"
										aria-label={ sprintf( /* translators: 1: axis, 2: device name. */ __( 'Focal point %1$s percent on %2$s', 'sgs-blocks' ), name, deviceName( tier ) ) }
										value={ percent( point[ axis ] ) }
										onChange={ ( e ) => set( { ...point, [ axis ]: Number( e.target.value ) / 100 } ) }
									/>
									%
								</label>
							) ) }
						</div>
						{ isDefault && <p className="sgs-focal-field__state">{ __( 'Centre (default)', 'sgs-blocks' ) }</p> }
						<div className="sgs-focal-field__picks" role="group" aria-label={ __( 'Quick picks', 'sgs-blocks' ) }>
							{ QUICK_PICKS.map( ( [ label, pick ] ) => (
								<button key={ label } type="button" className="sgs-focal-field__pick" onClick={ () => set( pick ) }>
									{ label }
								</button>
							) ) }
							{ ownValue && (
								<button type="button" className="sgs-focal-field__pick" onClick={ resetTier }>
									{ __( 'Reset', 'sgs-blocks' ) }
								</button>
							) }
						</div>
						{ ownFile && inherited && sourceTier && (
							<p className="sgs-focal-field__note">
								{ sprintf( /* translators: %s: the wider device. */ __( "Using %s's focal point on this image.", 'sgs-blocks' ), deviceName( sourceTier ) ) }
							</p>
						) }
						<p className="sgs-focal-field__live" role="status" aria-live="polite">
							{ announcement }
						</p>
					</div>
				);
			} }
		</ResponsiveOverride>
	);
}
