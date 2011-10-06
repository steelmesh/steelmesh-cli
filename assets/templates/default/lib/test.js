var time = require('./time-helper'),
    uuid = require('node-uuid'),
    counter = 0;

exports.getTime = function(req, res) {
    res.json({
        time: time.getTime()
    });
};

exports.getCount = function(req, res) {
    res.json({
        value: counter++
    });
};

exports.uuid = function(req, res) {
    res.json({
        uuid: uuid()
    });
};

exports.genHTML = function(req, res, next) {
    res.send('<body>Some test html</body>');
};

exports.testJob = function(mesh) {
    mesh.log('ran test job 2');
};