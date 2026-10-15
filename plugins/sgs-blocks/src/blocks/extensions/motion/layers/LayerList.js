/**
 * The ordered layer list of a motion panel's Fine-tune (Spec 38A §5): each layer numbered in paint order with its own
 * controls, Move up, Move down and Remove, and an "Add effect" menu that offers only the effects valid for this block
 * and target. An effect the schema would refuse stays in the menu, disabled but reachable, with the refusal's text
 * beside it. After a removal, focus moves to the next layer's Remove button, or to Add effect when none follows.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useRef, useState } from '@wordpress/element';
import {
	Button,
	Dropdown,
	MenuGroup,
	MenuItem,
	Notice,
} from '@wordpress/components';
import { chevronDown, chevronUp, plus, trash } from '@wordpress/icons';
import { effectLabel } from './refusals';

const ADD_FOCUS = 'add';

/**
 * @param {Object}   props
 * @param {string}   props.label            The list's heading ("Hover effects", "More effects").
 * @param {Object[]} props.layers           The layers, in paint order (each with `id` and `effect`).
 * @param {string[]} props.effects          The effect slugs this list may add for this target (`layers.effectsFor`).
 * @param {Function} props.refusalFor       `( effect ) => string|null`: why adding the effect would be refused.
 * @param {Function} props.onAdd            `( effect ) => result` from the layer operations.
 * @param {Function} props.onMove           `( id, delta )`.
 * @param {Function} props.onRemove         `( id )`.
 * @param {Function} [props.renderControls] `( layer, index ) => Element`: the layer's own controls.
 * @param {boolean}  [props.full]           Whether the list holds its maximum number of layers.
 * @return {Element} The list.
 */
export default function LayerList( {
	label,
	layers,
	effects,
	refusalFor,
	onAdd,
	onMove,
	onRemove,
	renderControls,
	full = false,
} ) {
	const [ message, setMessage ] = useState( null );
	const [ focusNext, setFocusNext ] = useState( null );
	const removeButtons = useRef( new Map() );
	const addButton = useRef( null );

	useEffect( () => {
		if ( ! focusNext ) {
			return;
		}
		const target =
			focusNext === ADD_FOCUS
				? addButton.current
				: removeButtons.current.get( focusNext );
		target?.focus();
		setFocusNext( null );
	}, [ focusNext, layers ] );

	const add = ( effect, close ) => {
		const result = onAdd( effect );
		if ( result?.refusal ) {
			setMessage( result.refusal );
		} else if ( result?.full ) {
			setMessage(
				__(
					'This list is full. Remove an effect to add another.',
					'sgs-blocks'
				)
			);
		} else {
			setMessage( null );
		}
		close();
	};

	const remove = ( index ) => {
		const next = layers[ index + 1 ];
		onRemove( layers[ index ].id );
		setFocusNext( next ? next.id : ADD_FOCUS );
	};

	return (
		<div className="sgs-motion-layers">
			<h3 className="sgs-motion-layers__heading">{ label }</h3>
			{ layers.length > 0 && (
				<ol className="sgs-motion-layers__list">
					{ layers.map( ( layer, index ) => {
						const name = effectLabel( layer.effect );
						return (
							<li
								key={ layer.id }
								className="sgs-motion-layers__item"
							>
								<div className="sgs-motion-layers__item-head">
									<span className="sgs-motion-layers__item-name">
										<span
											className="sgs-motion-layers__item-number"
											aria-hidden="true"
										>
											{ index + 1 }
										</span>{ ' ' }
										{ name }
									</span>
									<Button
										icon={ chevronUp }
										label={ sprintf(
											/* translators: %s: effect name. */
											__( 'Move %s up', 'sgs-blocks' ),
											name
										) }
										onClick={ () => onMove( layer.id, -1 ) }
										disabled={ index === 0 }
										accessibleWhenDisabled
										__next40pxDefaultSize
									/>
									<Button
										icon={ chevronDown }
										label={ sprintf(
											/* translators: %s: effect name. */
											__( 'Move %s down', 'sgs-blocks' ),
											name
										) }
										onClick={ () => onMove( layer.id, 1 ) }
										disabled={ index === layers.length - 1 }
										accessibleWhenDisabled
										__next40pxDefaultSize
									/>
									<Button
										ref={ ( node ) => {
											if ( node ) {
												removeButtons.current.set(
													layer.id,
													node
												);
											} else {
												removeButtons.current.delete(
													layer.id
												);
											}
										} }
										icon={ trash }
										label={ sprintf(
											/* translators: %s: effect name. */
											__( 'Remove %s', 'sgs-blocks' ),
											name
										) }
										onClick={ () => remove( index ) }
										isDestructive
										__next40pxDefaultSize
									/>
								</div>
								{ renderControls &&
									renderControls( layer, index ) }
							</li>
						);
					} ) }
				</ol>
			) }
			<Dropdown
				className="sgs-motion-layers__add"
				contentClassName="sgs-motion-layers__menu"
				popoverProps={ { placement: 'bottom-start' } }
				renderToggle={ ( { isOpen, onToggle } ) => (
					<Button
						ref={ addButton }
						variant="secondary"
						icon={ plus }
						onClick={ onToggle }
						aria-expanded={ isOpen }
						disabled={ full || ! effects.length }
						accessibleWhenDisabled
						__next40pxDefaultSize
					>
						{ __( 'Add effect', 'sgs-blocks' ) }
					</Button>
				) }
				renderContent={ ( { onClose } ) => (
					<MenuGroup label={ __( 'Effects', 'sgs-blocks' ) }>
						{ effects.map( ( effect ) => {
							const refusal = refusalFor( effect );
							return (
								<MenuItem
									key={ effect }
									onClick={ () => add( effect, onClose ) }
									disabled={ Boolean( refusal ) }
									accessibleWhenDisabled
									info={ refusal || undefined }
								>
									{ effectLabel( effect ) }
								</MenuItem>
							);
						} ) }
					</MenuGroup>
				) }
			/>
			{ message && (
				<Notice status="warning" onRemove={ () => setMessage( null ) }>
					{ message }
				</Notice>
			) }
		</div>
	);
}
