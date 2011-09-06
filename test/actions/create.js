var path = require('path'),
    assert = require('assert'),
    projectDir = path.resolve(__dirname, '../project');

module.exports = function(mesh) {
    return {
        'Checking Project Initialization': {
            topic: function() {
                mesh.create(this.callback);
            }, 
            
            'initialization successful': function(err) {
                assert.ok(! err);
            },
            
            'Project files created': {
                topic: function() {
                    path.exists(path.join(projectDir, 'app.js'), this.callback);
                },
            
                'app.js file exists': function(exists) {
                    assert.ok(exists);
                }
            }
        }
    };
};
    