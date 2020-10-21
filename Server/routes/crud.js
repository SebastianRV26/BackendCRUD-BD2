const express = require('express');
const router = express.Router();
const middleware = require('../middleware/middleware');
const HttpStatus = require('http-status-codes');
const crudController = require('../controllers/crud');
const utils = require('../utils/utils');

/**
 * @api{post} /GenerateCrud Permite general el crud de un grupo de tablas
 * @apiName GenerateCrud
 * @apiGroup Crud
 *  
 * @apiParam {String} schema Nombre del esquema donde se genran los procedures
 * @apiParam {Boolean} create Indica si hay que crear el esquema
 * @apiParam {String} execute Indica si hay que ejecutar el código
 * @apiParam {Array} tables Lista de tablas con los datos a generar
 * 
 * @apiSuccess {JSON} devuelve el script generado
 */
router.post('/GenerateCrud', middleware.validateToken(), function (req, res) {
    const token = utils.getBearerToken(req);
    crudController.getCrud(token, req.body).then(result => {
        res.status(HttpStatus.OK).json({ data: result });
    }).catch(err => {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    });
});

module.exports = router;