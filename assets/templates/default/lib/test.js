var time = require('./time-helper'),
    uuid = require('node-uuid'),
    counter = 0;

exports.getTime = function(mesh, callback, queryParams, req, res) {
    callback({
        time: time.getTime()
    });
};

exports.getCount = function(mesh, callback, queryParams, req, res) {
    callback({
        value: counter++
    });
};

exports.uuid = function(mesh, callback, queryParams, req, res) {
    callback({
        uuid: uuid()
    });
};

exports.genHTML = function(mesh, callback, queryParams, req, res, next) {
    res.ok('<body>Some test html</body>');
};

exports.testJob = function(mesh) {
    mesh.log('ran test job 2');
};