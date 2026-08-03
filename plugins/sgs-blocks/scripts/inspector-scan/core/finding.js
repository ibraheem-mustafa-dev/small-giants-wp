'use strict';

/**
 * The one Finding shape every rule produces. `fix` is MANDATORY — Bean is the
 * QC layer for this framework, so a finding with no plain-English next action
 * is not a usable finding. Enforced here (throws) rather than by review.
 *
 * `key` is the stable dedup/baseline identity: rule + block + file + whatever
 * extra parts the rule supplies (attr name, JSX locus, filename, ...). Full
 * tuple identity, never a tier-blind join (STOP-17).
 */
function makeFinding({
	rule,
	checklistItem = null,
	block = null,
	file = null,
	line = null,
	severity = 'warn',
	detail,
	fix,
	keyParts = [],
}) {
	if (!detail || typeof detail !== 'string' || !detail.trim()) {
		throw new Error(
			`[inspector-scan] finding for rule "${rule}" has no non-empty 'detail' text.`
		);
	}
	if (!fix || typeof fix !== 'string' || !fix.trim()) {
		throw new Error(
			`[inspector-scan] finding for rule "${rule}" (${detail}) has no non-empty 'fix' text — ` +
				`fix is mandatory (Bean is the QC layer; every finding must carry a plain-English next action).`
		);
	}
	if (!['error', 'warn', 'informational'].includes(severity)) {
		throw new Error(
			`[inspector-scan] finding for rule "${rule}" has an unknown severity "${severity}".`
		);
	}
	const key = [rule, block || '-', file || '-', ...keyParts].join('|');
	return {
		rule,
		checklistItem,
		block,
		file,
		line,
		severity,
		detail,
		fix,
		key,
		status: 'FLAGGED',
	};
}

module.exports = { makeFinding };
