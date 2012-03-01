var builder = require('../appbuilder').create(),
    out = require('out');

module.exports = function(args) {
    var cli = this;
    
    builder.init(function(err) {
        builder.exec(cli, 'package', args, function(err) {
            out('successfully packaged application');
            cli.run('quit');
        });
    });
};