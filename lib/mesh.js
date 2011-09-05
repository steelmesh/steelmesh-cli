var path = require('path'),
    fs = require('fs'),
    url = require('url'),
    comfy = require('comfy'),
    couchapp = require('couchapp'),
    reLeadingSlash = /^\//,
    walkOpts = {
        ignoreDotFiles: true
    };

function errorOut(message) {
    console.log(message);
} // error

function status(message) {
    console.log(message);
}

function initDB(couch, callback) {
    couch.get(function(error, res) {
        if (res && res.error === 'not_found') {
            couch.put(function(error, res) {
                if (! error) {
                    callback();
                }
                else {
                    errorOut(error);
                }
            });
        }
        else if (res) {
            callback();
        } // if..else
    });
} // initDB

function loadConfig(configFile, argv, callback) {
    var config = require(configFile),
        filepath = config.attachments || path.dirname(configFile),
        couchUrl = url.format({
            protocol: config.protocol || argv.protocol || 'http:',
            hostname: config.hostname || argv.hostname || 'localhost',
            port: config.port || argv.port || 5984
        }),
        couch = comfy.init({
            url: couchUrl,
            db: config.db || argv.db || 'meshapps'
        });
        
    initDB(couch, function() {
        status('connected to couch, uploading application: ' + config._id);
        
        // update the designs
        updateDesigns(couchUrl, couch);
        
        // look for attachments for the app we are loading
        path.exists(filepath, function(exists) {
            config._attachments = [];
            
            // load any attachments for the app
            if (exists) {
                couchapp.loadAttachments(config, filepath);
            } // if
            
            // deploy the application
            couchapp.createApp(config, couchUrl + '/' + couch.db, function(app) {
                status('application ' + config._id + ' prepared, pushing to server');

                app.push(function() {
                    status('application ' + config._id + ' published');

                    if (callback) {
                        callback();
                    } // if
                });
            });
        });
    });
} // loadConfig

function updateDesigns(couchUrl, couch, callback) {
    status('updating design docs for db: ' + couch.db);
    
    fs.readdir(path.join(__dirname, '../designs'), function(err, files) {
        if (! err) {
            files.forEach(function(file) {
                var designDoc = require(path.join(__dirname, '../designs', file));
                
                designDoc._id = '_design/' + path.basename(file, '.js');
                
                couchapp.createApp(designDoc, couchUrl + '/' + couch.db, function(app) {
                    status('uploading design: ' + designDoc._id);
                    app.push();
                });
            });
        } // if
    });
} // updateDesigns

exports.run = function(argv) {
    var configFile = path.resolve(argv.app);
    
    path.exists(configFile, function(exists) {
        if (exists) {
            loadConfig(configFile, argv);
        }
        else {
            error('Application configuration file not found');
        }
    });
}; 