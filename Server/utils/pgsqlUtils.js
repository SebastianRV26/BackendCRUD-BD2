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
            \nRETURNS void AS $BODY$ \nBEGIN\n    INSERT INTO ${table}(${columns})\n        VALUES(${parameters});\nEND \n$BODY$ \nLANGUAGE 'plpgsql'; \n`;
};

exports.generateRead = (schema, table, columnInfo) => {
    let parameters = '';
    let parametersWithType = '';
    let columns = '';

    Object.entries(columnInfo).forEach(([key, value]) => {
        // Exclude identities
        //if (value.data_type != 'serial' & value.data_type != 'bigserial' & value.data_type != 'smallserial') {
        parameters += `(_${value.attname} IS NULL) OR (_${value.attname} = ${table.split('.')[1]}.${value.attname}) AND `;
        parametersWithType += `_${value.attname} ${value.data_type},\n`;
        columns += `${value.attname}, `;
        //}
    });
    parameters = parameters.substring(0, parameters.length - 5);
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);
    columns = columns.substring(0, columns.length - 2);

    return `CREATE OR REPLACE FUNCTION ${schema}.read_${table.split('.')[1]}(\n${parametersWithType})\n\
RETURNS TABLE(${parametersWithType}) LANGUAGE 'plpgsql' AS $BODY$ \nBEGIN \n\
    RETURN QUERY  SELECT * FROM ${table}\n\
    WHERE ${parameters};\nEND \n$BODY$;`;
}

exports.generateUpdate = (schema, table, columnInfo, primaryKeys) => {
    let parametersWithType = '';
    let set = '';

    Object.entries(primaryKeys).forEach(([key, value]) => {
        primaryKeys = value.column_name
    });

    Object.entries(columnInfo).forEach(([key, value]) => {
        // Exclude identities
        if(value.data_type == 'serial' || value.data_type == 'bigserial' || value.data_type == 'smallserial'){
            parametersWithType += `    _${value.attname} int,\n`;
        }else{
            parametersWithType += `    _${value.attname} ${value.data_type},\n`;
            if(primaryKeys != value.attname){
                set += `${value.attname} = _${value.attname}, `;
            }
        }
    });
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);
    set = set.substring(0, set.length - 2);

    return `CREATE OR REPLACE FUNCTION ${schema}.upd_${table.split('.')[1]}(\n${parametersWithType})\
            \nRETURNS void AS $BODY$ \nBEGIN\n    UPDATE ${table} SET ${set} WHERE ${primaryKeys} = _${primaryKeys};\nEND\
            \n$BODY$ \nLANGUAGE 'plpgsql'; \n`;
}

exports.generateDelete = (schema, table, columnInfo, primaryKeys) => {
    let parameters = '';
    let parametersWithType = '';
    let columns = '';

    Object.entries(primaryKeys).forEach(([key, value]) => {
        primaryKeys = value.column_name
    });

    Object.entries(columnInfo).forEach(([key, value]) => {
        // Exclude identities
        if (primaryKeys == value.attname) {
            parameters += `_${value.attname}, `;
            if(value.data_type == 'serial' || value.data_type == 'bigserial' || value.data_type == 'smallserial'){
                parametersWithType += `    _${value.attname} int,\n`;
            }
            columns += `${value.attname} `;
        }
    });
    parameters = parameters.substring(0, parameters.length - 2);
    parametersWithType = parametersWithType.substring(0, parametersWithType.length - 2);
    columns = columns.substring(0, columns.length - 2);

    return `CREATE OR REPLACE FUNCTION ${schema}.del_${table.split('.')[1]}(\n${parametersWithType})\
            \nRETURNS void AS $BODY$ \nBEGIN\n    DELETE FROM ${table} WHERE ${primaryKeys} = ${parameters};\nEND\
            \n$BODY$ \nLANGUAGE 'plpgsql';`;
}