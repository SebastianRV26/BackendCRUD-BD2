const { ConnectionPool } = require('mssql');
const poolManager = require('../poolManager');

exports.getTables = async (token, req) => {
    const pool = await poolManager.getConnection(token);
    let result;

    // mssql
    if (pool instanceof ConnectionPool) {
        result = await pool.request()
            .query("SELECT CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS table_name \
                        FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME != 'sysdiagrams'");
        return result.recordset;
    } else { // pgsql
        const client = await pool.connect();
        result = await client
            .query("SELECT CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS table_name \
                        FROM INFORMATION_SCHEMA.TABLES WHERE table_schema not in \
                        ('pg_catalog', 'information_schema') and table_schema not like 'pg_toast%'");
        client.release();
        return result.rows;
    }
}