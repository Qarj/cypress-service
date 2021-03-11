const config = require('config');

module.exports = function () {
    if (!config.get('port')) {
        console.log('WARNING: port is not defined in config.');
    }
};
