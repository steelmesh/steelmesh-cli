var connect = require('connect'),
    events = require('events'),
    util = require('util'),
    quip = require('quip'),
    out = require('out');

var DevServer = exports.DevServer = function(mesh) {
    this.basePath = mesh.targetPath;
};

util.inherits(DevServer, events.EventEmitter);

DevServer.prototype.run = function() {
    var server = this;
    
    connect.createServer(
        quip(),
        connect.static(this.basePath + '/public'),
        
        // define the connect routes
        connect.router(function(app) {
            server.on('route', function(route) {
                out('registered route: !{underline}{0}', route.path);
                app[(route.method || 'GET').toLowerCase()](route.path, route.handler);
            });
        })
    ).listen(2999);
}; // run