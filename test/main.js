var vows = require('vows'),
    assert = require('assert'),
    cli = require('../lib/mesh'),
    path = require('path'),
    rePathMesh = /^(.*?\/mesh)\/?.*$/i,
    meshOpts = {
        path: process.cwd().replace(rePathMesh, '$1/test/test-project')
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
        
        'mesh options have been initialized to defaults': function(err, mesh) {
            assert.equal(mesh.hostname, 'localhost');
            assert.equal(mesh.protocol, 'http');
            assert.equal(mesh.port, 5984);
            assert.equal(mesh.app, path.basename(meshOpts.path));
            assert.equal(mesh.db, 'steelmesh');
        },
        
        'the mesh instance has an create method': function(err, mesh) {
            checkMethod(mesh, 'create');
        },
        
        'the mesh instance has an update method': function(err, mesh) {
            checkMethod(mesh, 'update');
        },
        
        'the mesh instance has a list method': function(err, mesh) {
            checkMethod(mesh, 'list');
        },
        
        'the actions testing is successful': function(err, mesh) {
            actionsSuite.run();
        }
    }
});

suite.run();