var async = require('async');
var debug = require('debug')('steelmesh-cli-publish');
var fs = require('fs');
var path = require('path');
var fstream = require('fstream');
var attachmate = require('attachmate');
var url = require('url');
var _ = require('underscore');
var reTrailingSlash = /\/$/;
var reLeadingSlash = /^\//;

function createFilter(basePath, opts) {
  var ignorePaths = [
    /^\.git/i
  ];

  // if we are ignoring modules, then add node_modules to the ignore paths
  if (opts['ignore-modules']) {
    ignorePaths.push(/^node_modules/i);
  }

  return function(item) {
    var relPath = item.path.slice(basePath.length + 1);
    var include = true;

    // ensure the item does not match the ignore paths
    ignorePaths.forEach(function(regex) {
      include = include && (! regex.test(relPath));
    });

    debug(relPath, include);
    return include;
  };
}

exports.desc = 'Publish an application to a steelmesh db';
exports.args = {
  url:    url,
  path:   path,
  "ignore-modules": Boolean
};

exports.run = function(opts, callback) {
  var appFile = path.resolve(opts.path, 'app.js');
  var sourcePath = opts.path ? path.resolve(opts.path) : this.builder.getSourcePath();
  var data = this.builder.pkgInfo;
  var targetUrl = opts.url || 'http://localhost:5984/steelmesh';
  var parts = url.parse(targetUrl);
  var targetServer = url.format({ protocol: parts.protocol, host: parts.host, auth: parts.auth });
  var targetDB = (parts.path || '').replace(reLeadingSlash, '') || 'steelmesh';
  var ignoreModules = opts['ignore-modules'];
  var reader;
  var writer;
  var appid;

  // check if we have an app file to use in addition to the package data
  fs.exists(appFile, function(exists) {
    if (exists) {
      data = _.extend({}, data);
    }
    if (!ignoreModules) {
      data = _.extend(data, require(appFile));
    }

    // initialise the db connection
    debug('connecting to ' + targetServer + ', db: ' + targetDB);

    // update the document
    appid = 'app::' + data.name;

    // initialise the reader
    reader = fstream.Reader({
      type: 'Directory',
      path: sourcePath,
      filter: createFilter(sourcePath, opts)
    });

    // create the new attachmate writer
    writer = new attachmate.Writer({
      path: targetServer.replace(reTrailingSlash, '') + '/' + targetDB + '/' + appid,
      docData: data,
      preserveExisting: false
    });

    // pipe from the reader to the writer
    reader
    .pipe(writer)
    .on('end', callback)
    .on('error', callback);
  });
};
