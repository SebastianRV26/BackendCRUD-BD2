/**
 * Obtiene las columnas de una tabla en pgsql
 * 
 * @param {string} schema esquema de la tabla
 * @param {string} table nombre de la tabla
 * @param {Pool} pool pool de conexiones de pgsql
 */
exports.getColumns = async (schema, table, pool) => {
    const client = await pool.connect();
    const result = await client
        .query(`SELECT a.attname
        , CASE WHEN a.atttypid = ANY ('{int,int8,int2}'::regtype[])
             AND EXISTS (
                SELECT FROM pg_attrdef ad
                WHERE  ad.adrelid = a.attrelid
                AND    ad.adnum   = a.attnum
                AND    pg_get_expr(ad.adbin, ad.adrelid)
                     = 'nextval('''
                    || (pg_get_serial_sequence (a.attrelid::regclass::text
                                             , a.attname))::regclass
                    || '''::regclass)'
                )
           THEN CASE a.atttypid
                   WHEN 'int'::regtype  THEN 'serial'
                   WHEN 'int8'::regtype THEN 'bigserial'
                   WHEN 'int2'::regtype THEN 'smallserial'
                END
           ELSE format_type(a.atttypid, a.atttypmod)
           END AS data_type
   FROM   pg_attribute  a
   WHERE  a.attrelid = '${schema}.${table}'::regclass  -- table name, optionally schema-qualified
   AND    a.attnum > 0
   AND    NOT a.attisdropped
   ORDER  BY a.attnum;`);
    client.release();
    return result.rows;
}

/**
 * Obtiene las llaves primarias de una tabla en pgsql
 * 
 * @param {String} schema esquema de la tabla
 * @param {String} table nombre de la tabla
 * @param {Pool} pool pool de conexiones de pgsql
 */
exports.getPrimaryKeys = async (schema, table, pool) => {
    const client = await pool.connect();
    const result = await client
        .query(`SELECT c.column_name
                FROM information_schema.table_constraints tc 
                JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name) 
                JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
                AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
                WHERE constraint_type = 'PRIMARY KEY' and tc.table_name = '${table}' and tc.table_schema = '${schema}';`);
    client.release();
    return result.rows;
};

/**
 * Genera el procedimiento de inserción de datos de una tabla en pgsql
 * 
 * @param {string} schema esquema de la tabla
 * @param {string} table nombre de la tabla
 * @param {Array} columnInfo lista con la info de las columnas
 */
exports.generateCreate = (schema, table, columnInfo) => {
    let parameters = ''; // parametros
    let parametersWithType = ''; // parametros junto al tipo
    let columns = ''; // columnas

    Object.entries(columnInfo).forEach(([key, value]) => {
        // Se excluyen los tipos de sequencias
        if (value.data_type != 'serial' & value.data_type != 'bigserial' & value.data_type != 'smallserial') {
            parameters += `_${value.attname}, `;
            parametersWithType += `    _${value.attname} ${value.data_type},\n`;
            columns += `${value.attname}, `;
        }
    });

    // Se elimina la ultima coma y el espacio al final
    parameters = parameters.substring(0, parameters.length - 2);
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);
    columns = columns.substring(0, columns.length - 2);

    // Se devuelve el código del procedure
    return `CREATE OR REPLACE FUNCTION ${schema}.ins_${table.split('.')[1]}(\n${parametersWithType})\
            \nRETURNS void AS $BODY$ \nBEGIN\n    INSERT INTO ${table}(${columns})\n        VALUES(${parameters});\nEND \n$BODY$ \nLANGUAGE 'plpgsql'; \n`;
};

/**
 * Genera el procedimiento de lectura de datos de una tabla en pgsql
 * 
 * @param {string} schema esquema de la tabla
 * @param {string} table nombre de la tabla
 * @param {Array} columnInfo lista con la info de las columnas
 */
exports.generateRead = (schema, table, columnInfo) => {
    let parameters = ''; // parametros
    let parametersWithType = ''; // parametros junto al tipo
    let columns = '';

    Object.entries(columnInfo).forEach(([key, value]) => {
        // Exclude identities
        value.data_type = value.data_type.replace('serial', 'int');

        parameters += `(_${value.attname} IS NULL) OR (_${value.attname} = ${table.split('.')[1]}.${value.attname})\n        AND `;
        parametersWithType += `\n    _${value.attname} ${value.data_type} default null,`;
        columns += `${value.attname}, `;
    });

    // Se elimina la ultima coma y el espacio al final
    parameters = parameters.substring(0, parameters.length - 13);
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 1);
    columns = columns.substring(0, columns.length - 2);

    // Se devuelve el código del procedure
    return `CREATE OR REPLACE FUNCTION ${schema}.read_${table.split('.')[1]}(${parametersWithType})\
            \nRETURNS SETOF ${table}\nLANGUAGE 'plpgsql' AS $BODY$ \nBEGIN\
            \n    RETURN QUERY  SELECT * FROM ${table}\
            \n    WHERE ${parameters};\nEND \n$BODY$;\n`;
}

/**
 * Genera el procedimiento de actualizacion de datos de una tabla en pgsql
 * 
 * @param {string} schema esquema de la tabla
 * @param {string} table nombre de la tabla
 * @param {Array} columnInfo lista con la info de las columnas
 * @param {Array} primaryKeys lista con la info de las primary keys
 */
exports.generateUpdate = (schema, table, columnInfo, primaryKeys) => {
    let parametersWithType = '', updateData = '', pkData = '';

    Object.entries(columnInfo).forEach(([key, value]) => {
        // Si la columna no es una primary key se incluye en los datos a actualizar
        if (primaryKeys.filter(pk => pk.column_name == value.attname).length == 0) {
            value.data_type = value.data_type.replace('serial', 'int');
            updateData += `\n        ${value.attname} = coalesce(_${value.attname}, ${value.attname}),`;
            parametersWithType +=
                `    _${value.attname} ${value.data_type},\n`;
        } else {
            value.data_type = value.data_type.replace('serial', 'int');
            parametersWithType +=
                `    _${value.attname} ${value.data_type},\n`;
        }
    });

    // Se genera el WHERE con los datos de las llaves primarias
    pkData = `        ${primaryKeys[0].column_name} = _${primaryKeys[0].column_name}`;
    for (i = 1; i < primaryKeys.length; i++) {
        pkData += ` AND ${primaryKeys[i].column_name} = _${primaryKeys[i].column_name}`;
    }

    // Se elimina la ultima coma y el espacio al final
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);
    updateData = updateData.substring(0, updateData.length - 1);

    // Se devuelve el código del procedure
    return `CREATE OR REPLACE FUNCTION ${schema}.upd_${table.split('.')[1]}(\n${parametersWithType})\
            \nRETURNS void AS $BODY$ \nBEGIN\n    UPDATE ${table} SET${updateData}\n    WHERE\n${pkData};\nEND\
            \n$BODY$ \nLANGUAGE 'plpgsql'; \n`;
}

/**
 * Genera el procedimiento de eliminación de datos de una tabla en pgsql
 * 
 * @param {string} schema esquema de la tabla
 * @param {string} table nombre de la tabla
 * @param {Array} columnInfo lista con la info de las columnas
 * @param {Array} primaryKeys lista con la info de las primary keys
 */
exports.generateDelete = (schema, table, columnInfo, primaryKeys) => {
    let parameters = ''; // parametros
    let parametersWithType = ''; // parametros junto al tipo

    Object.entries(columnInfo).forEach(([key, value]) => {
        if (primaryKeys.filter(pk => pk.column_name == value.attname).length > 0) {
            value.data_type = value.data_type.replace('serial', 'int');

            // Se genera el WHERE con los datos de las llaves primarias
            parameters += `${value.attname} = _${value.attname} AND `;

            parametersWithType += `    _${value.attname} ${value.data_type},\n`;

        }
    });

    // Se elimina la ultima coma y el espacio al final
    parameters = parameters.substring(0, parameters.length - 5);
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);

    // Se devuelve el código del procedure
    return `CREATE OR REPLACE FUNCTION ${schema}.del_${table.split('.')[1]}(\n${parametersWithType})\
            \nRETURNS void AS $BODY$ \nBEGIN\n    DELETE FROM ${table} WHERE ${parameters};\nEND\
            \n$BODY$ \nLANGUAGE 'plpgsql';`;
}