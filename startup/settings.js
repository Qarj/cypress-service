const timeout = require('connect-timeout');

module.exports = function (app) {
    app.use(timeout('600s', true));
};
