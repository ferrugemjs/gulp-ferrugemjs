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
			var fileName = file.path	
			fileName = fileName.substring(fileName.lastIndexOf('\\')+1,fileName.length-5);
			//console.log(fileName);
			var tmp_mod_name = "_mod_"+fileName.replace("-","_")+"_"+new Date().getTime();
			var templateFile = new Buffer(decoder.write(file.contents));

			var modules_to_import = [];

			templateFile = superviews(
										decoder.write(templateFile)
										.replace(/(<template .+args=")(.+?)"/g,'$1$2 _$ferrugemRegister _$ferrugemLoad"')
										.replace('</require>', '')
										.replace(/<require from="([^"]*)">/g,function(found,p1){
											if(p1.lastIndexOf(' as ') > -1){
												console.log(p1.substring(0,p1.lastIndexOf(' as ')));
												modules_to_import.push(p1.substring(0,p1.lastIndexOf(' as '))+'.html');
											}else{
												console.log(p1);												
												modules_to_import.push(p1+'.html');
											}											
											return found;
										})	
										.replace(/<require from="([^"]*)">/g, '<script>_$ferrugemRegister.add("$1");</script>')									
										.replace(/[\n\t\r]/g," ")
										.replace(/ (\w*)\.((trigger)|(delegate))="([^"]+)"/g," on$1=\"{$event.preventDefault();$5}\"")
			, null, null, opt.mode);

			var modules_string = "";

			if(modules_to_import.length > 0){
				modules_string = ",'"+modules_to_import.join("','")+"'";
				console.log(modules_string);
			}

			

			templateFile = templateFile
							.replace(/define\(\['exports', 'incremental-dom'\], function \(exports, IncrementalDOM\) {/g,"define(['exports', 'incremental-dom', './"+fileName+"' "+modules_string+"], function (exports, IncrementalDOM, "+tmp_mod_name+") { var _"+tmp_mod_name+"_tmp = Object.keys("+tmp_mod_name+")[0];")
							.replace(/exports\.([^ ]+) =/g,'exports.$1 = '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.render =')
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
