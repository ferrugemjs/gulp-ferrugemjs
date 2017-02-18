var through = require('through-gulp');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var fjsparse = require("./parse/parse");

module.exports = function(opt) {
	// to preserve existing |undefined| behaviour and to introduce |newLine: ""| for binaries
	if (typeof opt.newLine !== 'string') {
		opt.newLine = '\n';
	}
	return through(function(file, encoding, callback) {
		if (file.isNull()) {}
		if (file.isBuffer()) {	
			var fileName = file.path;
			fileName = fileName.match(/(\w|[-.])+$/g)[0];
			fileName = fileName.substring(0,fileName.length-5);
			var viewModel = './'+fileName;
			
			var rawHtml = new Buffer(decoder.write(file.contents));
			
			file.contents = new Buffer(
				fjsparse(rawHtml,{formatCode:(opt?opt.formatCode:false)})
			);
		}
		if (file.isStream()){}
		this.push(file);
		callback();
	}, function(callback) {
		callback();
	});
};
