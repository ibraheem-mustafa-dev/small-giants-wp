import { useBlockProps } from '@wordpress/block-editor';

/**
 * Editor for sgs/gift-section.
 * Scaffolded by spec-15-p5b.8 (role=text-content) -- needs human polish.
 */
export default function Edit({ attributes, setAttributes }) {
    const blockProps = useBlockProps({ className: 'sgs-gift-section' });
    return (
        <div { ...blockProps }>
            {/* TODO(human): polish for role=text-content */}
            <span>{ attributes.text || 'sgs/gift-section (scaffold)' }</span>
        </div>
    );
}
