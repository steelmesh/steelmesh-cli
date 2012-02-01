var builder = require('../appbuilder').create();

module.exports = function(args) {
    builder.init(function(err) {
        
    });
    
    this.run('quit');
};