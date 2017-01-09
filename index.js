var through = require('through-gulp');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var htmlparser = require('htmlparser2');

var buffer = [];
var render_controller_alias = '$_this_$';
var lasts_index_alias = [];
var lasts_item_alias = [];

function appendBuffer(txt){
	buffer.push(txt);
}

var incrementalUID = new Date().getTime();

function nextUID(){
	incrementalUID++;
	return incrementalUID;
}

function flush () {
  buffer.length = 0;
  buffer = [];
  lasts_index_alias = [];
  lasts_item_alias = [];
}

function appendContext(str){
	if(typeof str === "string"){
		var nstr = str.replace(/([.]?[_$a-zA-Z]+[a-zA-Z0-9_$]*)/g,function($0,$1){
			if($1.indexOf(".")===0){
				return $1;
			}else if(lasts_index_alias.indexOf($1) > -1 || lasts_item_alias.indexOf($1) > -1){
				return $1;
			}
			return render_controller_alias+"."+$1;
		});
		return nstr;
	}
	return str;

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
			var lastTag = "";
			var renderIDOMHTML = "";
			var mod_temp_inst = '';

			var parser = new htmlparser.Parser({
				onopentag: function(name, attribs){
					lastTag = name;
					if(name==="template"){  	
				    	renderIDOMHTML += 'function('+render_controller_alias+'){\n';				    	
				    	//renderIDOMHTML += '_idom.elementOpen("div",'+render_controller_alias+'._$el$domref.target,["id",'+render_controller_alias+'._$el$domref.target,"class","'+fileName+'"]);\n';
				    }else if(name === "script" && attribs.type === "text/javascript"){

				    }else if(name==="content"){				    	
				    	renderIDOMHTML += 'this.content();\n';
				    }else if(name === "style"){
				    }else if(name === "require" && attribs["from"]){
				    	if(attribs.from.lastIndexOf(".css!") > -1){
				    		modules_css_to_import.push(attribs.from);
				    	}else{		
				    		var tagobject = getALias(attribs.from);												
							modules_to_import.push(tagobject.url+'.html');
							modules_alias_to_import.push("_"+tagobject.tag.replace(/-/g,"_")+"_");				    		
				    	}
				    }else if(name.indexOf("-") > -1){
				    	var mod_temp_name_tag = '_'+name.replace(/-/g,"_")+'_';
						mod_temp_inst = 'tmp_inst_'+mod_temp_name_tag+nextUID();
				    	renderIDOMHTML += ' var '+mod_temp_inst+' = new '+mod_temp_name_tag+'.default();\n';
				    	var mod_tmp_attr = {};
				    	for (var key in attribs) {
				    		if(key.indexOf(".") > 0){				    			
				    			mod_tmp_attr[key] = "{"+appendContext(attribs[key])+"}";				    			
				    		}else{				    			
				    			if(attribs[key].indexOf("{") > -1){
				    				mod_tmp_attr[key] = appendContext(attribs[key]);
				    			}else{
				    				mod_tmp_attr[key] = attribs[key];
				    			}				    			
				    		}				    		
				    	}
				    	var mod_tmp_attr_str = JSON.stringify(mod_tmp_attr)
				    									.replace(/"\{/g,'(')
				    									.replace(/\}"/g,')');

				    	renderIDOMHTML += ' _libfjs_mod_.AuxClass.prototype.configComponent.call('+mod_temp_inst+',"'+name+'","'+mod_temp_inst+'",'+mod_tmp_attr_str+');\n';
				    	renderIDOMHTML += ' '+mod_temp_inst+'.content(function(){ \n';

				    }else if(name==="for"){
				    	var array_each = attribs.each.split(" in ");
				    	var sub_array_each = array_each[0].split(",");
				    	var index_array = "";
				    	if(sub_array_each.length > 1){
				    		index_array = ","+sub_array_each[1];
				    		lasts_index_alias.push(sub_array_each[1]);
				    	}
				    	lasts_item_alias.push(sub_array_each[0]);
				    	renderIDOMHTML += '\t'+appendContext(array_each[1])+'.forEach(function('+sub_array_each[0]+index_array+'){\n';
				    }else if(name==="if"){
				    	renderIDOMHTML += '\tif('+appendContext(attribs.condition)+'){\n';
				    }else if(name==="elseif"){
				    	renderIDOMHTML += '\t}else if('+appendContext(attribs.condition)+'){\n';
				    }else{
						var obj_array = [];						
						for(var key in attribs){							
							if(key.indexOf(".") > 0){
								obj_array.push('on'+key.substring(0,key.indexOf("."))+'');
								obj_array.push('{'+appendContext(attribs[key])+'.bind('+render_controller_alias+')}');								
							}else{
								obj_array.push(''+key+'');
								//console.log(attribs[key]);
								
								if(typeof attribs[key] === "string" && attribs[key].indexOf("{") === 0){
									obj_array.push(appendContext(attribs[key]));
								}else{
									obj_array.push(attribs[key]);
								}
							}							
						}
						var mod_tmp_attr_str_ = '["'+obj_array.join('","')+'"]';
						
						var mod_tmp_attr_str = mod_tmp_attr_str_.replace(/\"\{([^}]*)\}\"/g,function($1,$2){
  							return "("+$2+")";
						});						
						
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
  							return '"+('+appendContext($2)+')+"';
						})+'");\n';
						}
					}				  
				    lastTag = "";
				},
				onclosetag: function(tagname){
					if(tagname === "template"){
						//renderIDOMHTML += '_idom.elementClose("div");\n';
					}else if(tagname === "content"){
				        
				    }else if(tagname === "script"){
				       
				    }else if(tagname.indexOf("-") > -1){				    	
				    	renderIDOMHTML += ' }).refresh();\n';
				    	mod_temp_inst = '';
				    }else if(["else"].indexOf(tagname) > -1){
				    	renderIDOMHTML += '\n\t}else{\n';
				    }else if(["if"].indexOf(tagname) > -1){
				    	renderIDOMHTML += '\n\t};\n';
				    }else if(["for"].indexOf(tagname) > -1){
				    	renderIDOMHTML += '\n\t});\n';
				    }else if(["require","style"].indexOf(tagname) < 0){
				    	renderIDOMHTML += '_idom.elementClose("'+tagname+'");\n';
				    }
				}
			}, {decodeEntities: true});
			parser.write(decoder.write(templateFile).replace(/[\n\t\r]/g," "));
			parser.end();

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

			buffer.unshift('define(["exports","incremental-dom","ferrugemjs","./'+fileName+'"'+modules_string+modules_css_string+'], function (exports,_idom,_libfjs_mod_,'+tmp_mod_name+modules_alias_string+') {\n');
			
			buffer.push('\n var _'+tmp_mod_name+'_tmp = Object.keys('+tmp_mod_name+')[0];');

			buffer.push('\n'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.content = _libfjs_mod_.GenericComponent.prototype.content;');
			buffer.push('\n'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.refresh = _libfjs_mod_.GenericComponent.prototype.refresh;');
			buffer.push('\n'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.render = '+renderIDOMHTML+'}');


			buffer.push('\n exports.default = '+tmp_mod_name+'[_'+tmp_mod_name+'_tmp];');

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