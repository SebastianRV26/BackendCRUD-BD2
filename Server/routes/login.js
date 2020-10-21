const express = require('express');
const router = express.Router();
const middleware = require('../middleware/middleware');
const consts = require('../config/constants');
const HttpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const secret_token = require('../config/envconfig').secret_token;
const poolManager = require('../poolManager');

/**
 * @api{post} /login Agrega un nuevo cubículo
 * @apiName login
 * @apiGroup Login
 *  
 * @apiParam {String} user Nombre del usuario de la db
 * @apiParam {String} password Password del usuario
 * @apiParam {String} server Direccion del server
 * @apiParam {String} database Nombre de la db
 * @apiParam {String} driver Driver de la db (mssql o pgsql)
 * 
 * @apiSuccess {JSON} repuesta con el token del usuario
 */
router.post('/login', middleware.validateRequest([
    "user",
    "password",
    "server",
    "database",
    "driver"
], consts.IS_BODY_REQ), function (req, res) {
    // Se genera el token
    const token = jwt.sign(JSON.stringify(req.body), secret_token);

    // Se intenta establecer y guardar la conexión
    poolManager.addConnection(token, req.body).then(result => {
        // Validación de los posibles estados de la conexión
        if (result == 0) {
            res.status(HttpStatus.OK).json({
                message: 'Connection successful',
                status: 0,
                token: token
            });
        } else if (result == 1) {
            res.status(HttpStatus.UNAUTHORIZED).json({
                message: 'Connection failed. Bad credentials',
                status: 1
            });
        } else if (result == 2) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Port is required for pgsql driver',
                status: 2
            });
        } else {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Connection failed. Unknown driver',
                status: 3
            });
        }
    });
});

module.exports = router;