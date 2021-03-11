const express = require('express');
const config = require('config');
const app = express();

require('./startup/routes')(app);
require('./startup/settings')(app);
require('./startup/config')();

const PORT = process.env.PORT || config.get('port');
const HOST = process.env.HOST || config.get('host');
const server = app
    .listen(PORT, HOST, () => console.log(`Listening on port ${PORT}...`))
    .on('connection', (socket) => {
        socket.setTimeout(600000);
    });

module.exports = server;
