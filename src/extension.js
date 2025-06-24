
/**
 * Main entry point for the TODOtoNOTION extension.
 * This extension syncs TODO comments with a Notion database.
 */

var vscode = require('vscode');
var path = require('path');
var notion = require('./notion.js');
var commandHandler = require('./commandHandler.js');
var todoSync = require('./todoSync.js');

var openDocuments = {};
var notionStatusBarIndicator;
var todoCache = {};

function activate(context) {
    var outputChannel;

    function debug(text) {
        if (outputChannel) {
            var now = new Date();
            outputChannel.appendLine(now.toLocaleTimeString('en', { hour12: false }) + "." + String(now.getMilliseconds()).padStart(3, '0') + " " + text);
        }
    }

    debug("Starting TODOtoNOTION extension activation process.");

    try {
        notion.init(debug);
        debug("Notion integration initialized successfully.");
        vscode.window.showInformationMessage("TODOtoNOTION: Notion integration initialized.");
        // Check if Notion credentials are set
        notion.getCredentials(context).then(credentials => {
            if (!credentials.token || !credentials.databaseId) {
                vscode.window.showWarningMessage("TODOtoNOTION: Notion credentials are not set. Please set your Notion API token and Database ID.", "Set Credentials").then(selection => {
                    if (selection === "Set Credentials") {
                        vscode.commands.executeCommand('TODOtoNOTION.setCredentials');
                    }
                });
                debug("Notion credentials check: Not set.");
            } else {
                debug("Notion credentials check: Set.");
            }
        }).catch(error => {
            vscode.window.showErrorMessage("TODOtoNOTION: Failed to check Notion credentials: " + error.message);
            debug("Error checking Notion credentials: " + error.message);
        });
    } catch (error) {
        vscode.window.showErrorMessage("TODOtoNOTION: Failed to initialize Notion integration: " + error.message);
        debug("Error initializing Notion integration: " + error.message);
    }

    try {
        // Perform initial sync from Notion to code on activation
        todoSync.syncNotionToCode(context, openDocuments, notionStatusBarIndicator, debug);
        debug("Initial Notion sync triggered successfully.");
        vscode.window.showInformationMessage("TODOtoNOTION: Initial Notion sync started.");
    } catch (error) {
        vscode.window.showErrorMessage("TODOtoNOTION: Failed to perform initial Notion sync: " + error.message);
        debug("Error during initial Notion sync: " + error.message);
    }

    notionStatusBarIndicator = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1);
    notionStatusBarIndicator.text = "TODOtoNOTION: Idle";
    notionStatusBarIndicator.tooltip = "Notion Sync Status";
    notionStatusBarIndicator.show();
    context.subscriptions.push(notionStatusBarIndicator);

    // Register commands and event listeners
    commandHandler.registerCommands(context, () => todoSync.syncNotionToCode(context, openDocuments, notionStatusBarIndicator, debug), debug);
    commandHandler.registerEventListeners(context, openDocuments, todoCache, debug);

    // Initialize output channel for debugging
    function resetOutputChannel() {
        if (outputChannel) {
            outputChannel.dispose();
            outputChannel = undefined;
        }
        outputChannel = vscode.window.createOutputChannel("TODOtoNOTION");
    }

    resetOutputChannel();
    context.subscriptions.push(outputChannel);
}

function deactivate() {
    // Cleanup if needed
}

exports.activate = activate;
exports.deactivate = deactivate;
