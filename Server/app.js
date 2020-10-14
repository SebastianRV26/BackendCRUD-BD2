const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();

// Routers
const loginRouter = require('./routes/login');
const tablesRouter = require('./routes/tables');

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());

// Routes
app.use('/', loginRouter);
app.use('/', tablesRouter);

module.exports = app;