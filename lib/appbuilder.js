var debug = require('debug')('mesh-appbuilder'),
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

AppBuilder.prototype.exec = function(cli, action, args, callback) {
    var handler = this.handler(action);
    if (typeof handler == 'function') {
        handler.call(this, cli, args, function(err) { 
            if (callback) {
                callback(err);
            }
        });
    }
    else {
        out('!{red}No correct version ({1}) handler for "{0}" action', action, this.version);
        cli.run('quit');
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
        try {
            // couldn't find a version specific handler, let's try the default handler
            handler = require('./handlers/' + action);
        }
        catch (e) {
        }
    }
    
    return handler;
};

AppBuilder.prototype.init = function(targetFolder, callback) {
    var builder = this;
    
    if (typeof targetFolder == 'function' && arguments.length === 1) {
        callback = targetFolder;
        targetFolder = process.cwd();
    }
    
    async.series([
        this._loadPackageData.bind(this, targetFolder),
        this._findVersion.bind(this, targetFolder)
    ], function(err) {
        out('Current project detected as steelmesh {0} version project', builder.version);
        callback(err);
    });
};

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