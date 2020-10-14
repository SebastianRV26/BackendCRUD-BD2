const e = require('express');
const mssql = require('mssql');
const { Pool, Client } = require('pg');
var poolList = {};

const addConnection = async (token, req) => {
    if (!(token in poolList)) {
        if (req.driver == 'mssql') {
            const res = await new mssql.ConnectionPool(req)
                .connect()
                .then(pool => {
                    console.log('Connected to MSSQL');
                    poolList[token] = pool;
                    return 0;
                })
                .catch(err => {
                    console.log('Database Connection Failed! Bad Config: ', req);
                    return 1;
                });
            return res;
        } else if (req.driver == 'pgsql') {
            if (!req.hasOwnProperty('port')) {
                return 2;
            }
            req.host = req.server;
            const pool = new Pool(req);
            const res = await pool.connect()
                .then(client => {
                    poolList[token] = pool;
                    client.release();
                    return 0;
                }).catch(err => {
                    console.log('Database Connection Failed! Bad Config: ', req);
                    return 1;
                });
            return res;
        } else {
            return 3;
        }
    } else {
        console.log('Connection already exists');
        return 0;
    }
}

const getConnection = (token) => {
    if (token in poolList) {
        return poolList[token];
    }

    return null;
}

module.exports = {
    mssql, addConnection, getConnection
}