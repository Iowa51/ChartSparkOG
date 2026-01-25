/**
 * Animation Variants for Framer Motion-like animations
 * Uses CSS only for simplicity (no framer-motion dependency)
 */

// CSS animation utility classes for Tailwind
export const animations = {
    fadeIn: 'animate-in fade-in duration-300',
    fadeOut: 'animate-out fade-out duration-300',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
    slideDown: 'animate-in slide-in-from-top-4 duration-300',
    slideLeft: 'animate-in slide-in-from-right-4 duration-300',
    slideRight: 'animate-in slide-in-from-left-4 duration-300',
    zoomIn: 'animate-in zoom-in-95 duration-200',
    zoomOut: 'animate-out zoom-out-95 duration-200',
};

// Stagger delay helper for lists
export function getStaggerDelay(index: number, baseDelay = 50): string {
    return `${index * baseDelay}ms`;
}

// Animation keyframes (add to globals.css if not using tailwindcss-animate)
export const keyframes = `
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(1rem); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-1rem); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}
`;

// Transition classes
export const transitions = {
    fast: 'transition-all duration-150 ease-in-out',
    normal: 'transition-all duration-300 ease-in-out',
    slow: 'transition-all duration-500 ease-in-out',
    bounce: 'transition-all duration-300 ease-bounce',
};

// Hover animation classes
export const hoverEffects = {
    lift: 'hover:-translate-y-1 hover:shadow-lg',
    scale: 'hover:scale-105',
    glow: 'hover:shadow-lg hover:shadow-primary/20',
    brighten: 'hover:brightness-110',
};

// Click animation
export const clickEffects = {
    scale: 'active:scale-95',
    press: 'active:translate-y-0.5',
};
