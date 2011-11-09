var MeshApp = require('../meshapp').MeshApp,
    path = require('path'),
    out = require('out'),
    express = require('express'),
    _ = require('underscore'),
    reHandler = /(.*)\.(.*)$/;
    
function checkRouteData(routeData) {
    if (typeof routeData == 'string') {
        var routeParts = routeData.split('=>');
        
        routeData = {
            path: routeParts[0].trim(),
            handler: routeParts[1].trim()
        };
    } // if 
    
    return routeData;
}
    
function loadRoute(app, mesh, server, routeData) {
    var handler = (routeData.handler || '').replace(reHandler, '$1'),
        handlerFn = (routeData.handler || '').replace(reHandler, '$2'),
        isCoreModule = handler.toLowerCase() === 'core',
        modulePath, module, pathData, routeDetails;
        
    if (isCoreModule) {
        module = mesh;
    }
    else {
        modulePath = path.resolve(mesh.targetPath, 'lib/' + handler);
    } // if..else

    module = module || require(modulePath); // Module._load(modulePath, { filename: path.dirname(modulePath) });
    routeDetails = {
        method: routeData.method || 'GET',
        path: routeData.path,
        handler: mesh.wrap(app, module[handlerFn])
    };

    if (module[handlerFn]) {
        server.emit('route', routeDetails);
    }
    else {
        out('Handler for path: {0} invalid.  Was looking for {1}.{2}', routeDetails.path, handler, handlerFn);
    } // if..else
} // loadRoute

module.exports = function(opts, callback) {
    var mesh = this,
        appPath = path.resolve(this.targetPath, 'app.js'),
        config = {
            id: mesh.app
        }, app;
        
    try {
        // load the configuration
        config = _.extend(require(appPath), config);
    }
    catch (e) {
        out('!{red}Could not load app.js: !{underline}{0}', appPath);
    } // try..catch
    
    // create the new app
    app = new MeshApp(this.targetPath, config);
    
    app.mount(mesh, function(instance) {
        // if we have any global addins, then load them
        for (var key in app.globalAddins) {
            app.globalAddins[key](mesh, instance);
        } // for
        
        // initialise the instance
        instance.listen(2999);
        out('Dev server running @ http://localhost:2999/');
    }, { dev: true });
};