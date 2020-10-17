const { ConnectionPool } = require('mssql');
const poolManager = require('../poolManager');

exports.getTables = async (token, req) => {
    const pool = await poolManager.getConnection(token);
    let result;

    // mssql
    if (pool instanceof ConnectionPool) {
        result = await pool.request()
            .query("SELECT CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS name \
                        FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME != 'sysdiagrams'");
        return result.recordset;
    } else { // pgsql
        const client = await pool.connect();
        result = await client
            .query("SELECT CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS name \
                        FROM INFORMATION_SCHEMA.TABLES WHERE table_schema not in \
                        ('pg_catalog', 'information_schema') and table_schema not like 'pg_toast%'");
        client.release();
        return result.rows;
    }
}

exports.getSchemes = async (token, req) => {
    const pool = await poolManager.getConnection(token);
    let result;

    // mssql
    if (pool instanceof ConnectionPool) {
        result = await pool.request()
            .query("SELECT s.name as TABLE_SCHEMA\
            FROM sys.schemas s\
                    INNER JOIN sys.sysusers u\
                    ON u.uid = s.principal_id\
                    WHERE u.issqluser = 1\
                    and u.name not in ('sys', 'guest', 'INFORMATION_SCHEMA')");
        return result.recordset;
    } else { // postgresql
        const client = await pool.connect();
        result = await client.query("SELECT s.nspname AS TABLE_SCHEMA\
            FROM pg_catalog.pg_namespace s\
                JOIN pg_catalog.pg_user u on u.usesysid = s.nspowner\
                WHERE nspname NOT IN ('information_schema', 'pg_catalog', 'public')\
                AND nspname not like 'pg_toast%'\
                AND nspname not like 'pg_temp_%';");
        result.rows.push({TABLE_SCHEMA:"public"})
        return result.rows;
    }
    return result;
}