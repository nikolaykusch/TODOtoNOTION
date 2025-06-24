/**
 * Module for parsing TODO items from documents in the TODOtoNOTION extension.
 */

var vscode = require('vscode');
var utils = require('./utils');

/**
 * Parses TODO items from a given document.
 * @param {Object} document - The VSCode TextDocument to parse for TODOs.
 * @param {Function} debug - Debug logging function.
 * @returns {Array} An array of TODO objects found in the document.
 */
function parseTodos(document, debug = () => {}) {
    const todos = [];
    const regex = utils.getTodoRegex();
    const idRegex = /\[id:([a-z0-9-]+)\]/i;
    debug(`Parsing TODOs in document: ${document.uri.fsPath}, lineCount: ${document.lineCount}`);

    const maxTodos = 50;
    for (let i = 0; i < document.lineCount && todos.length < maxTodos; i++) {
        const lineText = document.lineAt(i).text;
        const match = regex.exec(lineText);
        if (!match) continue;

        const idMatch = lineText.match(idRegex);
        const typeMatch = lineText.match(/\/\/\s*(TODO|FIXME|BUG|HACK|XXX)/i);
        const type = typeMatch ? typeMatch[1].toUpperCase() : "TODO";

        let todoText = lineText.trim();
        const todoPrefixRegex = /\/\/\s*(TODO|FIXME|BUG|HACK|XXX)\s*[:\s]*/i;
        todoText = todoText.replace(todoPrefixRegex, '').trim();
        const idPartRegex = /\[id:[a-z0-9-]+\]/i;
        todoText = todoText.replace(idPartRegex, '').trim();

        const status = "Not started";
        const filePath = document.uri.fsPath;
        const lineNumber = i + 1;

        let todoId = null;
        if (idMatch && idMatch[1]) {
            todoId = idMatch[1];
        } else {
            todoId = utils.generateRandomId();
            debug && debug(`Generated new TODO ID: ${todoId} for line ${i + 1}`);
        }

        const todo = {
            text: todoText,
            type: type,
            status: status,
            filePath: filePath,
            lineNumber: lineNumber,
            line: i,
            column: 0,
            id: todoId
        };
        todos.push(todo);
    }
    if (todos.length >= maxTodos) {
        debug(`Reached TODO limit of ${maxTodos} in document: ${document.uri.fsPath}. Stopping parsing to prevent memory issues.`);
    }
    debug(`Finished parsing ${todos.length} TODOs in document: ${document.uri.fsPath}`);
    return todos;
}

/**
 * Scans all open documents for TODO items.
 * @param {Object} openDocuments - An object containing open TextDocuments.
 * @param {Function} debug - Debug logging function.
 * @returns {Array} An array of TODO objects found in open documents.
 */
function scanDocumentsForTodos(openDocuments, debug = () => {}) {
    const todos = [];
    const regex = utils.getTodoRegex();
    const idRegex = /\/\/\s*(TODO|FIXME|BUG|HACK|XXX)\s*\[id:([a-z0-9-]+)\]\s*(.*)/i;
    debug(`Scanning TODOs across ${Object.values(openDocuments).length} open documents`);

    Object.values(openDocuments).forEach(document => {
        if (document.uri.scheme === 'file' || document.uri.scheme === 'untitled') {
            const text = document.getText();
            let match;
            const maxTodos = 50; // Reduced limit per document to prevent memory overload
            while ((match = regex.exec(text)) !== null && todos.length < maxTodos * (Object.values(openDocuments).indexOf(document) + 1)) {
                while (text[match.index] === '\n' || text[match.index] === '\r') {
                    match.index++;
                    match[0] = match[0].substring(1);
                }

                const offset = match.index;
                const position = document.positionAt(offset);
                const lineText = document.lineAt(position.line).text;
                const idMatch = lineText.match(idRegex);

                const todo = {
                    text: lineText.trim(),
                    line: position.line,
                    column: position.character,
                    id: idMatch ? idMatch[2] : null,
                    uri: document.uri
                };

                todos.push(todo);
            }
        }
    });

    if (todos.length >= maxTodos * Object.values(openDocuments).length) {
        debug(`Reached total TODO limit of ${maxTodos * Object.values(openDocuments).length} across open documents. Stopping scanning to prevent memory issues.`);
    }
    debug(`Finished scanning ${todos.length} TODOs across open documents`);
    return todos;
}

module.exports = {
    parseTodos,
    scanDocumentsForTodos
};
