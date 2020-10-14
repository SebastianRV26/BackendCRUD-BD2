const app = require('./app');
const config = require('./config/envconfig');

app.listen(config.server.port, function () {
    console.log(`Listening on port ${config.server.port}`);
});