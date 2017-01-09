var path = require('path');
var through = require('through-gulp');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var superviews = require("superviews.js");


var htmlparser = require('htmlparser2');
var buffer = [];

function appendBuffer(txt){
	buffer.push(txt);
}

function flush () {
  buffer.length = 0;
  buffer = [];
}

function strify (str) {
  return '"' + (str || '') + '"';
}

function interpolate (text) {
	/*
		  text = text.replace(/\{/g, '" + (');
		  text = text.replace(/\}/g, ') + "');
		  text = text.replace(/\n/g, ' \\\n');
		  return strify(text);
		  //return text;
	*/
  console.log(text);
  text = text.replace(/"\{/g, ' (');
  text = text.replace(/\}"/g, ') ');
  //text = text.replace(/\n/g, ' \\\n');
  //return strify(text);
  console.log(text);
  return text;
}

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

module.exports = function(opt) {
	opt = opt || {};
	opt.mode = opt.mode || "es6";
	// to preserve existing |undefined| behaviour and to introduce |newLine: ""| for binaries
	if (typeof opt.newLine !== 'string') {
		opt.newLine = '\n';
	}
	return through(function(file, encoding, callback) {
		flush();
		if (file.isNull()) {}
		if (file.isBuffer()) {	
			var fileName = file.path;
			fileName = fileName.match(/(\w|[-.])+$/g)[0];
			fileName = fileName.substring(0,fileName.length-5);
			
			var tmp_mod_name = "_mod_"+fileName.replace(/-/g,"_")+"_"+new Date().getTime();
			var templateFile = new Buffer(decoder.write(file.contents));

			var modules_to_import = [];
			var modules_alias_to_import = [];
			var modules_css_to_import = [];

			//console.log(decoder.write(templateFile));

			var lastTag = "";
			var renderIDOMHTML = "";
			var mod_temp_inst = '';
			var render_args = '';
			var parser = new htmlparser.Parser({
				onopentag: function(name, attribs){
					lastTag = name;
				    if(name === "script" && attribs.type === "text/javascript"){
				        //appendBuffer("JS! Hooray!");
				    }else if(name==="content"){				    	
				    	renderIDOMHTML += 'this.content();';
				    }else if(name === "style"){
				    	//appendBuffer('style here!!!');
				    }else if(name === "require" && attribs["from"]){
				    	//console.log(attribs);
				    	if(attribs.from.lastIndexOf(".css!") > -1){
				    		modules_css_to_import.push(attribs.from);
				    	}else{		
				    		var tagobject = getALias(attribs.from);												
							modules_to_import.push(tagobject.url+'.html');
							modules_alias_to_import.push("_"+tagobject.tag.replace(/-/g,"_")+"_");
				    		//modules_to_import.push(attribs.from);
				    	}
				    }else if(name.indexOf("-") > -1){
				    	var mod_temp_name_tag = '_'+name.replace(/-/g,"_")+'_';
						mod_temp_inst = 'tmp_inst_'+mod_temp_name_tag+new Date().getTime();
				    	renderIDOMHTML += ' var '+mod_temp_inst+' = new '+mod_temp_name_tag+'.default();\n';
				    	
				    	
				    	var mod_tmp_attr = {};

				    	for (var key in attribs) {
				    		if(key.indexOf(".") > 0){
				    			console.log(key,attribs[key]);
				    			mod_tmp_attr[key] = "{"+attribs[key]+"}";
				    		}else{
				    			mod_tmp_attr[key] = attribs[key];
				    		}
				    		//mod_tmp_attr[key] = interpolate(attribs[key]);
				    	}
				    	

				    	var mod_tmp_attr_str = JSON.stringify(mod_tmp_attr)
				    									.replace(/"\{/g,'(')
				    									.replace(/\}"/g,')');
				    	
				    	//console.log(mod_tmp_attr_str);

				    	//renderIDOMHTML += '_idom.elementOpen("div","'+mod_temp_inst+'",["id","'+mod_temp_inst+'","class","'+name+'"]);\n';
				    	//renderIDOMHTML += '_idom.elementClose("div");\n';

				    	renderIDOMHTML += ' _ferrugemjs_mod_.AuxClass.prototype.configComponent.call('+mod_temp_inst+',"'+name+'","'+mod_temp_inst+'",'+mod_tmp_attr_str+');\n';

				    	//console.log(name,mod_temp_inst,mod_tmp_attr_str);

				    	renderIDOMHTML += ' '+mod_temp_inst+'.content(function(){ \n';
				    	
				    	//renderIDOMHTML += ' }).refresh();\n';

				    	//renderIDOMHTML += ' '+mod_temp_inst+'.refresh();\n';

				    }else if(name==="template"){	
				        render_args	= attribs.args;	    	
				    	renderIDOMHTML += 'function('+attribs.args+'){\n';	
				    }else if(name==="for"){
				    	var array_each = attribs.each.split(" in ");
				    	var sub_array_each = array_each[0].split(",");
				    	var index_array = "";
				    	if(sub_array_each.length > 1){
				    		index_array = ","+sub_array_each[1];
				    	}
				    	console.log(array_each);
				    	renderIDOMHTML += '\t'+array_each[1]+'.forEach(function('+sub_array_each[0]+index_array+'){\n';
				    	//renderIDOMHTML += '\tfor('+attribs.condition+'){\n';
				    }else if(name==="if"){
				    	renderIDOMHTML += '\tif('+attribs.condition+'){\n';
				    }else if(name==="elseif"){
				    	renderIDOMHTML += '\t}else if('+attribs.condition+'){\n';
				    }else if(["if","each"].indexOf(name) < 0){
						var obj_array = [];
						
						
						for(var key in attribs){
							
							if(key.indexOf(".") > 0){
								obj_array.push('on'+key.substring(0,key.indexOf("."))+'');
								obj_array.push('{'+attribs[key]+'.bind('+render_args+')}');								
							}else{
								obj_array.push(''+key+'');
								obj_array.push(attribs[key]);
							}							
						}
						/*
						var mod_tmp_attr_str = '["'+obj_array.join('","')
				    									.replace(/\{/g,'(')
				    									.replace(/\}/g,')')+'"]';
						*/

						/*
						var str_test = '["kara","{oxe-bicho}","si-nao-miguel","{cara-vai}"]';

						var result = str_test.replace(/"\{([^}]+)\}"/g,function($1,$2){
  							//console.log($2);
  							return "("+$2+")";
						}); 

						console.log(result);
						*/
						var mod_tmp_attr_str_ = '["'+obj_array.join('","')+'"]';

						var mod_tmp_attr_str = mod_tmp_attr_str_.replace(/\"\{([^}]*)\}\"/g,function($1,$2){
  							//console.log($2);
  							return "("+$2+")";
						});


						//mod_tmp_attr_str = mod_tmp_attr_str.
				    	//var mod_tmp_attr_str2 = '["'+obj_array.join('","')+'"]';								


				    	//.replace(/"\{/g,'(')
				    	//								.replace(/\}"/g,')');
				    	if(obj_array.length){
				    		//console.log('t2',mod_tmp_attr_str_,mod_tmp_attr_str);
				    	}
						
				    	renderIDOMHTML += '_idom.elementOpen("'+name+'",null,'+mod_tmp_attr_str+');\n';
				    }
				},
				ontext: function(text){
					if(text && text.trim()){
						if(lastTag==="style"){
							appendBuffer("var tmp_style = document.createElement('style');");
							appendBuffer("tmp_style.type = 'text/css';");
							appendBuffer("tmp_style.innerHTML = '"+text.replace(/\n/g,'')+"';");
							appendBuffer("document.getElementsByTagName('head')[0].appendChild(tmp_style);");
						}else if(lastTag.indexOf("-") > -1){
							console.log(text);
						}else if(["template","if","each","require","style"].indexOf(lastTag) < 0){
							renderIDOMHTML += '_idom.text("'+text.trim().replace(/\{([^}]*)\}/g,function($1,$2){
  							//console.log($2);
  							return '"+('+$2+')+"';
						})+'");\n';
						}
					}				  
				    lastTag = "";
				},
				onclosetag: function(tagname){
				    if(tagname === "script"){
				        //appendBuffer("That's it?!");
				    }else if(tagname.indexOf("-") > -1){

				    	//renderIDOMHTML += ' '+mod_temp_inst+'.content(function(){ \n';
				    	
				    	renderIDOMHTML += ' }).refresh();\n';

				    	//renderIDOMHTML += ' '+mod_temp_inst+'.refresh();\n';

				    	mod_temp_inst = '';

				    }else if(["else"].indexOf(tagname) > -1){
				    	renderIDOMHTML += '\n\t}else{\n';
				    }else if(["if"].indexOf(tagname) > -1){
				    	renderIDOMHTML += '\n\t};\n';
				    }else if(["for"].indexOf(tagname) > -1){
				    	renderIDOMHTML += '\n\t});\n';
				    }else if(["template","if","each","require","style"].indexOf(tagname) < 0){
				    	renderIDOMHTML += '_idom.elementClose("'+tagname+'");\n';
				    }

				}
			}, {decodeEntities: true});
			parser.write(decoder.write(templateFile).replace(/[\n\t\r]/g," "));
			parser.end();



			/*
			templateFile = superviews(
										decoder.write(templateFile)
										.replace('</require>', '')
										.replace(/(<style>)+([^<]*)+(<\/style>)/gm,"<script>"
											+"var tmp_style = document.createElement('style');"
											+"tmp_style.type = 'text/css';"
											+"tmp_style.innerHTML = '$2';"
											+"document.getElementsByTagName('head')[0].appendChild(tmp_style);"
										+"</script>")
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
			*/
			/*
			templateFile = templateFile
							.replace(/define\(\['exports', 'incremental-dom'\], function \(exports, IncrementalDOM\) {/g,"define(['exports', 'incremental-dom','ferrugemjs', './"+fileName+"' "+modules_string+modules_css_string+"], function (exports, IncrementalDOM,_ferrugemjs_mod_, "+tmp_mod_name+modules_alias_string+") { var _"+tmp_mod_name+"_tmp = Object.keys("+tmp_mod_name+")[0];")
							.replace(/exports\.([^ ]+) =/g,tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.content = _ferrugemjs_mod_.GenericComponent.prototype.content;'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.refresh = _ferrugemjs_mod_.GenericComponent.prototype.refresh;exports.$1 = '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp];  '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.render =')
							
							.replace(/elementOpen\(("\w+?-[^"]+")([^)]+)\)/g,function(found,$1,$2){
								var mod_temp_name_tag = '_'+$1.replace(/"/g,"").replace(/-/g,"_")+'_';
								var mod_temp_inst = 'tmp_inst_'+mod_temp_name_tag+new Date().getTime();
								return ' var '+mod_temp_inst+' = new '+mod_temp_name_tag+'[Object.keys('+mod_temp_name_tag+')[0]](); _ferrugemjs_mod_.AuxClass.prototype.configComponent.call('+mod_temp_inst+','+$1+''+$2+');'+mod_temp_inst+'.content(function(){'
							})
							.replace(/elementOpen\(("\w+?-[^"]+")\)/g,function(found,$1){
								var mod_temp_name_tag = '_'+$1.replace(/"/g,"").replace(/-/g,"_")+'_';
								var mod_temp_inst = 'tmp_inst_'+mod_temp_name_tag+new Date().getTime();
								return ' var '+mod_temp_inst+' = new '+mod_temp_name_tag+'[Object.keys('+mod_temp_name_tag+')[0]](); _ferrugemjs_mod_.AuxClass.prototype.configComponent.call('+mod_temp_inst+','+$1+',"nokey",[]);'+mod_temp_inst+'.content(function(){'
							})

							.replace(/elementClose\("\w+?-+\w.+\)+?/g,'}).refresh();')
							.replace('elementClose("content")','')
							.replace('elementOpen("content")','this.content();')
			*/	

			var modules_string = "";
			var modules_alias_string = "";
			var modules_css_string = "";

			if(modules_to_import.length > 0){
				modules_string = ',"'+modules_to_import.join('","')+'"';
			}
			if(modules_to_import.length > 0){
				modules_alias_string = ","+modules_alias_to_import.join(",");
			}
			if(modules_css_to_import.length > 0){
				modules_css_string = ',"'+modules_css_to_import.join('","')+'"';
			}

			buffer.unshift('define(["exports","incremental-dom","ferrugemjs","./'+fileName+'"'+modules_string+modules_css_string+'], function (exports,_idom,_ferrugemjs_mod_,'+tmp_mod_name+modules_alias_string+') {\n');
			
			buffer.push('\n var _'+tmp_mod_name+'_tmp = Object.keys('+tmp_mod_name+')[0];');

			buffer.push('\n'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.content = _ferrugemjs_mod_.GenericComponent.prototype.content;');
			buffer.push('\n'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.refresh = _ferrugemjs_mod_.GenericComponent.prototype.refresh;');
			buffer.push('\n'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.render = '+renderIDOMHTML+'}');


			buffer.push('\n exports.default = '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp];');


			//.replace(/exports\.([^ ]+) =/g,tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.content = _ferrugemjs_mod_.GenericComponent.prototype.content;'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.refresh = _ferrugemjs_mod_.GenericComponent.prototype.refresh;exports.$1 = '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp];  '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.render =')
							

			buffer.push('\n});');

			file.contents = new Buffer(buffer.join('\n'));
			flush();
		}
		if (file.isStream()) {}
		this.push(file);
		callback();
	}, function(callback) {
		callback();
	});
};








/*




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
			fileName = fileName.match(/(\w|[-.])+$/g)[0];
			fileName = fileName.substring(0,fileName.length-5);
			
			var tmp_mod_name = "_mod_"+fileName.replace(/-/g,"_")+"_"+new Date().getTime();
			var templateFile = new Buffer(decoder.write(file.contents));

			var modules_to_import = [];
			var modules_alias_to_import = [];
			var modules_css_to_import = [];

			templateFile = superviews(
										decoder.write(templateFile)
										.replace('</require>', '')
										.replace(/(<style>)+([^<]*)+(<\/style>)/gm,"<script>"
											+"var tmp_style = document.createElement('style');"
											+"tmp_style.type = 'text/css';"
											+"tmp_style.innerHTML = '$2';"
											+"document.getElementsByTagName('head')[0].appendChild(tmp_style);"
										+"</script>")
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
							.replace(/define\(\['exports', 'incremental-dom'\], function \(exports, IncrementalDOM\) {/g,"define(['exports', 'incremental-dom','ferrugemjs', './"+fileName+"' "+modules_string+modules_css_string+"], function (exports, IncrementalDOM,_ferrugemjs_mod_, "+tmp_mod_name+modules_alias_string+") { var _"+tmp_mod_name+"_tmp = Object.keys("+tmp_mod_name+")[0];")
							.replace(/exports\.([^ ]+) =/g,tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.content = _ferrugemjs_mod_.GenericComponent.prototype.content;'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.refresh = _ferrugemjs_mod_.GenericComponent.prototype.refresh;exports.$1 = '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp];  '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.render =')
							
							.replace(/elementOpen\(("\w+?-[^"]+")([^)]+)\)/g,function(found,$1,$2){
								var mod_temp_name_tag = '_'+$1.replace(/"/g,"").replace(/-/g,"_")+'_';
								var mod_temp_inst = 'tmp_inst_'+mod_temp_name_tag+new Date().getTime();
								return ' var '+mod_temp_inst+' = new '+mod_temp_name_tag+'[Object.keys('+mod_temp_name_tag+')[0]](); _ferrugemjs_mod_.AuxClass.prototype.configComponent.call('+mod_temp_inst+','+$1+''+$2+');'+mod_temp_inst+'.content(function(){'
							})
							.replace(/elementOpen\(("\w+?-[^"]+")\)/g,function(found,$1){
								var mod_temp_name_tag = '_'+$1.replace(/"/g,"").replace(/-/g,"_")+'_';
								var mod_temp_inst = 'tmp_inst_'+mod_temp_name_tag+new Date().getTime();
								return ' var '+mod_temp_inst+' = new '+mod_temp_name_tag+'[Object.keys('+mod_temp_name_tag+')[0]](); _ferrugemjs_mod_.AuxClass.prototype.configComponent.call('+mod_temp_inst+','+$1+',"nokey",[]);'+mod_temp_inst+'.content(function(){'
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


*/