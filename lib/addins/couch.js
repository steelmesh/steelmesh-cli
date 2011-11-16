var nano = require('nano');

function _connect(meshapp, key, config, mesh) {
    var dburl = config.url || mesh.config.couchurl,
        dbname = config.db || key;
    
    // create the connection
    conn = nano(dburl);

    // check to see if the database exists
    conn.db.get(dbname, function(err, res) {
        // if the db doesn't exist and we are allow to create it, then give it a go
        if (err && err.error === 'not_found' && config.autoCreate) {
            conn.db.create(dbname, function(err, res) {
                if (! err) {
                    meshapp[key] = conn.use(dbname);
                }
            });
        }
        else if (! err) {
            meshapp[key] = conn.use(dbname);
        }
    });
    
}

module.exports = function(mesh, instance) {
    // look for the couchdb configuration section
    var config = this.couchdb || {},
        conn, dburl, dbname;
    
    // iterate through the configurations
    for (var key in config) {
        if (this[key]) {
            throw new Error('Attempting to load database with invalid dbname: \'' + key + '');
        }
        
        _connect(this, key, config[key], mesh);
    }
};