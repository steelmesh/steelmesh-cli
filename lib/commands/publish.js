var async = require('async'),
    debug = require('debug')('steelmesh-cli-publish'),
    fs = require('fs'),
    path = require('path'),
    attachmate = require('attachmate'),
    url = require('url'),
    _ = require('underscore'),
    reTrailingSlash = /\/$/,
    reLeadingSlash = /^\/$/,
    _exists = fs.exists || path.exists;
    
exports.desc = 'Publish an application to a steelmesh db';
exports.args = {
    url:    'url',
    path:   path
};

exports.run = function(opts, callback) {
    var appFile = path.resolve(opts.path, 'app.js'),
        sourcePath = opts.path ? path.resolve(opts.path) : this.builder.getSourcePath(),
        data = this.builder.pkgInfo,
        targetUrl = opts.url || 'http://localhost:5984/steelmesh',
        parts = url.parse(targetUrl),
        targetServer = url.format({ protocol: parts.protocol, host: parts.host, auth: parts.auth }),
        targetDB = (parts.path || '').replace(reLeadingSlash, '') || 'steelmesh',
        appid;
        
    // check if we have an app file to use in addition to the package data
    _exists(appFile, function(exists) {
        if (exists) {
            data = _.extend({}, data, require(appFile));
        }
        
        // initialise the db connection
        debug('connecting to ' + targetServer + ', db: ' + targetDB);
        
        // update the document
        appid = 'app::' + data.name;

        // upload updated doc
        attachmate.upload(
            targetServer.replace(reTrailingSlash, '') + '/' + targetDB + '/' + appid,
            sourcePath,
            { docData: data },
            callback
        );
    });
};