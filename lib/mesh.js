var path = require('path'),
    events = require('events'),
    util = require('util'),
    fs = require('fs'),
    url = require('url'),
    comfy = require('comfy'),
    out = require('out'),
    reTrailingColon = /\:$/;

function Mesh(opts) {
    // initialise the path
    this.targetPath = path.resolve(opts.path || process.cwd);
};

util.inherits(Mesh, events.EventEmitter);

Mesh.prototype.connect = function(callback, allowCreate) {
    var mesh = this,
        couch;
        
    // update the couch url
    this.couchUrl = url.format({
        protocol: this.protocol.replace(reTrailingColon, '') + ':',
        hostname: this.hostname,
        port: this.port
    });
    
    // initialise the couch connection
    couch = comfy.init({
        url: this.couchUrl,
        db: this.db,
        user: this.user,
        pass: this.pass
    });
        
    // initialise the database
    couch.get(function(error, res) {
        if (res && res.error === 'not_found') {
            if (allowCreate) {
                couch.put(function(putErr, res) {
                    callback(putErr, res);
                });
            }
            else {
                callback('Cannot connect to ' + couchUrl + '/' + mesh.db, couch);
            } // if..else
        }
        else {
            callback(error, couch);
        } // if..else
    });    
}; // connect

Mesh.prototype.getAssetPath = function(target) {
    return path.resolve(__dirname, '../assets/' + target);
}; // getAssetPath

Mesh.prototype.getDbUrl = function() {
    if (! this.couchUrl) {
        this.couchUrl = url.format({
            protocol: this.protocol.replace(reTrailingColon, '') + ':',
            hostname: this.hostname,
            port: this.port
        });
    } // if
    
    return this.couchUrl + '/' + this.db;
};

Mesh.prototype.loadActions = function(callback) {
    var mesh = this;
    
    // find actions in the actions directory
    fs.readdir(path.join(__dirname, 'actions'), function(err, files) {
        if (! err) {
            files.forEach(function(file) {
                var actionName = path.basename(file, '.js');

                // add the action to the mesh tool
                mesh[actionName] = require('./actions/' + actionName);
            });
        } // if
        
        
        if (callback) {
            callback(err, mesh);
        } // if
    });
};

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
        mesh.hostname = opts.hostname || config.hostname || 'localhost';
        mesh.protocol = (opts.protocol || config.protocol || 'http').replace(reTrailingColon, '');
        mesh.port = opts.port || config.port || 5984;
        mesh.user = opts.user || config.user;
        mesh.pass = opts.pass || config.pass;
        mesh.db = opts.db || config.db || 'steelmesh';
        mesh.app = opts.app || config.app || path.basename(mesh.targetPath);
        
        // if we have a callback defined, then trigger that now
        if (callback) {
            callback(mesh);
        } // if
    });
}; // loadConfig

Mesh.prototype.wrap = function(handlerFn) {
    
    function jsonify(cbName, res, output) {
        if (cbName) {
            res.jsonp(cbName, output);
        }
        else {
            res.json(output);
        } // if..else
    } // jsonify

    return function(req, res, next) {
        var queryParams = url.parse(req.url, true).query,
            output = {};

        handlerFn(this, function(output) {
            jsonify(queryParams.callback, res, output || { error: 'No results' });
        }, queryParams, req, res, next);
    };
}; // wrap

exports.init = function(opts, callback) {
    // create a new mesh instance
    var mesh = new Mesh(opts);
    
    mesh.loadConfig(opts, function() {
        // load the actions
        mesh.loadActions(function(err) {
            callback(err, mesh);
        });
    });
}; // init



