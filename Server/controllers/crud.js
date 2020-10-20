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
    if (req.createSchema) {
        await createMssqlSchema(pool, req.schema);
    }

    const tables = req.tables;
    let scripts = "";
    let schema, tableName, columns, primaryKeys, tmp;

    for (const table of Object.keys(req.tables)) {
        if (!tables[table].create && !tables[table].read
            && !tables[table].update && !tables[table].delete) {
            continue;
        }

        schema = table.split('.')[0];
        tableName = table.split('.')[1];
        columns = await mssqlUtils.getColumns(schema, tableName, pool);
        primaryKeys = await mssqlUtils.getPrimaryKeys(schema, tableName, pool);

        scripts += `-- CRUD ${table}\n`
        if (tables[table].create) {
            tmp = mssqlUtils.generateCreate(req.schema, table, columns) + '\n';
            scripts += tmp;
            if (req.execute) {
                await pool.request()
                    .batch(tmp.substring(0, tmp.length - 4));
            }
        }
        if (tables[table].read) {
            tmp = mssqlUtils.generateRead(req.schema, table, columns) + '\n';
            scripts += tmp;
            if (req.execute) {
                await pool.request()
                    .batch(tmp.substring(0, tmp.length - 4));
            }
        }
        if (tables[table].update) {
            if (primaryKeys.length == 0) {
                scripts += '--No primary keys for update\n\n';
            } else if (primaryKeys.length == columns.length) {
                scripts += '--No attribute to update\n\n';
            } else {
                tmp = mssqlUtils.generateUpdate(req.schema, table, columns, primaryKeys) + '\n';
                scripts += tmp;
                if (req.execute) {
                    await pool.request()
                        .batch(tmp.substring(0, tmp.length - 4));
                }
            }
        }
        if (tables[table].delete) {
            if (primaryKeys.length == 0) {
                scripts += '--No primary keys to delete\n\n';
            } else {
                tmp = mssqlUtils.generateDelete(req.schema, table, columns, primaryKeys) + '\n';
                scripts += tmp;
                if (req.execute) {
                    await pool.request()
                        .batch(tmp.substring(0, tmp.length - 4));
                }
            }
        }

        scripts += '\n\n'
    }

    return scripts;
}

const createMssqlSchema = async (pool, schemaName) => {
    await pool.request()
        .query(`CREATE SCHEMA ${schemaName};`);
}

const generetePgsqlCrud = async (pool, req) => {
    if (req.createSchema) {
        await createPgsqlSchema(pool, req.schema);
    }

    const tables = req.tables;
    let scripts = "";
    let schema, tableName, columns, primaryKeys;;

    for (const table of Object.keys(req.tables)) {
        if (!tables[table].create && !tables[table].read
            && !tables[table].update && !tables[table].delete) {
            continue;
        }

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
            if (primaryKeys.length == 0) {
                scripts += '--No primary keys for update\n\n';
            } else if (primaryKeys.length == columns.length) {
                scripts += '--No attributes to update\n\n';
            } else {
                scripts += pgsqlUtils.generateUpdate(req.schema, table, columns, primaryKeys) + '\n';
            }
        }
        if (tables[table].delete) {
            if (primaryKeys.length == 0) {
                scripts += '--No primary keys to delete\n\n';
            } else {
                scripts += pgsqlUtils.generateDelete(req.schema, table, columns, primaryKeys) + '\n';
            }
        }

        scripts += '\n\n'
    }

    if (req.execute) {
        const client = await pool.connect();
        result = await client
            .query(scripts);
        client.release();
    }

    return scripts;
}

const createPgsqlSchema = async (pool, schemaName) => {
    const client = await pool.connect();
    result = await client
        .query(`CREATE SCHEMA ${schemaName};`);
    client.release();
}