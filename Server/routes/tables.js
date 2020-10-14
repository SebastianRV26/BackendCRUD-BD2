const express = require('express');
const router = express.Router();
const middleware = require('../middleware/middleware');
const HttpStatus = require('http-status-codes');
const tablesController = require('../controllers/tables');
const utils = require('../utils');

router.get('/GetTables', middleware.validateToken(), function (req, res) {
    const token = utils.getBearerToken(req);
    tablesController.getTable(token, req.query).then(result => {
        res.status(HttpStatus.OK).json({ data: result });
    }).catch(err => {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    })
});

module.exports = router;