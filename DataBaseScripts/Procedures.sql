--create SCHEMA autogeneracion
go
--create SCHEMA cruds
GO
IF OBJECT_ID('autogeneracion.gen_inserts') IS NOT NULL
    drop PROCEDURE autogeneracion.gen_inserts
go
CREATE OR ALTER PROCEDURE autogeneracion.gen_inserts (@esquema varchar(100),@tabla varchar(100))
AS
    DECLARE
        @sql nvarchar(500),
        @nombre varchar(100),
        @tipo VARCHAR(100),
        @cp int,
        @np int,
        @dp int,
        @nl varchar(2),
        @parametros_con_tipo VARCHAR(200),
        @parametros_sin_tipo VARCHAR(200),
        @nombres_columnas VARCHAR(200)
    SET @parametros_con_tipo=''
    SET @parametros_sin_tipo=''
    SET @nombres_columnas=''
    DECLARE cursor_columnas CURSOR FOR
        select  COLUMN_NAME nombre,
                DATA_TYPE tipo,
                CHARACTER_MAXIMUM_LENGTH cp,
                NUMERIC_PRECISION np,
                DATETIME_PRECISION dp
        from INFORMATION_SCHEMA.COLUMNS
        where TABLE_NAME=@tabla
    set @sql='CREATE PROCEDURE '+@esquema+'.ins_'+@tabla+'('
    
    OPEN cursor_columnas

    FETCH NEXT FROM cursor_columnas 
    INTO @nombre,@tipo,@cp,@np,@dp
    while @@FETCH_STATUS=0
    BEGIN
        SET @parametros_con_tipo=@parametros_con_tipo+'@'+@nombre+ ' '+@tipo +', '
        SET @parametros_sin_tipo=@parametros_sin_tipo+'@'+@nombre+ ', '
        SET @nombres_columnas=@nombres_columnas+@nombre+ ', '
        FETCH NEXT FROM cursor_columnas 
        INTO    @nombre,@tipo,@cp,@np,@dp
    END
    CLOSE cursor_columnas
    DEALLOCATE cursor_columnas
    SET @parametros_con_tipo=SUBSTRING(@parametros_con_tipo,1,LEN(@parametros_con_tipo)-1)
    SET @parametros_sin_tipo=SUBSTRING(@parametros_sin_tipo,1,LEN(@parametros_sin_tipo)-1)
    SET @nombres_columnas=SUBSTRING(@nombres_columnas,1,LEN(@nombres_columnas)-1)
    set @nl=CHAR(13) + CHAR(10)
    SET @sql=@sql+@parametros_con_tipo+')'+ @nl +' as ' +@nl
    SET @sql=@sql+'insert into personas('+@nombres_columnas+')'+@nl+'values'+@nl
    SET @sql=@sql+'('+@parametros_sin_tipo+')'
    print @sql;
    exec sp_executeSQL @sql;
go

EXEC autogeneracion.gen_inserts 'cruds','personas'