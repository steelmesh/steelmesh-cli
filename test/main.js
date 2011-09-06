var vows = require('vows'),
    assert = require('assert'),
    cli = require('../lib/mesh'),
    rePathGreenslide = /^(.*?\/mesh)\/?.*$/i,
    meshOpts = {
        path: process.cwd().replace(rePathGreenslide, '$1/test/project')
    };
    
var suite = vows.describe('Project Initialization'),
    actionsSuite = vows.describe('Mesh Actions');

function checkMethod(mesh, targetMethod) {
    assert.ok(mesh[targetMethod], 'Mesh supports the ' + targetMethod + ' method');
    actionsSuite.addBatch(require('./actions/' + targetMethod)(mesh));
};

suite.addBatch({
    'Mesh CLI Initialization': {
        topic: function() {
            var callback = this.callback;
            
            cli.init(meshOpts, function(err, mesh) {
                callback(err, mesh);
            });
        }, 
        
        'we have a mesh instance': function(err, mesh) {
            assert.ok(mesh);
        },
        
        'the mesh instance has an create method': function(err, mesh) {
            checkMethod(mesh, 'create');
        },
        
        'the mesh instance has an update method': function(err, mesh) {
            checkMethod(mesh, 'update');
        },
        
        'the actions testing is successful': function(err, mesh) {
            actionsSuite.run();
        }
    }
});

suite.run();