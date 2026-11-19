// Which discovered values may answer a row (lib/resolve.mjs::resolveDiscovered, lib/css-equivalence/effect.mjs::discoveredWrite). A
// discovered setting's value that records a layout effect (display, flex-direction or grid tracks on any element) is a layout mode:
// it answers a layout row and no other. An option picker's `tile` style draws a cocoa border and a 44px minimum height and also turns its
// options into a one-column grid, so neither the border nor the height row may be answered by it (Mama's Help chips, 2026-11-19).

// The properties a layout mode may answer.
export const LAYOUT_ROW = /^(?:display|flex(?:-[a-z]+)?|grid(?:-[a-z]+)*|gap|row-gap|column-gap|justify-[a-z]+|align-[a-z]+|place-[a-z]+|order|position|float)$/;
// The recorded effects that mark a value as a layout mode.
export const LAYOUT_EFFECTS = [ 'display', 'flex-direction', 'grid-template-columns', 'grid-template-rows' ];

// Whether a discovered value (`props`: the setting's recorded effects by property) may answer a row for `prop`.
export const mayAnswer = ( props, value, prop ) => LAYOUT_ROW.test( prop ) || ! LAYOUT_EFFECTS.some( ( l ) => props?.[ l ]?.values?.[ value ] );
