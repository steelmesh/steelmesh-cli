var fs = require('fs'),
    express = require('express');

exports.install = function(mesh, instance) {
    var logPath = process.env['STEELMESH_REQUESTLOG'],
        format = process.env['STEELMESH_REQUESTLOG_FORMAT'] || 'default',
        stats;
    
    // TODO: customize log format
    if (logPath) {
        try {
            stats = fs.statSync(logPath);
        }
        catch (e) {
        }

        instance.use(express.logger({
            format: format,
            buffer: false,
            stream: fs.createWriteStream(logPath, {
                flags: stats ? 'r+' : 'w',
                encoding: 'utf8',
                start: stats ? stats.size : 0
            })
        }));
    }
    else {
        instance.use(express.logger(format));
    }
};

exports.prereqs = [];