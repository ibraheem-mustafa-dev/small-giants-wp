/**
 * SGS fork of WordPress core's `gradient-bar/index.tsx`, forked verbatim
 * at commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4). Type
 * annotations stripped only — behaviour-identical to core. The one
 * divergence in this fork lives entirely in `control-points.js`.
 */
import clsx from 'clsx';

import { useRef, useReducer } from '@wordpress/element';

import ControlPoints from './control-points';
import { getHorizontalRelativeGradientPosition } from './utils';
import { MINIMUM_DISTANCE_BETWEEN_INSERTER_AND_POINT } from './constants';

const customGradientBarReducer = ( state, action ) => {
	switch ( action.type ) {
		case 'MOVE_INSERTER':
			if ( state.id === 'IDLE' || state.id === 'MOVING_INSERTER' ) {
				return {
					id: 'MOVING_INSERTER',
					insertPosition: action.insertPosition,
				};
			}
			break;
		case 'STOP_INSERTER_MOVE':
			if ( state.id === 'MOVING_INSERTER' ) {
				return { id: 'IDLE' };
			}
			break;
		case 'OPEN_INSERTER':
			if ( state.id === 'MOVING_INSERTER' ) {
				return {
					id: 'INSERTING_CONTROL_POINT',
					insertPosition: state.insertPosition,
				};
			}
			break;
		case 'CLOSE_INSERTER':
			if ( state.id === 'INSERTING_CONTROL_POINT' ) {
				return { id: 'IDLE' };
			}
			break;
		case 'START_CONTROL_CHANGE':
			if ( state.id === 'IDLE' ) {
				return { id: 'MOVING_CONTROL_POINT' };
			}
			break;
		case 'STOP_CONTROL_CHANGE':
			if ( state.id === 'MOVING_CONTROL_POINT' ) {
				return { id: 'IDLE' };
			}
			break;
	}
	return state;
};
const customGradientBarReducerInitialState = { id: 'IDLE' };

export default function CustomGradientBar( {
	background,
	hasGradient,
	value: controlPoints,
	onChange,
	disableInserter = false,
	disableAlpha = false,
	__experimentalIsRenderedInSidebar = false,
} ) {
	const gradientMarkersContainerDomRef = useRef( null );

	const [ gradientBarState, gradientBarStateDispatch ] = useReducer(
		customGradientBarReducer,
		customGradientBarReducerInitialState
	);
	const onMouseEnterAndMove = ( event ) => {
		if ( ! gradientMarkersContainerDomRef.current ) {
			return;
		}

		const insertPosition = getHorizontalRelativeGradientPosition(
			event.clientX,
			gradientMarkersContainerDomRef.current
		);

		if (
			controlPoints.some( ( { position } ) => {
				return (
					Math.abs( insertPosition - position ) <
					MINIMUM_DISTANCE_BETWEEN_INSERTER_AND_POINT
				);
			} )
		) {
			if ( gradientBarState.id === 'MOVING_INSERTER' ) {
				gradientBarStateDispatch( { type: 'STOP_INSERTER_MOVE' } );
			}
			return;
		}

		gradientBarStateDispatch( { type: 'MOVE_INSERTER', insertPosition } );
	};

	const onMouseLeave = () => {
		gradientBarStateDispatch( { type: 'STOP_INSERTER_MOVE' } );
	};

	const isMovingInserter = gradientBarState.id === 'MOVING_INSERTER';
	const isInsertingControlPoint =
		gradientBarState.id === 'INSERTING_CONTROL_POINT';

	return (
		<div
			className={ clsx(
				// Core's class carries the ACTUAL styling (height:48px, width,
				// positioning). WordPress enqueues wp-components in the editor,
				// so wearing core's class means the fork is styled for free —
				// the same arrangement the sibling colour-picker fork already
				// relies on. The sgs- class stays as our own styling hook.
				// Without core's class this bar had no height or width at all:
				// invisible bar, collapsed popover.
				'components-custom-gradient-picker__gradient-bar',
				'sgs-gradient-picker__gradient-bar',
				{ 'has-gradient': hasGradient }
			) }
			onMouseEnter={ onMouseEnterAndMove }
			onMouseMove={ onMouseEnterAndMove }
			onMouseLeave={ onMouseLeave }
		>
			<div
				className={ clsx(
					'components-custom-gradient-picker__gradient-bar-background',
					'sgs-gradient-picker__gradient-bar-background'
				) }
				style={ {
					background,
					opacity: hasGradient ? 1 : 0.4,
				} }
			/>
			<div
				ref={ gradientMarkersContainerDomRef }
				className={ clsx(
					'components-custom-gradient-picker__markers-container',
					'sgs-gradient-picker__markers-container'
				) }
			>
				{ ! disableInserter &&
					( isMovingInserter || isInsertingControlPoint ) && (
						<ControlPoints.InsertPoint
							__experimentalIsRenderedInSidebar={
								__experimentalIsRenderedInSidebar
							}
							disableAlpha={ disableAlpha }
							insertPosition={ gradientBarState.insertPosition }
							value={ controlPoints }
							onChange={ onChange }
							onOpenInserter={ () => {
								gradientBarStateDispatch( { type: 'OPEN_INSERTER' } );
							} }
							onCloseInserter={ () => {
								gradientBarStateDispatch( { type: 'CLOSE_INSERTER' } );
							} }
						/>
					) }
				<ControlPoints
					__experimentalIsRenderedInSidebar={
						__experimentalIsRenderedInSidebar
					}
					disableAlpha={ disableAlpha }
					disableRemove={ disableInserter }
					gradientPickerDomRef={ gradientMarkersContainerDomRef }
					ignoreMarkerPosition={
						isInsertingControlPoint
							? gradientBarState.insertPosition
							: undefined
					}
					value={ controlPoints }
					onChange={ onChange }
					onStartControlPointChange={ () => {
						gradientBarStateDispatch( { type: 'START_CONTROL_CHANGE' } );
					} }
					onStopControlPointChange={ () => {
						gradientBarStateDispatch( { type: 'STOP_CONTROL_CHANGE' } );
					} }
				/>
			</div>
		</div>
	);
}
