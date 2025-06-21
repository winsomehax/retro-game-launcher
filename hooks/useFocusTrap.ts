import React, { useEffect, useRef, useCallback } from 'react';

// Selector for all focusable elements
const FOCUSABLE_ELEMENTS_SELECTOR =
  'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

/**
 * Custom hook to trap focus within a designated element (typically a modal).
 * @param isOpen - Boolean indicating if the trap should be active.
 * @param onClose - Optional callback function to be called when Escape key is pressed.
 * @returns A React ref object to be attached to the trapping container element.
 */
export function useFocusTrap(isOpen: boolean, onClose?: () => void) {
  const trapRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!trapRef.current) return;

      if (event.key === 'Escape' && onClose) {
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = Array.from(
          trapRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR)
        ).filter(el => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none'); // Check if visible and displayed

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const currentActiveElement = document.activeElement as HTMLElement;

        if (event.shiftKey) {
          // Shift + Tab
          if (currentActiveElement === firstElement || !trapRef.current.contains(currentActiveElement)) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          // Tab
          if (currentActiveElement === lastElement || !trapRef.current.contains(currentActiveElement)) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen && trapRef.current) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      
      const focusableElements = Array.from(
        trapRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR)
      ).filter(el => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none');
      
      const firstFocusableElement = focusableElements[0];
      if (firstFocusableElement) {
        // Delay focus slightly to ensure modal is fully rendered and transitions complete
        const timerId = setTimeout(() => firstFocusableElement.focus(), 50);
        return () => clearTimeout(timerId); // Clear timeout if component unmounts or isOpen changes
      }
    } else if (!isOpen && previouslyFocusedElement.current) {
        // Restore focus to the element that had focus before the modal opened
        previouslyFocusedElement.current.focus();
        previouslyFocusedElement.current = null;
    }
  }, [isOpen]);


  useEffect(() => {
    if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown])


  return trapRef;
}
