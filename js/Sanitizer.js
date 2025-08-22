// HTML Sanitization Utility to prevent XSS attacks

// Check environment at top level to avoid lazy loading detection
const isNodeEnvironment = typeof module !== 'undefined' && typeof module.exports !== 'undefined';

class Sanitizer {
    // Simple HTML sanitization function to prevent XSS
    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Sanitize URL for href attributes
    static sanitizeURL(url) {
        try {
            const parsedURL = new URL(url);
            // Only allow http and https protocols
            if (parsedURL.protocol === 'http:' || parsedURL.protocol === 'https:') {
                return parsedURL.href;
            }
            return '';
        } catch (e) {
            // If URL parsing fails, return empty string
            return '';
        }
    }

    // Escape HTML special characters
    static escapeHTML(str) {
        return str.replace(/[&<>"']/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[tag]));
    }

    // Sanitize log messages to prevent log injection
    static sanitizeForLog(str) {
        if (typeof str !== 'string') {
            return String(str);
        }
        // Remove or escape control characters that could be used for log injection
        return str.replace(/[\x00-\x1F\x7F]/g, '');
    }

    // Sanitize messages for display in progress/status updates
    static sanitizeForDisplay(str) {
        if (typeof str !== 'string') {
            return String(str);
        }
        // Escape HTML and remove control characters
        return this.escapeHTML(str).replace(/[\x00-\x1F\x7F]/g, '');
    }
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.Sanitizer = Sanitizer;
}

// Export for Node.js environments
if (isNodeEnvironment) {
    module.exports = Sanitizer;
}