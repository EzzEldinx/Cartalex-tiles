import { validationResult } from 'express-validator';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 });

function createWhereBuilder(tableAliasMap = {}) {
    return function(req, res, next) {
        let whereClause = "";
        const conditions = [];

        for (const param in req.query) {
            if (['limit', 'offset', 'field', 'order', 'fromTable', 'alias'].includes(param) || param.endsWith('floor') || param.endsWith('ceil')) {
                continue;
            }

            const alias = tableAliasMap[param] || '';
            const values = req.query[param].split('|').map(val => `'${val.replace(/'/g, "''")}'`).join(',');
            
            if (values) {
                // If an alias is provided, use it. Otherwise, use the param name directly.
                const qualifiedParam = alias ? `${alias}.${param}` : param;
                conditions.push(` ${qualifiedParam} IN (${values})`);
            }
        }

        if (conditions.length > 0) {
            whereClause = ' WHERE ' + conditions.join(' AND ');
        }

        res.locals.whereClause = whereClause;
        next();
    };
}

// Define the aliases for columns in each specific query
const addWhereVestiges = createWhereBuilder({ caracterisation: 'c', periode: 'p' });
const addWhereDecouvertes = createWhereBuilder({ nom: 'p', date_decouverte: 'd' }, 'sf');
const addWhereBiblio = createWhereBuilder({ nom_document: 'b', nom: 'p' }, 'sf');

/**
 * Corrected function to handle field aliasing for SELECT DISTINCT queries.
 * This middleware constructs the SELECT and ORDER BY clauses.
 * It ensures that *both* the original field (for internal ID) and
 * the aliased field (for display) are selected if an alias is provided.
 */
function addOrderAliasOnSelectDistinct(req, res, next) {
    const { field, fromTable, alias, order } = req.query;

    // 1. Determine the base field, qualified with table name if available
    const qualifiedField = fromTable ? `${fromTable}.${field}` : field;

    // 2. Start select query by ALWAYS selecting the original field (e.g., "personnes.nom")
    let selectFields = qualifiedField;

    // 3. Add the aliased field IF 'alias' is provided and is different from 'field'
    if (alias && alias !== field) {
        // Select the same field again, but aliased AS the display name.
        // e.g., ", personnes.nom AS "Auteur""
        // Using quotes " " around the alias handles spaces or special characters.
        selectFields += `, ${qualifiedField} AS "${alias}"`;
    }

    // 4. Handle the 'order' field (e.g., 'date_debut' for 'periode')
    // If an 'order' field is specified and it's NOT the same as the main 'field',
    // it MUST also be included in the SELECT DISTINCT list to be used in ORDER BY.
    if (order && order !== field) {
        const qualifiedOrder = fromTable ? `${fromTable}.${order}` : order;
        // Avoid adding it if it's already the main field (which it isn't, due to check)
        selectFields += `, ${qualifiedOrder}`;
    }

    // 5. Assign the final SELECT query
    res.locals.selectQuery = `SELECT DISTINCT ${selectFields}`;

    // 6. Determine which field to ORDER BY
    // Prioritize the 'order' parameter if it exists, otherwise fall back to the main 'field'
    const orderByField = order || field;
    const qualifiedOrderByField = fromTable ? `${fromTable}.${orderByField}` : orderByField;

    // 7. Assign the final ORDER BY query
    res.locals.orderQuery = ` ORDER BY ${qualifiedOrderByField}`;

    next();
}


function errorHandler(err, req, res, next) {
    console.error("ERROR HANDLER:", err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
}

function cacheMiddleware(req, res, next) {
    // ... (cache logic is fine)
    if (req.method !== 'GET') return next();
    const key = req.originalUrl;
    const cached = cache.get(key);
    if (cached) { return res.json(cached); }
    
    // Store original res.json to avoid conflicts
    const originalJson = res.json; 
    
    res.json = (body) => {
        cache.set(key, body);
        res.json = originalJson; // Restore original function
        res.json(body); // Send response
    };
    
    next();
}

export { addWhereVestiges, addWhereDecouvertes, addWhereBiblio, addOrderAliasOnSelectDistinct, errorHandler, cacheMiddleware };