var debug = require('debug')('steelmesh-cli');
var events = require('events');
var util = require('util');
var async = require('async');
var path = require('path');
var fs = require('fs');

/**
  # steelmesh-cli

  This module installs the command-line tools for working with a steelmesh server.

  ## Commands

  ```
  mesh run
  ```

  Run a local development server that tests the application.

  ```
  mesh pack
  ```

  Package the application resources into a `.tar.gz` file that can be uploaded
  into steelmesh using the admin dashboard.

  ```
  mesh publish
  ```

  Publish the application to a steelmesh CouchDB server.
**/

function AppBuilder() {
  if (! (this instanceof AppBuilder)) {
    return new AppBuilder();
  }

  // initialise members
  this.pkgInfo = {
    name: path.basename(process.cwd),
    version: '0.0.0'
  };

  this.workingDir = process.cwd();
}

module.exports = AppBuilder;
util.inherits(AppBuilder, events.EventEmitter);

AppBuilder.prototype._findVersion = function(targetFolder, callback) {
  // if we have package data, then use that version

  // otherwise, look for an app.js file
  try {
    require(path.join(targetFolder, 'app.js'));
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

AppBuilder.prototype.getSourcePath = function() {
  var pathDist = path.join(this.workingDir, 'dist');
  if (fs.existsSync(pathDist)) {
    return pathDist;
  }

  return this.workingDir;
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
    catch (e2) {
      debug('unable to include action handler (generic version): ', e2);
    }
  }

  return handler;
};

AppBuilder.prototype.init = function(opts, callback) {
  var builder = opts.builder;

  debug('initializing appbuilder, working directory: ' + builder.workingDir);

  async.series([
    builder._loadPackageData.bind(builder, builder.workingDir),
    builder._findVersion.bind(builder, builder.workingDir)
  ], function(err) {
    debug('Current project detected as steelmesh project version: ', builder.version);
    callback(err);
  });
};

['pack', 'publish'].forEach(function(action) {
  AppBuilder.prototype[action] = function() {
    var builder = this,
        args = Array.prototype.slice.call(arguments),
        callback = args[args.length - 1] || function() {};

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
