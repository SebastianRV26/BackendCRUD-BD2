exports.getColumns = async (schema, table, pool) => {
    const result = await pool.request()
        .query(`SELECT  COLUMN_NAME nombre,\
                        DATA_TYPE tipo,\
                        CHARACTER_MAXIMUM_LENGTH cp,\
                        NUMERIC_PRECISION np,\
                        DATETIME_PRECISION dp,\
                        IIF(NAME IS NULL, 0, 1) id\
                FROM INFORMATION_SCHEMA.COLUMNS C\
                LEFT JOIN sys.identity_columns IC\
                ON (C.COLUMN_NAME = IC.NAME) AND (OBJECT_NAME(OBJECT_ID) = C.TABLE_NAME)\
                WHERE C.TABLE_NAME='${table}' AND C.TABLE_SCHEMA='${schema}'`);
    return result.recordset;
}

exports.getPrimaryKeys = async (schema, table, pool) => {
    const result = await pool.request()
        .query(`SELECT COLUMN_NAME\
		        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE\
		        WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA+'.'+CONSTRAINT_NAME), 'IsPrimaryKey')=1\
			        AND TABLE_NAME='${table}' AND TABLE_SCHEMA='${schema}';`);
    return result.recordset;
}

exports.generateCreate = (schema, table, columnInfo) => {
    let parameters = '';
    let parametersWithType = '';
    let columns = '';

    Object.entries(columnInfo).forEach(([key, value]) => {
        // Exclude identities
        if (value.id == 0) {
            parameters += `@${value.nombre}, `;
            parametersWithType += `    @${value.nombre} ${value.tipo}${value.cp == null ? '' : `(${value.cp})`},\n`;
            columns += `${value.nombre}, `;
        }
    });

    parameters = parameters.substring(0, parameters.length - 2);
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);
    columns = columns.substring(0, columns.length - 2);

    return `CREATE OR ALTER PROC ${schema}.ins_${table.split('.')[1]}\n${parametersWithType}\
                \nAS\nBEGIN\n    INSERT INTO ${table}(${columns})\n        VALUES(${parameters});\nEND\nGO\n`;
};

exports.generateRead = (schema, table, columnInfo) => {
    let parameters = '';
    let parametersWithType = '';
    let columns = '';

    Object.entries(columnInfo).forEach(([key, value]) => {
        // Exclude identities
        //if (value.id == 0) {
        parameters += `(@${value.nombre} IS NULL) OR (@${value.nombre}=${value.nombre})\n        AND `;
        parametersWithType += `    @${value.nombre} ${value.tipo}${value.cp == null ? '' : `(${value.cp})`},\n`;
        columns += `${value.nombre}, `;
        //}
    });

    parameters = parameters.substring(0, parameters.length - 13);
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);
    columns = columns.substring(0, columns.length - 2);
    return `CREATE OR ALTER PROC ${schema}.read_${table.split('.')[1]}\n${parametersWithType}\
                \nAS\nBEGIN\n    SELECT ${columns} FROM ${table}\n    WHERE ${parameters}\nEND\nGO\n`;
}

exports.generateUpdate = (schema, table, columnInfo, primaryKeys) => {
    let parametersWithType = '', updateData = '', pkData = '';

    Object.entries(columnInfo).forEach(([key, value]) => {
        if (primaryKeys.filter(pk => pk.COLUMN_NAME == value.nombre).length == 0) {
            updateData += `\n        ${value.nombre} = ISNULL(@${value.nombre}, ${value.nombre}),`;
            parametersWithType +=
                `    @${value.nombre} ${value.tipo}${value.cp == null ? '' : `(${value.cp})`},\n`;
        } else {
            parametersWithType +=
                `    @${value.nombre} ${value.tipo}${value.cp == null ? '' : `(${value.cp})`},\n`;
        }
    });

    pkData = `        ${primaryKeys[0].COLUMN_NAME} = @${primaryKeys[0].COLUMN_NAME}`;
    for (i = 1; i < primaryKeys.length; i++) {
        pkData += ` AND ${primaryKeys[i].COLUMN_NAME} = @${primaryKeys[i].COLUMN_NAME}`;
    }

    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);
    updateData = updateData.substring(0, updateData.length - 1);

    return `CREATE OR ALTER PROC ${schema}.upd_${table.split('.')[1]}\n${parametersWithType}\
                \nAS\nBEGIN\n    UPDATE ${table} SET${updateData}\n    WHERE\n${pkData};\nEND\nGO\n`;
}

exports.generateDelete = (schema, table, columnInfo, primaryKeys) => {
    let parameters = '';
    let parametersWithType = '';

    Object.entries(columnInfo).forEach(([key, value]) => {
        if (primaryKeys.filter(pk => pk.COLUMN_NAME == value.nombre).length > 0) {
            parameters += `${value.nombre} = @${value.nombre} AND `;
            parametersWithType += `    @${value.nombre} ${value.tipo}${value.cp == null ? '' : `(${value.cp})`},\n`;
        }
    });

    parameters = parameters.substring(0, parameters.length - 5);
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);

    return `CREATE OR ALTER PROC ${schema}.del_${table.split('.')[1]}\n${parametersWithType}\
                \nAS\nBEGIN\n    DELETE FROM ${table} WHERE ${parameters};\nEND\nGO\n`;
}