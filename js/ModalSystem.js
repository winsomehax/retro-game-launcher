// ModalSystem.js - Secure modal system for the Retro Game Launcher

class ModalSystem {
    constructor() {
        this.modal = null;
        this.modalTitle = null;
        this.modalFields = null;
        this.modalForm = null;
        this.modalCancel = null;
        this.modalSave = null;
        this.currentOnSubmit = null;
        this.init();
    }

    init() {
        this.setupModalElements();
        this.setupEventListeners();
    }

    setupModalElements() {
        // Get existing modal elements from the DOM
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalFields = document.getElementById('modal-fields');
        this.modalForm = document.getElementById('modal-form');
        this.modalCancel = document.getElementById('modal-cancel');
        this.modalSave = document.getElementById('modal-save');
    }

    setupEventListeners() {
        // Close modal on overlay click
        const modalOverlay = this.modal.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.close());
        }
        
        // Close modal on close button click
        const closeButton = this.modal.querySelector('.modal-close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }
        
        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });
        
        // Form submission
        if (this.modalForm) {
            this.modalForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // Cancel button
        if (this.modalCancel) {
            this.modalCancel.addEventListener('click', () => this.close());
        }
    }

    show(title, fields, onSubmit) {
        // Store the onSubmit handler
        this.currentOnSubmit = onSubmit;
        
        // Set modal title
        if (this.modalTitle) {
            // Use textContent to prevent XSS
            this.modalTitle.textContent = title;
        }
        
        // Clear and populate fields using safe DOM methods
        this.populateFields(fields);
        
        // Show modal
        this.modal.classList.remove('hidden');
        this.modal.setAttribute('aria-hidden', 'false');
        
        // Focus first input
        setTimeout(() => {
            const firstInput = this.modalForm.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    close() {
        this.modal.classList.add('hidden');
        this.modal.setAttribute('aria-hidden', 'true');
        this.currentOnSubmit = null;
    }

    populateFields(fields) {
        // Clear existing fields using safe DOM methods
        while (this.modalFields.firstChild) {
            this.modalFields.removeChild(this.modalFields.firstChild);
        }
        
        // Create form fields using safe DOM methods
        fields.forEach(field => {
            const fieldElement = this.createField(field);
            this.modalFields.appendChild(fieldElement);
        });
    }

    createField(field) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'mb-4';
        
        // Label
        if (field.label) {
            const label = document.createElement('label');
            label.className = 'block text-sm font-medium mb-2';
            // Use textContent to prevent XSS
            label.textContent = field.label;
            label.setAttribute('for', field.id);
            fieldDiv.appendChild(label);
        }
        
        let inputElement;
        
        switch (field.type) {
            case 'tags':
                inputElement = this.createTagsSelect(field);
                break;
            case 'select':
                inputElement = this.createSelect(field);
                break;
            case 'textarea':
                inputElement = this.createTextarea(field);
                break;
            default:
                inputElement = this.createInput(field);
        }
        
        fieldDiv.appendChild(inputElement);
        
        return fieldDiv;
    }

    createInput(field) {
        const input = document.createElement('input');
        input.type = field.type || 'text';
        input.id = field.id;
        input.name = field.id;
        input.className = 'w-full p-3 bg-neutral-800 border border-neutral-700 rounded';
        
        // Use value property instead of setAttribute to prevent XSS
        if (field.value) {
            input.value = field.value;
        }
        
        if (field.readOnly) {
            input.readOnly = true;
        }
        
        if (field.placeholder) {
            // Use placeholder property to prevent XSS
            input.placeholder = field.placeholder;
        }
        
        return input;
    }

    createTextarea(field) {
        const textarea = document.createElement('textarea');
        textarea.id = field.id;
        textarea.name = field.id;
        textarea.className = 'w-full p-3 bg-neutral-800 border border-neutral-700 rounded';
        textarea.rows = field.rows || 4;
        
        // Use value property instead of setAttribute to prevent XSS
        if (field.value) {
            textarea.value = field.value;
        }
        
        if (field.readOnly) {
            textarea.readOnly = true;
        }
        
        if (field.placeholder) {
            // Use placeholder property to prevent XSS
            textarea.placeholder = field.placeholder;
        }
        
        return textarea;
    }

    createSelect(field) {
        const select = document.createElement('select');
        select.id = field.id;
        select.name = field.id;
        select.className = 'w-full p-3 bg-neutral-800 border border-neutral-700 rounded';
        
        if (field.multiple) {
            select.multiple = true;
        }
        
        // Handle options safely
        if (field.options) {
            if (Array.isArray(field.options)) {
                // Handle array of option objects
                field.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value || '';
                    // Use textContent to prevent XSS
                    optionElement.textContent = option.text || '';
                    if (option.selected) {
                        optionElement.selected = true;
                    }
                    select.appendChild(optionElement);
                });
            } else {
                // Handle HTML string options - parse safely
                this.parseAndAppendOptions(field.options, select);
            }
        }
        
        return select;
    }

    createTagsSelect(field) {
        const select = document.createElement('select');
        select.id = field.id;
        select.name = field.id;
        select.className = 'w-full p-3 bg-neutral-800 border border-neutral-700 rounded h-32';
        select.multiple = true;
        
        // Populate with tags safely
        if (window.app && window.app.tags) {
            const selectedTags = field.value || [];
            window.app.tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag.id;
                // Use textContent to prevent XSS
                option.textContent = tag.name;
                if (selectedTags.includes(tag.id)) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
        
        return select;
    }

    parseAndAppendOptions(optionsHtml, selectElement) {
        // Parse HTML options safely without using innerHTML
        // Create a temporary container to hold the parsed elements
        const tempContainer = document.createElement('div');
        
        // Parse the HTML options string by creating elements individually
        // This is a safer approach than using innerHTML
        if (optionsHtml) {
            // Handle options as array of objects or HTML string
            if (Array.isArray(optionsHtml)) {
                optionsHtml.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value || '';
                    // Use textContent to prevent XSS
                    optionElement.textContent = option.text || '';
                    if (option.selected) {
                        optionElement.selected = true;
                    }
                    if (option.disabled) {
                        optionElement.disabled = true;
                    }
                    tempContainer.appendChild(optionElement);
                });
            } else {
                // Parse HTML string options safely using DOMParser
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString('<select>' + optionsHtml + '</select>', 'text/html');
                    const options = doc.querySelectorAll('option');
                    options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option.value || '';
                        // Use textContent to prevent XSS
                        optionElement.textContent = option.textContent;
                        if (option.hasAttribute('selected')) {
                            optionElement.selected = true;
                        }
                        if (option.hasAttribute('disabled')) {
                            optionElement.disabled = true;
                        }
                        tempContainer.appendChild(optionElement);
                    });
                } catch (e) {
                    // Fallback to text content only if parsing fails
                    const optionElement = document.createElement('option');
                    // Use textContent to prevent XSS
                    optionElement.textContent = optionsHtml;
                    tempContainer.appendChild(optionElement);
                }
            }
        }
        
        // Extract and append option elements
        const options = tempContainer.querySelectorAll('option');
        options.forEach(option => {
            // Clone the option to avoid moving issues
            const optionClone = option.cloneNode(true);
            selectElement.appendChild(optionClone);
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.modalForm || !this.currentOnSubmit) {
            return;
        }
        
        try {
            // Collect form data safely
            const formData = new FormData(this.modalForm);
            const data = {};
            
            for (const [key, value] of formData.entries()) {
                // Handle multiple select values
                if (data[key]) {
                    if (Array.isArray(data[key])) {
                        data[key].push(value);
                    } else {
                        data[key] = [data[key], value];
                    }
                } else {
                    data[key] = value;
                }
            }
            
            // Handle multi-select for tags specifically
            const tagsSelect = this.modalForm.querySelector('select[name="tags"]');
            if (tagsSelect) {
                data.tags = Array.from(tagsSelect.selectedOptions).map(option => option.value);
            }
            
            // Show loading state
            const originalSaveText = this.modalSave ? this.modalSave.textContent : 'Save';
            if (this.modalSave) {
                this.modalSave.textContent = 'Saving...';
                this.modalSave.disabled = true;
            }
            
            // Call onSubmit handler
            await this.currentOnSubmit(data);
            
            // Close modal on success
            this.close();
        } catch (error) {
            console.error('Error saving form:', error);
            window.NotificationSystem?.error('Failed to save changes. Please try again.') || console.error('Failed to save changes. Please try again.');
        } finally {
            // Reset button state
            if (this.modalSave) {
                this.modalSave.textContent = originalSaveText;
                this.modalSave.disabled = false;
            }
        }
    }
}

// Initialize modal system
const modalSystem = new ModalSystem();

// Make it available globally
window.ModalSystem = modalSystem;

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalSystem;
}