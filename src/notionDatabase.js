/**
 * Module for handling Notion database operations in the TODOtoNOTION extension.
 */

var vscode = require('vscode');
var { Client } = require('@notionhq/client');
var notionClient;

/**
 * Fetches the current state of tasks from the Notion database.
 * @param {Object} context - The VSCode extension context for accessing credentials.
 * @param {Object} credentials - The Notion credentials (token and databaseId).
 * @param {Function} debug - Debug logging function.
 * @returns {Promise<Array>} - A promise resolving to an array of task objects from Notion with custom ID mapping.
 */
async function fetchNotionState(context, credentials, debug) {
    try {
        const { token, databaseId } = credentials;
        if (!token || !databaseId) {
            vscode.window.showErrorMessage("Notion integration not configured. Please set credentials first.");
            debug("Notion credentials not configured for fetchNotionState.");
            return [];
        }

        // Initialize Notion client with the token
        notionClient = new Client({ auth: token });
        
        // Query the database for all pages
        const response = await notionClient.databases.query({
            database_id: databaseId
        });

        const tasks = response.results.map(page => {
            let taskText = "Untitled Task";
            let customId = "";
            let filePath = "";
            let lineNumber = undefined;
            let type = "";
            let status = "";
            try {
                if (page.properties.Name && page.properties.Name.title && page.properties.Name.title.length > 0) {
                    taskText = page.properties.Name.title[0].plain_text;
                }
                if (page.properties.TODO_ID && page.properties.TODO_ID.rich_text && page.properties.TODO_ID.rich_text.length > 0) {
                    customId = page.properties.TODO_ID.rich_text[0].plain_text;
                }
                if (page.properties["File Path"] && page.properties["File Path"].rich_text && page.properties["File Path"].rich_text.length > 0) {
                    filePath = page.properties["File Path"].rich_text[0].plain_text;
                }
                if (page.properties["Line Number"] && typeof page.properties["Line Number"].number === 'number') {
                    lineNumber = page.properties["Line Number"].number;
                }
                if (page.properties.Type && page.properties.Type.select && page.properties.Type.select.name) {
                    type = page.properties.Type.select.name;
                }
                if (page.properties.Status && page.properties.Status.select && page.properties.Status.select.name) {
                    status = page.properties.Status.select.name;
                }
            } catch (error) {
                debug("Error accessing task details for page " + page.id + ": " + error.message);
            }
            return {
                id: page.id,
                customId: customId,
                text: taskText,
                filePath: filePath,
                lineNumber: lineNumber,
                type: type,
                status: status
            };
        });

        debug("Fetched " + tasks.length + " tasks from Notion database.");
        vscode.window.showInformationMessage("Fetched " + tasks.length + " tasks from Notion.");
        return tasks;
    } catch (error) {
        if (error.message.includes("Could not find database with ID")) {
            vscode.window.showErrorMessage(`Failed to fetch Notion state: Database ID ${credentials.databaseId} not found. Ensure the database is shared with your integration.`, "Set Credentials").then(selection => {
                if (selection === "Set Credentials") {
                    vscode.commands.executeCommand('TODOtoNOTION.setCredentials');
                }
            });
            debug("Error fetching Notion state: Database not found - " + error.message);
        } else if (error.message.includes("API token is invalid")) {
            vscode.window.showErrorMessage("Failed to fetch Notion state: Invalid API token. Please update your credentials.", "Set Credentials").then(selection => {
                if (selection === "Set Credentials") {
                    vscode.commands.executeCommand('TODOtoNOTION.setCredentials');
                }
            });
            debug("Error fetching Notion state: Invalid API token - " + error.message);
        } else {
            vscode.window.showErrorMessage("Failed to fetch Notion state: " + error.message);
            debug("Error fetching Notion state: " + error.message);
        }
        return [];
    }
}

/**
 * Retrieves the list of database properties for the Notion database.
 * @param {Object} context - The VSCode extension context for accessing credentials.
 * @param {Object} credentials - The Notion credentials (token and databaseId).
 * @param {Function} debug - Debug logging function.
 * @returns {Promise<Object>} - A promise resolving to an object mapping property names to their types.
 */
async function listDatabaseProperties(context, credentials, debug) {
    try {
        const { token, databaseId } = credentials;
        if (!token || !databaseId) {
            vscode.window.showErrorMessage("Notion integration not configured. Please set credentials first.");
            debug("Notion credentials not configured for listDatabaseProperties.");
            return null;
        }

        // Initialize Notion client if not already done
        if (!notionClient) {
            notionClient = new Client({ auth: token });
        }

        // Retrieve the database information
        const response = await notionClient.databases.retrieve({
            database_id: databaseId
        });

        // Extract and return the properties schema
        const properties = response.properties;
        const propertySchema = {};
        for (const [key, value] of Object.entries(properties)) {
            propertySchema[key] = value.type;
        }

        debug("Retrieved database properties schema from Notion.");
        return propertySchema;
    } catch (error) {
        if (error.message.includes("API token is invalid")) {
            vscode.window.showErrorMessage("Failed to retrieve database properties: Invalid API token. Please update your credentials.", "Set Credentials").then(selection => {
                if (selection === "Set Credentials") {
                    vscode.commands.executeCommand('TODOtoNOTION.setCredentials');
                }
            });
            debug("Error retrieving database properties: Invalid API token - " + error.message);
        } else {
            vscode.window.showErrorMessage("Failed to retrieve database properties: " + error.message);
            debug("Error retrieving database properties: " + error.message);
        }
        return null;
    }
}

/**
 * Gets the Notion client instance, initializing it if necessary.
 * @param {string} token - The Notion API token.
 * @returns {Object} The Notion client instance.
 */
function getNotionClient(token) {
    if (!notionClient) {
        notionClient = new Client({ auth: token });
    }
    return notionClient;
}

module.exports = {
    fetchNotionState,
    listDatabaseProperties,
    getNotionClient
};
