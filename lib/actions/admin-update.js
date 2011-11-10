var couchapp = require('couchapp'),
    fs = require('fs'),
    path = require('path');

module.exports = function(opts, callback) {
    var mesh = this;
    
    // connect to the mesh instance
    this.connect(function(err, couch) {
        var designPath = mesh.getAssetPath('designs');

        if (err) {
            callback(err);
            return; 
        } // if
        
        fs.readdir(designPath, function(err, files) {
            if (err) {
                callback(err);
            }
            else {
                // initialise the number of designs to load
                var designsToLoad = files.length,
                    designs = [];
            
                // iterate through the files and load the designs
                files.forEach(function(file) {
                    var designDoc = require(path.join(designPath, file));
                
                    designDoc._id = '_design/' + path.basename(file, '.js');
                    designs.push(designDoc._id);
                    
                    couchapp.createApp(designDoc, mesh.getDbUrl(), function(app) {
                        app.push(function() {
                            designsToLoad--;
                            if (designsToLoad <= 0) {
                                callback(null, designs);
                            } // if
                        });
                    });
                });
            } // if..else
        });
    });
};