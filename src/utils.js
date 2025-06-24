/**
 * Utility functions for TODOtoNOTION extension.
 */

var vscode = require('vscode');

/**
 * Generates a random UUID-like ID for TODO items.
 * @returns {string} A randomly generated ID.
 */
function generateRandomId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Returns a regex pattern to match TODO comments.
 * @returns {RegExp} The regex pattern for TODO tags.
 */
function getTodoRegex() {
    const tags = ["TODO", "FIXME", "BUG", "HACK", "XXX"];
    const tagPattern = tags.join("|");
    return new RegExp(`\/\/\\s*(${tagPattern})\\s*`, 'i');
}

module.exports = {
    generateRandomId,
    getTodoRegex
};
