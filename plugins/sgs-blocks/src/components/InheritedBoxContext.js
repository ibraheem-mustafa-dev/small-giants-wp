/**
 * What each side or corner of a box takes from a wider device tier, for the box control inside a
 * `ResponsiveOverride`. The override provides it for the tier being edited; `SgsBoxControl` shows each value as
 * placeholder text in its empty box (src/utils/inherited-box.js), so a client never reads an unset side as 0.
 */
import { createContext } from '@wordpress/element';

export const InheritedBoxContext = createContext( {} );
