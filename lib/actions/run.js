var MeshApp = require('../meshapp').MeshApp,
    path = require('path'),
    out = require('out'),
    express = require('express'),
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
        app;
        
    // try to load the application configuration
    try {
        app = new MeshApp(this.targetPath, require(appPath));
    }
    catch (e) {
        out('!{red}Could not load app.js: !{underline}{0}', appPath);
    } // try..catch
    
    app.mount(mesh, function(instance) {
        instance.listen(2999);
        out('Dev server running');
    }, { dev: true });
};