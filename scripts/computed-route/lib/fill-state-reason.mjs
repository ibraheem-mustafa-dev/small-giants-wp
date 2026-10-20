// Why the page cannot be put into a state combination (lib/fill-state-read.mjs): the first token that has no host or is never exposed to scripts.

export function reasonOf( tokens ) {
	const t = tokens.find( ( x ) => 'unreachable' === x.row.reach || null === x.host );
	if ( t.inHas ) {
		return `${ t.text } inside :has() is a descendant's state, not one on the target or its ancestors`;
	}
	return null === t.host ? `${ t.text } has no host on the target or its ancestors (a sibling combinator)` : `${ t.text } is never exposed to scripts`;
}
