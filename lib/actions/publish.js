var couchapp = require('couchapp'),
    path = require('path'),
    fs = require('fs'),
    out = require('out'),
    async = require('async'),
    nano = require('nano');
    
function _findDesigns(mesh, app, callback) {
    var designs = [];
    
    out(':: checking for designs...');
    
    // iterate through the config and look for designs
    for (var key in app.couchdb) {
        (app.couchdb[key].designs || []).forEach(function(design) {
            designs.push({
                db: key,
                design: design
            });
        });
    }
    
    app.wireCouch(mesh, function(dbUrls) {
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
        mesh.loadApp(function(app, config) {
            // reset the attachments
            config._attachments = [];
            
            // load any attachments for the app
            couchapp.loadAttachments(config, mesh.targetPath);
            
            // initialise the id for the item
            config._id = 'app::' + mesh.config.appid;
            out(':: preparing !{cyan}{0}!{} for deployment to !{underline}{1}', mesh.config.appid, mesh.getDbUrl());

            // deploy the application
            couchapp.createApp(config, mesh.getDbUrl(), function(couchApplication) {
                out(':: pushing to db...');
                
                console.log(couchApplication);
                
                async.series([
                    couchApplication.push,
                    function(itemCallback) {
                        _findDesigns(mesh, app, itemCallback);
                    }
                ], function(err) {
                    callback(null, ['application publish ' + (err ? '!{red}failed' : '!{green}succeeded')]);
                });
            });
        });
    });
};