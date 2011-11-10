var fs = require('fs'),
    path = require('path'),
    events = require('events'),
    util = require('util'),
    comfy = require('comfy'),
    _ = require('underscore'),
    express = require('express'),
    semver = require('semver'),
    reHandler = /(.*)\.(.*)$/,
    reJSFile = /\.js$/i,
    
    addinPrereqs = {
        sessions: ['cookies']
    },
    
    // define some base addins
    baseAddins = {
        bodyparser: function(mesh, instance) {
            instance.use(express.bodyParser());
        },
        
        cookies: function(mesh, instance) {
            // enable cookie parsing and body parsing
            instance.use(express.cookieParser());
        },
        
        couch: function(mesh, instance) {
            var db = this.db = comfy.init({
                url: mesh.couchurl,
                db: (this.dbname || this.id).toLowerCase()
            });
            
            // ensure the database has been created
            db.get(function(err, res) {
                if (err) {
                    // attempt creation
                    db.put();
                } // if
            });
        },
        
        exceptions: function(mesh, instance) {
            instance.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        },
        
        sessions: function(mesh, instance) {
            // set up for session support
            instance.use(express.session({ secret: this.sessionKey || 'meshapp' }));
        }
    };
    
/* helper functions */

function loadDesign(app, mesh, file, packageVersion) {
    if (reJSFile.test(file)) {
        var basename = path.basename(file, '.js'),
            upgrade = false,
            designPath = '_design/' + basename,
            designDoc;
            
        mesh.log('Checking design doc (' + basename + ') for upgrade requirements');
        
        // attempt to read the design with that name
        app.db.get(designPath, function(err, res) {
            upgrade = err || (! res) || (! res.ver) || semver.gt(packageVersion, res.ver);

            // if we need to upgrade the design doc, then do it
            if (upgrade) {
                mesh.log('need to upgrade design doc: ' + basename);

                try {
                    // initialise the design doc
                    designDoc = require(file);
                    
                    // add the id and version
                    designDoc._id = designPath;
                    designDoc._rev = res._rev;
                    designDoc.ver = packageVersion;
                    
                    // upload the design
                    app.db.put(designDoc, function(err, putRes) {
                        if (err) {
                            mesh.log('Error uploading design doc (' + basename + '): ' + err, 'error');
                            console.log(putRes);
                        }
                        else {
                            mesh.log('Updated design doc (' + basename + ')');
                        } // if..else
                    });
                }
                catch (e) {
                    mesh.log('error loading design doc: ' + basename, 'error');
                } // try..catch
            } // if
        });
    } // if
} // loadDesign
    
/* mesh app definition */

var MeshApp = exports.MeshApp = function(appPath, config) {
    // ensure we have a valid configuration 
    this.basePath = appPath;
    this.baseUrl = '/';
    
    this.id = 'app';
    this.routes = [];
    this.jobs = [];
    
    // initialise the instance to empty
    this.instance = null;
    
    // initialise the default addins
    this.addins = [];
    this.globalAddins = {};
    
    // copy the configuration across
    _.extend(this, config);
};

util.inherits(MeshApp, events.EventEmitter);

// TODO: allow this function to fire a callback
MeshApp.prototype.loadAddIns = function(mesh, instance, opts) {
    var app = this,
        requiredAddins = _.map(this.addins, function(addin) { return addin.toLowerCase(); }),
        addinsLength = 0;
        
    while (addinsLength !== requiredAddins.length) {
        // update the addins length
        addinsLength = requiredAddins.length;
        
        // iterate through the required
        requiredAddins.forEach(function(addin) {
            var prereqs = addinPrereqs[addin] || [];
            
            try {
                prereqs = prereqs.concat(require('steelmesh-' + addin).prereqs);
            }
            catch (e) {
                // no prereqs, nothing to worry about
            } // try..catch
            
            // add the prereqs to the required addins
            requiredAddins = _.difference(prereqs, requiredAddins).concat(requiredAddins);
        });
        
        // compact and union the addins
        requiredAddins = _.compact(_.uniq(requiredAddins));
    } // while
    
    // iterate through the app addins
    requiredAddins.forEach(function(addin) {
        var addinHandler,
            addinModule;
        
        // find the addin handler
        try {
            addinHandler = baseAddins[addin];
            if (! addinHandler) {
                addinModule = require('steelmesh-' + addin);
                addinHandler = addinModule.install;
            } // if
        }
        catch (e) {
            mesh.log('no handler for addin: ' + addin);
        } // try..catch
       
        // if the addin handler has been defined then run it
        if (addinHandler) {
            addinHandler.call(app, mesh, instance, opts);
            mesh.log('installed addin: ' + addin);
        } // if
        
        // if we have a global installer, then register than now
        if (addinModule && addinModule.installGlobal) {
            app.globalAddins[addin] = addinModule.installGlobal;
        } // if
    });    
};

MeshApp.prototype.loadDesigns = function(mesh, searchPath) {
    // if we don't have a database for the app, then do nothing
    if (! this.db) {
        return;
    } // if
    
    // initialise variables
    var version = '1.0',
        app = this;
    
    // if the version has not been specified, then attempt to read from a package json file
    fs.readFile(path.join(searchPath, 'package.json'), function(err, contents) {
        if (! err) {
            var packageData = JSON.parse(contents);
            
            // update the version from the package data
            version = packageData.version || version;
        } // if
        
        // now look for design docs in the ddocs folder
        fs.readdir(path.join(searchPath, 'ddoc'), function(err, files) {
            if (! err) {
                files.forEach(function(file) {
                    loadDesign(app, mesh, path.join(searchPath, 'ddoc', file), version);
                });
            } // if
        });
    });
};

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
            instance.use(express['static'](appPath));
        } // if
        
        // use the meshapp middleware
        instance.use(app.middleware(instance));
        
        // load the addins
        app.loadAddIns(mesh, instance, opts);
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
            var modulePath = path.join(app.basePath, 'lib', match[1]);
            
            try {
                var module = require(modulePath),
                    handlerFn = module[match[2]];

                // if we have a handler function, then handle the route
                if (handlerFn) {
                    routeHandlers.push({
                        method: route.method || 'GET',
                        path: route.path,
                        handler: handlerFn
                    });
                } // if
            }
            catch (e) {
                mesh.log('Could not load module: ' + modulePath);
            }
        } // if
    });
    
    return routeHandlers;
};