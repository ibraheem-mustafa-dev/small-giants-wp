/**
 * The Hover and Entrance panels' preset gallery (Spec 38A §11, FR-38A-28): a radio group with one radio per preset, each
 * holding its demo (`PresetThumbnail`) and its name. It writes through the same `onChange` as the panel's choice control
 * above it, so either one picks the preset.
 *
 * Keyboard: the group is one tab stop (roving tabindex: the chosen radio, else the first). The arrow keys, Home and End
 * move focus between the radios; Enter or Space chooses the focused one. Each demo loops only while its radio is hovered,
 * focused with the keyboard or chosen (`assets/css/motion-thumbnails.css`), so a panel of presets runs one or two
 * animations, not all of them.
 *
 * The panel re-renders on every layer edit and builds `onChange` and (for the Entrance panel) the option list afresh, so
 * the radios are a memoised child that compares the label, the value and the options' content; the current `onChange`
 * is read through a ref, so a skipped render never leaves a stale callback.
 *
 * @package
 */

import { memo, useCallback, useRef } from '@wordpress/element';
import { Button } from '@wordpress/components';
import PresetThumbnail from './PresetThumbnail';

const KEYS = {
	ArrowRight: 1,
	ArrowDown: 1,
	ArrowLeft: -1,
	ArrowUp: -1,
};

const sameOptions = ( a, b ) =>
	a.length === b.length &&
	a.every(
		( option, i ) =>
			option.value === b[ i ].value && option.label === b[ i ].label
	);

const Radios = memo(
	function Radios( { label, options, value, choose } ) {
		const group = useRef( null );
		const stop = options.some( ( option ) => option.value === value )
			? value
			: options[ 0 ]?.value;
		const onKeyDown = ( event ) => {
			const radios = [
				...group.current.querySelectorAll( '[role="radio"]' ),
			];
			const at = radios.indexOf( event.target );
			let next = -1;
			if ( KEYS[ event.key ] && at !== -1 ) {
				next =
					( at + KEYS[ event.key ] + radios.length ) % radios.length;
			} else if ( event.key === 'Home' ) {
				next = 0;
			} else if ( event.key === 'End' ) {
				next = radios.length - 1;
			}
			if ( next !== -1 ) {
				event.preventDefault();
				radios[ next ].focus();
			}
		};
		return (
			// The radiogroup owns the arrow-key handling for its radios.
			// eslint-disable-next-line jsx-a11y/interactive-supports-focus
			<div
				ref={ group }
				className="sgs-motion-thumbs"
				role="radiogroup"
				aria-label={ label }
				onKeyDown={ onKeyDown }
			>
				{ options.map( ( option ) => (
					<Button
						key={ option.value }
						className="sgs-motion-thumbs__item"
						role="radio"
						aria-checked={ option.value === value }
						tabIndex={ option.value === stop ? 0 : -1 }
						onClick={ () => choose( option.value ) }
					>
						<PresetThumbnail slug={ option.value } />
						<span className="sgs-motion-thumbs__label">
							{ option.label }
						</span>
					</Button>
				) ) }
			</div>
		);
	},
	( before, after ) =>
		before.label === after.label &&
		before.value === after.value &&
		sameOptions( before.options, after.options )
);

/**
 * @param {Object}   props
 * @param {string}   props.label    Accessible name of the group.
 * @param {Array}    props.options  `[ { value, label } ]`, as the panel's choice control takes them.
 * @param {string}   props.value    The chosen preset slug, or an empty string.
 * @param {Function} props.onChange Receives the chosen preset slug (not called for the preset already chosen).
 * @return {Element|null} The gallery, or null when there is no preset to show.
 */
export default function PresetThumbnailGrid( {
	label,
	options,
	value,
	onChange,
} ) {
	const latest = useRef( onChange );
	latest.current = onChange;
	const current = useRef( value );
	current.current = value;
	const choose = useCallback( ( slug ) => {
		if ( slug !== current.current ) {
			latest.current( slug );
		}
	}, [] );
	if ( ! options.length ) {
		return null;
	}
	return (
		<Radios
			label={ label }
			options={ options }
			value={ value }
			choose={ choose }
		/>
	);
}
