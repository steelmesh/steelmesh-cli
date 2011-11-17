var async = require('async'),
    nano = require('nano');

function _connect(meshapp, key, config, mesh, callback) {
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
                
                callback(null, dburl + '/' + dbname);
            });
        }
        else if (! err) {
            meshapp[key] = conn.use(dbname);
            callback(null, dburl + '/' + dbname);
        }
    });
    
}

module.exports = function(mesh, instance, opts, callback) {
    // look for the couchdb configuration section
    var meshapp = this,
        config = this.couchdb || {},
        conn, dburl, dbname,
        dbs = [], dbUrls = {};
    
    // iterate through the configurations
    for (var key in config) {
        if (this[key]) {
            throw new Error('Attempting to load database with invalid dbname: \'' + key + '');
        }
    
        dbs.push({
            key: key,
            config: config[key]
        });
    }
    
    async.map(dbs, function(data, itemCallback) {
        _connect(meshapp, data.key, data.config, mesh, function(err, dbUrl) {
            dbUrls[data.key] = dbUrl;
            itemCallback(err);
        });
    }, function(err) {
        if (callback) {
            callback(dbUrls);
        }
    });
};