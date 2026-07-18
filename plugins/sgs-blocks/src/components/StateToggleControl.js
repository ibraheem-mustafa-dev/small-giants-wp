/**
 * Normal / Hover (state) switch for block sidebar colour controls.
 *
 * A panel-level segmented toggle — the Kadence/Spectra pattern converged on by
 * the 2026-07-18 inspector-design research council: ONE switch pinned to an
 * element panel scopes every colour control beneath it, rather than a separate
 * toggle per control or a duplicate "Hover" panel.
 *
 * Passes the active state key to the child render function so the consumer can
 * show that state's controls in-place:
 *
 *   <StateToggleControl
 *       label={ __( 'Colours', 'sgs-blocks' ) }
 *       swatches={ [
 *           { label: 'Normal bg', value: tileBg },
 *           { label: 'Hover bg', value: hoverBg },
 *       ] }
 *   >
 *       { ( state ) => state === 'normal'
 *           ? <NormalColourControls />
 *           : <HoverColourControls /> }
 *   </StateToggleControl>
 *
 * The `swatches` legend stays visible in BOTH states, so a hidden hover value is
 * never invisible (the discoverability mitigation from the council sceptic) —
 * the client always sees that a hover colour exists even while editing Normal.
 *
 * Mirrors the ResponsiveControl idiom (local useState, render-prop child) so the
 * state is editor-only UI and never persisted as an attribute.
 *
 * @package SGS\Blocks
 */
import { useState } from '@wordpress/element';
import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { colourVar } from '../utils';

const DEFAULT_STATES = [
	{ key: 'normal', label: __( 'Normal', 'sgs-blocks' ) },
	{ key: 'hover', label: __( 'Hover', 'sgs-blocks' ) },
];

export default function StateToggleControl( {
	label,
	states = DEFAULT_STATES,
	swatches = [],
	children,
} ) {
	const [ state, setState ] = useState( states[ 0 ].key );

	return (
		<div className="sgs-state-toggle">
			<ToggleGroupControl
				label={ label }
				value={ state }
				onChange={ ( val ) => setState( val || states[ 0 ].key ) }
				isBlock
				__nextHasNoMarginBottom
			>
				{ states.map( ( s ) => (
					<ToggleGroupControlOption
						key={ s.key }
						value={ s.key }
						label={ s.label }
					/>
				) ) }
			</ToggleGroupControl>

			{ swatches.length > 0 && (
				<ul
					className="sgs-state-toggle__swatches"
					style={ {
						display: 'flex',
						flexWrap: 'wrap',
						gap: '4px 12px',
						listStyle: 'none',
						margin: '6px 0 10px',
						padding: 0,
						fontSize: '11px',
						color: 'var(--wp-admin-theme-color, #757575)',
					} }
				>
					{ swatches.map( ( sw, i ) => (
						<li
							key={ i }
							style={ {
								display: 'flex',
								alignItems: 'center',
								gap: '5px',
							} }
						>
							<span
								aria-hidden="true"
								style={ {
									display: 'inline-block',
									width: '12px',
									height: '12px',
									borderRadius: '2px',
									border: '1px solid rgba(0,0,0,0.2)',
									backgroundColor: sw.value
										? colourVar( sw.value )
										: 'transparent',
								} }
							/>
							<span>{ sw.label }</span>
						</li>
					) ) }
				</ul>
			) }

			{ children( state ) }
		</div>
	);
}
