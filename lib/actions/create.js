var ncp = require('ncp').ncp,
    out = require('out');

module.exports = function(opts, callback) {
    // if options is a function, then set it to the callback and reset the options
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    } // if
    
    // ensure the options have been initialized
    opts = opts || {};
    opts.template = opts.template || 'default';
    
    out('Initializing project in: {0}', this.targetPath);
    
    // copy the files from the assets
    ncp(this.getAssetPath('templates/' + opts.template), this.targetPath, callback);
};