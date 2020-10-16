const { ConnectionPool } = require('mssql');
const poolManager = require('../poolManager');
const mssqlUtils = require('../utils/mssqlUtils');

exports.getCrud = async (token, req) => {
    const pool = await poolManager.getConnection(token);

    // mssql
    if (pool instanceof ConnectionPool) {
        return await genereteMssqlCrud(pool, req);
    }

    // pgsql
    return await result.rows;
}

const genereteMssqlCrud = async (pool, req) => {
    const tables = req.tables;
    let scripts = "";
    let schema, tableName, columns, primaryKeys;

    for (const table of Object.keys(req.tables)) {
        schema = table.split('.')[0];
        tableName = table.split('.')[1];
        columns = await mssqlUtils.getColumns(schema, tableName, pool);
        primaryKeys = await mssqlUtils.getPrimaryKeys(schema, tableName, pool);

        scripts += `-- CRUD ${table}\n`
        if (tables[table].create) {
            scripts += mssqlUtils.generateCreate(req.schema, table, columns) + '\n';
        }
        if (tables[table].read) {
            scripts += mssqlUtils.generateRead(req.schema, table, columns) + '\n';
        }
        if (tables[table].update) {
            scripts += mssqlUtils.generateUpdate(req.schema, table, columns, primaryKeys) + '\n';
        }
        if (tables[table].delete) {
            scripts += mssqlUtils.generateDelete(req.schema, table, columns, primaryKeys) + '\n';
        }

        scripts += '\n\n'
    }

    console.log(scripts);
    return scripts;
}

const generetePgsqlCrud = async (pool, req) => {
    const tables = req.tables;
    const client = await pool.connect();

    let scripts = "";
    let result, schema, tableName;

    for (const table of Object.keys(req.tables)) {
        schema = table.split('.')[0];
        tableName = table.split('.')[1];

        scripts += `-- CRUD ${table}\n`
        if (tables[table].create) {
            result = await client
                .query(`SELECT  COLUMN_NAME nombre,\
                                DATA_TYPE tipo,\
                                CHARACTER_MAXIMUM_LENGTH cp,\
                                NUMERIC_PRECISION np,\
                                DATETIME_PRECISION dp\
                        FROM INFORMATION_SCHEMA.COLUMNS C\
                        WHERE C.TABLE_NAME='${tableName}' AND C.TABLE_SCHEMA='${schema}'`);
        }
        if (tables[table].read) {

        }
        if (tables[table].update) {

        }
        if (tables[table].delete) {

        }

        scripts += '\n\n'
    }

    client.release();
    return scripts;
}