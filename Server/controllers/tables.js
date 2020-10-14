const { ConnectionPool } = require('mssql');
const poolManager = require('../poolManager');

exports.getTable = async (token, req) => {
    const pool = await poolManager.getConnection(token);
    let result;

    if (pool instanceof ConnectionPool) {
        result = await pool.request()
            .query("SELECT CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS table_name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME != 'sysdiagrams'");
        return result.recordset;
    } else {
        const client = await pool.connect();
        result = await client.query("SELECT CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS table_name FROM INFORMATION_SCHEMA.TABLES where table_schema not in ('pg_catalog', 'information_schema') and table_schema not like 'pg_toast%'");
        return result.rows;
    }
    return result;
}