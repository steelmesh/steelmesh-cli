exports.install = function(mesh, instance) {
    instance.use(function(req, res, next) {
        console.log(req.url);
    });
};

exports.prereqs = [];