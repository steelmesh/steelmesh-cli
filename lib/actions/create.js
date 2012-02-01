var builders = {
        'package.json': function(repl) {
            repl
                .prompt('What language?')
                .receive('node', function() {
                    console.log('Good choice :)');
                });
        }
    };

module.exports = function(args) {
    // run the appropriate builder
    var builder = builders[args];
    
    if (builder) {
        builder(this);
    }
};