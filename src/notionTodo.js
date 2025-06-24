/**
 * Module for managing TODO operations in Notion for the TODOtoNOTION extension.
 */

var vscode = require('vscode');
var notionDatabase = require('./notionDatabase.js');

/**
 * Creates a new TODO item in Notion and returns the assigned ID.
 * @param {Object} context - The VSCode extension context for accessing credentials.
 * @param {Object} credentials - The Notion credentials (token and databaseId).
 * @param {Object} todo - The TODO item to create in Notion.
 * @param {Function} debug - Debug logging function.
 * @returns {Promise<string|null>} - A promise resolving to the new TODO's ID or null if creation fails.
 */
async function createTodo(context, credentials, todo, debug) {
    try {
        const { token, databaseId } = credentials;
        if (!token || !databaseId) {
            vscode.window.showErrorMessage("Notion integration not configured. Please set credentials first.");
            debug("Notion credentials not configured for createTodo.");
            return null;
        }

        // Initialize Notion client if not already done
        const notionClient = notionDatabase.getNotionClient(token);

        // Start with essential properties for TODO creation
        const properties = {
            Name: {
                title: [
                    {
                        text: {
                            content: todo.text
                        }
                    }
                ]
            },
            Type: {
                select: {
                    name: todo.type || "TODO"
                }
            },
            Status: {
                select: {
                    name: todo.status || "Not started"
                }
            }
        };

        // Fetch database properties to check which ones exist
        const dbProperties = await notionDatabase.listDatabaseProperties(context, credentials, debug);
        let missingProperties = [];
        if (dbProperties) {
            if (dbProperties["File Path"] && todo.filePath) {
                properties["File Path"] = {
                    rich_text: [
                        {
                            text: {
                                content: todo.filePath || "Unknown"
                            }
                        }
                    ]
                };
            } else if (!dbProperties["File Path"]) {
                missingProperties.push("File Path");
            }
            if (dbProperties["Line Number"] && todo.lineNumber !== undefined) {
                properties["Line Number"] = {
                    rich_text: [
                        {
                            text: {
                                content: String(todo.lineNumber)
                            }
                        }
                    ]
                };
            } else if (!dbProperties["Line Number"]) {
                missingProperties.push("Line Number");
            }
            if (dbProperties["TODO_ID"] && todo.id) {
                properties["TODO_ID"] = {
                    rich_text: [
                        {
                            text: {
                                content: todo.id
                            }
                        }
                    ]
                };
            } else if (!dbProperties["TODO_ID"]) {
                missingProperties.push("TODO_ID");
            }
        } else {
            debug("Could not fetch database properties, using only essential properties for TODO creation.");
            vscode.window.showWarningMessage("Could not verify Notion database properties. Only essential fields will be set for the TODO.");
            missingProperties = ["File Path", "Line Number", "ID"];
        }

        // Create a new page in the specified database with checked properties
        const response = await notionClient.pages.create({
            parent: { database_id: databaseId },
            properties: properties
        });

        if (missingProperties.length > 0) {
            debug("Note: The following properties were not set for TODO creation due to schema mismatch: " + missingProperties.join(", ") + ". Available data - File Path: " + (todo.filePath || "Unknown") + ", Line Number: " + (todo.lineNumber || 0));
            vscode.window.showWarningMessage("TODO created without: " + missingProperties.join(", ") + ". Ensure these properties (especially 'Line Number') are defined in your Notion database schema to track TODO locations accurately.");
        }

        const newId = response.id;
        debug(`Created TODO in Notion with ID: ${newId} for text: ${todo.text}`);
        vscode.window.showInformationMessage(`Created TODO in Notion: ${todo.text}`);
        return newId;
    } catch (error) {
        if (error.message.includes("Could not find database with ID")) {
            vscode.window.showErrorMessage(`Failed to create TODO in Notion: Database ID ${credentials.databaseId} not found. Ensure the database is shared with your integration.`, "Set Credentials").then(selection => {
                if (selection === "Set Credentials") {
                    vscode.commands.executeCommand('TODOtoNOTION.setCredentials');
                }
            });
            debug("Error creating TODO in Notion: Database not found - " + error.message);
        } else if (error.message.includes("API token is invalid")) {
            vscode.window.showErrorMessage("Failed to create TODO in Notion: Invalid API token. Please update your credentials.", "Set Credentials").then(selection => {
                if (selection === "Set Credentials") {
                    vscode.commands.executeCommand('TODOtoNOTION.setCredentials');
                }
            });
            debug("Error creating TODO in Notion: Invalid API token - " + error.message);
        } else {
            vscode.window.showErrorMessage("Failed to create TODO in Notion: " + error.message);
            debug("Error creating TODO in Notion: " + error.message);
        }
        return null;
    }
}

/**
 * Updates an existing TODO item in Notion with the provided updates.
 * @param {Object} context - The VSCode extension context for accessing credentials.
 * @param {Object} credentials - The Notion credentials (token).
 * @param {string} todoId - The ID of the TODO item to update (Notion page ID).
 * @param {Object} updates - The updates to apply to the TODO item.
 * @param {Function} debug - Debug logging function.
 * @returns {Promise<boolean>} - A promise resolving to true if update succeeds, false otherwise.
 */
async function updateTodo(context, credentials, todoId, updates, debug) {
    try {
        const { token } = credentials;
        if (!token) {
            vscode.window.showErrorMessage("Notion integration not configured. Please set credentials first.");
            debug("Notion credentials not configured for updateTodo.");
            return false;
        }

        // Initialize Notion client if not already done
        const notionClient = notionDatabase.getNotionClient(token);

        // Start with essential properties for TODO update
        const properties = {
            Name: {
                title: [
                    {
                        text: {
                            content: updates.text
                        }
                    }
                ]
            },
            Type: {
                select: {
                    name: updates.type || "TODO"
                }
            },
            Status: {
                select: {
                    name: updates.status || "Not started"
                }
            }
        };

        // Fetch database properties to check which ones exist
        const dbProperties = await notionDatabase.listDatabaseProperties(context, credentials, debug);
        let missingProperties = [];
        if (dbProperties) {
            if (dbProperties["File Path"] && updates.filePath) {
                properties["File Path"] = {
                    rich_text: [
                        {
                            text: {
                                content: updates.filePath || "Unknown"
                            }
                        }
                    ]
                };
            } else if (!dbProperties["File Path"]) {
                missingProperties.push("File Path");
            }
            if (dbProperties["Line Number"] && updates.lineNumber !== undefined) {
                properties["Line Number"] = {
                    rich_text: [
                        {
                            text: {
                                content: String(updates.lineNumber)
                            }
                        }
                    ]
                };
            } else if (!dbProperties["Line Number"]) {
                missingProperties.push("Line Number");
            }
            if (dbProperties["TODO_ID"] && updates.id) {
                properties["TODO_ID"] = {
                    rich_text: [
                        {
                            text: {
                                content: updates.id
                            }
                        }
                    ]
                };
            } else if (!dbProperties["TODO_ID"]) {
                missingProperties.push("TODO_ID");
            }
        } else {
            debug("Could not fetch database properties, using only essential properties for TODO update.");
            vscode.window.showWarningMessage("Could not verify Notion database properties. Only essential fields will be updated for the TODO.");
            missingProperties = ["File Path", "Line Number", "TODO_ID"];
        }

        // Update the page with the given ID with checked properties
        const response = await notionClient.pages.update({
            page_id: todoId,
            properties: properties
        });

        if (missingProperties.length > 0) {
            debug("Note: The following properties were not updated for TODO due to schema mismatch: " + missingProperties.join(", ") + ". Available data - File Path: " + (updates.filePath || "Unknown") + ", Line Number: " + (updates.lineNumber || 0));
            vscode.window.showWarningMessage("TODO updated without: " + missingProperties.join(", ") + ". Ensure these properties (especially 'Line Number') are defined in your Notion database schema to track TODO locations accurately.");
        }

        debug(`Updated TODO in Notion with ID: ${todoId}`);
        vscode.window.showInformationMessage(`Updated TODO in Notion: ${updates.text}`);
        return true;
    } catch (error) {
        if (error.message.includes("API token is invalid")) {
            vscode.window.showErrorMessage("Failed to update TODO in Notion: Invalid API token. Please update your credentials.", "Set Credentials").then(selection => {
                if (selection === "Set Credentials") {
                    vscode.commands.executeCommand('TODOtoNOTION.setCredentials');
                }
            });
            debug("Error updating TODO in Notion: Invalid API token - " + error.message);
        } else {
            vscode.window.showErrorMessage("Failed to update TODO in Notion: " + error.message);
            debug("Error updating TODO in Notion: " + error.message);
        }
        return false;
    }
}

/**
 * Deletes (archives) a TODO item in Notion.
 * @param {Object} context - The VSCode extension context for accessing credentials.
 * @param {Object} credentials - The Notion credentials (token).
 * @param {string} todoId - The ID of the TODO item to delete.
 * @param {Function} debug - Debug logging function.
 * @returns {Promise<boolean>} - A promise resolving to true if deletion succeeds, false otherwise.
 */
async function deleteTodo(context, credentials, todoId, debug) {
    try {
        const { token } = credentials;
        if (!token) {
            vscode.window.showErrorMessage("Notion integration not configured. Please set credentials first.");
            debug("Notion credentials not configured for deleteTodo.");
            return false;
        }

        // Initialize Notion client if not already done
        const notionClient = notionDatabase.getNotionClient(token);

        // Archive the page in Notion to remove it from active view
        const response = await notionClient.pages.update({
            page_id: todoId,
            archived: true
        });

        debug(`Archived TODO in Notion with ID: ${todoId}`);
        vscode.window.showInformationMessage(`Archived TODO in Notion with ID: ${todoId}`);
        return true;
    } catch (error) {
        if (error.message.includes("API token is invalid")) {
            vscode.window.showErrorMessage("Failed to delete TODO in Notion: Invalid API token. Please update your credentials.", "Set Credentials").then(selection => {
                if (selection === "Set Credentials") {
                    vscode.commands.executeCommand('TODOtoNOTION.setCredentials');
                }
            });
            debug("Error deleting TODO in Notion: Invalid API token - " + error.message);
        } else {
            vscode.window.showErrorMessage("Failed to delete TODO in Notion: " + error.message);
            debug("Error deleting TODO in Notion: " + error.message);
        }
        return false;
    }
}

/**
 * Synchronizes TODO items to Notion, handling creation, updates, and deletions in a batch-like process.
 * This function ensures that TODO IDs from the code are the single source of truth and prevents duplicate entries in Notion.
 * @param {Object} context - The VSCode extension context for accessing credentials.
 * @param {Object} credentials - The Notion credentials (token and databaseId).
 * @param {Array} todos - The current list of TODO items to sync from the code.
 * @param {Object} cachedTodos - The previously cached TODO items for comparison to detect changes.
 * @param {Function} debug - Debug logging function.
 * @returns {Promise<Object>} - A promise resolving to an object with arrays of created, updated, and deleted TODOs.
 */
async function syncTodos(context, credentials, todos, cachedTodos = {}, debug) {
    try {
        const { token, databaseId } = credentials;
        if (!token || !databaseId) {
            vscode.window.showErrorMessage("Notion integration not configured. Please set credentials first.");
            debug("Notion credentials not configured for syncTodos.");
            return { created: [], updated: [], deleted: [] };
        }

        const created = [];
        const updated = [];
        const deleted = [];

        debug("Starting batch TODO sync with Notion...");
        vscode.window.showInformationMessage("Starting batch TODO sync with Notion...");

        // Fetch current state from Notion to determine which TODOs already exist
        const notionTasks = await notionDatabase.fetchNotionState(context, credentials, debug);
        
        // Create mappings for efficient lookup
        const customIdToPageId = {}; // Maps code ID to Notion page ID
        const notionTaskByPageId = {}; // Maps Notion page ID to task details for quick access
        notionTasks.forEach(task => {
            notionTaskByPageId[task.id] = task;
            if (task.customId) {
                customIdToPageId[task.customId] = task.id;
            }
        });

        // Process current TODOs from code for creation or update
        for (const todo of todos) {
            if (!todo.id) {
                debug(`Unexpected: TODO without ID for text: "${todo.text}". IDs should be generated in code.`);
                vscode.window.showErrorMessage(`Unexpected: TODO without ID for text: "${todo.text}". Please check the extension logic.`);
                continue;
            }

            if (customIdToPageId[todo.id]) {
                // Existing TODO in Notion (based on ID from code), update it using the Notion page ID
                const notionPageId = customIdToPageId[todo.id];
                debug(`TODO exists in Notion with ID from code: ${todo.id} (page ID: ${notionPageId}), checking for updates`);

                // Check if there are any changes to update (compare with Notion data, not cachedTodos)
                const notionTask = notionTaskByPageId[notionPageId];
                let needsUpdate = false;
                // Compare all relevant fields
                if (
                    notionTask.text !== todo.text ||
                    notionTask.filePath !== todo.filePath ||
                    notionTask.lineNumber !== todo.lineNumber ||
                    notionTask.type !== todo.type ||
                    notionTask.status !== todo.status
                ) {
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    debug(`Updating TODO with ID: ${todo.id}, Line Number: ${todo.lineNumber}`);
                    const success = await updateTodo(context, credentials, notionPageId, {
                        text: todo.text,
                        type: todo.type,
                        status: todo.status,
                        filePath: todo.filePath,
                        lineNumber: todo.lineNumber,
                        id: todo.id
                    }, debug);
                    if (success) {
                        updated.push(todo);
                        debug(`Updated TODO with ID: ${todo.id} in Notion`);
                    } else {
                        debug(`Failed to update TODO with ID: ${todo.id} in Notion`);
                    }
                } else {
                    debug(`No changes detected for TODO with ID: ${todo.id}, skipping update`);
                }
            } else {
                // TODO has an ID in code but not found in Notion. Create new TODO in Notion. [id:6d0dd779-1eb7-40a9-a0cc-a8cf9e0f59a2]
                debug(`No TODO in Notion with ID: ${todo.id}. Creating new TODO in Notion.`);
                const newPageId = await createTodo(context, credentials, todo, debug);
                if (newPageId) {
                    created.push(todo);
                    debug(`Created TODO with ID: ${todo.id} and page ID: ${newPageId} in Notion`);
                }
            }
        }

        // Optionally handle deletions: TODOs present in cachedTodos but not in current todos
        if (Object.keys(cachedTodos).length > 0) {
            debug("Checking for TODOs to delete in Notion...");
            const cachedIds = Object.keys(cachedTodos);
            for (const cachedId of cachedIds) {
                if (!customIdToPageId[cachedId]) {
                    // TODO with this ID does not exist in current todos, mark for deletion [id:5536bc93-1078-49cb-b853-3df426ca0fcc]
                    const notionPageId = cachedTodos[cachedId];
                    deleted.push(notionPageId);
                    debug(`Marked TODO for deletion in Notion: ${notionPageId} (ID from code: ${cachedId})`);
                }
            }
        }

        // Perform deletion of marked TODOs in Notion
        for (const todoId of deleted) {
            const success = await deleteTodo(context, credentials, todoId, debug);
            if (success) {
                debug(`Deleted TODO in Notion with ID: ${todoId}`);
            } else {
                debug(`Failed to delete TODO in Notion with ID: ${todoId}`);
            }
        }

        debug("Batch TODO sync with Notion completed.");
        vscode.window.showInformationMessage("Batch TODO sync with Notion completed.");
        return { created, updated, deleted };
    } catch (error) {
        vscode.window.showErrorMessage("Failed to sync TODOs with Notion: " + error.message);
        debug("Error syncing TODOs with Notion: " + error.message);
        return { created: [], updated: [], deleted: [] };
    }
}

module.exports = {
    createTodo,
    updateTodo,
    deleteTodo,
    syncTodos
};
