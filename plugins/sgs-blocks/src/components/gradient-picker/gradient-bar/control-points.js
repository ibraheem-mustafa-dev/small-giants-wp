/**
 * SGS fork of WordPress core's `gradient-bar/control-points.tsx`, forked
 * at commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * ONE deliberate divergence from core (Task 3, 2026-08-16, D636): each
 * stop's popover mounts the SGS forked `ColorPalette`
 * (`../../colour-picker`) ABOVE the raw colour picker, instead of a bare
 * `ColorPicker` alone. Picking a theme swatch stores the stop as
 * `var(--wp--preset--color--<slug>)` (via `token` on the control point —
 * see `utils.js`'s `updateControlPointColor`); a brand-palette change then
 * re-colours the stop, same as every other SGS colour row (D618/D619).
 * Everything else in this file is behaviour-identical to core — the
 * drag/keyboard positioning, the insert-point flow, the remove-point flow.
 */
import clsx from 'clsx';
import { colord } from 'colord';

import { useInstanceId } from '@wordpress/compose';
import { useEffect, useRef, useState, useMemo } from '@wordpress/element';
import { useSettings } from '@wordpress/block-editor';
import { __, sprintf } from '@wordpress/i18n';
import { plus } from '@wordpress/icons';
import { Button, VisuallyHidden } from '@wordpress/components';

import { HStack } from '../../primitives';
import { ColorPicker, ColorPalette } from '../../colour-picker';
import DropdownContentWrapper from '../../colour-picker/dropdown/dropdown-content-wrapper';
import { CustomColorPickerDropdown } from '../../colour-picker/color-palette';
import { resolveStopToken } from '../utils';

import {
	addControlPoint,
	clampPercent,
	removeControlPoint,
	updateControlPointColor,
	updateControlPointColorByPosition,
	updateControlPointPosition,
	getHorizontalRelativeGradientPosition,
} from './utils';
import {
	MINIMUM_SIGNIFICANT_MOVE,
	KEYBOARD_CONTROL_POINT_VARIATION,
} from './constants';

function ControlPointButton( { isOpen, position, color, ...additionalProps } ) {
	const instanceId = useInstanceId( ControlPointButton );
	const descriptionId = `sgs-gradient-picker__control-point-button-description-${ instanceId }`;
	return (
		<>
			<Button
				aria-label={ sprintf(
					// translators: 1: gradient position e.g: 70. 2: gradient colour code.
					__(
						'Gradient control point at position %1$d%% with color code %2$s.',
						'sgs-blocks'
					),
					position,
					color
				) }
				aria-describedby={ descriptionId }
				aria-haspopup="true"
				aria-expanded={ isOpen }
				__next40pxDefaultSize
				className={ clsx(
					// Core's class carries the styling (see gradient-bar/index.js).
					'components-custom-gradient-picker__control-point-button',
					'sgs-gradient-picker__control-point-button',
					{ 'is-active': isOpen }
				) }
				{ ...additionalProps }
			/>
			<VisuallyHidden id={ descriptionId }>
				{ __(
					'Use your left or right arrow keys or drag and drop with the mouse to change the gradient position. Press the button to change the colour or remove the control point.',
					'sgs-blocks'
				) }
			</VisuallyHidden>
		</>
	);
}

function GradientColorPickerDropdown( { isRenderedInSidebar, className, ...props } ) {
	const popoverProps = useMemo(
		() => ( {
			placement: 'bottom',
			offset: 8,
			resize: false,
		} ),
		[]
	);

	const mergedClassName = clsx(
		// Core's class carries the styling (see gradient-bar/index.js).
		'components-custom-gradient-picker__control-point-dropdown',
		'sgs-gradient-picker__control-point-dropdown',
		className
	);

	return (
		<CustomColorPickerDropdown
			isRenderedInSidebar={ isRenderedInSidebar }
			popoverProps={ popoverProps }
			className={ mergedClassName }
			{ ...props }
		/>
	);
}

/**
 * Task 3 divergence: the palette-plus-custom-picker stop editor, replacing
 * core's bare `<ColorPicker>`. `value`/`token` are the stop's current
 * colour + palette link (if any); `onChange(newColor, newToken)` mirrors
 * `updateControlPointColor`'s signature.
 */
function StopColourEditor( { value, token, disableAlpha, onChange } ) {
	// Same shape DesignTokenPicker.js already uses for every other colour
	// row — a flat array from useSettings(), no grouped-origin handling
	// (nothing else in this codebase handles that case either).
	const [ palette ] = useSettings( 'color.palette' );

	return (
		<DropdownContentWrapper paddingSize="none">
			<div className="sgs-gradient-picker__stop-editor">
				{ Array.isArray( palette ) && palette.length > 0 && (
					<div className="sgs-gradient-picker__stop-editor-palette">
						<ColorPalette
							colors={ palette }
							value={ token ? undefined : value }
							onChange={ ( picked ) => {
								if ( ! picked ) {
									return;
								}
								const resolved = resolveStopToken(
									picked,
									palette
								);
								onChange( picked, resolved?.token ?? undefined );
							} }
							clearable={ false }
							disableCustomColors
						/>
					</div>
				) }
				<ColorPicker
					enableAlpha={ ! disableAlpha }
					color={ value }
					onChange={ ( colour ) => {
						// A custom pick always clears any palette link — the
						// stop is no longer tied to a theme swatch.
						onChange( colord( colour ).toRgbString(), undefined );
					} }
				/>
			</div>
		</DropdownContentWrapper>
	);
}

function ControlPoints( {
	disableRemove,
	disableAlpha,
	gradientPickerDomRef,
	ignoreMarkerPosition,
	value: controlPoints,
	onChange,
	onStartControlPointChange,
	onStopControlPointChange,
	__experimentalIsRenderedInSidebar,
} ) {
	const controlPointMoveStateRef = useRef( undefined );

	const onMouseMove = ( event ) => {
		if (
			controlPointMoveStateRef.current === undefined ||
			gradientPickerDomRef.current === null
		) {
			return;
		}

		const relativePosition = getHorizontalRelativeGradientPosition(
			event.clientX,
			gradientPickerDomRef.current
		);

		const { initialPosition, index, significantMoveHappened } =
			controlPointMoveStateRef.current;

		if (
			! significantMoveHappened &&
			Math.abs( initialPosition - relativePosition ) >=
				MINIMUM_SIGNIFICANT_MOVE
		) {
			controlPointMoveStateRef.current.significantMoveHappened = true;
		}

		onChange(
			updateControlPointPosition( controlPoints, index, relativePosition )
		);
	};

	const cleanEventListeners = () => {
		if (
			window &&
			window.removeEventListener &&
			controlPointMoveStateRef.current &&
			controlPointMoveStateRef.current.listenersActivated
		) {
			window.removeEventListener( 'mousemove', onMouseMove );
			window.removeEventListener( 'mouseup', cleanEventListeners );
			onStopControlPointChange();
			controlPointMoveStateRef.current.listenersActivated = false;
		}
	};

	const cleanEventListenersRef = useRef( undefined );
	cleanEventListenersRef.current = cleanEventListeners;

	useEffect( () => {
		return () => {
			cleanEventListenersRef.current?.();
		};
	}, [] );

	return (
		<>
			{ controlPoints.map( ( point, index ) => {
				const initialPosition = point?.position;
				return (
					ignoreMarkerPosition !== initialPosition && (
						<GradientColorPickerDropdown
							isRenderedInSidebar={ __experimentalIsRenderedInSidebar }
							key={ index }
							onClose={ onStopControlPointChange }
							renderToggle={ ( { isOpen, onToggle } ) => (
								<ControlPointButton
									key={ index }
									onClick={ () => {
										if (
											controlPointMoveStateRef.current &&
											controlPointMoveStateRef.current
												.significantMoveHappened
										) {
											return;
										}
										if ( isOpen ) {
											onStopControlPointChange();
										} else {
											onStartControlPointChange();
										}
										onToggle();
									} }
									onMouseDown={ () => {
										if ( window && window.addEventListener ) {
											controlPointMoveStateRef.current = {
												initialPosition,
												index,
												significantMoveHappened: false,
												listenersActivated: true,
											};
											onStartControlPointChange();
											window.addEventListener(
												'mousemove',
												onMouseMove
											);
											window.addEventListener(
												'mouseup',
												cleanEventListeners
											);
										}
									} }
									onKeyDown={ ( event ) => {
										if ( event.code === 'ArrowLeft' ) {
											event.stopPropagation();
											onChange(
												updateControlPointPosition(
													controlPoints,
													index,
													clampPercent(
														point.position -
															KEYBOARD_CONTROL_POINT_VARIATION
													)
												)
											);
										} else if ( event.code === 'ArrowRight' ) {
											event.stopPropagation();
											onChange(
												updateControlPointPosition(
													controlPoints,
													index,
													clampPercent(
														point.position +
															KEYBOARD_CONTROL_POINT_VARIATION
													)
												)
											);
										}
									} }
									isOpen={ isOpen }
									position={ point.position }
									color={ point.color }
								/>
							) }
							renderContent={ ( { onClose } ) => (
								<>
									<StopColourEditor
										value={ point.color }
										token={ point.token }
										disableAlpha={ disableAlpha }
										onChange={ ( colour, token ) => {
											onChange(
												updateControlPointColor(
													controlPoints,
													index,
													colour,
													token
												)
											);
										} }
									/>
									{ ! disableRemove &&
										controlPoints.length > 2 && (
											<HStack
												className={ clsx(
									'components-custom-gradient-picker__remove-control-point-wrapper',
									'sgs-gradient-picker__remove-control-point-wrapper'
								) }
												alignment="center"
											>
												<Button
													onClick={ () => {
														onChange(
															removeControlPoint(
																controlPoints,
																index
															)
														);
														onClose();
													} }
													variant="link"
												>
													{ __(
														'Remove Control Point',
														'sgs-blocks'
													) }
												</Button>
											</HStack>
										) }
								</>
							) }
							style={ {
								left: `${ point.position }%`,
								transform: 'translateX( -50% )',
							} }
						/>
					)
				);
			} ) }
		</>
	);
}

function InsertPoint( {
	value: controlPoints,
	onChange,
	onOpenInserter,
	onCloseInserter,
	insertPosition,
	disableAlpha,
	__experimentalIsRenderedInSidebar,
} ) {
	const [ alreadyInsertedPoint, setAlreadyInsertedPoint ] = useState( false );
	return (
		<GradientColorPickerDropdown
			isRenderedInSidebar={ __experimentalIsRenderedInSidebar }
			className={ clsx(
				'components-custom-gradient-picker__inserter',
				'sgs-gradient-picker__inserter'
			) }
			onClose={ () => {
				onCloseInserter();
			} }
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Button
					__next40pxDefaultSize
					aria-expanded={ isOpen }
					aria-haspopup="true"
					onClick={ () => {
						if ( isOpen ) {
							onCloseInserter();
						} else {
							setAlreadyInsertedPoint( false );
							onOpenInserter();
						}
						onToggle();
					} }
					className={ clsx(
						'components-custom-gradient-picker__insert-point-dropdown',
						'sgs-gradient-picker__insert-point-dropdown'
					) }
					icon={ plus }
				/>
			) }
			renderContent={ () => (
				<StopColourEditor
					value={ undefined }
					token={ undefined }
					disableAlpha={ disableAlpha }
					onChange={ ( colour, token ) => {
						if ( ! alreadyInsertedPoint ) {
							onChange(
								addControlPoint(
									controlPoints,
									insertPosition,
									colour,
									token
								)
							);
							setAlreadyInsertedPoint( true );
						} else {
							onChange(
								updateControlPointColorByPosition(
									controlPoints,
									insertPosition,
									colour,
									token
								)
							);
						}
					} }
				/>
			) }
			style={
				insertPosition !== null
					? {
							left: `${ insertPosition }%`,
							transform: 'translateX( -50% )',
					  }
					: undefined
			}
		/>
	);
}
ControlPoints.InsertPoint = InsertPoint;

export default ControlPoints;
