const { ConnectionPool } = require('mssql');
const { Pool } = require('pg');
const poolManager = require('../poolManager');
const mssqlUtils = require('../utils/mssqlUtils');
const pgsqlUtils = require('../utils/pgsqlUtils');

/**
 * Genera el código necesario para todas las tablas dadas.
 * 
 * @param {string} token el token que permite identificar el usuario dueño de la conexion 
 * @param {any} req diccionario con la lista de tablas
 */
exports.getCrud = async (token, req) => {
    const pool = await poolManager.getConnection(token);

    // conexion mssql
    if (pool instanceof ConnectionPool) {
        return await genereteMssqlCrud(pool, req);
    }

    // conexion pgsql
    return await generetePgsqlCrud(pool, req);
}

/**
 * Recorre la lista de tablas y va generando los scripts de los procedimientos.
 * 
 * @param {ConnectionPool} pool pool de conexiones de mssql
 * @param {any} req diccionario con la lista de tablas
 */
const genereteMssqlCrud = async (pool, req) => {
    // Si el JSON indica que hay que crear un nuevo esquema
    if (req.createSchema) {
        await createMssqlSchema(pool, req.schema);
    }

    const tables = req.tables; // lista de tablas
    let scripts = ""; // string con los scripts
    let schema, tableName, columns, primaryKeys, tmp;

    // Se recorren las tablas
    for (const table of Object.keys(req.tables)) {
        // Si a esta tabla no hay que aplicarle ninguna operacion se sigue con el loop
        if (!tables[table].create && !tables[table].read
            && !tables[table].update && !tables[table].delete) {
            continue;
        }

        // Se obtiene el esquema y el nombre de la tabla
        schema = table.split('.')[0];
        tableName = table.split('.')[1];

        // Se obtienen las columnas y llaves primarias
        columns = await mssqlUtils.getColumns(schema, tableName, pool);
        primaryKeys = await mssqlUtils.getPrimaryKeys(schema, tableName, pool);

        scripts += `-- CRUD ${table}\n`

        // Se verifica cuales procedimientos hay que generar
        if (tables[table].create) {
            // Se genera el procedimiento de crear
            tmp = mssqlUtils.generateCreate(req.schema, table, columns) + '\n';
            scripts += tmp;

            // Si verifica si hay que ejecutarlo y se ejecuta
            if (req.execute) {
                await pool.request()
                    .batch(tmp.substring(0, tmp.length - 4)); // Se elimina el GO del final
            }
        }
        if (tables[table].read) {
            // Se genera el procedimiento de leer
            tmp = mssqlUtils.generateRead(req.schema, table, columns) + '\n';
            scripts += tmp;

            // Si verifica si hay que ejecutarlo y se ejecuta
            if (req.execute) {
                await pool.request()
                    .batch(tmp.substring(0, tmp.length - 4)); // Se elimina el GO del final
            }
        }
        if (tables[table].update) {
            // Si no hay primary keys o atributos para actualizar no se genera el update
            if (primaryKeys.length == 0) {
                scripts += '--No primary keys for update\n\n';
            } else if (primaryKeys.length == columns.length) {
                scripts += '--No attribute to update\n\n';
            } else {
                // Se genera el procedimiento de actualizar
                tmp = mssqlUtils.generateUpdate(req.schema, table, columns, primaryKeys) + '\n';
                scripts += tmp;

                // Si verifica si hay que ejecutarlo y se ejecuta
                if (req.execute) {
                    await pool.request()
                        .batch(tmp.substring(0, tmp.length - 4)); // Se elimina el GO del final
                }
            }
        }
        if (tables[table].delete) {
            // Si no hay primary keys no se genera el delete
            if (primaryKeys.length == 0) {
                scripts += '--No primary keys to delete\n\n';
            } else {
                // Se genera el procedimiento de borrar
                tmp = mssqlUtils.generateDelete(req.schema, table, columns, primaryKeys) + '\n';
                scripts += tmp;

                // Si verifica si hay que ejecutarlo y se ejecuta
                if (req.execute) {
                    await pool.request()
                        .batch(tmp.substring(0, tmp.length - 4)); // Se elimina el GO del final
                }
            }
        }

        scripts += '\n\n'
    }

    return scripts;
}

/**
 * Crea un esquema en mssql
 * 
 * @param {ConnectionPool} pool pool de conexiones de mssql
 * @param {string} schemaName nombre del esquema a crear
 */
const createMssqlSchema = async (pool, schemaName) => {
    await pool.request()
        .query(`CREATE SCHEMA ${schemaName};`);
}

/**
 * Recorre la lista de tablas y va generando los scripts de los procedimientos.
 * 
 * @param {Pool} pool pool de conexiones de pgsql
 * @param {any} req diccionario con la lista de tablas
 */
const generetePgsqlCrud = async (pool, req) => {
    // Si el JSON indica que hay que crear un nuevo esquema
    if (req.createSchema) {
        await createPgsqlSchema(pool, req.schema);
    }

    const tables = req.tables; // lista de tablas
    let scripts = ""; // string con los scripts
    let schema, tableName, columns, primaryKeys;;

    // Se recorren las tablas
    for (const table of Object.keys(req.tables)) {
        // Si a esta tabla no hay que aplicarle ninguna operacion se sigue con el loop
        if (!tables[table].create && !tables[table].read
            && !tables[table].update && !tables[table].delete) {
            continue;
        }

        // Se obtiene el esquema y el nombre de la tabla
        schema = table.split('.')[0];
        tableName = table.split('.')[1];

        // Si verifica si hay que ejecutarlo y se ejecuta
        columns = await pgsqlUtils.getColumns(schema, tableName, pool);
        primaryKeys = await pgsqlUtils.getPrimaryKeys(schema, tableName, pool);

        scripts += `-- CRUD ${table}\n`
        // Se verifica cuales procedimientos hay que generar
        if (tables[table].create) {
            // Se genera el procedimiento de crear
            scripts += pgsqlUtils.generateCreate(req.schema, table, columns) + '\n';
        }
        if (tables[table].read) {
            // Se genera el procedimiento de leer
            scripts += pgsqlUtils.generateRead(req.schema, table, columns) + '\n';
        }
        if (tables[table].update) {
            // Si no hay primary keys o atributos para actualizar no se genera el update
            if (primaryKeys.length == 0) {
                scripts += '--No primary keys for update\n\n';
            } else if (primaryKeys.length == columns.length) {
                scripts += '--No attributes to update\n\n';
            } else {
                // Se genera el procedimiento de actualizar
                scripts += pgsqlUtils.generateUpdate(req.schema, table, columns, primaryKeys) + '\n';
            }
        }
        if (tables[table].delete) {
            // Si no hay primary keys no se genera el delete
            if (primaryKeys.length == 0) {
                scripts += '--No primary keys to delete\n\n';
            } else {
                // Se genera el procedimiento de eliminar
                scripts += pgsqlUtils.generateDelete(req.schema, table, columns, primaryKeys) + '\n';
            }
        }

        scripts += '\n\n'
    }

    // Si verifica si hay que ejecutar el código
    if (req.execute) {
        const client = await pool.connect();
        result = await client
            .query(scripts);
        client.release();
    }

    return scripts;
}

/**
 * Crea un esquema en pgsql
 * 
 * @param {Pool} pool pool de conexiones de pgsql
 * @param {string} schemaName nombre del esquema a crear
 */
const createPgsqlSchema = async (pool, schemaName) => {
    const client = await pool.connect();
    result = await client
        .query(`CREATE SCHEMA ${schemaName};`);
    client.release();
}