var path = require('path'),
    tar = require('tar'),
    fstream = require('fstream'),
    zlib = require('zlib');

// action description
exports.desc = 'Package an application for steelmesh distribution';

exports.args = {
    
};

// export runner
exports.run = function(opts, callback) {
    var builder = this.builder,
        sourcePath = builder.getSourcePath(),
        targetPackage = path.resolve(builder.pkgInfo.name + '-' + builder.pkgInfo.version + '.tar.gz'),
        log = builder.log.bind(builder, callback);

    // pack the files into a tar.gz archive
    // code courtesy of @izs wonderful section from npm
    // ==> https://github.com/isaacs/npm/blob/master/lib/utils/tar.js#L86
    fstream.Reader({
        type: 'Directory',
        path: sourcePath
    })
    .on('error', log(new Error('Could not read path: ' + sourcePath)))
    .pipe(tar.Pack())
    .on('error', log(new Error('Unable to create tar: ' + targetPackage)))
    .pipe(zlib.Gzip())
    .on('error', log(new Error('Unable to gzip package: ' + targetPackage)))
    .pipe(fstream.Writer({
        type: 'File',
        path: targetPackage
    }))
    .on('error', log(new Error('Unable to write file: ' + targetPackage)))
    .on('close', callback);    
};