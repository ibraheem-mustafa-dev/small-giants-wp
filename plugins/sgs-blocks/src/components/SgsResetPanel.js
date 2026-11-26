/**
 * SgsResetPanel: a titled panel of controls with one small Reset, shown only while the panel holds a value.
 *
 * It replaces a core `ToolsPanel` whose every item is shown by default (core's header menu then offers only reset).
 * Every control stays and keeps its own reset behaviour; the panel adds one Reset (`SgsPanelReset`) that clears all of
 * them. It draws a `PanelBody` at the top level of an inspector tab, or, with `nested`, a light inner section
 * (`SgsInnerSection`) when the panel sits inside another panel (one level deep only).
 *
 * The caller gives the panel what it holds as `items`: `[ { hasValue: () => boolean, onDeselect: () => void } ]`, the
 * same two functions a `ToolsPanelItem` took. The panel holds a value when any item does; Reset calls `resetAll` when the
 * caller passes one, else every item's `onDeselect`.
 *
 * Props: `title`, `items`, optional `resetAll`, `initialOpen` (default false), `nested` (default false), `className`,
 * `children`.
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

import SgsInnerSection from './SgsInnerSection';
import SgsPanelReset from './SgsPanelReset';

/**
 * Whether any item holds a value, and what Reset does.
 *
 * @param {Array<{hasValue: Function, onDeselect: Function}>} items    The panel's items.
 * @param {Function}                                           [resetAll] Overrides the per-item reset.
 * @return {{hasValue: boolean, onReset: Function}} Panel state.
 */
export function panelResetState( items = [], resetAll ) {
	const list = ( items || [] ).filter( Boolean );
	return {
		hasValue: list.some( ( item ) => !! item.hasValue() ),
		onReset: () => {
			if ( 'function' === typeof resetAll ) {
				resetAll();
				return;
			}
			list.forEach( ( item ) => item.onDeselect() );
		},
	};
}

export default function SgsResetPanel( {
	title,
	items,
	resetAll,
	initialOpen = false,
	nested = false,
	className = '',
	children,
} ) {
	const { hasValue, onReset } = panelResetState( items, resetAll );
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
	if ( nested ) {
		return (
			<SgsInnerSection
				title={ title }
				hasValue={ hasValue }
				className={ className }
			>
				{ body }
			</SgsInnerSection>
		);
	}
	return (
		<PanelBody
			title={ title }
			initialOpen={ initialOpen }
			className={ `sgs-reset-panel ${ className }`.trim() }
		>
			{ body }
		</PanelBody>
	);
}
