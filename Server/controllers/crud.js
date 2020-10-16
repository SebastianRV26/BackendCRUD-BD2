const { ConnectionPool } = require('mssql');
const poolManager = require('../poolManager');
const mssqlUtils = require('../utils/mssqlUtils');
const pgsqlUtils = require('../utils/pgsqlUtils');

exports.getCrud = async (token, req) => {
    const pool = await poolManager.getConnection(token);

    // mssql
    if (pool instanceof ConnectionPool) {
        return await genereteMssqlCrud(pool, req);
    }

    // pgsql
    return await generetePgsqlCrud(pool, req);
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

    let scripts = "";
    let schema, tableName, columns, primaryKeys;;

    for (const table of Object.keys(req.tables)) {
        schema = table.split('.')[0];
        tableName = table.split('.')[1];
        columns = await pgsqlUtils.getColumns(schema, tableName, pool);
        primaryKeys = await pgsqlUtils.getPrimaryKeys(schema, tableName, pool);

        scripts += `-- CRUD ${table}\n`
        if (tables[table].create) {
            scripts += pgsqlUtils.generateCreate(req.schema, table, columns) + '\n';
        }
        if (tables[table].read) {
            scripts += pgsqlUtils.generateRead(req.schema, table, columns) + '\n';
        }
        if (tables[table].update) {
            scripts += pgsqlUtils.generateUpdate(req.schema, table, columns, primaryKeys) + '\n';
        }
        if (tables[table].delete) {
            scripts += pgsqlUtils.generateDelete(req.schema, table, columns, primaryKeys) + '\n';
        }

        scripts += '\n\n'
    }

    return scripts;
}