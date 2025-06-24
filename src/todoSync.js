/**
 * Module for synchronizing TODO items with Notion in the TODOtoNOTION extension.
 */

var vscode = require('vscode');
var notion = require('./notion.js');
var todoParser = require('./todoParser.js');

// Global flag to prevent sync loop
let skipNextSaveForUri = {};

/**
 * Synchronizes TODO items from Notion to the code.
 * @param {Object} context - The VSCode extension context.
 * @param {Object} openDocuments - An object containing open TextDocuments.
 * @param {Object} notionStatusBarIndicator - The status bar item for Notion sync status.
 * @param {Function} debug - Debug logging function.
 */
function syncNotionToCode(context, openDocuments, notionStatusBarIndicator, debug) {
    if (notionStatusBarIndicator) {
        notionStatusBarIndicator.text = "TODOtoNOTION: Syncing...";
        notionStatusBarIndicator.show();
    }
    vscode.window.showInformationMessage("Starting sync from Notion to code...");
    
    // Fetch state from Notion
    notion.fetchNotionState(context).then(notionTasks => {
        // Create a map of Notion tasks
        const notionMap = {};
        notionTasks.forEach(task => {
            notionMap[task.id] = task;
        });

        // Scan open documents for tracked TODOs
        const codeTodos = todoParser.scanDocumentsForTodos(openDocuments, debug);
        const codeMap = {};
        codeTodos.forEach(todo => {
            if (todo.id) {
                codeMap[todo.id] = todo;
            }
        });

        // Reconciliation logic
        reconcileNotionToCode(notionMap, codeMap);
        if (notionStatusBarIndicator) {
            notionStatusBarIndicator.text = "TODOtoNOTION: Idle";
            notionStatusBarIndicator.show();
        }
    }).catch(error => {
        vscode.window.showErrorMessage(`Failed to sync from Notion: ${error.message}`);
        if (notionStatusBarIndicator) {
            notionStatusBarIndicator.text = "TODOtoNOTION: Sync Failed";
            notionStatusBarIndicator.show();
        }
    });
}

/**
 * Reconciles TODO items from Notion to code, updating or deleting as necessary.
 * @param {Object} notionMap - Map of TODOs from Notion.
 * @param {Object} codeMap - Map of TODOs from code.
 */
function reconcileNotionToCode(notionMap, codeMap) {
    let updatedCount = 0;
    let deletedCount = 0;

    // Iterate through Notion tasks to update or delete in code
    Object.keys(notionMap).forEach(notionId => {
        const notionTask = notionMap[notionId];
        const codeTodo = codeMap[notionId];

        if (notionTask && notionTask.status === "Archived") {
            // Delete from code if it exists
            if (codeTodo) {
                deleteTodoFromCode(codeTodo);
                deletedCount++;
            }
        } else if (codeTodo && notionTask && notionTask.text) {
            // Update code if text has changed
            if (notionTask.text !== codeTodo.text) {
                updateTodoInCode(codeTodo, notionTask.text);
                updatedCount++;
            }
        }
    });

    if (updatedCount > 0) {
        vscode.window.showInformationMessage(`Updated ${updatedCount} TODOs from Notion.`);
    }
    if (deletedCount > 0) {
        vscode.window.showInformationMessage(`Deleted ${deletedCount} TODOs from code based on Notion state.`);
    }
    if (updatedCount === 0 && deletedCount === 0) {
        vscode.window.showInformationMessage("No changes needed. Code is in sync with Notion.");
    }
}

/**
 * Updates a TODO item in the code with new text.
 * @param {Object} todo - The TODO item to update.
 * @param {string} newText - The new text for the TODO item.
 */
function updateTodoInCode(todo, newText) {
    vscode.workspace.openTextDocument(todo.uri).then(document => {
        vscode.window.showTextDocument(document).then(editor => {
            editor.edit(editBuilder => {
                const range = document.lineAt(todo.line).range;
                editBuilder.replace(range, newText);
            }).then(applied => {
                if (!applied) {
                    vscode.window.showErrorMessage(`Failed to update TODO with ID ${todo.id} in code.`);
                }
            });
        });
    });
}

/**
 * Deletes a TODO item from the code.
 * @param {Object} todo - The TODO item to delete.
 */
function deleteTodoFromCode(todo) {
    vscode.workspace.openTextDocument(todo.uri).then(document => {
        vscode.window.showTextDocument(document).then(editor => {
            editor.edit(editBuilder => {
                const range = document.lineAt(todo.line).range;
                editBuilder.delete(range);
            }).then(applied => {
                if (!applied) {
                    vscode.window.showErrorMessage(`Failed to delete TODO with ID ${todo.id} from code.`);
                }
            });
        });
    });
}

/**
 * Synchronizes TODO items to Notion on document save with debouncing to prevent excessive syncs.
 * @param {Object} document - The saved TextDocument.
 * @param {Object} context - The VSCode extension context.
 * @param {Object} todoCache - Cache of TODOs per file URI.
 * @param {Function} debug - Debug logging function.
 */
function syncTodosOnSave(document, context, todoCache, debug) {
    // Prevent sync if this save was triggered programmatically after injection
    if (skipNextSaveForUri[document.uri.toString()]) {
        debug && debug(`Skipping sync for programmatic save: ${document.uri.toString()}`);
        skipNextSaveForUri[document.uri.toString()] = false;
        return;
    }

    if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') {
        debug(`Skipping sync for document ${document.uri.fsPath} - invalid scheme.`);
        return;
    }

    const uriStr = document.uri.toString();
    // Parse current TODOs in the document (limit to 100 per doc for safety)
    const todos = todoParser.parseTodos(document, debug).slice(0, 100);
    const cachedTodos = todoCache[uriStr] || {};

    debug(`Syncing ${todos.length} TODOs for document: ${uriStr}`);
    if (todos.length === 0) {
        debug(`No TODOs found to sync for document: ${uriStr}`);
        vscode.window.showInformationMessage("No TODOs found to sync in current document.");
        return;
    }

    notion.syncTodos(context, todos, cachedTodos).then(result => {
        const { created, updated, deleted } = result;
        // Update cache with current state
        todoCache[uriStr] = {};
        todos.forEach(todo => {
            if (todo.id) {
                todoCache[uriStr][todo.id] = todo;
            }
        });
        // Inject IDs for all TODOs that do not have them in the code
        injectTodoIds(document, todos, debug);
        debug(`Sync result for ${uriStr}: ${created.length} created, ${updated.length} updated, ${deleted.length} deleted.`);
        if (created.length > 0) {
            vscode.window.showInformationMessage(`Synced ${created.length} new TODOs to Notion.`);
        }
        if (updated.length > 0) {
            vscode.window.showInformationMessage(`Updated ${updated.length} TODOs in Notion.`);
        }
        if (deleted.length > 0) {
            vscode.window.showInformationMessage(`Archived ${deleted.length} TODOs in Notion.`);
        }
    }).catch(error => {
        vscode.window.showErrorMessage(`Failed to sync TODOs to Notion: ${error.message}`);
        debug(`Error syncing TODOs for ${uriStr}: ${error.message}`);
    });
}

/**
 * Injects TODO IDs into comments where they are missing.
 * @param {Object} document - The TextDocument to inject IDs into.
 * @param {Array} todos - Array of TODO objects to inject IDs for.
 * @param {Function} debug - Debug logging function.
 */
function injectTodoIds(document, todos, debug) {
    vscode.window.showTextDocument(document).then(editor => {
        editor.edit(editBuilder => {
            todos.forEach(todo => {
                const line = todo.line;
                const lineText = editor.document.lineAt(line).text;
                // Remove any existing [id:...] from the line
                const newLineText = lineText.replace(/\s*\[id:[a-z0-9-]+\]$/i, '').trimEnd() + ` [id:${todo.id}]`;
                if (lineText !== newLineText) {
                    const range = editor.document.lineAt(line).range;
                    editBuilder.replace(range, newLineText);
                    debug && debug(`Injected or updated ID ${todo.id} for TODO at line ${line + 1}: ${todo.text}`);
                }
            });
        }).then(applied => {
            if (applied) {
                // Set flag to skip next save-triggered sync
                skipNextSaveForUri[document.uri.toString()] = true;
                // Save the document programmatically
                document.save().then(() => {
                    vscode.window.showInformationMessage("Injected TODO IDs and saved file.");
                    debug && debug("Successfully injected/updated TODO IDs and saved file.");
                });
            } else {
                vscode.window.showErrorMessage("Failed to inject TODO IDs into comments.");
                debug && debug("Failed to inject TODO IDs into comments.");
            }
        });
    });
}

module.exports = {
    syncNotionToCode,
    syncTodosOnSave,
    injectTodoIds
};
