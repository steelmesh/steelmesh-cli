var path = require('path'),
    assert = require('assert');

module.exports = function(mesh) {
    return {
        'Checking Update': {
            topic: function() {
                mesh.update(this.callback);
            }, 
            
            'initialization successful': function(err, app) {
                assert.ok(! err);
            },
            
            'uploaded document is valid': function(err, app) {
                assert.ok(app);
                assert.ok(app.doc);
                assert.equal(app.doc._id, 'test-project');
            }
        }
    };
};
