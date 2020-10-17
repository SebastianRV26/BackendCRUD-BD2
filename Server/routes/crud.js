const express = require('express');
const router = express.Router();
const middleware = require('../middleware/middleware');
const HttpStatus = require('http-status-codes');
const crudController = require('../controllers/crud');
const utils = require('../utils/utils');

router.post('/GenerateCrud', middleware.validateToken(), function (req, res) {
    const token = utils.getBearerToken(req);
    crudController.getCrud(token, req.body).then(result => {
        res.status(HttpStatus.OK).json({ data: result });
    }).catch(err => {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    });
});

module.exports = router;