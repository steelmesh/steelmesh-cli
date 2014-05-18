var path = require('path');
var squirrel = require('squirrel');
var debug = require('debug')('mesh');

exports.desc = 'Run a steelmesh 1.x app locally';
exports.args = {
  port: 'number'
};

exports.run = function(opts, callback) {
  var target = path.resolve(opts.argv.remain.slice(1)[0] || 'app.js');
  var basePath = path.dirname(target);

  // in steelmesh, handlers are assumed to live within the lib path
  var handlerPath = path.join(basePath, 'lib');
  var appData;
  var scaffolder = this;
  var targetPort = opts.port || 3000;

  // try and require the app info
  try {
    appData = require(target);
  }
  catch (e) {
    return callback('Unable to load app.js: ' + target);
  }

  debug('executing run command on: ' + target + ', requesting plugin express');
  debug('appData: ', appData);

  // request express
  squirrel(['express', 'routerules'], { allowInstall: 'prompt' }, function(err, express, routerules) {
    var ruleset;
    var app;

    if (err) return callback(err);

    // initialise the application
    app = express();

    // load the routes
    routerules.load(path.resolve('routes.txt'), { basePath: handlerPath }, function(err, ruleset) {
      // mount the rules at a particular mountpoint
      ruleset.mount(appData.mountpoint || path.basename(basePath));

      // bind the rules with valid express handlers
      ruleset.rules.forEach(function(rule) {
        debug('registering route: ' + rule.pattern);
        app[rule.method.toLowerCase()](rule.pattern, rule.handler);
      });

      scaffolder.out('running application on port: ' + targetPort);
      app.listen(targetPort);
    });

  });
};
