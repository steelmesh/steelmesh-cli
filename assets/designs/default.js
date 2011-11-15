function mapApps(doc) {
    var key, 
        syncPaths = (doc.syncPaths || ['resources']).join('|'),
        reLib = new RegExp('^(lib|node_modules|' + syncPaths + ')\/', 'i'),
        ignoreKey = new RegExp('^(_|attachments)', 'i'),
        node_modules = [],
        appData = {
            libs: []
        };

    if (doc._attachments) {
        for (key in doc._attachments) {
            if (reLib.test(key)) {
                appData.libs.push(key);
            } // if
        } // for
    } // if
    
    // update the appdata with relevant data
    for (key in doc) {
        if (! ignoreKey.test(key)) {
            appData[key] = doc[key];
        } // if
    } // for
    
    emit(doc.title || doc._id, appData);
}

module.exports = {
    filters: {
        valid_items: function(doc, req) {
            return true;
        }
    },
    
    views: {
        apps: {
            map: mapApps
        }
    }
};