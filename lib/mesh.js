var path = require('path'),
    debug = require('debug')('mesh'),
    events = require('events'),
    util = require('util'),
    fs = require('fs'),
    url = require('url'),
    nano = require('nano'),
    out = require('out'),
    MeshApp = require('./meshapp').MeshApp,
    reTrailingSlash = /\/$/,
    reTrailingColon = /\:$/;

function Mesh(opts) {
    // initialise the path
    this.targetPath = path.resolve(opts.path || process.cwd);
};

util.inherits(Mesh, events.EventEmitter);

Mesh.prototype.connect = function(callback, allowCreate) {
    var dbname = this.config.meshdb,
        mesh = this,
        couch = nano(this.config.couchurl);
        
    // initialise the database
    couch.db.get(dbname, function(error, res) {
        if (res && res.error === 'not_found') {
            if (allowCreate) {
                couch.db.create(dbname, function(putErr, res) {
                    callback(putErr, res);
                });
            }
            else {
                callback('Cannot connect to ' + mesh.config.couchurl + '/' + mesh.config.meshdb, couch);
            } // if..else
        }
        else {
            callback(error, couch);
        } // if..else
    });    
}; // connect

Mesh.prototype.getAction = function(name) {
    var actionPath = path.resolve(__dirname, 'actions', name + '.js');
    
    debug('action \'' + name + '\' requested, loading file: ' + actionPath);
    return require(actionPath);
};

Mesh.prototype.getAssetPath = function(target) {
    return path.resolve(__dirname, '../assets/' + target);
}; // getAssetPath

Mesh.prototype.getDbUrl = function() {
    return this.config.couchurl + '/' + this.config.meshdb;
};

Mesh.prototype.loadApp = function(callback) {
    var targetPath = this.targetPath,
        config = require(path.join(targetPath, 'app.js')),
        packagePath = path.join(targetPath, 'package.json');

    // if we have a package json in the directory selectively add some of thos details
    fs.readFile(packagePath, 'utf8', function(err, data) {
        if (! err) {
            var packageData = JSON.parse(data);
            
            // add the dependencies information to the config
            config.dependencies = packageData.dependencies;
        } // if
        
        callback(new MeshApp(targetPath, config), config);
    });
}; // loadApp

Mesh.prototype.loadConfig = function(opts, callback) {
    var configFile = path.join(this.targetPath, 'config.json'),
        mesh = this;
        
    fs.readFile(configFile, 'utf8', function(err, data) {
        var config = {};
        
        if (! err) {
            try {
                config = JSON.parse(data);
            }
            catch (e) {
                out('!{red}Corrupt config file: !{underline}{0}', configFile);
            } // try..catch
        }
        
        // initialise configuration
        mesh.config = {
            couchurl: (opts.couchurl || config.couchurl || 'http://localhost:5984/').replace(reTrailingSlash, ''),
            meshdb: opts.meshdb || config.meshdb || 'steelmesh',
            appid: opts.appid || config.appid || path.basename(mesh.targetPath)
        };
        
        // if we have a callback defined, then trigger that now
        if (callback) {
            callback(mesh);
        } // if
    });
}; // loadConfig

/* Steelmesh interface implementation */

exports.init = function(opts, callback) {
    // create a new mesh instance
    var mesh = new Mesh(opts);
    
    mesh.loadConfig(opts, function() {
        callback(null, mesh);
    });
}; // init