/**
 * SgsResetPanel: a titled panel of controls with one small Reset, shown only while the panel holds a value.
 *
 * It replaces a core `ToolsPanel` whose every item is shown by default (core's header menu then offers only reset).
 * Every control stays and keeps its own reset behaviour; the panel adds one Reset (`SgsPanelReset`) that clears all of
 * them. It draws a `PanelBody` at the top level of an inspector tab, or, with `nested`, a light inner section
 * (`SgsInnerSection`) when the panel sits inside another panel (one level deep only).
 *
 * The caller gives the panel what it holds in one or both of two ways. `items`: `[ { hasValue: () => boolean, onDeselect:
 * () => void } ]`, the same two functions a `ToolsPanelItem` took; the panel knows its value even while closed. Or a
 * `SgsResetItem` around each control (for a panel whose controls come from helper components): each registers its two
 * functions while it is mounted, so the panel knows its value once it is open. The panel holds a value when any item
 * does; Reset calls `resetAll` when the caller passes one and then every item's `onDeselect`, so whatever made the panel
 * show a value is cleared.
 *
 * Props: `title`, `items`, optional `resetAll`, `initialOpen` (default false), `nested` (default false; a light inner
 * section inside another panel), `bare` (default false; no panel at all, only Reset above the controls, for a panel that
 * repeats its parent's title), `className`, `children`.
 *
 * Usage:
 *   <SgsResetPanel
 *       title={ __( 'Answer slide', 'sgs-blocks' ) }
 *       items={ [ { hasValue: () => 0 !== duration, onDeselect: () => setAttributes( { panelDuration: 0 } ) } ] }
 *   >
 *       ...controls
 *   </SgsResetPanel>
 *
 * @package SGS\Blocks
 */
import { PanelBody } from '@wordpress/components';
import {
	createContext,
	useContext,
	useLayoutEffect,
	useReducer,
	useRef,
} from '@wordpress/element';

import SgsInnerSection from './SgsInnerSection';
import SgsPanelReset from './SgsPanelReset';

/**
 * Whether any item holds a value, and what Reset does.
 *
 * @param {Array<{hasValue: Function, onDeselect: Function}>} items    The panel's items.
 * @param {Function}                                           [resetAll] A caller's own reset, run before the items'.
 * @return {{hasValue: boolean, onReset: Function}} Panel state.
 */
export function panelResetState( items = [], resetAll ) {
	const list = ( items || [] ).filter( Boolean );
	return {
		hasValue: list.some( ( item ) => !! item.hasValue() ),
		onReset: () => {
			if ( 'function' === typeof resetAll ) {
				resetAll();
			}
			list.forEach( ( item ) => item.onDeselect() );
		},
	};
}

const ItemRegistry = createContext( null );

/**
 * One control of an `SgsResetPanel` whose controls come from a helper: it tells the panel whether it holds a value and how
 * to clear it. Renders its children unchanged; outside a panel it is a no-op.
 *
 * @param {Object}   props
 * @param {Function} props.hasValue   Returns true while the control holds a value.
 * @param {Function} props.onDeselect Clears the control.
 * @param {Element}  props.children   The control.
 * @return {Element} The control.
 */
export function SgsResetItem( { hasValue, onDeselect, children } ) {
	const registry = useContext( ItemRegistry );
	const id = useRef( {} ).current;
	if ( registry ) {
		registry.entries.set( id, { hasValue, onDeselect } );
	}
	// After each commit, tell the panel; on unmount, drop the entry.
	useLayoutEffect( () => {
		if ( registry ) {
			registry.sync();
		}
	} );
	useLayoutEffect(
		() => () => {
			if ( registry ) {
				registry.entries.delete( id );
				registry.sync();
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);
	return <>{ children }</>;
}

export default function SgsResetPanel( {
	title,
	items,
	resetAll,
	initialOpen = false,
	nested = false,
	bare = false,
	className = '',
	children,
} ) {
	const [ , rerender ] = useReducer( ( n ) => n + 1, 0 );
	const shown = useRef( false );
	const registry = useRef( null );
	if ( ! registry.current ) {
		registry.current = {
			entries: new Map(),
			// After the controls commit, draw again only when the panel's value differs from what it drew.
			sync: () => {
				const now = [
					...( registry.current.items || [] ),
					...registry.current.entries.values(),
				].some( ( item ) => !! item.hasValue() );
				if ( now !== shown.current && ! registry.current.pending ) {
					registry.current.pending = true;
					rerender();
				}
			},
		};
	}
	registry.current.pending = false;
	registry.current.items = items;
	const all = [ ...( items || [] ), ...registry.current.entries.values() ];
	const { hasValue, onReset } = panelResetState( all, resetAll );
	shown.current = hasValue;
	const body = (
		<>
			<SgsPanelReset
				hasValue={ hasValue }
				onReset={ onReset }
				panelTitle={ title }
			/>
			{ children }
		</>
	);
	if ( bare ) {
		return (
			<ItemRegistry.Provider value={ registry.current }>
				{ body }
			</ItemRegistry.Provider>
		);
	}
	if ( nested ) {
		return (
			<SgsInnerSection
				title={ title }
				hasValue={ hasValue }
				className={ className }
			>
				<ItemRegistry.Provider value={ registry.current }>
					{ body }
				</ItemRegistry.Provider>
			</SgsInnerSection>
		);
	}
	return (
		<PanelBody
			title={ title }
			initialOpen={ initialOpen }
			className={ `sgs-reset-panel ${ className }`.trim() }
		>
			<ItemRegistry.Provider value={ registry.current }>
				{ body }
			</ItemRegistry.Provider>
		</PanelBody>
	);
}
