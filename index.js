var path = require('path');
var through = require('through-gulp');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var superviews = require("superviews.js");

function getALias(p_resource_url){
		var patt_alias = / as\W+(\w.+)/g;
		var _tagname;
		var _trueurl;
		if(patt_alias.test(p_resource_url)){
			var _urlsplit = p_resource_url.split(' as ');
			_trueurl = _urlsplit[0];
			_tagname = _urlsplit[1];
		}else{
			_trueurl = p_resource_url;
			_tagname = p_resource_url.substring(p_resource_url.lastIndexOf("/")+1,p_resource_url.length);
		};
		return {tag:_tagname,url:_trueurl};
}


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
			var fileName = file.path;
			fileName = fileName.substring(fileName.lastIndexOf('/')+1,fileName.length-5);
			
			if(fileName.lastIndexOf('\\') > -1){
				fileName = fileName.substring(fileName.lastIndexOf('\\')+1,fileName.length-5);
			};	
			var tmp_mod_name = "_mod_"+fileName.replace(/-/g,"_")+"_"+new Date().getTime();
			var templateFile = new Buffer(decoder.write(file.contents));

			var modules_to_import = [];
			var modules_alias_to_import = [];
			var modules_css_to_import = [];

			templateFile = superviews(
										decoder.write(templateFile)
										.replace('</require>', '')
										.replace(/<require from="([^"]*)">/g,function(found,p1){
											if(p1.lastIndexOf('!') > -1){												
												modules_css_to_import.push(p1);
											}else{
												var tagobject = getALias(p1);												
												modules_to_import.push(tagobject.url+'.html');
												modules_alias_to_import.push("_"+tagobject.tag.replace(/-/g,"_")+"_");											
											}
											return found;
										})	
										.replace(/<require from="([^"]*)">/g, '')									
										.replace(/[\n\t\r]/g," ")
										.replace(/ (\w*)\.((trigger)|(delegate))="([^"]+)"/g," on$1=\"{$event.preventDefault();$5}\"")
			, null, null, opt.mode);

			var modules_string = "";
			var modules_alias_string = "";
			var modules_css_string = "";

			if(modules_to_import.length > 0){
				modules_string = ",'"+modules_to_import.join("','")+"'";
			}
			if(modules_to_import.length > 0){
				modules_alias_string = ","+modules_alias_to_import.join(",");
			}
			if(modules_css_to_import.length > 0){
				modules_css_string = ",'"+modules_css_to_import.join("','")+"'";
			}
			templateFile = templateFile
							.replace(/define\(\['exports', 'incremental-dom'\], function \(exports, IncrementalDOM\) {/g,"define(['exports', 'incremental-dom','ferrugemjs', './"+fileName+"' "+modules_string+modules_css_string+"], function (exports, IncrementalDOM,_generic_component_mod, "+tmp_mod_name+modules_alias_string+") { var _"+tmp_mod_name+"_tmp = Object.keys("+tmp_mod_name+")[0];")
							.replace(/exports\.([^ ]+) =/g,tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.content ='+' _generic_component_mod.GenericComponent.prototype.content;'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.configComponent ='+' _generic_component_mod.GenericComponent.prototype.configComponent;'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.refresh ='+' _generic_component_mod.GenericComponent.prototype.refresh;exports.$1 = '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp];  '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.render =')
							.replace(/elementOpen\(("\w+?-[^"]+")([^)]+)\)/g,function(found,$1,$2){
								var mod_temp_name_tag = '_'+$1.replace(/"/g,"").replace(/-/g,"_")+'_';
								return ' new '+mod_temp_name_tag+'[Object.keys('+mod_temp_name_tag+')[0]]().configComponent('+$1+''+$2+').content(function(){'
							})
							.replace(/elementOpen\(("\w+?-[^"]+")\)/g,function(found,$1){
								var mod_temp_name_tag = '_'+$1.replace(/"/g,"").replace(/-/g,"_")+'_';
								return ' new '+mod_temp_name_tag+'[Object.keys('+mod_temp_name_tag+')[0]]().configComponent('+$1+',"nokey",[]).content(function(){'
							})
							.replace(/elementClose\("\w+?-+\w.+\)+?/g,'}).refresh();')
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
