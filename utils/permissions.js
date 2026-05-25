const fs = require('fs');
const path = require('path');

/**
 * Load admin IDs from admins.conf
 * @returns {Set<string>} Set of admin Discord IDs
 */
function loadAdmins() {
    const adminsPath = path.join(__dirname, '..', 'admins.conf');
    
    try {
        if (!fs.existsSync(adminsPath)) {
            console.warn('⚠️ admins.conf not found. No admins configured.');
            return new Set();
        }
        
        const content = fs.readFileSync(adminsPath, 'utf-8');
        const adminIds = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#')) // Remove empty lines and comments
            .filter(id => /^\d{17,19}$/.test(id)); // Validate Discord ID format
        
        return new Set(adminIds);
    } catch (error) {
        console.error('Error loading admins.conf:', error);
        return new Set();
    }
}

/**
 * Check if a user is an admin
 * @param {string} userId - Discord user ID
 * @returns {boolean} True if user is admin
 */
function isAdmin(userId) {
    const admins = loadAdmins();
    return admins.has(userId);
}

module.exports = { isAdmin, loadAdmins };