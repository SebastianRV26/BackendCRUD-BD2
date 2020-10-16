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
                \nAS\nBEGIN\n    INSERT INTO ${table}(${columns})\n        VALUES(${parameters});\nEND`;
};

exports.generateRead = (schema, table, columnInfo) => {
    return '';
}

exports.generateUpdate = (schema, table, columnInfo, primaryKeys) => {
    /*let parametersWithType = '';

    Object.entries(columnInfo).forEach(([key, value]) => {
        // Exclude identities
        if (value.id == 0) {
            parameters += `@${value.nombre}, `;
            parametersWithType += `    @${value.nombre} ${value.tipo}${value.cp == null ? '' : `(${value.cp})`},\n`;
            columns += `${value.nombre}, `;
        }
    });*/   

    return '';
}

exports.generateDelete = (schema, table, columnInfo, primaryKeys) => {
    return '';
}