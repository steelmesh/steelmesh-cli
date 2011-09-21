var fs = require('fs'),
    path = require('path'),
    events = require('events'),
    util = require('util'),
    _ = require('underscore'),
    express = require('express'),
    reHandler = /(.*)\.(.*)$/;

var MeshApp = exports.MeshApp = function(appPath, config) {
    // ensure we have a valid configuration 
    this.basePath = appPath;
    
    this.id = 'app';
    this.routes = [];
    this.jobs = [];
    
    // initialise the instance to empty
    this.instance = null;
    
    // copy the configuration across
    _.extend(this, config);
};

util.inherits(MeshApp, events.EventEmitter);

MeshApp.prototype.loadResource = function(resource, callback) {
    var targetFile = path.resolve(this.basePath, path.join('resources', resource));
    
    fs.readFile(targetFile, 'utf8', function(err, data) {
        callback(err, data, {
            path: targetFile
        });
    });
};

MeshApp.prototype.mount = function(mesh, parent, callback) {
    // create the application instance
    var app = this.instance = express.createServer(),
        appPath = this.basePath,
        routes = this.parseRoutes(mesh);
    
    // serve the public files
    app.configure(function() {
        app.use(express.static(path.join(appPath, 'public')));
    });
    
    // connect the routes
    routes.forEach(function(routeData) {
        app[routeData.method.toLowerCase()](routeData.path, routeData.handler);
    });
    
    
    if (callback) {
        callback(app);
    } // if
};

MeshApp.prototype.parseRoutes = function(mesh) {
    var app = this,
        routeHandlers = [],
        match;
    
    this.routes.forEach(function(route) {
        // if the route is a string, then convert into an object
        if (typeof route == 'string') {
            var routeParts = route.split(/\s?=>\s?/);
            
            if (routeParts.length > 1) {
                route = {
                    path: routeParts[0],
                    handler: routeParts[1]
                };
            }
            else {
                return;
            } // if..else
        } // if
        
        // check for a route path
        match = reHandler.exec(route.handler);
        
        if (match) {
            var module = require(path.join(app.basePath, 'lib', match[1]));
            
            routeHandlers.push({
                method: route.method || 'GET',
                path: route.path,
                handler: mesh.wrap(app, module[match[2]])
            });
        } // if
    });
    
    return routeHandlers;
};