
/**
 * Module for handling commands and event listeners in the TODOtoNOTION extension.
 */

var vscode = require('vscode');
var notion = require('./notion.js');
var todoSync = require('./todoSync.js');

/**
 * Registers commands for the TODOtoNOTION extension.
 * @param {Object} context - The VSCode extension context.
 * @param {Function} syncNotionToCodeFunc - Function to sync TODOs from Notion to code.
 * @param {Function} debug - Debug logging function.
 */
function registerCommands(context, syncNotionToCodeFunc, debug) {
    context.subscriptions.push(vscode.commands.registerCommand('TODOtoNOTION.setCredentials', function() {
        debug("Executing command: TODOtoNOTION.setCredentials");
        notion.setCredentials(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('TODOtoNOTION.syncFromNotion', function() {
        debug("Executing command: TODOtoNOTION.syncFromNotion");
        syncNotionToCodeFunc();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('TODOtoNOTION.forceSync', function() {
        debug("Executing command: TODOtoNOTION.forceSync");
        syncNotionToCodeFunc();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('TODOtoNOTION.listProperties', function() {
        debug("Executing command: TODOtoNOTION.listProperties");
        if (typeof notion.listDatabaseProperties === 'function') {
            notion.listDatabaseProperties(context).then(properties => {
                if (properties) {
                    vscode.window.showInformationMessage("Notion database properties listed in the output channel.");
                }
            }).catch(error => {
                vscode.window.showErrorMessage("Failed to list Notion database properties: " + error.message);
                debug("Error executing listDatabaseProperties: " + error.message);
            });
        } else {
            vscode.window.showErrorMessage("Notion integration error: listDatabaseProperties function is not defined.");
            debug("Notion integration error: listDatabaseProperties function is not defined on notion object.");
        }
    }));
}

/**
 * Registers event listeners for document changes and saves.
 * @param {Object} context - The VSCode extension context.
 * @param {Object} openDocuments - An object to store open TextDocuments.
 * @param {Object} todoCache - Cache of TODOs per file URI.
 * @param {Function} debug - Debug logging function.
 */
function registerEventListeners(context, openDocuments, todoCache, debug) {
    // Only keep track of open documents for potential future use, but do not sync on change
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(function(e) {
        if (e && e.document) {
            openDocuments[e.document.uri.toString()] = e.document;
        }
    }));

    // Sync only on document save
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
        if (document.uri.scheme === 'file' || document.uri.scheme === 'untitled') {
            todoSync.syncTodosOnSave(document, context, todoCache, debug);
        }
    }));

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
        if (document.uri.scheme === 'file' || document.uri.scheme === 'untitled') {
            openDocuments[document.uri.toString()] = document;
        }
    }));

    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => {
        delete openDocuments[document.uri.toString()];
    }));
}

module.exports = {
    registerCommands,
    registerEventListeners
};
