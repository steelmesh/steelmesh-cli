module.exports = function(opts, callback) {
    var mesh = this;
    
    // if options is a function, then set it to the callback and reset the options
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    } // if
    
    // initialise options
    opts = opts || {};
    
    // connect to the mesh instance
    this.connect(function(err, couch) {
        require('./admin-update').call(mesh, opts, callback);
    }, true);
};