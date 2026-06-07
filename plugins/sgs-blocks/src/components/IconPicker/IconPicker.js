/**
 * Shared visual icon picker for SGS blocks.
 *
 * A "Browse icons…" button in the inspector opens a full-width modal with:
 *   - Library tabs: Lucide (1,917) · Emoji (1,914) · WordPress · Dashicons
 *   - A category sidebar that appears when a dataset has groups
 *   - A search box that filters by name, aliases and keywords
 *   - A windowed grid: renders 120 cells at a time, loading more as the user
 *     scrolls — avoids mounting 1,900 DOM nodes at once without a virtualisation
 *     library dependency.
 *   - Keyboard-navigable grid, screen-reader accessible (radiogroup/radio +
 *     roving tabindex, WCAG 2.2 AA).
 *
 * Reused by sgs/icon, sgs/icon-list, sgs/notice-banner (and any block that
 * picks an icon). The block stores only { source, name }; render.php resolves
 * the SVG server-side from its existing PHP maps.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { useState, useEffect, useRef, useMemo, useCallback } from '@wordpress/element';
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

/**
 * Number of cells in the initial render window and each incremental load.
 * 120 = 8 columns × 15 rows — fills the modal without mounting 1,900 nodes.
 */
const PAGE_SIZE = 120;

/**
 * Derive Lucide categories from the tags map.
 *
 * Each icon can have multiple tags; we use the first tag word of each as a
 * loose category label and bucket icons that share it. The "All" bucket always
 * exists and contains every icon.
 *
 * @param {string[]} names Icon name list.
 * @param {Object}   tags  { name: [tag, …] }.
 * @return {Array<{key:string, label:string, names:string[]}>} Sorted categories.
 */
function buildLucideCategories( names, tags ) {
	const buckets = {};
	for ( const name of names ) {
		const ts = tags[ name ];
		const cat = ts && ts.length ? ts[ 0 ] : 'other';
		if ( ! buckets[ cat ] ) {
			buckets[ cat ] = [];
		}
		buckets[ cat ].push( name );
	}
	const cats = Object.keys( buckets )
		.sort()
		.map( ( k ) => ( { key: k, label: k, names: buckets[ k ] } ) );
	return [ { key: '__all__', label: __( 'All', 'sgs-blocks' ), names }, ...cats ];
}

/**
 * Derive emoji categories from the group field.
 *
 * @param {Array} emoji Emoji list [{ c, n, g, k }].
 * @return {Array<{key:string, label:string, items:Array}>} Sorted categories.
 */
function buildEmojiCategories( emoji ) {
	const buckets = {};
	for ( const e of emoji ) {
		const g = e.g || 'Other';
		if ( ! buckets[ g ] ) {
			buckets[ g ] = [];
		}
		buckets[ g ].push( e );
	}
	const cats = Object.keys( buckets )
		.sort()
		.map( ( k ) => ( { key: k, label: k, items: buckets[ k ] } ) );
	return [ { key: '__all__', label: __( 'All', 'sgs-blocks' ), items: emoji }, ...cats ];
}

/**
 * Windowed list hook — returns the visible slice of `allItems`, expanding by
 * PAGE_SIZE whenever the sentinel element (returned as `sentinelRef`) enters
 * the viewport.
 *
 * @param {Array} allItems Full filtered item list.
 * @return {{ visible: Array, sentinelRef: Function, hasMore: boolean }}
 */
function useWindowed( allItems ) {
	const [ limit, setLimit ] = useState( PAGE_SIZE );
	const observer = useRef( null );

	// Reset limit whenever the underlying list changes (new search / category).
	useEffect( () => {
		setLimit( PAGE_SIZE );
	}, [ allItems ] );

	const sentinelRef = useCallback(
		( node ) => {
			if ( observer.current ) {
				observer.current.disconnect();
			}
			if ( ! node ) {
				return;
			}
			observer.current = new IntersectionObserver(
				( entries ) => {
					if ( entries[ 0 ].isIntersecting ) {
						setLimit( ( prev ) => prev + PAGE_SIZE );
					}
				},
				{ threshold: 0.1 }
			);
			observer.current.observe( node );
		},
		// allItems in deps ensures observer restarts when the list changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ allItems ]
	);

	return {
		visible: allItems.slice( 0, limit ),
		sentinelRef,
		hasMore: limit < allItems.length,
	};
}

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
	// Coerce null → empty object so destructuring value.source/value.name below
	// never throws when a block passes value={ icon ? { source, name } : null }.
	value = value || {};
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
	const [ activeCategory, setActiveCategory ] = useState( '__all__' );

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

	// Reset category to "All" when switching source or starting a search.
	useEffect( () => {
		setActiveCategory( '__all__' );
	}, [ activeSource ] );
	useEffect( () => {
		if ( query ) {
			setActiveCategory( '__all__' );
		}
	}, [ query ] );

	// ── Category lists (memoised from loaded data) ─────────────────────────────
	const lucideCategories = useMemo(
		() => ( lucide ? buildLucideCategories( lucide.names, lucide.tags ) : [] ),
		[ lucide ]
	);
	const emojiCategories = useMemo(
		() => ( emoji ? buildEmojiCategories( emoji ) : [] ),
		[ emoji ]
	);

	// ── Filtered item list for the active source + category + search ────────────
	const allItems = useMemo( () => {
		const q = query.trim().toLowerCase();

		if ( 'lucide' === activeSource && lucide ) {
			const { map, tags } = lucide;
			// Start from the category's name subset (or all names if no category match).
			const cat = lucideCategories.find( ( c ) => c.key === activeCategory );
			const pool = cat ? cat.names : lucide.names;
			const filtered = q
				? pool.filter(
						( n ) =>
							n.includes( q ) ||
							( tags[ n ] && tags[ n ].some( ( t ) => t.includes( q ) ) )
				  )
				: pool;
			return filtered.map( ( n ) => ( {
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
		}

		if ( 'emoji' === activeSource && emoji ) {
			const cat = emojiCategories.find( ( c ) => c.key === activeCategory );
			const pool = cat ? cat.items : emoji;
			const filtered = q ? pool.filter( ( e ) => e.k.includes( q ) ) : pool;
			return filtered.map( ( e ) => ( {
				key: e.c,
				label: e.n,
				render: () => <span className="sgs-icon-grid__emoji">{ e.c }</span>,
			} ) );
		}

		if ( 'wp-icon' === activeSource && wpIcons ) {
			const slugs = Object.keys( wpIcons );
			return ( q ? slugs.filter( ( s ) => s.includes( q ) ) : slugs ).map(
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
		}

		if ( 'dashicon' === activeSource ) {
			return ( q
				? DASHICONS.filter( ( s ) => s.includes( q ) )
				: DASHICONS
			).map( ( s ) => ( {
				key: s,
				label: s,
				render: () => <span className={ `dashicons dashicons-${ s }` } />,
			} ) );
		}

		return [];
	}, [ activeSource, activeCategory, query, lucide, emoji, wpIcons, lucideCategories, emojiCategories ] );

	const { visible, sentinelRef, hasMore } = useWindowed( allItems );

	// Which category list is active (only shown when there's more than "All").
	const categories =
		'lucide' === activeSource
			? lucideCategories
			: 'emoji' === activeSource
			? emojiCategories
			: [];
	const showCategoryPanel = categories.length > 1 && ! query;

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
		setActiveCategory( '__all__' );
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
					size="large"
				>
					{ /* ── Library tabs ─────────────────────────────────────────── */ }
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

					{ /* ── Search ───────────────────────────────────────────────── */ }
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

					{ /* ── Loading / error ─────────────────────────────────────── */ }
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
						<div className={ `sgs-icon-picker__body${ showCategoryPanel ? ' has-categories' : '' }` }>
							{ /* ── Category sidebar ──────────────────────────────── */ }
							{ showCategoryPanel && (
								<nav
									className="sgs-icon-picker__cats"
									aria-label={ __( 'Icon categories', 'sgs-blocks' ) }
								>
									{ categories.map( ( cat ) => (
										<button
											key={ cat.key }
											type="button"
											className={ `sgs-icon-picker__cat-btn${
												activeCategory === cat.key ? ' is-active' : ''
											}` }
											aria-pressed={ activeCategory === cat.key }
											onClick={ () => setActiveCategory( cat.key ) }
										>
											{ cat.label }
											<span className="sgs-icon-picker__cat-count">
												{ 'lucide' === activeSource
													? cat.names.length
													: cat.items.length }
											</span>
										</button>
									) ) }
								</nav>
							) }

							{ /* ── Icon grid + windowed sentinel ─────────────────── */ }
							<div className="sgs-icon-picker__grid-wrap">
								{ 0 === allItems.length && (
									<p className="sgs-icon-picker__note">
										{ __( 'No icons match your search.', 'sgs-blocks' ) }
									</p>
								) }

								{ allItems.length > 0 && (
									<>
										<IconGrid
											items={ visible }
											value={ selectedKey }
											onSelect={ handleSelect }
											columns={ 8 }
											label={ activeLabel }
										/>

										{ /* Sentinel — triggers loading the next window when scrolled into view. */ }
										{ hasMore && (
											<div
												ref={ sentinelRef }
												className="sgs-icon-picker__sentinel"
												aria-hidden="true"
											>
												<Spinner />
											</div>
										) }

										{ ! hasMore && allItems.length > PAGE_SIZE && (
											<p className="sgs-icon-picker__note">
												{ sprintf(
													/* translators: %d: total icon count */
													__( 'All %d icons shown.', 'sgs-blocks' ),
													allItems.length
												) }
											</p>
										) }
									</>
								) }
							</div>
						</div>
					) }
				</Modal>
			) }
		</BaseControl>
	);
}
