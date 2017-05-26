var through = require('through-gulp');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var ferrugemjs_node = require("ferrugemjs-node");

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
			var viewModel = fileName;
			
			var templateFile = new Buffer(decoder.write(file.contents));
			//var rawHtml = new Buffer(decoder.write(file.contents));
			
			file.contents = new Buffer(
				ferrugemjs_node(decoder.write(templateFile),{viewModel:viewModel})
			);
		}
		if (file.isStream()){}
		this.push(file);
		callback();
	}, function(callback) {
		callback();
	});
};
