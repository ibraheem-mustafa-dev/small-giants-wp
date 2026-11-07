// Applier family: chrome. Header, footer and drawer settings the clone leaves at their defaults and the draft shows: the animated
// logo, the header strip leaving with the page, burger bars, drawer row and card hovers, the open-status badge, the footer list
// shift and the process steps' connector. Rules sit in apply-chrome-logo, -hover and -state; each (and -icons, a row's child icons) reads the draft's records, a
// computed read, or the client's data file, and returns nothing for a block it does not govern.
import { logoRule } from './apply-chrome-logo.mjs';
import { hoverRule } from './apply-chrome-hover.mjs';
import { iconRule } from './apply-chrome-icons.mjs';
import { groundRule } from './apply-chrome-ground.mjs';
import { headingLevel } from './apply-chrome-heading.mjs';
import { arrowHover, itemCardHover } from './apply-chrome-cards.mjs';
import { burgerBars, connectorLine, pulseDot, rowWrapper, stateRule } from './apply-chrome-state.mjs';

export const chrome = {
	name: 'chrome',
	slots: true,
	props: [ 'display', 'position', 'height', 'width', 'background-color', 'background-image', 'right', 'bottom', 'border-top-width', 'border-top-style', 'border-top-color', 'border-bottom-width', 'border-bottom-style', 'border-bottom-color' ],
	// Whether a surface needs the closed-clock read: it holds an open-status badge.
	closedClock( { saved } ) {
		return Object.values( saved ).some( ( b ) => 'sgs/business-info' === b.block && 'open-status' === b.attrs?.displayType );
	},
	// Extra draft elements a block's rule reads beside its own.
	aux( ctx ) {
		if ( ctx.target.slot ) {
			return rowWrapper( ctx );
		}
		return { 'sgs/nav-bar-menu': burgerBars, 'sgs/process-steps': connectorLine, 'sgs/business-info': pulseDot }[ ctx.block ]?.( ctx ) ?? [];
	},
	decide( ctx ) {
		return [ logoRule, hoverRule, iconRule, stateRule, groundRule, itemCardHover, arrowHover, headingLevel ].flatMap( ( rule ) => rule( ctx ) );
	},
};
