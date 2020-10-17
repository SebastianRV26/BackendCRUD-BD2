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
    let parameters = '';
    let parametersWithType = '';
    let columns = '';

    Object.entries(columnInfo).forEach(([key, value]) => {
        // Exclude identities
        console.log("se imprime esto",value.nombre, value.id);
        if (value.data_type != 'serial' & value.data_type != 'bigserial' & value.data_type != 'smallserial') {
            parameters += `_${value.attname}, `;
            parametersWithType += `    _${value.attname} ${value.data_type},\n`;
            columns += `${value.attname}, `;
        }
    });
    parameters = parameters.substring(0, parameters.length - 2);
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);
    columns = columns.substring(0, columns.length - 2);

    return `CREATE OR REPLACE FUNCTION ${schema}.ins_${table.split('.')[1]}(\n${parametersWithType})\
            \nRETURNS void AS $BODY$ \nBEGIN\n    INSERT INTO ${table}(${columns})\n        VALUES(${parameters});\nEND; \n$BODY$ \nLANGUAGE 'plpgsql';`;
};

exports.generateRead = (schema, table, columnInfo) => {
    return '';
}

exports.generateUpdate = (schema, table, columnInfo, primaryKeys) => {
    return '';
}

exports.generateDelete = (schema, table, columnInfo, primaryKeys) => {
    return '';
}