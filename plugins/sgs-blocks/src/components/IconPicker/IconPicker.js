/**
 * Shared visual icon picker for SGS blocks.
 *
 * A "Browse icons…" button in the inspector opens a modal with a search box,
 * library tabs (Lucide / Emoji / WordPress / Dashicons) and a keyboard-navigable
 * grid. The operator browses and clicks — never types an icon name from memory.
 *
 * Reused by sgs/icon, sgs/icon-list, sgs/notice-banner (and any block that
 * picks an icon). The block stores only { source, name }; render.php resolves
 * the SVG server-side from its existing PHP maps.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { useState, useEffect, useMemo } from '@wordpress/element';
import {
	BaseControl,
	Button,
	Modal,
	SearchControl,
	Spinner,
} from '@wordpress/components';
import IconGrid from './IconGrid';
import IconPreview from './IconPreview';
import { loadLucide, loadEmoji, loadWpIcons, ICON_SOURCES, DASHICONS } from './icon-data';
import './editor.css';

// Max cells rendered at once. Search narrows well below this; the cap keeps the
// unfiltered grid responsive without a virtualisation library.
const CAP = 300;

/**
 * @param {Object}   props
 * @param {Object}   props.value     { source, name } — current selection.
 * @param {Function} props.onChange  ({ source, name }) => void.
 * @param {string}   [props.label]   Inspector control label. Default "Icon".
 * @param {string[]} [props.sources] Enabled source keys. Default all four.
 */
export default function IconPicker( {
	value = {},
	onChange,
	label = __( 'Icon', 'sgs-blocks' ),
	sources,
} ) {
	const enabledSources = useMemo(
		() =>
			ICON_SOURCES.filter(
				( s ) => ! sources || sources.includes( s.key )
			),
		[ sources ]
	);

	const [ isOpen, setIsOpen ] = useState( false );
	const [ activeSource, setActiveSource ] = useState(
		value.source || enabledSources[ 0 ]?.key || 'lucide'
	);
	const [ query, setQuery ] = useState( '' );

	const [ lucide, setLucide ] = useState( null );
	const [ emoji, setEmoji ] = useState( null );
	const [ wpIcons, setWpIcons ] = useState( null );
	const [ error, setError ] = useState( '' );

	// Whether the active source's dataset is ready. Dashicons are static
	// (always ready); the other three are fetched JSON. Loading is DERIVED from
	// data presence — never a separate flag — so a cleanup race on first open
	// can never leave the modal stuck on "Loading…".
	const sourceData =
		'lucide' === activeSource
			? lucide
			: 'emoji' === activeSource
			? emoji
			: 'wp-icon' === activeSource
			? wpIcons
			: 'dashicon'; // static — always ready
	const isLoading = isOpen && ! error && ! sourceData;

	// Trigger the active source's fetch on first need. Each loader caches its
	// promise module-side, so re-runs are cheap and idempotent.
	useEffect( () => {
		if ( ! isOpen ) {
			return undefined;
		}
		let cancelled = false;
		const set = ( fn ) => ( v ) => {
			if ( ! cancelled ) {
				fn( v );
			}
		};
		const fail = set( () => setError( 'load' ) );

		if ( 'lucide' === activeSource && ! lucide ) {
			setError( '' );
			loadLucide().then( set( setLucide ), fail );
		} else if ( 'emoji' === activeSource && ! emoji ) {
			setError( '' );
			loadEmoji().then( set( setEmoji ), fail );
		} else if ( 'wp-icon' === activeSource && ! wpIcons ) {
			setError( '' );
			loadWpIcons().then( set( setWpIcons ), fail );
		}
		return () => {
			cancelled = true;
		};
	}, [ isOpen, activeSource, lucide, emoji, wpIcons ] );

	// Build the filtered, capped item list for the active source.
	const { items, total, truncated } = useMemo( () => {
		const q = query.trim().toLowerCase();
		let filtered = [];

		if ( 'lucide' === activeSource && lucide ) {
			const { names, map, tags } = lucide;
			filtered = ( q
				? names.filter(
						( n ) =>
							n.includes( q ) ||
							( tags[ n ] && tags[ n ].some( ( t ) => t.includes( q ) ) )
				  )
				: names
			).map( ( n ) => ( {
				key: n,
				label: n,
				render: () => (
					<span
						className="sgs-icon-grid__svg"
						// eslint-disable-next-line react/no-danger
						dangerouslySetInnerHTML={ { __html: map[ n ] } }
					/>
				),
			} ) );
		} else if ( 'emoji' === activeSource && emoji ) {
			filtered = ( q ? emoji.filter( ( e ) => e.k.includes( q ) ) : emoji ).map(
				( e ) => ( {
					key: e.c,
					label: e.n,
					render: () => <span className="sgs-icon-grid__emoji">{ e.c }</span>,
				} )
			);
		} else if ( 'wp-icon' === activeSource && wpIcons ) {
			const slugs = Object.keys( wpIcons );
			filtered = ( q ? slugs.filter( ( s ) => s.includes( q ) ) : slugs ).map(
				( s ) => ( {
					key: s,
					label: s,
					render: () => (
						<span
							className="sgs-icon-grid__svg"
							// eslint-disable-next-line react/no-danger
							dangerouslySetInnerHTML={ { __html: wpIcons[ s ] } }
						/>
					),
				} )
			);
		} else if ( 'dashicon' === activeSource ) {
			filtered = ( q
				? DASHICONS.filter( ( s ) => s.includes( q ) )
				: DASHICONS
			).map( ( s ) => ( {
				key: s,
				label: s,
				render: () => <span className={ `dashicons dashicons-${ s }` } />,
			} ) );
		}

		return {
			items: filtered.slice( 0, CAP ),
			total: filtered.length,
			truncated: filtered.length > CAP,
		};
	}, [ activeSource, query, lucide, emoji, wpIcons ] );

	const selectedKey = value.source === activeSource ? value.name : null;
	const activeLabel =
		enabledSources.find( ( s ) => s.key === activeSource )?.label || '';

	const handleSelect = ( key ) => {
		onChange( { source: activeSource, name: key } );
		setIsOpen( false );
		setQuery( '' );
	};

	const openPicker = () => {
		setActiveSource( value.source || enabledSources[ 0 ]?.key || 'lucide' );
		setQuery( '' );
		setIsOpen( true );
	};

	return (
		<BaseControl label={ label } __nextHasNoMarginBottom>
			<Button
				variant="secondary"
				className="sgs-icon-picker__trigger"
				onClick={ openPicker }
				aria-haspopup="dialog"
			>
				<IconPreview source={ value.source } name={ value.name } size={ 24 } />
				<span className="sgs-icon-picker__trigger-label">
					{ value.name || __( 'Choose an icon…', 'sgs-blocks' ) }
				</span>
			</Button>

			{ isOpen && (
				<Modal
					title={ __( 'Choose an icon', 'sgs-blocks' ) }
					onRequestClose={ () => setIsOpen( false ) }
					className="sgs-icon-picker-modal"
				>
					<div
						className="sgs-icon-picker__tabs"
						role="group"
						aria-label={ __( 'Icon library', 'sgs-blocks' ) }
					>
						{ enabledSources.map( ( s ) => (
							<Button
								key={ s.key }
								variant={ activeSource === s.key ? 'primary' : 'tertiary' }
								aria-pressed={ activeSource === s.key }
								onClick={ () => {
									setActiveSource( s.key );
									setQuery( '' );
								} }
							>
								{ s.label }
							</Button>
						) ) }
					</div>

					<SearchControl
						value={ query }
						onChange={ setQuery }
						placeholder={ sprintf(
							/* translators: %s: icon library name */
							__( 'Search %s…', 'sgs-blocks' ),
							activeLabel
						) }
						__nextHasNoMarginBottom
					/>

					{ isLoading && (
						<div className="sgs-icon-picker__status">
							<Spinner /> { __( 'Loading icons…', 'sgs-blocks' ) }
						</div>
					) }

					{ ! isLoading && error && (
						<div className="sgs-icon-picker__status">
							{ __( 'Could not load icons. Try again.', 'sgs-blocks' ) }
						</div>
					) }

					{ ! isLoading && ! error && (
						<>
							<IconGrid
								items={ items }
								value={ selectedKey }
								onSelect={ handleSelect }
								columns={ 8 }
								label={ activeLabel }
							/>
							{ truncated && (
								<p className="sgs-icon-picker__note">
									{ sprintf(
										/* translators: 1: shown count, 2: total count */
										__(
											'Showing first %1$d of %2$d — refine your search.',
											'sgs-blocks'
										),
										CAP,
										total
									) }
								</p>
							) }
							{ 0 === items.length && (
								<p className="sgs-icon-picker__note">
									{ __( 'No icons match your search.', 'sgs-blocks' ) }
								</p>
							) }
						</>
					) }
				</Modal>
			) }
		</BaseControl>
	);
}
