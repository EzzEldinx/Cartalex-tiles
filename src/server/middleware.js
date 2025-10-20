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

function addOrderAliasOnSelectDistinct(req, res, next) {
    res.locals.selectQuery = req.query.fromTable ? `SELECT DISTINCT ${req.query.fromTable}.${req.query.field}` : `SELECT DISTINCT ${req.query.field}`;
    res.locals.selectQuery += req.query.alias ? ` AS ${req.query.alias}` : '';
    res.locals.selectQuery += req.query.field != req.query.order && typeof req.query.order !== 'undefined' ? `, ${req.query.fromTable}.${req.query.order}` : '';
    res.locals.orderQuery = req.query.order ? ` ORDER BY ${req.query.fromTable}.${req.query.order}` : ` ORDER BY ${req.query.field}`;
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
    res.sendResponse = res.json;
    res.json = (body) => { cache.set(key, body); res.sendResponse(body); };
    next();
}

export { addWhereVestiges, addWhereDecouvertes, addWhereBiblio, addOrderAliasOnSelectDistinct, errorHandler, cacheMiddleware };