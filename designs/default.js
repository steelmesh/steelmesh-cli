function mapRoutes(doc) {
    if (doc.routes) {
        doc.routes.forEach(function(route, index) {
            var routeData = route;
            
            if (typeof route == 'string') {
                var routeParts = route.split('=>');
                
                routeData = {
                    path: routeParts[0].trim(),
                    handler: routeParts[1].trim()
                };
            } // if

            // if we have both a path and handler, then process
            if (routeData.path && routeData.handler) {
                // trim any leading slashes from the path
                var path = '/' + doc._id + '/' + routeData.path.replace(/^\//, '');
                    
                emit(path, {
                    handler: routeData.handler,
                    method: routeData.method || 'get'
                });
            } // if
        });
    } // if
} // mapRoutes

function mapLibs(doc) {
    var reLib = new RegExp('^lib', 'i');

    if (doc._attachments) {
        for (var key in doc._attachments) {
            if (reLib.test(key)) {
                emit(key);
            } // if
        } // for
    } // if
}

module.exports = {
    views: {
        libs: {
            map: mapLibs
        },
        
        routes: {
            map: mapRoutes
        }
    }
};