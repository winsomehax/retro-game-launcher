// Sanitizer.js - Utility functions to sanitize user input for logging and display

class Sanitizer {
    /**
     * Sanitize user input for logging to prevent log injection
     * @param {string} input - The input to sanitize
     * @returns {string} - The sanitized input
     */
    static sanitizeForLog(input) {
        if (typeof input !== 'string') {
            return String(input);
        }
        
        // Remove or escape potentially dangerous characters
        return input
            .replace(/\0/g, '\\0')  // Null bytes
            .replace(/\r/g, '\\r')  // Carriage returns
            .replace(/\n/g, '\\n')  // Line feeds
            .replace(/\t/g, '\\t')  // Tabs
            .replace(/"/g, '\\"')   // Double quotes
            .replace(/'/g, "\\'")   // Single quotes
            .replace(/</g, '&lt;')  // Less than
            .replace(/>/g, '&gt;'); // Greater than
    }

    /**
     * Sanitize user input for HTML display to prevent XSS
     * @param {string} input - The input to sanitize
     * @returns {string} - The sanitized input
     */
    static sanitizeForHTML(input) {
        if (typeof input !== 'string') {
            return String(input);
        }
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    /**
     * Sanitize file paths to prevent path traversal
     * @param {string} inputPath - The input path to sanitize
     * @param {string} baseDir - The base directory to resolve against
     * @returns {string|null} - The sanitized path or null if invalid
     */
    static sanitizePath(inputPath, baseDir) {
        if (typeof inputPath !== 'string' || typeof baseDir !== 'string') {
            return null;
        }
        
        try {
            // Use path.posix to ensure consistent behavior across platforms
            const path = require('path');
            const posix = path.posix || path;
            
            // Normalize the path
            let normalizedPath = posix.normalize(inputPath);
            
            // Resolve against base directory
            const resolvedBase = posix.resolve(baseDir);
            const resolvedPath = posix.resolve(normalizedPath);
            
            // Check if path is within base directory
            if (!resolvedPath.startsWith(resolvedBase)) {
                return null;
            }
            
            // Prevent access to sensitive system directories
            const sensitivePaths = ['/etc/', '/root/', '/home/', '/usr/', '/var/'];
            for (const sensitivePath of sensitivePaths) {
                if (resolvedPath.startsWith(sensitivePath)) {
                    return null;
                }
            }
            
            return resolvedPath;
        } catch (error) {
            return null;
        }
    }

    /**
     * Escape HTML special characters
     * @param {string} unsafe - The string to escape
     * @returns {string} - The escaped string
     */
    static escapeHTML(unsafe) {
        if (typeof unsafe !== 'string') {
            return String(unsafe);
        }
        
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Make the class available globally
window.Sanitizer = Sanitizer;

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sanitizer;
}