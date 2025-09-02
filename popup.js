class StandupExtension {
    constructor() {
        this.jiraConfig = null;
        this.tickets = [];
        this.init();
    }

    async init() {
        await this.loadConfiguration();
        this.bindEvents();
        this.setupInitialFreeformTicket();
        await this.loadTickets();
    }

    setupInitialFreeformTicket() {
        // Setup the initial freeform ticket that's already in the HTML
        const initialTicket = document.querySelector('.freeform-ticket');
        if (initialTicket) {
            const ticketInput = initialTicket.querySelector('.ticket-input');
            
            // Add blur event to convert to link
            if (ticketInput) {
                ticketInput.addEventListener('blur', () => {
                    const ticketKey = ticketInput.value.trim();
                    if (ticketKey && this.jiraConfig && this.jiraConfig.domain) {
                        this.convertInputToLink(ticketInput, ticketKey);
                    }
                });
            }

            // Add submit functionality
            const submitBtn = initialTicket.querySelector('.submit-ticket-btn');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => {
                    const ticketKey = this.getTicketKeyFromRow(initialTicket);
                    if (ticketKey) {
                        this.submitTicketUpdate(ticketKey, initialTicket);
                    } else {
                        alert('Please enter a ticket number');
                    }
                });
            }

            // Add remove functionality
            const removeBtn = initialTicket.querySelector('.remove-ticket-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    initialTicket.remove();
                });
            }
        }
    }

    async loadConfiguration() {
        try {
            const result = await chrome.storage.sync.get(['jiraConfig']);
            this.jiraConfig = result.jiraConfig;
            
            if (!this.jiraConfig || !this.jiraConfig.domain || !this.jiraConfig.apiToken || !this.jiraConfig.email) {
                this.showConfigureView();
                return;
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            this.showError('Failed to load configuration');
        }
    }

    bindEvents() {
        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });

        // Configure button
        document.getElementById('openSettingsBtn')?.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });

        // Retry button
        document.getElementById('retryBtn').addEventListener('click', async () => {
            await this.loadConfiguration();
            await this.loadTickets();
        });

        // Add ticket button
        document.getElementById('addTicketBtn').addEventListener('click', () => {
            this.addFreeformTicket();
        });

        // Submit all button
        document.getElementById('submitAllBtn').addEventListener('click', () => {
            this.submitAllUpdates();
        });

        // View history button
        document.getElementById('viewHistoryBtn').addEventListener('click', () => {
            this.showHistory();
        });

        // Close history modal
        document.getElementById('closeHistoryBtn').addEventListener('click', () => {
            this.hideHistory();
        });

        // Close modal when clicking outside
        document.getElementById('historyModal').addEventListener('click', (e) => {
            if (e.target.id === 'historyModal') {
                this.hideHistory();
            }
        });
    }

    showLoading() {
        document.getElementById('loadingDiv').classList.remove('hidden');
        document.getElementById('errorDiv').classList.add('hidden');
        document.getElementById('configureDiv').classList.add('hidden');
        document.getElementById('mainContent').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorDiv').classList.remove('hidden');
        document.getElementById('loadingDiv').classList.add('hidden');
        document.getElementById('configureDiv').classList.add('hidden');
        document.getElementById('mainContent').classList.add('hidden');
    }

    showConfigureView() {
        document.getElementById('configureDiv').classList.remove('hidden');
        document.getElementById('loadingDiv').classList.add('hidden');
        document.getElementById('errorDiv').classList.add('hidden');
        document.getElementById('mainContent').classList.add('hidden');
    }

    showMainContent() {
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('loadingDiv').classList.add('hidden');
        document.getElementById('errorDiv').classList.add('hidden');
        document.getElementById('configureDiv').classList.add('hidden');
    }

    async loadTickets() {
        if (!this.jiraConfig) {
            this.showConfigureView();
            return;
        }

        this.showLoading();

        try {
            // Use the new /search/jql endpoint and updated body format
            const response = await this.makeJiraRequest('/rest/api/3/search/jql', {
                method: 'POST',
                body: JSON.stringify({
                    jql: `assignee = 636cef379cde5926182a2b52 AND status NOT IN ("Ready to release",Released,Closed) AND Sprint in openSprints() AND resolution = Unresolved order by priority DESC,updated DESC`,
                    fields: ['summary', 'status', 'assignee', 'updated', 'duedate'],
                    maxResults: 50
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.errorMessages?.[0] || 'Failed to fetch tickets');
            }

            this.tickets = data.issues || [];
            this.renderTickets();
            this.showMainContent();
        } catch (error) {
            console.error('Error loading tickets:', error);
            this.showError(`Failed to load tickets: ${error.message}`);
        }
    }

    renderTickets() {
        const ticketsList = document.getElementById('ticketsList');
        ticketsList.innerHTML = '';

        if (this.tickets.length === 0) {
            ticketsList.innerHTML = '<p class="no-tickets">No assigned tickets found.</p>';
            return;
        }

        this.tickets.forEach(ticket => {
            const ticketCard = this.createTicketCard(ticket);
            ticketsList.appendChild(ticketCard);
        });
    }

    createTicketCard(ticket) {
        const card = document.createElement('div');
        card.className = 'ticket-card';
        card.dataset.ticketKey = ticket.key;

        const statusClass = this.getStatusClass(ticket.fields.status.name);
        const ticketUrl = `https://${this.jiraConfig.domain}.atlassian.net/browse/${ticket.key}`;

        card.innerHTML = `
            <div class="ticket-header">
                <div class="ticket-info">
                    <h3>${ticket.key}: ${ticket.fields.summary}</h3>
                    <span class="ticket-status ${statusClass}">${ticket.fields.status.name}</span>
                </div>
            </div>
            <div class="ticket-row">
                <a href="${ticketUrl}" target="_blank" class="ticket-link" title="Open ticket in Jira">${ticket.key}</a>
                <textarea placeholder="Yesterday" class="yesterday-input" data-field="yesterday"></textarea>
                <textarea placeholder="Today" class="today-input" data-field="today"></textarea>
                <textarea placeholder="Blockers" class="blockers-input" data-field="blockers"></textarea>
                <label for="completionDate-${ticket.key}">Completion Date:</label>
                <input type="date" style="font-size: 12px;" class="completion-date-input" data-field="completionDate" value="${ticket.fields.duedate || ''}">
                <button class="submit-ticket-btn" data-ticket-key="${ticket.key}">Submit</button>
            </div>
        `;

        // Add event listener for individual submit button
        card.querySelector('.submit-ticket-btn').addEventListener('click', () => {
            this.submitTicketUpdate(ticket.key);
        });

        return card;
    }

    getStatusClass(status) {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('todo') || statusLower.includes('to do') || statusLower.includes('open')) {
            return 'status-todo';
        } else if (statusLower.includes('progress') || statusLower.includes('development')) {
            return 'status-inprogress';
        } else if (statusLower.includes('review') || statusLower.includes('testing')) {
            return 'status-inreview';
        } else if (statusLower.includes('done') || statusLower.includes('closed')) {
            return 'status-done';
        }
        return 'status-todo';
    }

    addFreeformTicket() {
        const freeformTickets = document.getElementById('freeformTickets');
        const ticketDiv = document.createElement('div');
        ticketDiv.className = 'freeform-ticket';

        ticketDiv.innerHTML = `
            <div class="ticket-row">
                <input type="text" placeholder="Ticket #" class="ticket-input">
                <textarea placeholder="Yesterday" class="yesterday-input"></textarea>
                <textarea placeholder="Today" class="today-input"></textarea>
                <textarea placeholder="Blockers" class="blockers-input"></textarea>
                <input type="date" class="completion-date-input">
                <button class="submit-ticket-btn">Submit</button>
                <button class="remove-ticket-btn" title="Remove">×</button>
            </div>
        `;

        const ticketInput = ticketDiv.querySelector('.ticket-input');
        
        // Convert ticket input to link when value changes
        ticketInput.addEventListener('blur', () => {
            const ticketKey = ticketInput.value.trim();
            if (ticketKey && this.jiraConfig && this.jiraConfig.domain) {
                this.convertInputToLink(ticketInput, ticketKey);
            }
        });

        // Add remove functionality
        ticketDiv.querySelector('.remove-ticket-btn').addEventListener('click', () => {
            ticketDiv.remove();
        });

        // Add submit functionality for individual freeform ticket
        ticketDiv.querySelector('.submit-ticket-btn').addEventListener('click', () => {
            const ticketKey = this.getTicketKeyFromRow(ticketDiv);
            if (ticketKey) {
                this.submitTicketUpdate(ticketKey, ticketDiv);
            } else {
                alert('Please enter a ticket number');
            }
        });

        freeformTickets.appendChild(ticketDiv);
    }

    convertInputToLink(input, ticketKey) {
        const ticketUrl = `https://${this.jiraConfig.domain}.atlassian.net/browse/${ticketKey}`;
        const link = document.createElement('a');
        link.href = ticketUrl;
        link.target = '_blank';
        link.className = 'ticket-link';
        link.title = 'Click to open ticket in Jira • Double-click to edit';
        link.textContent = ticketKey;
        link.dataset.ticketKey = ticketKey;
        
        // Add click handler to convert back to input for editing
        link.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.convertLinkToInput(link, ticketKey);
        });
        
        input.parentNode.replaceChild(link, input);
    }

    convertLinkToInput(link, ticketKey) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'ticket-input';
        input.value = ticketKey;
        input.placeholder = 'Ticket #';
        
        // Add blur event to convert back to link
        input.addEventListener('blur', () => {
            const newTicketKey = input.value.trim();
            if (newTicketKey && this.jiraConfig && this.jiraConfig.domain) {
                this.convertInputToLink(input, newTicketKey);
            }
        });
        
        link.parentNode.replaceChild(input, link);
        input.focus();
        input.select();
    }

    getTicketKeyFromRow(row) {
        const ticketInput = row.querySelector('.ticket-input');
        const ticketLink = row.querySelector('.ticket-link');
        
        if (ticketInput) {
            return ticketInput.value.trim();
        } else if (ticketLink) {
            return ticketLink.dataset.ticketKey || ticketLink.textContent.trim();
        }
        
        return '';
    }

    async submitTicketUpdate(ticketKey, customCard = null) {
        const card = customCard || document.querySelector(`[data-ticket-key="${ticketKey}"]`);
        if (!card) return;

        const updates = this.extractUpdatesFromCard(card);
        if (!this.validateUpdates(updates)) {
            alert('Please fill in at least one field before submitting.');
            return;
        }

        try {
            await this.postUpdateToJira(ticketKey, updates);
            await this.saveUpdateHistory(ticketKey, updates);
            
            // Clear the form after successful submission
            this.clearCardInputs(card);
            
            alert('Update posted successfully!');
        } catch (error) {
            console.error('Error submitting update:', error);
            alert(`Failed to submit update: ${error.message}`);
        }
    }

    async submitAllUpdates() {
        const allCards = document.querySelectorAll('.ticket-card');
        const freeformTickets = document.querySelectorAll('.freeform-ticket');
        
        let successCount = 0;
        let totalCount = 0;
        const errors = [];

        // Process assigned tickets
        for (const card of allCards) {
            const ticketKey = card.dataset.ticketKey;
            const updates = this.extractUpdatesFromCard(card);
            
            if (this.validateUpdates(updates)) {
                totalCount++;
                try {
                    await this.postUpdateToJira(ticketKey, updates);
                    await this.saveUpdateHistory(ticketKey, updates);
                    this.clearCardInputs(card);
                    successCount++;
                } catch (error) {
                    errors.push(`${ticketKey}: ${error.message}`);
                }
            }
        }

        // Process freeform tickets
        for (const ticket of freeformTickets) {
            const ticketKey = ticket.querySelector('.ticket-input').value.trim();
            if (!ticketKey) continue;

            const updates = this.extractUpdatesFromCard(ticket);
            
            if (this.validateUpdates(updates)) {
                totalCount++;
                try {
                    await this.postUpdateToJira(ticketKey, updates);
                    await this.saveUpdateHistory(ticketKey, updates);
                    this.clearCardInputs(ticket);
                    successCount++;
                } catch (error) {
                    errors.push(`${ticketKey}: ${error.message}`);
                }
            }
        }

        // Show results
        if (totalCount === 0) {
            alert('No updates to submit. Please fill in at least one field for any ticket.');
        } else if (successCount === totalCount) {
            alert(`All ${successCount} updates submitted successfully!`);
        } else {
            const errorMessage = errors.length > 0 ? `\n\nErrors:\n${errors.join('\n')}` : '';
            alert(`${successCount} of ${totalCount} updates submitted successfully.${errorMessage}`);
        }
    }

    extractUpdatesFromCard(card) {
        return {
            yesterday: card.querySelector('.yesterday-input')?.value.trim() || '',
            today: card.querySelector('.today-input')?.value.trim() || '',
            blockers: card.querySelector('.blockers-input')?.value.trim() || '',
            completionDate: card.querySelector('.completion-date-input')?.value || ''
        };
    }

    validateUpdates(updates) {
        return updates.yesterday || updates.today || updates.blockers || updates.completionDate;
    }

    clearCardInputs(card) {
        card.querySelector('.yesterday-input').value = '';
        card.querySelector('.today-input').value = '';
        card.querySelector('.blockers-input').value = '';
        // Don't clear completion date as it might be a planned date
    }

    async postUpdateToJira(ticketKey, updates) {
        const comment = this.formatUpdateComment(updates);
        
        const response = await this.makeJiraRequest(`/rest/api/3/issue/${ticketKey}/comment`, {
            method: 'POST',
            body: JSON.stringify({
                body: {
                    type: 'doc',
                    version: 1,
                    content: [{
                        type: 'paragraph',
                        content: [{
                            type: 'text',
                            text: comment
                        }]
                    }]
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errorMessages?.[0] || 'Failed to post comment');
        }
    }

    formatUpdateComment(updates) {
        let comment = 'Daily Standup Update:\n\n';
        
        if (updates.yesterday) {
            comment += `Yesterday: ${updates.yesterday}\n`;
        }
        
        if (updates.today) {
            comment += `Today: ${updates.today}\n`;
        }
        
        if (updates.blockers) {
            comment += `Blockers: ${updates.blockers}\n`;
        }
        
        if (updates.completionDate) {
            const formattedDate = new Date(updates.completionDate).toLocaleDateString();
            comment += `Completion Date: ${formattedDate}\n`;
        }
        
        return comment;
    }

    async saveUpdateHistory(ticketKey, updates) {
        try {
            const result = await chrome.storage.local.get(['updateHistory']);
            const history = result.updateHistory || [];
            
            history.unshift({
                ticketKey,
                updates,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 50 entries
            if (history.length > 50) {
                history.splice(50);
            }
            
            await chrome.storage.local.set({ updateHistory: history });
        } catch (error) {
            console.error('Error saving update history:', error);
        }
    }

    async showHistory() {
        try {
            const result = await chrome.storage.local.get(['updateHistory']);
            const history = result.updateHistory || [];
            
            const historyContent = document.getElementById('historyContent');
            
            if (history.length === 0) {
                historyContent.innerHTML = '<p>No update history found.</p>';
            } else {
                historyContent.innerHTML = history.map(entry => `
                    <div class="history-item">
                        <h4>${entry.ticketKey}</h4>
                        <div class="date">${new Date(entry.timestamp).toLocaleString()}</div>
                        <div class="update-content">
                            ${entry.updates.yesterday ? `<strong>Yesterday:</strong> ${entry.updates.yesterday}<br>` : ''}
                            ${entry.updates.today ? `<strong>Today:</strong> ${entry.updates.today}<br>` : ''}
                            ${entry.updates.blockers ? `<strong>Blockers:</strong> ${entry.updates.blockers}<br>` : ''}
                            ${entry.updates.completionDate ? `<strong>Completion Date:</strong> ${new Date(entry.updates.completionDate).toLocaleDateString()}<br>` : ''}
                        </div>
                    </div>
                `).join('');
            }
            
            document.getElementById('historyModal').classList.remove('hidden');
        } catch (error) {
            console.error('Error loading history:', error);
            alert('Failed to load update history');
        }
    }

    hideHistory() {
        document.getElementById('historyModal').classList.add('hidden');
    }

    async makeJiraRequest(endpoint, options = {}) {
        const url = `https://${this.jiraConfig.domain}.atlassian.net${endpoint}`;
        const auth = btoa(`${this.jiraConfig.email}:${this.jiraConfig.apiToken}`);
        
        const defaultOptions = {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };
        
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        return fetch(url, finalOptions);
    }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StandupExtension();
});
