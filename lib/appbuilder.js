var debug = require('debug')('steelmesh-cli'),
    events = require('events'),
    util = require('util'),
    async = require('async'),
    path = require('path'),
    out = require('out'),
    fs = require('fs');

function AppBuilder() {
    // initialise members
    this.pkgInfo = {
        name: path.basename(process.cwd),
        version: '0.0.0'
    };
    
    this.workingDir = process.cwd();
}

util.inherits(AppBuilder, events.EventEmitter);

AppBuilder.prototype._findVersion = function(targetFolder, callback) {
    // if we have package data, then use that version
    
    // otherwise, look for an app.js file
    try {
        var appData = require(path.join(targetFolder, 'app.js'));
        
        this.version = '1.0.0';
    }
    catch (e) {
        this.version = '2.0.0';
    }
    
    callback();
};

AppBuilder.prototype._loadPackageData = function(targetFolder, callback) {
    var builder = this;
    
    // load the package.json file from the specified directory
    fs.readFile(path.join(targetFolder, 'package.json'), 'utf8', function(err, data) {
        // if we read the file successfully, then parse it
        if (! err) {
            try {
                builder.pkgInfo = JSON.parse(data);
            }
            catch(e) {
                err = e;
            }
        }
        
        callback(err);
    });
};

AppBuilder.prototype.exec = function(action, args, callback) {
    var handler = this.handler(action);
    if (typeof handler == 'function') {
        handler.call(this, args, function(err) { 
            if (callback) {
                callback(err);
            }
        });
    }
    else {
        callback(new Error('No correct version (' + this.version + ') handler for "' + action + '" action'));
    }
};

AppBuilder.prototype.handler = function(action) {
    var handler;
    
    debug('attempting to open handler for action: ' + action);
    
    try {
        // first attempt to get the handler for the current version
        handler = require('./handlers/' + action + '-' + this.version); 
    }
    catch (e) {
        debug('unable to include action handler (version specific): ', e);
        
        try {
            // couldn't find a version specific handler, let's try the default handler
            handler = require('./handlers/' + action);
        }
        catch (e) {
            debug('unable to include action handler (generic version): ', e);
        }
    }
    
    return handler;
};

AppBuilder.prototype.init = function(callback) {
    var builder = this;
    
    async.series([
        this._loadPackageData.bind(this, this.workingDir),
        this._findVersion.bind(this, this.workingDir)
    ], function(err) {
        // out('Current project detected as steelmesh {0} version project', builder.version);
        callback(err);
    });
};

['pack', 'publish'].forEach(function(action) {
    AppBuilder.prototype[action] = function() {
        var builder = this,
            args = Array.prototype.slice.call(arguments);
        
        this.init(function(err) {
            if (err) {
                callback(err);
            }
            else {
                builder.exec.apply(builder, [action].concat(args));
            }
        });
    };
});

AppBuilder.prototype.log = function(callback) {
    return function(message) {
        // display the error to the console

        if (message instanceof Error) {
            callback(message);
        }
    };
};

exports = module.exports = AppBuilder;

exports.create = function() {
    return new AppBuilder();
};