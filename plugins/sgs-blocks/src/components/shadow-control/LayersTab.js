/**
 * The Layers tab: an ordered list of shadow layers. Each row shows its colour, a plain-English
 * summary and move up, move down, duplicate and delete. Alt+Up and Alt+Down reorder from the
 * keyboard. Every action announces a distinct message, and focus goes to a sensible next
 * control after a delete or a move. A layer's fields open under its row.
 *
 * @package SGS\Blocks
 */
import { useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { speak } from '@wordpress/a11y';
import { Button } from '@wordpress/components';
import { chevronUp, chevronDown, copy, trash } from '@wordpress/icons';
import { makeLayer, summarise, UI_CAP } from '../../utils/shadow-model';
import LayerEditor from './LayerEditor';

/**
 * @param {Object}   props
 * @param {Object[]} props.layers     Model layers.
 * @param {Function} props.commit     Receives the next layers array (one write).
 * @param {Function} props.resolveHex Colour token resolver for the row dot.
 */
export default function LayersTab( { layers, commit, resolveHex } ) {
	const [ open, setOpen ] = useState( null );
	const rows = useRef( {} );
	const addButton = useRef( null );
	const focusSoon = ( id ) =>
		window.requestAnimationFrame( () => ( id && rows.current[ id ] ? rows.current[ id ] : addButton.current )?.focus() );

	const move = ( index, by ) => {
		const to = index + by;
		if ( to < 0 || to >= layers.length ) {
			return;
		}
		const next = [ ...layers ];
		[ next[ index ], next[ to ] ] = [ next[ to ], next[ index ] ];
		commit( next );
		speak(
			/* translators: 1: new position, 2: total layers. */
			sprintf( __( 'Layer moved to position %1$d of %2$d.', 'sgs-blocks' ), to + 1, layers.length )
		);
		focusSoon( layers[ index ].id );
	};
	const remove = ( index ) => {
		const next = layers.filter( ( _, i ) => i !== index );
		commit( next );
		speak( __( 'Layer deleted.', 'sgs-blocks' ) );
		focusSoon( ( next[ index ] || next[ index - 1 ] )?.id );
	};
	const duplicate = ( index ) => {
		if ( layers.length >= UI_CAP ) {
			return;
		}
		const next = [ ...layers ];
		const twin = makeLayer( { ...layers[ index ] } );
		next.splice( index + 1, 0, twin );
		commit( next );
		speak( __( 'Layer duplicated.', 'sgs-blocks' ) );
		focusSoon( twin.id );
	};
	const patch = ( index, fields ) => commit( layers.map( ( l, i ) => ( i === index ? { ...l, ...fields } : l ) ) );
	const add = () => {
		const fresh = makeLayer( { y: 2, blur: 8, alpha: 10 } );
		commit( [ ...layers, fresh ] );
		setOpen( fresh.id );
		speak( __( 'Layer added.', 'sgs-blocks' ) );
	};

	/* translators: %s: layer name, for example "Layer 2". */
	const named = ( text, label ) => sprintf( text, label );

	return (
		<>
			{ layers.length > 0 && (
				<ol className="sgs-shadow-control__layers">
					{ layers.map( ( layer, index ) => {
						/* translators: %d: layer number. */
						const label = sprintf( __( 'Layer %d', 'sgs-blocks' ), index + 1 );
						const expanded = open === layer.id;
						return (
							<li key={ layer.id }>
								{ /* Alt+Up and Alt+Down reorder from anywhere in the row. */ }
								{ /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */ }
								<div
									className="sgs-shadow-control__layer-row"
									onKeyDown={ ( event ) => {
										if ( event.altKey && ( 'ArrowUp' === event.key || 'ArrowDown' === event.key ) ) {
											event.preventDefault();
											move( index, 'ArrowUp' === event.key ? -1 : 1 );
										}
									} }
								>
									<button
										type="button"
										className="sgs-shadow-control__layer-summary"
										ref={ ( node ) => {
											rows.current[ layer.id ] = node;
										} }
										aria-expanded={ expanded }
										onClick={ () => setOpen( expanded ? null : layer.id ) }
									>
										<span
											className={ `sgs-shadow-control__layer-dot${ layer.raw ? ' is-raw' : '' }` }
											style={ layer.raw ? undefined : { background: resolveHex( layer.colour ) } }
											aria-hidden="true"
										/>
										<span>
											<strong>{ label }</strong>
											<br />
											<small>{ summarise( layer ) }</small>
										</span>
									</button>
									<Button
										icon={ chevronUp }
										label={ named( __( 'Move %s up', 'sgs-blocks' ), label ) }
										disabled={ 0 === index }
										onClick={ () => move( index, -1 ) }
										size="small"
									/>
									<Button
										icon={ chevronDown }
										label={ named( __( 'Move %s down', 'sgs-blocks' ), label ) }
										disabled={ index === layers.length - 1 }
										onClick={ () => move( index, 1 ) }
										size="small"
									/>
									<Button
										icon={ copy }
										label={ named( __( 'Duplicate %s', 'sgs-blocks' ), label ) }
										disabled={ layers.length >= UI_CAP }
										onClick={ () => duplicate( index ) }
										size="small"
									/>
									<Button
										icon={ trash }
										label={ named( __( 'Delete %s', 'sgs-blocks' ), label ) }
										onClick={ () => remove( index ) }
										size="small"
										isDestructive
									/>
								</div>
								{ expanded && <LayerEditor layer={ layer } onChange={ ( fields ) => patch( index, fields ) } /> }
							</li>
						);
					} ) }
				</ol>
			) }
			<Button variant="secondary" ref={ addButton } onClick={ add } disabled={ layers.length >= UI_CAP } __next40pxDefaultSize>
				{ layers.length >= UI_CAP
					? /* translators: %d: layer limit. */ sprintf( __( 'Layer limit reached (%d)', 'sgs-blocks' ), UI_CAP )
					: __( 'Add layer', 'sgs-blocks' ) }
			</Button>
		</>
	);
}
