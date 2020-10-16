exports.getColumns = async (schema, table, pool) => {
    const client = await pool.connect();
    const result = await client
        .query(`SELECT  COLUMN_NAME nombre,\
                        DATA_TYPE tipo,\
                        CHARACTER_MAXIMUM_LENGTH cp,\
                        NUMERIC_PRECISION np,\
                        DATETIME_PRECISION dp\
                FROM INFORMATION_SCHEMA.COLUMNS C\
                WHERE C.TABLE_NAME='${table}' AND C.TABLE_SCHEMA='${schema}'`);
    client.release();
    return result.rows;
}

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

exports.generateCreate = (schema, table, columnInfo) => {
    return '';
}

exports.generateRead = (schema, table, columnInfo) => {
    return '';
}

exports.generateUpdate = (schema, table, columnInfo, primaryKeys) => {
    return '';
}

exports.generateDelete = (schema, table, columnInfo, primaryKeys) => {
    return '';
}