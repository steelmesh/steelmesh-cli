var builder = require('../appbuilder').create(),
    out = require('out');

module.exports = function(args) {
    var cli = this;
    
    builder.init(function(err) {
        builder.exec(cli, 'publish', args, function(err) {
            if (err) {
                out('!{red}{0}', err);
            }
            else {
                out('successfully packaged application');
            }

            cli.run('quit');
        });
    });
};