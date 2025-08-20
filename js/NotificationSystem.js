// NotificationSystem.js - Modern notification system for the Retro Game Launcher

class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(this.container);
        
        // Add styles for notifications
        this.addStyles();
    }

    addStyles() {
        // Add CSS for notifications
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: relative;
                padding: 1rem;
                border-radius: 0.5rem;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                max-width: 300px;
                word-wrap: break-word;
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification.success {
                background-color: #10B981; /* green-500 */
                color: white;
            }
            
            .notification.error {
                background-color: #EF4444; /* red-500 */
                color: white;
            }
            
            .notification.warning {
                background-color: #F59E0B; /* amber-500 */
                color: white;
            }
            
            .notification.info {
                background-color: #3B82F6; /* blue-500 */
                color: white;
            }
            
            .notification .close-btn {
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                background: none;
                border: none;
                color: white;
                font-size: 1.25rem;
                cursor: pointer;
                padding: 0;
                width: 1.5rem;
                height: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .notification .close-btn:hover {
                opacity: 0.7;
            }
        `;
        document.head.appendChild(style);
    }

    show(message, type = 'info', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add message using safe textContent
        const messageElement = document.createElement('span');
        // Sanitize message for display
        messageElement.textContent = window.Sanitizer ? window.Sanitizer.sanitizeForHTML(message) : message;
        notification.appendChild(messageElement);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            this.hide(notification);
        });
        notification.appendChild(closeBtn);
        
        // Add to container
        this.container.appendChild(notification);
        
        // Trigger show animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }
        
        return notification;
    }

    hide(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode === this.container) {
                this.container.removeChild(notification);
            }
        }, 300);
    }

    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 0) { // Errors don't auto-hide by default
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }
}

// Initialize notification system
const notificationSystem = new NotificationSystem();

// Make it available globally
window.NotificationSystem = notificationSystem;

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}