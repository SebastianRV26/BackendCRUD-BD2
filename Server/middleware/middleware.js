const HttpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const secret_token = require('../config/envconfig').secret_token;
const utils = require('../utils');
const poolManager = require('../poolManager');

exports.validateRequest = (fields, bodyRequest) => {
    return (req, res, next) => {
        if (fields.length != 0) {
            let request = bodyRequest ? req.body : req.query;
            for (const field of fields) {
                if (!request[field] && request[field] != 0) {
                    res.status(HttpStatus.BAD_REQUEST).send({ error: `Paremeter ${field} is required!` });
                    return;
                }
            }
        }
        next();
    }
};

exports.validateToken = () => {
    return (req, res, next) => {
        const token = utils.getBearerToken(req);
        if (token) {
            jwt.verify(token, secret_token, (err, data) => {
                if (err) {
                    return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token' });
                } else if (poolManager.getConnection(token) == null) {
                    return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not logged' });
                } else {
                    next();
                }
            });
        } else {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No token provided' });
        }
    }
}