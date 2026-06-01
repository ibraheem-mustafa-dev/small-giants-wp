/**
 * Accessible icon grid — WAI-ARIA radio-group with roving tabindex.
 *
 * Exclusive single-select (radiogroup/radio + aria-checked). One tab stop;
 * arrow keys move focus (Left/Right ±1, Up/Down ±columns), Home/End jump to
 * ends. Each cell is a 44×44 button with an aria-label. WCAG 2.2 AA.
 *
 * All rendered SVG content originates from first-party build-time manifests
 * (see scripts/generate-icons.js) — never user input.
 *
 * @package SGS\Blocks
 */

import { useRef } from '@wordpress/element';

/**
 * @param {Object}   props
 * @param {Array}    props.items    [{ key, label, render() }].
 * @param {string}   props.value    Currently-selected key (or null).
 * @param {Function} props.onSelect (key) => void.
 * @param {number}   [props.columns] Grid column count for arrow nav. Default 8.
 * @param {string}   props.label    Accessible group label.
 */
export default function IconGrid( {
	items,
	value,
	onSelect,
	columns = 8,
	label,
} ) {
	const refs = useRef( [] );

	const focusIndex = ( i ) => {
		const n = items.length;
		if ( ! n ) {
			return;
		}
		const idx = ( ( i % n ) + n ) % n;
		const el = refs.current[ idx ];
		if ( el ) {
			el.focus();
		}
	};

	const onKeyDown = ( event, i ) => {
		switch ( event.key ) {
			case 'ArrowRight':
				event.preventDefault();
				focusIndex( i + 1 );
				break;
			case 'ArrowLeft':
				event.preventDefault();
				focusIndex( i - 1 );
				break;
			case 'ArrowDown':
				event.preventDefault();
				focusIndex( i + columns );
				break;
			case 'ArrowUp':
				event.preventDefault();
				focusIndex( i - columns );
				break;
			case 'Home':
				event.preventDefault();
				focusIndex( 0 );
				break;
			case 'End':
				event.preventDefault();
				focusIndex( items.length - 1 );
				break;
			default:
				break;
		}
	};

	const selectedIdx = items.findIndex( ( it ) => it.key === value );

	return (
		<div
			className="sgs-icon-grid"
			role="radiogroup"
			aria-label={ label }
			style={ { gridTemplateColumns: `repeat(${ columns }, 1fr)` } }
		>
			{ items.map( ( it, i ) => {
				const checked = it.key === value;
				// Roving tabindex: the selected cell is the tab stop; if nothing
				// is selected, the first cell takes it.
				const tabIndex =
					checked || ( selectedIdx === -1 && 0 === i ) ? 0 : -1;
				return (
					<button
						key={ it.key }
						type="button"
						ref={ ( el ) => ( refs.current[ i ] = el ) }
						className={ `sgs-icon-grid__cell${
							checked ? ' is-selected' : ''
						}` }
						role="radio"
						aria-checked={ checked }
						aria-label={ it.label }
						title={ it.label }
						tabIndex={ tabIndex }
						onClick={ () => onSelect( it.key ) }
						onKeyDown={ ( e ) => onKeyDown( e, i ) }
					>
						{ it.render() }
					</button>
				);
			} ) }
		</div>
	);
}
