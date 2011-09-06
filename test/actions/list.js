var path = require('path'),
    assert = require('assert');

module.exports = function(mesh) {
    return {
        'Checking Project Initialization': {
            topic: function() {
                mesh.list(this.callback);
            }, 
            
            'initialization successful': function(err, couch) {
                assert.ok(! err);
            }
        }
    };
};
