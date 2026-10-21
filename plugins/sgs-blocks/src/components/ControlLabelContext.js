/**
 * The visible label of the wrapper a control sits in (`ResponsiveOverride`). A control mounted without its own label
 * takes this as its accessible name, so the value box, preset select and slider are never nameless; the wrapper keeps
 * showing the label.
 */
import { createContext } from '@wordpress/element';

export const ControlLabelContext = createContext( '' );
