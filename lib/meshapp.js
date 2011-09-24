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
    
    // initialise configuration defaults
    this.sessionKey = 'meshapp';
    this.webSockets = false;
    
    // copy the configuration across
    _.extend(this, config);
};

util.inherits(MeshApp, events.EventEmitter);

MeshApp.prototype.configureWebSockets = function(mesh, instance) {
    // first try to see if sockjs is available
    try {
        this.io = require('socket.io').listen(instance);
    }
    catch (e) {
        mesh.log('sockets requests, but socket.io library not available');
    }
}; // getSocketServer

MeshApp.prototype.loadResource = function(resource, callback) {
    var targetFile = path.resolve(this.basePath, path.join('resources', resource));
    
    fs.readFile(targetFile, 'utf8', function(err, data) {
        callback(err, data, {
            path: targetFile
        });
    });
};

MeshApp.prototype.middleware = function() {
    var meshapp = this;
    
    return function(req, res, next) {
        // expose the app's mount-point
        // as per: https://github.com/visionmedia/express/blob/master/examples/blog/middleware/locals.js
        // TODO: implement this once supported and remove from dynamic helpers
        // res.locals.appPath = req.app.route;
        
        // patch the meshapp into the request
        req.meshapp = meshapp;
        
        // all we wanted to do was assign some view locals
        // so pass control to the next middleware
        next();
    };
};

MeshApp.prototype.mount = function(mesh, callback, opts) {
    // initialise options
    opts = opts || {};
    
    // create the application instance
    var app = this,
        instance = this.instance = express.createServer(),
        appPath = this.basePath,
        routes = this.parseRoutes(mesh);
        
    // add some dynamic helpers
    instance.dynamicHelpers({
        appPath: function() {
            return '/' == instance.route ? '' : instance.route;
        }
    });
        
    // serve the public files
    instance.configure(function() {
        // initialise the view path
        instance.set('basepath', appPath);
        instance.set('views', path.join(appPath, 'views'));
        
        // if we are running a dev configuration, then attach a static handler 
        // to the app path directory which emulates couch loading behaviour
        if (opts.dev) {
            instance.use(express.static(appPath));
        } // if
        
        // enable cookie parsing and body parsing
        instance.use(express.cookieParser());
        instance.use(express.bodyParser());
        
        // set up for session support
        if (app.sessionKey) {
            // TODO: make the store use couch
            instance.use(express.session({ secret: app.sessionKey }));
        } // if

        // if websockets have been requested then attempt to bootstrap socket.io
        if (app.webSockets || app.websockets) {
            app.configureWebSockets(mesh, instance);
        } // if
        
        // use the meshapp middleware
        instance.use(app.middleware(instance));
        
        // instance.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        // instance.use(instance.router);
    });
    
    // connect the routes
    routes.forEach(function(routeData) {
        instance[routeData.method.toLowerCase()](routeData.path, routeData.handler);
        app.emit('route', routeData);
    });
    
    
    if (callback) {
        callback(instance);
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
            var module = require(path.join(app.basePath, 'lib', match[1])),
                handlerFn = module[match[2]];
            
            // if we have a handler function, then handle the route
            if (handlerFn) {
                routeHandlers.push({
                    method: route.method || 'GET',
                    path: route.path,
                    handler: handlerFn
                });
            } // if
        } // if
    });
    
    return routeHandlers;
};