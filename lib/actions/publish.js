var builder = require('../appbuilder').create(),
    out = require('out');

module.exports = function(args) {
    var cli = this;
    
    builder.publish(args, function(err) {
        if (err) {
            out('!{red}{0}', err);
        }
        else {
            out('successfully published application');
        }

        cli.run('quit');
    });
};