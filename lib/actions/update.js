var couchapp = require('couchapp'),
    path = require('path'),
    out = require('out');

module.exports = function(opts, callback) {
    var mesh = this;
    
    // if options is a function, then set it to the callback and reset the options
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    } // if
    
    this.connect(function(error, couch) {
        var config = require(path.join(mesh.targetPath, 'app.js'));
        
        if (error) {
            callback(error);
            return;
        } // if
        
        // reset the attachments
        config._attachments = [];

        // load any attachments for the app
        couchapp.loadAttachments(config, mesh.targetPath);
        
        // initialise the id for the item
        config._id = mesh.app;
        out('Preparing !{magenta}{0} for deployment', mesh.app);

        // deploy the application
        couchapp.createApp(config, mesh.getDbUrl(), function(app) {
            out('Pushing to db...');
            
            app.push(function() {
                if (callback) {
                    callback(null, app);
                } // if
            });
        });
    });
};