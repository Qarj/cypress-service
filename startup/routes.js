const express = require('express');
const about = require('../routes/about');
const ping = require('../routes/ping');
const tests = require('../routes/tests');
const serveIndex = require('serve-index');
const fileUpload = require('express-fileupload');

module.exports = function (app) {
    app.use(express.json());
    app.use('/about', about);
    app.use('/ping', ping);
    app.use(fileUpload()); // must be before route to /tests
    app.use('/tests', tests);
    app.use('/logs', express.static('logs'), serveIndex('logs', { icons: true }));
    app.use('/results', express.static('results'), serveIndex('results', { icons: true }));
    app.use('/static', express.static('static'), serveIndex('static', { icons: true }));
};
