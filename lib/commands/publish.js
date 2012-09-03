var async = require('async'),
    debug = require('debug')('steelmesh-cli-publish'),
    fs = require('fs'),
    path = require('path'),
    fstream = require('fstream'),
    attachmate = require('attachmate'),
    url = require('url'),
    _ = require('underscore'),
    reTrailingSlash = /\/$/,
    reLeadingSlash = /^\//,
    _exists = fs.exists || path.exists;

function createFilter(basePath, opts) {

    var ignorePaths = [
        /^\.git/i
    ];

    // if we are ignoring modules, then add node_modules to the ignore paths
    if (opts['ignore-modules']) {
        ignorePaths.push(/^node_modules/i);
    }


    return function(item) {
        var relPath = item.path.slice(basePath.length + 1),
            include = true;

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
    var appFile = path.resolve(opts.path, 'app.js'),
        sourcePath = opts.path ? path.resolve(opts.path) : this.builder.getSourcePath(),
        data = this.builder.pkgInfo,
        targetUrl = opts.url || 'http://localhost:5984/steelmesh',
        parts = url.parse(targetUrl),
        targetServer = url.format({ protocol: parts.protocol, host: parts.host, auth: parts.auth }),
        targetDB = (parts.path || '').replace(reLeadingSlash, '') || 'steelmesh',
        ignoreModules = opts['ignore-modules'],
        reader, writer,
        appid;
        
    // check if we have an app file to use in addition to the package data
    _exists(appFile, function(exists) {
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