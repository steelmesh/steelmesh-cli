exports.install = function(mesh, instance) {
    instance.use(function(req, res, next) {
        next();
    });
};

exports.prereqs = [];