/**
 * IconPicker — searchable Lucide icon grid for the block editor.
 *
 * Lazy-loads the 1917-icon map on first render to keep initial bundle small.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useState, useEffect, useMemo, useCallback } from '@wordpress/element';
import { TextControl, Spinner } from '@wordpress/components';

/** Max icons to show in the grid at once (for perf). */
const MAX_VISIBLE = 120;

/**
 * Render a single Lucide icon from its SVG inner content.
 *
 * @param {Object} props
 * @param {string} props.paths - SVG inner content (paths, circles, etc.).
 * @param {number} props.size  - Icon size in px.
 */
function LucideIcon( { paths, size = 20 } ) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={ size }
			height={ size }
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			dangerouslySetInnerHTML={ { __html: paths } }
		/>
	);
}

/**
 * Searchable icon picker component.
 *
 * @param {Object}   props
 * @param {string}   props.value    - Currently selected icon name.
 * @param {Function} props.onChange  - Callback with new icon name.
 * @param {string}   props.label    - Optional label above the picker.
 */
export default function IconPicker( { value, onChange, label } ) {
	const [ iconMap, setIconMap ] = useState( null );
	const [ iconNames, setIconNames ] = useState( [] );
	const [ search, setSearch ] = useState( '' );
	const [ isLoading, setIsLoading ] = useState( true );

	// Lazy-load the icon map.
	useEffect( () => {
		let cancelled = false;
		import( /* webpackChunkName: "lucide-editor-map" */ '../utils/lucide-editor-map' ).then(
			( mod ) => {
				if ( ! cancelled ) {
					setIconMap( mod.default );
					setIconNames( mod.ICON_NAMES );
					setIsLoading( false );
				}
			}
		);
		return () => {
			cancelled = true;
		};
	}, [] );

	// Filter icons by search term.
	const filtered = useMemo( () => {
		if ( ! iconNames.length ) {
			return [];
		}
		const q = search.toLowerCase().trim();
		if ( ! q ) {
			return iconNames.slice( 0, MAX_VISIBLE );
		}
		return iconNames.filter( ( name ) => name.includes( q ) ).slice( 0, MAX_VISIBLE );
	}, [ iconNames, search ] );

	const handleSelect = useCallback(
		( name ) => {
			onChange( name );
		},
		[ onChange ]
	);

	if ( isLoading ) {
		return (
			<div className="sgs-icon-picker">
				{ label && <p className="sgs-icon-picker__label">{ label }</p> }
				<Spinner />
			</div>
		);
	}

	return (
		<div className="sgs-icon-picker">
			{ label && (
				<p className="sgs-icon-picker__label" style={ { marginBottom: '8px', fontWeight: 500 } }>
					{ label }
				</p>
			) }

			{ /* Current selection */ }
			{ value && iconMap[ value ] && (
				<div className="sgs-icon-picker__current" style={ { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px', background: '#f0f0f0', borderRadius: '4px' } }>
					<LucideIcon paths={ iconMap[ value ] } size={ 24 } />
					<span style={ { fontSize: '13px', color: '#1e1e1e' } }>{ value }</span>
				</div>
			) }

			<TextControl
				placeholder={ __( 'Search icons…', 'sgs-blocks' ) }
				value={ search }
				onChange={ setSearch }
				__nextHasNoMarginBottom
			/>

			<div
				className="sgs-icon-picker__grid"
				style={ {
					display: 'grid',
					gridTemplateColumns: 'repeat(6, 1fr)',
					gap: '2px',
					maxHeight: '240px',
					overflowY: 'auto',
					marginTop: '8px',
					border: '1px solid #ddd',
					borderRadius: '4px',
					padding: '4px',
				} }
			>
				{ filtered.map( ( name ) => (
					<button
						key={ name }
						type="button"
						title={ name }
						onClick={ () => handleSelect( name ) }
						style={ {
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '36px',
							height: '36px',
							border: name === value ? '2px solid #0F7E80' : '1px solid transparent',
							borderRadius: '4px',
							background: name === value ? '#e8f5f5' : 'transparent',
							cursor: 'pointer',
							padding: 0,
						} }
					>
						<LucideIcon paths={ iconMap[ name ] } size={ 18 } />
					</button>
				) ) }
			</div>

			{ filtered.length === MAX_VISIBLE && (
				<p style={ { fontSize: '12px', color: '#757575', marginTop: '4px' } }>
					{ __( 'Showing first 120 results. Type to narrow down.', 'sgs-blocks' ) }
				</p>
			) }

			{ filtered.length === 0 && (
				<p style={ { fontSize: '12px', color: '#757575', marginTop: '8px' } }>
					{ __( 'No icons found.', 'sgs-blocks' ) }
				</p>
			) }
		</div>
	);
}
