/**
 * Module for managing Notion credentials in the TODOtoNOTION extension.
 */

var vscode = require('vscode');

var NOTION_TOKEN_KEY = 'notionIntegrationToken';

/**
 * Prompts the user to set Notion integration credentials (API token and Database ID).
 * Stores the credentials securely and updates configuration.
 * @param {Object} context - The VSCode extension context for storing secrets.
 * @param {Function} debug - Debug logging function.
 * @returns {Promise<boolean>} - Returns true if both token and database ID are provided, false otherwise.
 */
async function setCredentials(context, debug) {
    try {
        debug("Setting Notion credentials...");
        // Get a workspace-specific key for storing the token
        const workspaceKey = getWorkspaceKey(context);
        const tokenKey = `${NOTION_TOKEN_KEY}_${workspaceKey}`;
        
        // Prompt for Notion API Token
        const token = await vscode.window.showInputBox({
            prompt: "Enter your Notion Integration Token for this project",
            placeHolder: "Token",
            password: true
        });

        if (token) {
            // Store the token securely using SecretStorage with workspace-specific key
            await context.secrets.store(tokenKey, token);
            vscode.window.showInformationMessage("Notion Integration Token saved securely for this project.");
            debug("Notion token saved successfully for workspace: " + workspaceKey);
        } else {
            vscode.window.showWarningMessage("No token provided. Notion integration will not work without a token for this project.");
            debug("No Notion token provided by user for workspace: " + workspaceKey);
            return false;
        }

        // Prompt for Notion Database ID (already in settings, but can be updated here if needed)
        const databaseId = await vscode.window.showInputBox({
            prompt: "Enter your Notion Database ID for Todo Sync in this project",
            placeHolder: "Database ID",
            value: vscode.workspace.getConfiguration('TODOtoNOTION').get('databaseId', '')
        });

        if (databaseId) {
            // Update the database ID in settings, scoped to workspace
            await vscode.workspace.getConfiguration('TODOtoNOTION').update('databaseId', databaseId, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage("Notion Database ID updated for this project.");
            debug("Notion Database ID updated to: " + databaseId + " for workspace: " + workspaceKey);
        } else {
            vscode.window.showWarningMessage("No Database ID provided. Using existing or default empty value for this project.");
            debug("No Notion Database ID provided, using existing value for workspace: " + workspaceKey);
        }

        return token && databaseId;
    } catch (error) {
        vscode.window.showErrorMessage("Failed to set Notion credentials: " + error.message);
        debug("Error setting Notion credentials: " + error.message);
        return false;
    }
}

/**
 * Retrieves the stored Notion credentials (token and database ID).
 * @param {Object} context - The VSCode extension context for accessing secrets.
 * @param {Function} debug - Debug logging function.
 * @returns {Promise<Object>} - An object containing the token and databaseId.
 */
async function getCredentials(context, debug) {
    try {
        const workspaceKey = getWorkspaceKey(context);
        const tokenKey = `${NOTION_TOKEN_KEY}_${workspaceKey}`;
        const token = await context.secrets.get(tokenKey);
        const databaseId = vscode.workspace.getConfiguration('TODOtoNOTION').get('databaseId', '');
        debug("Retrieved Notion credentials for workspace " + workspaceKey + " (token: " + (token ? "present" : "not set") + ", databaseId: " + (databaseId || "not set") + ")");
        return { token, databaseId };
    } catch (error) {
        vscode.window.showErrorMessage("Failed to retrieve Notion credentials: " + error.message);
        debug("Error retrieving Notion credentials: " + error.message);
        return { token: null, databaseId: '' };
    }
}

/**
 * Gets a workspace-specific key for storing secrets.
 * @param {Object} context - The VSCode extension context.
 * @returns {string} - The workspace-specific key.
 */
function getWorkspaceKey(context) {
    const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 ? vscode.workspace.workspaceFolders[0].uri.fsPath : "global";
    return workspaceFolder;
}

module.exports = {
    setCredentials,
    getCredentials
};
