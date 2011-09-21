var connect = require('express'),
    events = require('events'),
    util = require('util'),
    out = require('out');

var DevServer = exports.DevServer = function(mesh) {
    this.basePath = mesh.targetPath;
    
    // create the express instance
    this.instance = express.createServer();

    this.instance.configure(function() {
        this.instance.use(express.static(this.basePath + '/public'));
    });
    
    this.instance.listen(2999);
};

util.inherits(DevServer, events.EventEmitter);

DevServer.prototype.run = function() {
    var server = this,
        app = express.createServer();
        
    app.configure(function() {
        app.use(
    });
    
    express.createServer(
        express.static(,
        
        // define the connect routes
        connectables.router(function(router) {
            server.on('route', function(route) {
                out('registered route: !{underline}{0}', route.path);
                router[(route.method || 'GET').toLowerCase()](route.path, route.handler);
            });
        })
    ).listen(2999);
}; // run