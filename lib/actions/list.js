var reDesignDoc = /^_design/i;

module.exports = function(opts, callback) {
    var mesh = this;
    
    // if options is a function, then set it to the callback and reset the options
    if (typeof opts == 'function') {
        callback = opts;
        opts = {};
    } // if
    
    // initialise options
    opts = opts || {};
    
    // connect to the mesh instance
    this.connect(function(error, couch) {
        if (error) {
            callback(error);
        }
        else {
            couch.use(mesh.config.meshdb).list(function(err, res) {
                if (err) {
                    callback(err);
                }
                else {
                    var apps = [];
                    for (var ii = 0; res && ii < res.rows.length; ii++) {
                        // if this isn't a design doc, then add it to the list
                        if (! reDesignDoc.test(res.rows[ii].id)) {
                            apps.push(res.rows[ii].id);
                        } // if
                    } // for

                    callback(error, apps);
                }
            });
        }
    }, false);
};