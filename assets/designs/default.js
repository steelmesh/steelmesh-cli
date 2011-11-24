function mapApps(doc) {
    var key, 
        syncPaths = (doc.syncPaths || ['resources']).join('|'),
        // TODO: ensure sync paths are regexified...
        reLib = new RegExp('^(lib|node_modules|' + syncPaths + ')\/', 'i'),
        ignoreKey = new RegExp('^(_|attachments)', 'i'),
        node_modules = [],
        appPrefix = 'app::',
        appData = {
            libs: []
        };
        
    // if this is an application, then return it in the results
    if (doc._id.slice(0, appPrefix.length) === appPrefix) {
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

        appData.id = doc._id.slice(appPrefix.length);
        emit(doc.title || doc._id, appData);
    }
}

module.exports = {
    filters: {
        apps: function(doc, req) {
            var appPrefix = 'app::';

            return doc._id.slice(0, appPrefix.length) === appPrefix;
        }
    },
    
    views: {
        apps: {
            map: mapApps
        }
    }
};