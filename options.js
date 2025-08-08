class OptionsManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.bindEvents();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['jiraConfig']);
            const config = result.jiraConfig || {};
            
            document.getElementById('jiraDomain').value = config.domain || '';
            document.getElementById('jiraEmail').value = config.email || '';
            document.getElementById('jiraApiToken').value = config.apiToken || '';
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showStatus('Failed to load settings', 'error');
        }
    }

    bindEvents() {
        // Form submission
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Test connection
        document.getElementById('testConnectionBtn').addEventListener('click', () => {
            this.testConnection();
        });

        // Clear history
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.clearHistory();
        });

        // Clear all data
        document.getElementById('clearAllDataBtn').addEventListener('click', () => {
            this.clearAllData();
        });
    }

    async saveSettings() {
        const domain = document.getElementById('jiraDomain').value.trim();
        const email = document.getElementById('jiraEmail').value.trim();
        const apiToken = document.getElementById('jiraApiToken').value.trim();

        if (!domain || !email || !apiToken) {
            this.showStatus('Please fill in all required fields', 'error');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showStatus('Please enter a valid email address', 'error');
            return;
        }

        // Clean up domain (remove protocol and .atlassian.net if present)
        const cleanDomain = domain
            .replace(/^https?:\/\//, '')
            .replace(/\.atlassian\.net.*$/, '');

        const jiraConfig = {
            domain: cleanDomain,
            email: email,
            apiToken: apiToken
        };

        try {
            await chrome.storage.sync.set({ jiraConfig });
            this.showStatus('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Failed to save settings', 'error');
        }
    }

    async testConnection() {
        const domain = document.getElementById('jiraDomain').value.trim();
        const email = document.getElementById('jiraEmail').value.trim();
        const apiToken = document.getElementById('jiraApiToken').value.trim();

        if (!domain || !email || !apiToken) {
            this.showStatus('Please fill in all fields before testing', 'error');
            return;
        }

        const testBtn = document.getElementById('testConnectionBtn');
        const originalText = testBtn.textContent;
        
        testBtn.classList.add('loading');
        testBtn.disabled = true;

        try {
            // Clean up domain
            const cleanDomain = domain
                .replace(/^https?:\/\//, '')
                .replace(/\.atlassian\.net.*$/, '');

            const auth = btoa(`${email}:${apiToken}`);
            const url = `https://${cleanDomain}.atlassian.net/rest/api/3/myself`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.showStatus(`Connection successful! Welcome, ${userData.displayName}`, 'success');
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.errorMessages?.[0] || `HTTP ${response.status}: ${response.statusText}`;
                this.showStatus(`Connection failed: ${errorMessage}`, 'error');
            }
        } catch (error) {
            console.error('Connection test error:', error);
            
            let errorMessage = 'Connection failed';
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Network error. Check your domain name and internet connection.';
            } else {
                errorMessage = `Connection failed: ${error.message}`;
            }
            
            this.showStatus(errorMessage, 'error');
        } finally {
            testBtn.classList.remove('loading');
            testBtn.disabled = false;
        }
    }

    async clearHistory() {
        if (!confirm('Are you sure you want to clear your update history? This action cannot be undone.')) {
            return;
        }

        try {
            await chrome.storage.local.remove(['updateHistory']);
            this.showStatus('Update history cleared successfully', 'success');
        } catch (error) {
            console.error('Error clearing history:', error);
            this.showStatus('Failed to clear update history', 'error');
        }
    }

    async clearAllData() {
        if (!confirm('Are you sure you want to clear ALL data including settings and history? This action cannot be undone.')) {
            return;
        }

        const doubleConfirm = confirm('This will remove all your Jira settings and update history. Are you absolutely sure?');
        if (!doubleConfirm) {
            return;
        }

        try {
            await chrome.storage.sync.clear();
            await chrome.storage.local.clear();
            
            // Clear form fields
            document.getElementById('jiraDomain').value = '';
            document.getElementById('jiraEmail').value = '';
            document.getElementById('jiraApiToken').value = '';
            
            this.showStatus('All data cleared successfully', 'success');
        } catch (error) {
            console.error('Error clearing all data:', error);
            this.showStatus('Failed to clear all data', 'error');
        }
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type} show`;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 5000);

        // Hide when clicking the message
        statusElement.onclick = () => {
            statusElement.classList.remove('show');
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});
