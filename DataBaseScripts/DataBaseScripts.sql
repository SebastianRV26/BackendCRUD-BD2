-------------------------- Base de datos de pueba -------------------------------
--CREATE DATABASE DB1;
USE DB1;

GO
CREATE SCHEMA esquema1;
GO

GO
CREATE SCHEMA esquema2;
GO

CREATE TABLE esquema1.tabla1 (
	id INT IDENTITY(1,1) NOT NULL, 
	nombre VARCHAR(20) NOT NULL
);

CREATE TABLE esquema2.tabla2 (
	id INT IDENTITY(1,1) NOT NULL, 
	nombre VARCHAR(20) NOT NULL
);

CREATE TABLE esquema1.tabla3 (
	id INT IDENTITY(1,1) NOT NULL, 
	nombre VARCHAR(20) NOT NULL
);

CREATE TABLE esquema2.tabla4 (
	id INT IDENTITY(1,1) NOT NULL, 
	nombre VARCHAR(20) NOT NULL
);

-------------------------- Base de datos de pueba 2 -------------------------------
--CREATE DATABASE DB2;
USE DB2;

GO
CREATE SCHEMA esquema3;
GO

GO
CREATE SCHEMA esquema4;
GO

CREATE TABLE esquema3.tabla1 (
	id INT IDENTITY(1,1) NOT NULL, 
	nombre VARCHAR(20) NOT NULL
);

CREATE TABLE esquema4.tabla2 (
	id INT IDENTITY(1,1) NOT NULL, 
	nombre VARCHAR(20) NOT NULL
);

CREATE TABLE esquema3.tabla3 (
	id INT IDENTITY(1,1) NOT NULL, 
	nombre VARCHAR(20) NOT NULL
);

CREATE TABLE esquema4.tabla4 (
	id INT IDENTITY(1,1) NOT NULL, 
	nombre VARCHAR(20) NOT NULL
);
