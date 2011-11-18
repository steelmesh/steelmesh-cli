var couchapp = require('couchapp'),
    path = require('path'),
    fs = require('fs'),
    out = require('out'),
    async = require('async'),
    nano = require('nano'),
    couchAddin = require('../addins/couch');
    
function _findDesigns(mesh, config, callback) {
    var designs = [];
    
    // iterate through the config and look for designs
    for (var key in config.couchdb) {
        (config.couchdb[key].designs || []).forEach(function(design) {
            designs.push({
                db: key,
                design: design
            });
        });
    }
    
    // run the couch addin to initialise the databases
    couchAddin.install.call(config, mesh, null, null, function(dbUrls) {
        // iterate through each of the dseigns and upload to the database
        async.forEach(designs, function(data, itemCallback) {
            _uploadDesign(mesh, dbUrls[data.db], data.design, itemCallback);
        }, callback);
    });
} // _findDesigns

function _uploadDesign(mesh, dbUrl, targetDesign, callback) {
    // initialise the path to the design doc
    var ddoc = path.join(mesh.targetPath, 'lib', '_designs', targetDesign + '.js');

    try {
        var designDoc = require(ddoc);
        
        designDoc._id = '_design/' + targetDesign;
        couchapp.createApp(designDoc, dbUrl, function(app) {
            app.push(callback);
        });
    }
    catch (e) {
        callback('Unable to upload design: ' + ddoc);
    }
} // _uploadDesign
    
module.exports = function(opts, callback) {
    var mesh = this;
    
    // if options is a function, then set it to the callback and reset the options
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    } // if
    
    this.connect(function(error, couch) {
        if (error) {
            callback(error);
            return;
        } // if
        
        // load the app config
        mesh.loadApp(function(config) {
            // reset the attachments
            config._attachments = [];

            // load any attachments for the app
            couchapp.loadAttachments(config, mesh.targetPath);

            // initialise the id for the item
            config._id = mesh.config.appid;
            out('Preparing !{magenta}{0} for deployment', mesh.config.appid);
            out(mesh.getDbUrl());

            // deploy the application
            couchapp.createApp(config, mesh.getDbUrl(), function(app) {
                out('Pushing to db...');
                
                async.series([
                    app.push,
                    function(itemCallback) {
                        _findDesigns(mesh, config, itemCallback);
                    }
                ], callback);
            });
        });
    });
};