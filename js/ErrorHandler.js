// ErrorHandler.js - Consistent error handling for the Retro Game Launcher

class ErrorHandler {
    /**
     * Display a user-friendly error message
     * @param {string} message - The error message to display
     * @param {string} type - The type of message (error, warning, info, success)
     * @param {number} duration - How long to show the message in milliseconds (0 for persistent)
     */
    static showMessage(message, type = 'error', duration = 5000) {
        // Create or reuse message container
        let messageContainer = document.getElementById('message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'message-container';
            messageContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(messageContainer);
        }

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `px-4 py-3 rounded-lg shadow-lg flex items-center max-w-md ${
            type === 'error' ? 'bg-red-900/90 border border-red-700 text-red-100' :
            type === 'warning' ? 'bg-yellow-900/90 border border-yellow-700 text-yellow-100' :
            type === 'success' ? 'bg-green-900/90 border border-green-700 text-green-100' :
            'bg-blue-900/90 border border-blue-700 text-blue-100'
        }`;
        
        // Add icon based on type
        const icon = document.createElement('span');
        icon.className = 'mr-2';
        icon.textContent = type === 'error' ? '⚠️' : 
                          type === 'warning' ? '⚠️' : 
                          type === 'success' ? '✅' : 'ℹ️';
        
        // Add message text
        const text = document.createElement('span');
        text.textContent = message;
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'ml-2 text-current opacity-70 hover:opacity-100';
        closeButton.textContent = '×';
        closeButton.onclick = () => {
            messageElement.remove();
            if (messageContainer.children.length === 0) {
                messageContainer.remove();
            }
        };
        
        messageElement.appendChild(icon);
        messageElement.appendChild(text);
        messageElement.appendChild(closeButton);
        messageContainer.appendChild(messageElement);

        // Auto-remove message after duration
        if (duration > 0) {
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.remove();
                    if (messageContainer.children.length === 0) {
                        messageContainer.remove();
                    }
                }
            }, duration);
        }
    }

    /**
     * Handle an error with both user-facing message and console logging
     * @param {string} userMessage - Message to show to the user
     * @param {Error|string} error - The actual error object or message
     * @param {string} context - Context where the error occurred
     */
    static handleError(userMessage, error, context = '') {
        // Log to console with context
        const sanitizeForLog = (str) => String(str).replace(/[\r\n]+/g, ' ').replace(/[\x00-\x1F\x7F]+/g, '');
        const sanitizedUserMessage = window.Sanitizer ? window.Sanitizer.sanitizeForLog(userMessage) : sanitizeForLog(userMessage);
        const sanitizedContext = window.Sanitizer ? window.Sanitizer.sanitizeForLog(context) : sanitizeForLog(context);
        const logMessage = sanitizedContext ? `[${sanitizedContext}] ${sanitizedUserMessage}` : sanitizedUserMessage;
        const sanitizedError = window.Sanitizer ? window.Sanitizer.sanitizeForLog(String(error)) : sanitizeForLog(String(error));
        const finalLogMessage = window.Sanitizer ? window.Sanitizer.sanitizeForLog(`${logMessage} ${sanitizedError}`) : `${logMessage} ${sanitizedError}`;
        console.error(finalLogMessage);
        
        // Show user-friendly message
        this.showMessage(userMessage, 'error');
    }

    /**
     * Handle a warning with both user-facing message and console logging
     * @param {string} userMessage - Message to show to the user
     * @param {string} context - Context where the warning occurred
     */
    static handleWarning(userMessage, context = '') {
        // Log to console with context
        const sanitizedUserMessage = window.Sanitizer ? window.Sanitizer.sanitizeForLog(userMessage) : userMessage;
        const sanitizedContext = window.Sanitizer ? window.Sanitizer.sanitizeForLog(context) : context;
        const logMessage = sanitizedContext ? `[${sanitizedContext}] ${sanitizedUserMessage}` : sanitizedUserMessage;
        console.warn(logMessage);
        
        // Show user-friendly message
        this.showMessage(userMessage, 'warning');
    }

    /**
     * Show a success message
     * @param {string} message - The success message to display
     */
    static showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Show an info message
     * @param {string} message - The info message to display
     */
    static showInfo(message) {
        this.showMessage(message, 'info');
    }

    /**
     * Handle form validation errors
     * @param {Array<string>} errors - Array of error messages
     * @param {string} context - Context where the validation errors occurred
     */
    static handleValidationErrors(errors, context = '') {
        if (errors.length === 0) return;
        
        // Log to console
        const logMessage = context ? `[${context}] Validation errors: ${errors.join(', ')}` : 
                                   `Validation errors: ${errors.join(', ')}`;
        console.warn(logMessage);
        
        // Show first error to user (or all errors in a single message)
        if (errors.length === 1) {
            this.showMessage(errors[0], 'error');
        } else {
            this.showMessage(`Please fix the following issues: ${errors.join(', ')}`, 'error');
        }
    }

    /**
     * Handle API errors with appropriate user messaging
     * @param {Error} error - The error object
     * @param {string} operation - What operation was being performed
     * @param {string} context - Context where the error occurred
     */
    static handleAPIError(error, operation, context = '') {
        let userMessage = '';
        
        // Handle different types of errors
        if (error.message && error.message.includes('Authentication failed')) {
            userMessage = 'Authentication failed. Please check your credentials in the settings.';
        } else if (error.message && error.message.includes('Network')) {
            userMessage = `Network error occurred while ${operation}. Please check your connection.`;
        } else if (error.message && error.message.includes('404')) {
            userMessage = `Resource not found while ${operation}.`;
        } else if (error.message && error.message.includes('500')) {
            userMessage = `Server error occurred while ${operation}. Please try again later.`;
        } else {
            userMessage = `An error occurred while ${operation}. Please try again.`;
        }
        
        this.handleError(userMessage, error, context);
    }
}

// Make the class available globally
window.ErrorHandler = ErrorHandler;

// Export for use in Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}