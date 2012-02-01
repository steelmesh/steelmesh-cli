var builder = require('../appbuilder').create();

module.exports = function(args) {
    builder.init(function(err) {
        builder.exec(this, 'package', args);
    });
};