const express = require('express');
const about = require('../routes/about');
const ping = require('../routes/ping');
const test = require('../routes/test');
const serveIndex = require('serve-index');
const fileUpload = require('express-fileupload');

module.exports = function (app) {
    app.use(express.json());
    app.use('/about', about);
    app.use('/ping', ping);
    app.use(fileUpload()); // must be before route to /tests
    app.use('/test', test);
    app.use('/tests', express.static('tests'), serveIndex('tests', { icons: true }));
    app.use('/logs', express.static('logs'), serveIndex('logs', { icons: true }));
    app.use('/results', express.static('results'), serveIndex('results', { icons: true }));
    app.use('/static', express.static('static'), serveIndex('static', { icons: true }));
};
