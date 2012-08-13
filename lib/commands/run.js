var path = require('path'),
	squirrel = require('squirrel'),
	debug = require('debug')('mesh');

exports.desc = 'Run a steelmesh 1.x app locally';
exports.args = {
	port: 'number'
};

exports.run = function(opts, callback) {
	var target = path.resolve(opts.argv.remain.slice(1)[0] || 'app.js'),
		basePath = path.dirname(target),
		// in steelmesh, handlers are assumed to live within the lib path
		handlerPath = path.join(basePath, 'lib'),
		appData,
		scaffolder = this,
		targetPort = opts.port || 3000;

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
		var ruleset, app;

		if (err) return callback(err);

		// initialise the application
		app = express();

		// parse the route rules from the appData
		ruleset = routerules(appData.routes, { basePath: handlerPath });

		// bind the rules with valid express handlers
		ruleset.rules.forEach(function(rule) {
			app[rule.method.toLowerCase()](rule.pattern, rule.handler);
		});

		scaffolder.out('running application on port: ' + targetPort);
		app.listen(targetPort);
	});
};
