const express = require('express');
const router = express.Router();
const middleware = require('../middleware/middleware');
const HttpStatus = require('http-status-codes');
const tablesController = require('../controllers/tables');
const utils = require('../utils/utils');

/**
 * @api{get} /getTables Permite obtener las tablas de la base de datos
 * @apiName getTables
 * @apiGroup Tables
 * 
 * @apiSuccess {JSON} respuesta con los nombres de todas las tablas
 */
router.get('/GetTables', middleware.validateToken(), function (req, res) {
    const token = utils.getBearerToken(req);
    tablesController.getTables(token, req.query).then(result => {
        res.status(HttpStatus.OK).json({ data: result });
    }).catch(err => {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    });
});

/**
 * @api{get} /getSchemes Permite obtener los esquemas de la base de datos
 * @apiName getSchemes
 * @apiGroup Tables
 * 
 * @apiSuccess {JSON} respuesta con todos los esquemas
 */
router.get('/GetSchemes', middleware.validateToken(), function (req, res) {
    const token = utils.getBearerToken(req);
    tablesController.getSchemes(token, req.query).then(result => {
        res.status(HttpStatus.OK).json({ data: result });
    }).catch(err => {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    })
});

module.exports = router;