var events = require('events'),
    debug = require('debug')('mesh'),
    path = require('path'),
    util = require('util');
    
module.exports = function(opts, extraArgs, callback) {
    var selected = extraArgs[0] || 'default',
        appPath = path.join(this.targetPath, 'app.js'),
        scaffolder = this;

    path.exists(appPath, function(exists) {
        if (exists) {
            throw new Error('app.js file already exists, remove this to run the scaffold command');
        }
        
        scaffolder.copyAssets('templates/' + selected, function(err) {
            if (err) {
                throw new Error('Unable to create project from ' + selected + ' scaffold');
            }
            else {
                scaffolder.out('!{green,tick}!{grey}successfully scaffolded steelmesh project');
            }
        });
    });
};