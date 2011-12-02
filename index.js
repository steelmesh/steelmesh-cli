var path = require('path'),
    spawn = require('child_process').spawn;

exports.init = require('./lib/mesh').init;
exports.MeshApp = require('./lib/meshapp').MeshApp;

exports.spawn = function() {
    return spawn(
        path.resolve(__dirname, 'bin/mesh'), 
        Array.prototype.slice.call(arguments, 0)
    );
};