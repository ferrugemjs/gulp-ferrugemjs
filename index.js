var Transform = require('stream').Transform;
var path = require('path');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var ferrugemjs_node = require("ferrugemjs-node");

const compile2HTML = (file, opt) => {
	var opt = Object.assign({}, opt || {},{
		templateExtension: '.html',
		env:'development'
	});
	var filePath = file.path;
	var relativeFilePath = path.relative(__dirname, file.path).replace('../../','');
	var fileName = filePath;

	fileName = fileName.match(/(\w|[-.])+$/g)[0];
	fileName = fileName.substring(0,fileName.length - opt.templateExtension.length);
	var viewModel = fileName;

	console.log('filename:',fileName,relativeFilePath);
	var templateFile = Buffer.from(decoder.write(file.contents));
	file.contents = Buffer.from(
		ferrugemjs_node(decoder.write(templateFile),{
			viewModel: viewModel,
			env:opt. env,
			resourcePath: path.relative(__dirname, file.path).replace('../../',''),
		})
	);
	return file;
}

module.exports = function(opt) {

  var transformStream = new Transform({objectMode: true});
  transformStream._transform = function(file, encoding, callback) {
	var error = null;
	var output = compile2HTML(file, opt);
    callback(error, output);
  };

  return transformStream;
};
