// The reading helpers the effect recogniser (lib/motion-behaviours.mjs) and the settings recognisers
// (lib/motion-behaviour-settings.mjs) share: a record's properties, words, trigger and timing, and the number patterns
// their formulas are read with.

export const props = ( r ) => ( Array.isArray( r.properties ) ? r.properties : [] );
export const nameOf = ( p ) => String( p.property ?? '' ).toLowerCase();
export const words = ( ...parts ) => parts.filter( ( s ) => 'string' === typeof s ).join( ' ' );
export const blob = ( r ) => words( r.source?.code, r.trigger?.detail, r.element?.selector, r.element?.description, r.notes, ...props( r ).flatMap( ( p ) => [ p.property, p.from, p.to, p.formula ] ) );
export const triggerOf = ( r ) => r.trigger?.type ?? null;
export const MINUS = '[-\\u2212]';
export const TIMES = '[\\u00d7*]';
export const NUMBER = '(\\d*\\.?\\d+)';
export const number = ( s ) => ( null == s ? null : Number( s ) );
export const round = ( n ) => Math.round( n * 1000 ) / 1000;
export const durationOf = ( r ) => ( 'number' === typeof r.duration_ms ? r.duration_ms : null );
export const easingOf = ( r ) => ( 'string' === typeof r.easing && r.easing ? r.easing : null );
export const compact = ( o ) => Object.fromEntries( Object.entries( o ).filter( ( [ , v ] ) => null !== v && undefined !== v ) );
