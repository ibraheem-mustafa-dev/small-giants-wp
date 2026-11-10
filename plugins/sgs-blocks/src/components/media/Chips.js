/**
 * Chips: the shared contract for ratio, fit and mask grids (Spec 49 §9.2).
 *
 * One `radiogroup`. Arrow keys, Home and End move focus (roving tabindex: only one chip is a tab stop); Space, Enter
 * or a click chooses. A chosen chip is marked by a tick and a heavier border as well as colour, so it never relies on
 * colour alone. Each chip is at least 44px square, shows a visible focus ring and brightens on hover.
 *
 * `options` are `{ value, label, icon?, caption?, disabled? }`; `icon` is any node drawn above the label.
 *
 * @package
 */
import { useRef } from '@wordpress/element';
import './Chips.css';

const MOVES = {
	ArrowRight: 1,
	ArrowDown: 1,
	ArrowLeft: -1,
	ArrowUp: -1,
};

export default function Chips( { label, options, value, onChange, className = '', columns } ) {
	const refs = useRef( [] );
	const enabled = options
		.map( ( option, index ) => ( option.disabled ? -1 : index ) )
		.filter( ( index ) => index >= 0 );
	const selectedIndex = options.findIndex( ( option ) => option.value === value );
	const tabStop = enabled.includes( selectedIndex ) ? selectedIndex : enabled[ 0 ];

	const onKeyDown = ( event, index ) => {
		let target = null;
		if ( event.key in MOVES ) {
			const at = enabled.indexOf( index );
			target = enabled[ ( at + MOVES[ event.key ] + enabled.length ) % enabled.length ];
		} else if ( 'Home' === event.key ) {
			target = enabled[ 0 ];
		} else if ( 'End' === event.key ) {
			target = enabled[ enabled.length - 1 ];
		}
		if ( null !== target ) {
			event.preventDefault();
			refs.current[ target ]?.focus();
		}
	};

	return (
		<div
			role="radiogroup"
			aria-label={ label }
			className={ `sgs-chips ${ className }`.trim() }
			data-columns={ columns || undefined }
		>
			{ options.map( ( option, index ) => {
				const checked = option.value === value;
				return (
					<button
						key={ option.value }
						type="button"
						role="radio"
						aria-checked={ checked }
						disabled={ option.disabled }
						tabIndex={ index === tabStop ? 0 : -1 }
						ref={ ( node ) => {
							refs.current[ index ] = node;
						} }
						className={ `sgs-chips__chip${ checked ? ' is-selected' : '' }` }
						onClick={ () => onChange( option.value ) }
						onKeyDown={ ( event ) => onKeyDown( event, index ) }
					>
						{ option.icon && (
							<span className="sgs-chips__icon" aria-hidden="true">
								{ option.icon }
							</span>
						) }
						<span className="sgs-chips__label">{ option.label }</span>
						{ option.caption && (
							<span className="sgs-chips__caption">{ option.caption }</span>
						) }
						{ checked && (
							<span className="sgs-chips__tick" aria-hidden="true">
								&#10003;
							</span>
						) }
					</button>
				);
			} ) }
		</div>
	);
}
