
/**
 * Main entry point for Notion integration in the TODOtoNOTION extension.
 * This module integrates various Notion-related functionalities.
 */

var vscode = require('vscode');
var notionCredentials = require('./notionCredentials.js');
var notionDatabase = require('./notionDatabase.js');
var notionTodo = require('./notionTodo.js');

var debugFunc;

/**
 * Initializes the Notion integration with a debug logging function.
 * @param {Function} debug - Debug logging function.
 */
function init(debug) {
    debugFunc = debug;
    debug("Notion integration initialized.");
}

/**
 * Prompts the user to set Notion integration credentials.
 * @param {Object} context - The VSCode extension context for storing secrets.
 * @returns {Promise<boolean>} - Returns true if credentials are set successfully, false otherwise.
 */
async function setCredentials(context) {
    return await notionCredentials.setCredentials(context, debugFunc);
}

/**
 * Retrieves the stored Notion credentials.
 * @param {Object} context - The VSCode extension context for accessing secrets.
 * @returns {Promise<Object>} - An object containing the token and databaseId.
 */
async function getCredentials(context) {
    return await notionCredentials.getCredentials(context, debugFunc);
}

/**
 * Fetches the current state of tasks from the Notion database.
 * @param {Object} context - The VSCode extension context for accessing credentials.
 * @returns {Promise<Array>} - A promise resolving to an array of task objects from Notion.
 */
async function fetchNotionState(context) {
    const credentials = await getCredentials(context);
    return await notionDatabase.fetchNotionState(context, credentials, debugFunc);
}

/**
 * Retrieves the list of database properties for the Notion database.
 * @param {Object} context - The VSCode extension context for accessing credentials.
 * @returns {Promise<Object>} - A promise resolving to an object mapping property names to their types.
 */
async function listDatabaseProperties(context) {
    const credentials = await getCredentials(context);
    return await notionDatabase.listDatabaseProperties(context, credentials, debugFunc);
}

/**
 * Synchronizes TODO items to Notion, handling creation, updates, and deletions.
 * @param {Object} context - The VSCode extension context for accessing credentials.
 * @param {Array} todos - The current list of TODO items to sync from the code.
 * @param {Object} cachedTodos - The previously cached TODO items for comparison.
 * @returns {Promise<Object>} - A promise resolving to an object with arrays of created, updated, and deleted TODOs.
 */
async function syncTodos(context, todos, cachedTodos = {}) {
    const credentials = await getCredentials(context);
    return await notionTodo.syncTodos(context, credentials, todos, cachedTodos, debugFunc);
}

module.exports = {
    init,
    setCredentials,
    getCredentials,
    fetchNotionState,
    listDatabaseProperties,
    syncTodos
};
