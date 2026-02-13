/**
 * Responsive breakpoint switcher for block sidebar controls.
 *
 * Wraps any control and passes the current breakpoint (desktop/tablet/mobile)
 * to the child render function so attributes can be stored per-breakpoint.
 *
 * Usage:
 *   <ResponsiveControl label="Columns">
 *     { ( breakpoint ) => <RangeControl ... /> }
 *   </ResponsiveControl>
 */
import { useState } from '@wordpress/element';
import { ButtonGroup, Button, Tooltip } from '@wordpress/components';
import { desktop, tablet, mobile } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';

const BREAKPOINTS = [
	{ key: 'desktop', icon: desktop, label: __( 'Desktop', 'sgs-blocks' ) },
	{ key: 'tablet', icon: tablet, label: __( 'Tablet', 'sgs-blocks' ) },
	{ key: 'mobile', icon: mobile, label: __( 'Mobile', 'sgs-blocks' ) },
];

export default function ResponsiveControl( { children, label } ) {
	const [ breakpoint, setBreakpoint ] = useState( 'desktop' );

	return (
		<div className="sgs-responsive-control">
			<div className="sgs-responsive-control__header">
				{ label && (
					<span className="sgs-responsive-control__label">
						{ label }
					</span>
				) }
				<ButtonGroup className="sgs-responsive-control__buttons">
					{ BREAKPOINTS.map( ( bp ) => (
						<Tooltip key={ bp.key } text={ bp.label }>
							<Button
								icon={ bp.icon }
								isPressed={ breakpoint === bp.key }
								onClick={ () => setBreakpoint( bp.key ) }
								size="small"
							/>
						</Tooltip>
					) ) }
				</ButtonGroup>
			</div>
			{ children( breakpoint ) }
		</div>
	);
}
