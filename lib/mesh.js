var path = require('path'),
    events = require('events'),
    util = require('util'),
    fs = require('fs'),
    colors = require('colors'),
    reTrailingColon = /\:$/;

function Mesh(opts) {
    // initialise the path
    this.targetPath = path.resolve(opts.path || process.cwd);
};

util.inherits(Mesh, events.EventEmitter);

Mesh.prototype.getAssetPath = function(target) {
    return path.resolve(__dirname, '../assets/' + target);
}; // getAssetPath

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
                mesh.out('Corrupt config file: '.red + configFile);
            } // try..catch
        }
        
        // initialise configuration
        mesh.hostname = opts.hostname || config.hostname || 'localhost';
        mesh.protocol = (opts.protocol || config.protocol || 'http').replace(reTrailingColon, '') + ':';
        mesh.port = opts.port || config.port || 5984;
        
        // if we have a callback defined, then trigger that now
        if (callback) {
            callback(mesh);
        } // if
    });
}; // loadConfig

Mesh.prototype.out = function(message) {
    process.stdout.write(message + '\n');
};

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



