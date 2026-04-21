import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for registering global keyboard shortcuts
 * @param {Object} shortcuts - Object mapping keyboard combos to handler functions
 * @returns {number} - Number of registered shortcuts
 */
export function useKeyboardShortcuts(shortcuts = {}) {
  const navigate = useNavigate();

  // Focus search input handler
  const focusSearch = useCallback(() => {
    // Try to find search input by id="search" or class="search-input"
    const searchInput = document.getElementById('search') || 
                        document.querySelector('.search-input');
    
    if (searchInput) {
      searchInput.focus();
      return true;
    }
    return false;
  }, []);

  // Close modal handler - dispatches custom event
  const closeModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent('close-modal'));
    return true;
  }, []);

  // Handle keydown events
  const handleKeyDown = useCallback((e) => {
    // Don't trigger shortcuts when typing in input/textarea (unless it's Ctrl/Cmd+/ for search focus)
    const isInputField = e.target.tagName === 'INPUT' || 
                         e.target.tagName === 'TEXTAREA' || 
                         e.target.isContentEditable;
    
    // Ctrl or Cmd key
    const hasModifier = e.ctrlKey || e.metaKey;

    // Build the key combo string (normalize for Mac/Windows)
    const combo = [
      hasModifier ? 'mod' : '',
      e.key.length === 1 ? e.key.toLowerCase() : e.key
    ].filter(Boolean).join('+');

    // Check for Ctrl/Cmd + / (search focus) - always works even in input fields
    if (combo === 'mod+/') {
      e.preventDefault();
      focusSearch();
      return;
    }

    // Skip other shortcuts if in input field (unless it's a modifier-only combo)
    if (isInputField && combo !== 'mod+/') {
      return;
    }

    // Map shortcuts
    const shortcutMap = {
      'mod+d': () => navigate('/dashboard'),
      'mod+c': () => navigate('/contacts'),
      'mod+o': () => navigate('/companies'),
      'mod+p': () => navigate('/deals'),
      'mod+a': () => navigate('/activities'),
      'escape': () => closeModal(),
    };

    // Execute matching shortcut
    const handler = shortcutMap[combo];
    if (handler) {
      e.preventDefault();
      handler();
    }
  }, [navigate, focusSearch, closeModal]);

  // Register event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return the count of registered shortcuts
  const shortcutsCount = Object.keys(shortcuts).length;
  
  return shortcutsCount;
}

export default useKeyboardShortcuts;