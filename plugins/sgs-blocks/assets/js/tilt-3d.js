/**
 * 3D Tilt on Hover Effect.
 *
 * Calculates cursor position relative to the element and applies
 * a 3D perspective rotation towards the cursor.
 *
 * @package SGS\Blocks
 */
document.addEventListener('DOMContentLoaded', () => {
    const tiltElements = document.querySelectorAll('.sgs-has-tilt-3d');
    
    if (tiltElements.length === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const MAX_TILT_DEG = 6;

    tiltElements.forEach(el => {
        let frameId = null;

        el.addEventListener('mousemove', (e) => {
            if (frameId) cancelAnimationFrame(frameId);

            frameId = requestAnimationFrame(() => {
                const rect = el.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const rotateY = ((mouseX - centerX) / centerX) * MAX_TILT_DEG;
                const rotateX = -((mouseY - centerY) / centerY) * MAX_TILT_DEG;

                el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
        });

        el.addEventListener('mouseleave', () => {
            if (frameId) cancelAnimationFrame(frameId);
            el.style.transform = '';
        });
    });
});
