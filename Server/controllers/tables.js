const { ConnectionPool } = require('mssql');
const poolManager = require('../poolManager');

/**
 * Obtiene toda la informacion de las tablas
 * 
 * @param {string} token el token que permite identificar el usuario dueño de la conexion
 * @param {any} req request
 */
exports.getTables = async (token, req) => {
    const pool = await poolManager.getConnection(token);
    let result;

    // conexion mssql
    if (pool instanceof ConnectionPool) {
        result = await pool.request()
            .query("SELECT CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS name \
                        FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME != 'sysdiagrams'");
        return result.recordset;
    } else { // conexion pgsql
        const client = await pool.connect();
        result = await client
            .query("SELECT CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS name \
                        FROM INFORMATION_SCHEMA.TABLES WHERE table_schema not in \
                        ('pg_catalog', 'information_schema') and table_schema not like 'pg_toast%'");
        client.release();
        return result.rows;
    }
}

/**
 * Obtiene toda la informacion de los esquemas
 * 
 * @param {string} token el token que permite identificar el usuario dueño de la conexion
 * @param {any} req request
 */
exports.getSchemes = async (token, req) => {
    const pool = await poolManager.getConnection(token);
    let result;

    // conexion mssql
    if (pool instanceof ConnectionPool) {
        result = await pool.request()
            .query("SELECT s.name as table_schema\
            FROM sys.schemas s\
                    INNER JOIN sys.sysusers u\
                    ON u.uid = s.principal_id\
                    WHERE u.issqluser = 1\
                    and u.name not in ('sys', 'guest', 'INFORMATION_SCHEMA')");
        return result.recordset;
    } else { // conexion postgresql
        const client = await pool.connect();
        result = await client.query("SELECT s.nspname AS table_schema\
            FROM pg_catalog.pg_namespace s\
                JOIN pg_catalog.pg_user u on u.usesysid = s.nspowner\
                WHERE nspname NOT IN ('information_schema', 'pg_catalog', 'public')\
                AND nspname not like 'pg_toast%'\
                AND nspname not like 'pg_temp_%';");
        result.rows.push({table_schema:"public"})
        return result.rows;
    }
}