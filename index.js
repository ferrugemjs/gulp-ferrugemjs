var path = require('path');
var through = require('through-gulp');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var superviews = require("superviews.js");

// file can be a vinyl file object or a string
// when a string it will construct a new one
module.exports = function(opt) {
	opt = opt || {};
	opt.mode = opt.mode || "es6";
	// to preserve existing |undefined| behaviour and to introduce |newLine: ""| for binaries
	if (typeof opt.newLine !== 'string') {
		opt.newLine = '\n';
	}
	return through(function(file, encoding, callback) {
		if (file.isNull()) {}
		if (file.isBuffer()) {			
			var templateFile = new Buffer(decoder.write(file.contents));			
			templateFile = superviews(
										decoder.write(templateFile)
										.replace(/(<template .+args=")(.+?)"/g,'$1$2 _$ferrugemRegister _$ferrugemLoad"')
										.replace('</require>', '')
										.replace(/<require from="([^"]*)">/g, '<script>_$ferrugemRegister.add("$1");</script>')									
										.replace(/[\n\t\r]/g," ")
										.replace(/ (\w*)\.((trigger)|(delegate))="([^"]+)"/g," on$1=\"{$event.preventDefault();$5}\"")
			, null, null, opt.mode);
			templateFile = templateFile
							.replace(/elementOpen\(("\w+?-[^"]+")([^)]+)\)/g,'_$ferrugemLoad.load($1$2).content(function(){')
							.replace(/elementOpen\(("\w+?-[^"]+")\)/g,'_$ferrugemLoad.load($1,"nokey",[]).content(function(){')
							.replace(/elementClose\("\w+?-+\w.+\)+?/g,'});')
							.replace('elementClose("content")','')
							.replace('elementOpen("content")','this.content();')		
			file.contents = new Buffer(templateFile);
		}
		if (file.isStream()) {}
		this.push(file);
		callback();
	}, function(callback) {
		callback();
	});
};
