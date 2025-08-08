# Chrome extension for SCRUM Daily Standup
This Chrome extension is designed to facilitate daily standup meetings for SCRUM teams. It provides a simple interface for team members to quickly share their updates, including what they did yesterday, what they plan to do today, and any blockers they are facing.

## Use cases:
1. User clicks on the extension icon in the Chrome toolbar.
2. A popup appears with fields for entering updates.
3. The popup includes:
    - List of all Tickets assigned to the user along with their status (e.g., "In Progress", "In Review") and Planned completion date.
    - Text fields against each ticket for:
        - What was done yesterday
        - What will be done today
        - Any blockers faced
        - Completion date: <Date picker for selecting the planned completion date of the ticket.>
    - Freeform rows for adding a ticket number to the update in case Developer worked on a ticket not listed in the extension.
4. Once the user submits the update, it is uploaded as a comment on the ticket in Jira in the following format:
   ```
   Yesterday: [What was done yesterday]
   Today: [What will be done today]
   Blockers: [Any blockers faced]
   Completion Date: [Planned completion date]
   ```

5. The extension should handle multiple tickets and allow users to submit updates for each ticket in a single action 
   or individually.
6. The extension should also allow users to view their previous updates for reference.

## Technical Requirements:
- The extension should be built using HTML, CSS, and JavaScript.
- It should use the Jira API to fetch ticket details and post comments.
- The extension should be compatible with the latest version of Chrome.
- The extension should handle authentication with Jira securely via a settings field where the user can enter their Jira API token.
- The extension should be responsive and user-friendly, ensuring a smooth experience on various screen sizes.

## Development Notes:
- Ensure that the extension adheres to Chrome's extension development guidelines.
- Use modern JavaScript features and best practices for code quality.
- Consider implementing error handling for API requests to Jira.
- Test the extension thoroughly to ensure it works as expected across different scenarios.
