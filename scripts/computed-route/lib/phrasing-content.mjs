// HTML phrasing content (WHATWG HTML §3.2.5.2.5), read from the route's pinned packages: every tag html-tag-names lists that
// hast-util-phrasing (the unified project's reading of the phrasing content category) counts as phrasing. An element of
// these tags that renders inline and holds only text is part of the words around it, never a block of its own
// (lib/skeleton-model.mjs::inlinePart).
import { htmlTagNames } from 'html-tag-names';
import { phrasing } from 'hast-util-phrasing';

export const PHRASING_TAGS = new Set( htmlTagNames.filter( ( tagName ) => phrasing( { type: 'element', tagName, properties: {}, children: [] } ) ) );

// The text paint an inline element can differ from the words around it by: its weight, slant and strike (each one drawn by
// a rich-text format, lib/inline-text.mjs::FORMAT_TAGS), and the rest no format holds.
export const INLINE_PAINT = [ 'font-weight', 'font-style', 'text-decoration-line', 'color', 'background-color', 'font-size', 'font-family', 'letter-spacing', 'text-transform', 'vertical-align' ];
