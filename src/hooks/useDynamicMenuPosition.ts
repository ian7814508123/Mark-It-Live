import { useState, useLayoutEffect, useRef } from 'react';

export function useDynamicMenuPosition(isOpen: boolean, orientation: 'horizontal' | 'vertical' = 'horizontal') {
    const menuRef = useRef<HTMLDivElement>(null);
    const [positionClass, setPositionClass] = useState<string>('');

    useLayoutEffect(() => {
        if (!isOpen || !menuRef.current) return;

        const trigger = menuRef.current.parentElement;
        if (!trigger) return;

        const triggerRect = trigger.getBoundingClientRect();
        const menuRect = menuRef.current.getBoundingClientRect();
        
        // Use viewer container or viewport
        const viewerContainer = trigger.closest('.mermaid-viewer-container') || document.body;
        const containerRect = viewerContainer.getBoundingClientRect();
        
        // We use window dimensions as bounds if body, else container bounds
        const bounds = {
            top: viewerContainer === document.body ? 0 : containerRect.top,
            bottom: viewerContainer === document.body ? window.innerHeight : containerRect.bottom,
            left: viewerContainer === document.body ? 0 : containerRect.left,
            right: viewerContainer === document.body ? window.innerWidth : containerRect.right,
            width: viewerContainer === document.body ? window.innerWidth : containerRect.width,
            height: viewerContainer === document.body ? window.innerHeight : containerRect.height,
        };

        let classes = '';

        if (orientation === 'horizontal') {
            // Check if there's space below, else check if space above
            let isUp = false;
            if (triggerRect.bottom + menuRect.height > bounds.bottom && triggerRect.top - menuRect.height > bounds.top) {
                isUp = true;
            }

            if (isUp) {
                classes += 'bottom-full mb-2 slide-in-from-bottom-2 ';
            } else {
                classes += 'top-full mt-2 slide-in-from-top-2 ';
            }

            // Horizontal alignment
            // Prefer center, then right-aligned, then left-aligned
            const centerLeft = triggerRect.left + (triggerRect.width / 2) - (menuRect.width / 2);
            const centerRight = centerLeft + menuRect.width;

            if (centerLeft < bounds.left) {
                classes += 'left-0 ';
            } else if (centerRight > bounds.right) {
                classes += 'right-0 ';
            } else {
                classes += 'left-1/2 -translate-x-1/2 ';
            }

        } else {
            // Check if there's space right, else check left
            let isLeft = false;
            if (triggerRect.right + menuRect.width > bounds.right && triggerRect.left - menuRect.width > bounds.left) {
                isLeft = true;
            }

            if (isLeft) {
                classes += 'right-full mr-2 slide-in-from-right-2 ';
            } else {
                classes += 'left-full ml-2 slide-in-from-left-2 ';
            }

            // Vertical alignment
            const centerTop = triggerRect.top + (triggerRect.height / 2) - (menuRect.height / 2);
            const centerBottom = centerTop + menuRect.height;

            if (centerTop < bounds.top) {
                classes += 'top-0 ';
            } else if (centerBottom > bounds.bottom) {
                classes += 'bottom-0 ';
            } else {
                classes += 'top-1/2 -translate-y-1/2 ';
            }
        }

        setPositionClass(classes.trim());
    }, [isOpen, orientation]);

    // Give default classes for first render to avoid jumping from top-left
    const defaultClasses = orientation === 'horizontal' 
        ? 'top-full mt-2 left-1/2 -translate-x-1/2' 
        : 'left-full ml-2 top-1/2 -translate-y-1/2';

    return { menuRef, positionClass: positionClass || defaultClasses };
}
