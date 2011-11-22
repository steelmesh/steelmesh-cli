var ncp = require('ncp').ncp,
    out = require('out');

module.exports = function(opts, callback) {
    var mesh = this;
    
    // if options is a function, then set it to the callback and reset the options
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    } // if
    
    opts.prompt('project name: ', function(name) {
        // ensure the options have been initialized
        opts = opts || {};
        opts.template = opts.template || 'default';

        out('Initializing project in: {0}', mesh.targetPath);

        // copy the files from the assets
        ncp(mesh.getAssetPath('templates/' + opts.template), mesh.targetPath, callback);
    });
};