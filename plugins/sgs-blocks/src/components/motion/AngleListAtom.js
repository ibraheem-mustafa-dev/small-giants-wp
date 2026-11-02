/**
 * AngleListAtom: one angle, or a list of angles a repeated item cycles through (the `angleList` field type). On a
 * target that is a repeated item the switch "Same for all items" chooses between one angle (the plain angle control) and
 * a list: an ordered group of angle fields, one per item position, that start again after the last (item 1 takes the
 * first angle, item 2 the second, and so on). Anywhere else only the one angle is offered, because a root element has no
 * siblings to cycle through.
 *
 * Every written value is checked by the field type first; an angle outside the schema range is clamped to it and the
 * field says so. Left and right arrows move between the fields at the ends of their text.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { speak } from '@wordpress/a11y';
import { useRef, useState } from '@wordpress/element';
import {
	Button,
	ToggleControl,
	__experimentalNumberControl as NumberControl,
} from '@wordpress/components';
import AngleAtom from './AngleAtom';
import AtomFrame from './AtomFrame';
import { boundsOf, sameValue } from './atom-utils';
import { validateField } from './field-types';

const MIN_ITEMS = 2;
const MAX_ITEMS = 12;

/** A starting list for a scalar: its angle and the opposite, or a small tilt either way. */
const starterList = ( scalar ) =>
	typeof scalar === 'number' && scalar !== 0 ? [ scalar, -scalar ] : [ -2, 2 ];

/**
 * @param {Object}      props
 * @param {string}      props.label                 Field label.
 * @param {unknown}     props.value                 A number, a `deg` or `turn` string, a list of them, or undefined.
 * @param {Function}    props.onChange              Receives a schema-valid value, or undefined to clear.
 * @param {Object|null} [props.fieldNode]           The field's schema node.
 * @param {unknown}     [props.presetValue]         The preset's stamped value; a differing value shows the Customised tag.
 * @param {boolean}     [props.repeated]            Whether the target is a repeated item (the list is offered only then).
 * @param {string}      [props.help]                Hint text.
 * @param {boolean}     [props.hideLabelFromVision] Visually hide the label.
 * @return {Element} The control.
 */
export default function AngleListAtom( {
	label,
	value,
	onChange,
	fieldNode = null,
	presetValue,
	repeated = false,
	help,
	hideLabelFromVision,
} ) {
	const isList = Array.isArray( value );
	const range = boundsOf( 'angle', fieldNode );
	const [ notice, setNotice ] = useState( null );
	const fields = useRef( [] );

	if ( ! repeated || ! isList ) {
		return (
			<>
				<AngleAtom
					label={ label }
					value={ isList ? value[ 0 ] : value }
					onChange={ onChange }
					fieldNode={ fieldNode }
					presetValue={ isList ? undefined : presetValue }
					help={ help }
					hideLabelFromVision={ hideLabelFromVision }
				/>
				{ repeated && (
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Same for all items', 'sgs-blocks' ) }
						checked
						onChange={ () => {
							onChange( starterList( value ) );
							speak(
								__( 'A different angle for each item', 'sgs-blocks' )
							);
						} }
					/>
				) }
			</>
		);
	}

	const commit = ( next ) => {
		const verdict = validateField( 'angleList', next, fieldNode );
		if ( verdict.ok ) {
			onChange( verdict.value );
		}
	};
	const setAt = ( index, raw ) => {
		const number = Number( raw );
		if ( raw === '' || Number.isNaN( number ) ) {
			return;
		}
		const clamped = Math.max(
			range.min ?? -360,
			Math.min( range.max ?? 360, number )
		);
		setNotice(
			clamped === number
				? null
				: sprintf(
						/* translators: 1: item position, 2: the nearest allowed angle in degrees. */
						__(
							'Angle for item %1$d is out of range; it is kept at %2$d degrees.',
							'sgs-blocks'
						),
						index + 1,
						clamped
				  )
		);
		commit( value.map( ( angle, i ) => ( i === index ? clamped : angle ) ) );
	};
	const move = ( event, index ) => {
		const input = event.target;
		const atEnd =
			input.selectionStart === input.value.length &&
			input.selectionEnd === input.value.length;
		const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
		let target = null;
		if ( event.key === 'ArrowRight' && atEnd ) {
			target = index + 1;
		} else if ( event.key === 'ArrowLeft' && atStart ) {
			target = index - 1;
		}
		if ( target !== null && fields.current[ target ] ) {
			event.preventDefault();
			fields.current[ target ].focus();
		}
	};

	return (
		<AtomFrame
			kind="angle-list"
			label={ label }
			help={ help }
			error={ notice }
			customised={
				presetValue !== undefined && ! sameValue( value, presetValue )
			}
			onReset={ () => onChange( presetValue ) }
		>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Same for all items', 'sgs-blocks' ) }
				help={ __(
					'Item 1 gets the first angle, item 2 the second, and so on, starting again after the last. A carousel copy of an item continues the same cycle. The tilt is a pose, so it stays with reduced motion.',
					'sgs-blocks'
				) }
				checked={ false }
				onChange={ () => {
					onChange( typeof value[ 0 ] === 'number' ? value[ 0 ] : 0 );
					speak( __( 'The same angle for all items', 'sgs-blocks' ) );
				} }
			/>
			<fieldset
				className="sgs-motion-atom__chips"
				style={ { border: 0, margin: 0, padding: 0 } }
			>
				<legend>{ __( 'Tilt at rest, per item (Z)', 'sgs-blocks' ) }</legend>
				<ol
					style={ {
						listStyle: 'none',
						margin: 0,
						padding: 0,
						display: 'flex',
						flexWrap: 'wrap',
						gap: 8,
					} }
				>
					{ value.map( ( angle, index ) => (
						<li
							key={ index }
							style={ {
								display: 'flex',
								alignItems: 'flex-end',
								gap: 2,
							} }
						>
							<NumberControl
								ref={ ( node ) =>
									( fields.current[ index ] = node )
								}
								label={ sprintf(
									/* translators: %d: the item's position. */
									__( 'Angle for item %d', 'sgs-blocks' ),
									index + 1
								) }
								value={
									typeof angle === 'number'
										? angle
										: parseFloat( angle )
								}
								min={ range.min ?? -360 }
								max={ range.max ?? 360 }
								step={ 0.5 }
								spinControls="none"
								onChange={ ( next ) => setAt( index, next ) }
								onKeyDown={ ( event ) => move( event, index ) }
								style={ { width: 72 } }
								__next40pxDefaultSize
							/>
							<Button
								icon="no-alt"
								size="small"
								label={ sprintf(
									/* translators: %d: the item's position. */
									__( 'Remove angle for item %d', 'sgs-blocks' ),
									index + 1
								) }
								disabled={ value.length <= MIN_ITEMS }
								onClick={ () => {
									commit(
										value.filter( ( _, i ) => i !== index )
									);
									speak(
										sprintf(
											/* translators: %d: the item's position. */
											__(
												'Angle for item %d removed',
												'sgs-blocks'
											),
											index + 1
										)
									);
								} }
							/>
						</li>
					) ) }
				</ol>
			</fieldset>
			<Button
				variant="secondary"
				size="compact"
				disabled={ value.length >= MAX_ITEMS }
				onClick={ () => {
					commit( [ ...value, 0 ] );
					speak(
						sprintf(
							/* translators: %d: the item's position. */
							__( 'Angle for item %d added', 'sgs-blocks' ),
							value.length + 1
						)
					);
				} }
			>
				{ __( 'Add an angle', 'sgs-blocks' ) }
			</Button>
			<p
				className="sgs-motion-atom__help"
				style={ { margin: '4px 0 0', fontSize: '12px' } }
			>
				{ sprintf(
					/* translators: %d: the number of angles in the list. */
					__( 'Pattern repeats every %d items', 'sgs-blocks' ),
					value.length
				) }
			</p>
		</AtomFrame>
	);
}
