/**
 * SGS Choice Flow — shared selectors/classes/sentinels.
 *
 * Split out of `navigation.js` (which was growing past this codebase's
 * 250-line JS guideline) so every navigation-engine module (`flow-steps.js`,
 * `flow-progress.js`, `flow-persistence.js`, `flow-routing.js`,
 * `flow-options.js`) can share these without importing each other and
 * creating a circular dependency.
 *
 * @package SGS\Blocks
 */

export const TERMINAL_SENTINEL = '__terminal__';

export const FLOW_SELECTOR = '[data-wp-interactive="sgs/choice-flow"]';
export const STEP_SELECTOR = '.sgs-form-step';
export const OPTION_BUTTON_SELECTOR = '.sgs-choice-flow-question__option-button';
export const RESULT_SELECTOR = '.sgs-choice-flow-result';
export const BACK_BUTTON_SELECTOR = '.sgs-choice-flow__nav-back';
export const CONTINUE_BUTTON_SELECTOR = '.sgs-choice-flow__continue';
export const ADD_TO_BASKET_BUTTON_SELECTOR = '.sgs-choice-flow__add-to-basket';
export const BUY_NOW_BUTTON_SELECTOR = '.sgs-choice-flow__buy-now';
export const SELECTED_CLASS = 'sgs-choice-flow-question__option-button--selected';

export const STEP_COUNT_SELECTOR = '.sgs-choice-flow__step-count';
export const STEP_LABEL_SELECTOR = '.sgs-choice-flow__step-label';
export const STEPPER_SELECTOR = '.sgs-choice-flow__stepper';
export const PROGRESS_SELECTOR = '.sgs-choice-flow__progress';
export const PROGRESS_BADGE_SELECTOR = '.sgs-choice-flow__progress-badge';
export const CONTINUE_HINT_SELECTOR = '.sgs-choice-flow__continue-hint';
export const DEFAULT_OPTION_SELECTOR = '[data-default="1"]';
export const OPTIONS_GROUP_SELECTOR = '.sgs-choice-flow-question__options';
