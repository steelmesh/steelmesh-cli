var fs = require('fs'),
    path = require('path'),
    events = require('events'),
    nano = require('nano'),
    util = require('util'),
    _ = require('underscore'),
    async = require('async'),
    express = require('express'),
    reHandler = /(.*)\.(.*)$/,
    reJSFile = /\.js$/i,
    
    cachedAddins = {},
    
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
        
        exceptions: function(mesh, instance) {
            instance.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        },
        
        sessions: function(mesh, instance) {
            // set up for session support
            instance.use(express.session({ secret: this.sessionKey || 'meshapp' }));
        }
    };
    
function _getAddin(name) {
    if (! cachedAddins[name]) {
        try {
            cachedAddins[name] = require('./addins/' + name);
        }
        catch (e) {
            try {
                cachedAddins[name] = require('steelmesh-' + name);
            }
            catch (e) {
                // could not load addin from local path or node_modules
            }
        }
    }
    
    return cachedAddins[name];
}

function _connect(meshapp, key, config, mesh, callback) {
    var dburl = config.url || mesh.config.couchurl,
        dbname = config.db || key;
    
    // create the connection
    conn = nano(dburl);

    // check to see if the database exists
    conn.db.get(dbname, function(err, res) {
        // if the db doesn't exist and we are allow to create it, then give it a go
        if (err && err.error === 'not_found' && config.autoCreate) {
            conn.db.create(dbname, function(err, res) {
                if (! err) {
                    meshapp[key] = conn.use(dbname);
                }
                
                callback(null, dburl + '/' + dbname);
            });
        }
        else if (! err) {
            meshapp[key] = conn.use(dbname);
            callback(null, dburl + '/' + dbname);
        }
    });
}
 
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
                prereqs = prereqs.concat(_getAddin(addin).prereqs);
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
                addinModule = _getAddin(addin);
                addinHandler = addinModule.install;
            } // if
        }
        catch (e) {
            mesh.log.warn('no handler for addin: ' + addin);
        } // try..catch
       
        // if the addin handler has been defined then run it
        if (addinHandler) {
            addinHandler.call(app, mesh, instance, opts);
            mesh.log.info('installed addin: ' + addin);
        } // if
        
        // if we have a global installer, then register than now
        if (addinModule && addinModule.installGlobal) {
            app.globalAddins[addin] = addinModule.installGlobal;
        } // if
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
        appPath = this.basePath,
        routes = this.parseRoutes(mesh);
        
    this.wireCouch(mesh, function() {
        var instance = this.instance = express.createServer();
        
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

            // use the meshapp middleware
            instance.use(app.middleware(instance));

            // load the addins
            app.loadAddIns(mesh, instance, opts);
        });

        // connect the routes
        routes.forEach(function(routeData) {
            instance[routeData.method.toLowerCase()](routeData.path, routeData.handler);
            // app.emit('route', routeData);
        });

        if (callback) {
            callback(instance);
        } // if
    });
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
                mesh.log.error('Could not load module: ' + modulePath, e);
            }
        } // if
    });
    
    return routeHandlers;
};

MeshApp.prototype.wireCouch = function(mesh, callback) {
    // look for the couchdb configuration section
    var meshapp = this,
        config = this.couchdb || {},
        conn, dburl, dbname,
        dbs = [], dbUrls = {};
        
    // iterate through the configurations
    for (var key in config) {
        if (this[key]) {
            throw new Error('Attempting to load database with invalid dbname: \'' + key + '');
        }
        
        // add the database details to the list of databases we will connect to
        dbs.push({
            key: key,
            config: config[key]
        });
    }
    
    async.map(dbs, function(data, itemCallback) {
        _connect(meshapp, data.key, data.config, mesh, function(err, dbUrl) {
            meshapp.emit('db', 'couch', {
                id: data.key,
                url: dbUrl,
                config: data.config,
                instance: meshapp[data.key]
            });
            
            dbUrls[data.key] = dbUrl;
            itemCallback(err);
        });
    }, function(err) {
        if (callback) {
            callback(dbUrls);
        }
    });    
};