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
		var nstr = str.replace(/this\.([_$a-zA-Z]+[a-zA-Z0-9_$]*)/g,function($0,$1){
			if(lasts_index_alias.indexOf($1) > -1 || lasts_item_alias.indexOf($1) > -1){
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
		var _aliasname;
		var _trueurl;
		if(patt_alias.test(p_resource_url)){
			var _urlsplit = p_resource_url.split(' as ');
			_trueurl = _urlsplit[0];
			_aliasname = _urlsplit[1];
		}else{
			_trueurl = p_resource_url;
			_aliasname = p_resource_url.substring(p_resource_url.lastIndexOf("/")+1,p_resource_url.length);
		};
		return {alias:_aliasname,url:_trueurl};
}
function formatContext(value){
	return value
		.replace(/"\$\{/g,'(')
		.replace(/\}"/g,')');
}
function attrToContext(attribs){
	var mod_tmp_attr_str = formatContext(JSON.stringify(attribs));									
	return mod_tmp_attr_str;
}

function adjustEvents(key,value){
	var argslist = '('+render_controller_alias+')';
	value = appendContext(value);								
	var argsInitIndex = value.indexOf("(");
	if(argsInitIndex > 0){								
		argslist = value.substring(argsInitIndex+1,value.length);
		argslist = '('+render_controller_alias+','+argslist;									
		value = value.substring(0,argsInitIndex);
	}								
	value = '${'+value+'.bind'+argslist+'}';
	return {
		key:key
		,value:value
	}
}

function separateAttribs(attribs){
	var static_attr = {};
	var dinamic_attr = {};
	for (var key in attribs) {
		if(key.indexOf(".") > 0){	
			//is a custom event			    			
			//dinamic_attr[key] = "${"+appendContext(attribs[key])+"}";
			var eventStripped =	adjustEvents(key,attribs[key]);
			dinamic_attr[key] = eventStripped.value;
												    			
		}else{				    			
			if(attribs[key].indexOf("${") === 0){
				dinamic_attr[key] = appendContext(attribs[key]);
			}else{
				static_attr[key] = attribs[key];
			}				    			
		}				    		
	}
	return {
		static:static_attr
		,dinamic:dinamic_attr
	}
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
			var mod_temp_inst = "";
			var className = "";
			var index_array = "";
			
			var parser = new htmlparser.Parser({
				onopentag: function(name, attribs){
					lastTag = name;
					if(name==="template"){  	
				    	renderIDOMHTML += 'function('+render_controller_alias+'){\n';				    	
				    	className = fileName;
				    	if(attribs.class){
				    		className=attribs.class;
				    	};
				    	renderIDOMHTML += render_controller_alias+'._$el$domref.static_vars.className="'+className+'";\n';
				    	//var uid = "uid_"+nextUID();
				    	//renderIDOMHTML += '_idom.elementOpen("div","'+uid+'",["id","'+uid+'","class","'+className+'"]);\n';
				    	//renderIDOMHTML += '_idom.elementOpen("div","'+uid+'",["id","'+uid+'","class","'+className+'"]);\n';
				    	//renderIDOMHTML += '_idom.elementOpen("div",'+render_controller_alias+'._$el$domref.static_vars.id,["data-target",'+render_controller_alias+'._$el$domref.target,"id",'+render_controller_alias+'._$el$domref.static_vars.id,"class","'+className+'"]);\n';

				    }else if(name === "script"){
				    	//avoid script support
				    }else if(name==="content"){				    	
				    	renderIDOMHTML += render_controller_alias+'.content();\n';
				    }else if(name === "style"){

				    }else if(name === "require" && attribs["from"]){
				    	var fromstr = attribs.from;
				    	if(fromstr.lastIndexOf(".css!") > -1){
				    		modules_css_to_import.push(fromstr);
				    	}else if(attribs.type && attribs.type==="script"){		
				    		var fromobject = getALias(fromstr);										
							modules_to_import.push(fromobject.url);
							modules_alias_to_import.push(fromobject.alias.replace(/-/g,"_"));				    		
				    	}else if(attribs.type && attribs.type==="namespace"){		
							var tagobject = getALias(fromstr);										
							modules_to_import.push(tagobject.url);
							modules_alias_to_import.push("_"+tagobject.alias.replace(/-/g,"_"));				    		
				    	}else{
							var tagobject = getALias(fromstr);										
							modules_to_import.push(tagobject.url+'.html');
							modules_alias_to_import.push("_"+tagobject.alias.replace(/-/g,"_"));
				    	}
				    }else if(name === "compose" && attribs["view"]){
				    	//compose a element
				    	var separate_attrs = separateAttribs(attribs);
				    	var mod_tmp_attr_str = attrToContext(separate_attrs.dinamic);
				    	var mod_tmp_static_attr_str = JSON.stringify(separate_attrs.static);
				    	//console.log(attribs["view"],formatContext('"'+attribs["view"]+'"'),formatContext('"'+'chora-nao bebe'+'"'))
				    	renderIDOMHTML += ' _libfjs_mod_.AuxClass.prototype.compose.call(null,'+formatContext('"'+attribs["view"]+'"')+','+mod_tmp_attr_str+','+mod_tmp_static_attr_str+',function(){ \n';
				    }else if(name.indexOf(":") > -1 || name.indexOf("-") > -1){

						var namespace = "";
						var tagname = "";
						var tagname_underscore = "";
						var tagname_with_namespace = "";
						var tagname_constructor = "";

						if(name.indexOf(":") > -1){
							namespace = name.substring(0,name.indexOf(":"));
							tagname = name.substring(name.indexOf(":")+1,name.length);
							tagname_underscore = tagname.replace(/-/g,"_");
							tagname_with_namespace = namespace+'.'+tagname_underscore;
							tagname_constructor = '_'+tagname_with_namespace;
						}else{
							namespace = "";
							tagname = name;
							tagname_underscore = tagname.replace(/-/g,"_");
							tagname_with_namespace = tagname_underscore;
							tagname_constructor = '_'+tagname_with_namespace+'.default';							
						}					
	
						//console.log(namespace,"#",tagname,"#",tagname_underscore,"#",tagname_with_namespace,"#",tagname_constructor);
						
						mod_temp_inst = 'tmp_inst_'+tagname_underscore+nextUID();
				    	renderIDOMHTML += ' var '+mod_temp_inst+' = new '+tagname_constructor+'();\n';
				    	
				    	var separate_attrs = separateAttribs(attribs);
				    	separate_attrs.static.is = name;
				    	var mod_tmp_attr_str = attrToContext(separate_attrs.dinamic);
				    	var mod_tmp_static_attr_str = JSON.stringify(separate_attrs.static);
				    	//console.log(mod_tmp_attr_str,'#',mod_tmp_static_attr_str);

				    	renderIDOMHTML += ' _libfjs_mod_.AuxClass.prototype.configComponent.call('+mod_temp_inst+',"'+tagname+'","'+mod_temp_inst+'",'+mod_tmp_attr_str+','+mod_tmp_static_attr_str+');\n';
				    	renderIDOMHTML += ' '+mod_temp_inst+'.content(function(){ \n';						
						
				    }else if(name==="for"){
				    	var array_each = attribs.each.split(" in ");
				    	var sub_array_each = array_each[0].split(",");
				    	index_array = "$key_tmp_"+nextUID();
				    	if(sub_array_each.length > 1){
				    		index_array = sub_array_each[1];
				    		lasts_index_alias.push(sub_array_each[1]);
				    	}
				    	lasts_item_alias.push(sub_array_each[0]);
				    	renderIDOMHTML += '\t'+appendContext(array_each[1])+'.forEach(function('+sub_array_each[0]+','+index_array+'){\n';
				    }else if(name==="if"){
				    	renderIDOMHTML += '\tif('+appendContext(attribs.condition)+'){\n';
				    }else if(name==="elseif"){
				    	renderIDOMHTML += '\t}else if('+appendContext(attribs.condition)+'){\n';
				    }else if(name==="else"){
				    	renderIDOMHTML += '\t}else{\n';
				    }else{
				    	//is a normal tag
						var obj_array = [];		
						var bindField = "";	
						var obj_array_static = [];			
						for(var key in attribs){
							var indxBind = 	key.indexOf(".bind");
							if(indxBind > -1 && (name==="input" || name==="textarea" || name==="select")){
								var evtstr = "on"+key.substring(0,indxBind);
								obj_array.push(evtstr);
								if(name==="select"){									
									obj_array.push('#{#function($evt){\nvar tmp_$target$_evt=$evt.target;\n'+appendContext(attribs[key])+'=tmp_$target$_evt.options[tmp_$target$_evt.selectedIndex].value;\n'+render_controller_alias+'.refresh();\n}#}#');
								}else{									
									obj_array.push('#{#function($evt){\n'+appendContext(attribs[key])+'=$evt.target.value;\n'+render_controller_alias+'.refresh()\n}\n#}#');
								}								
							}else if(key.indexOf(".") > 0){
								var eventStripped =	adjustEvents('on'+key.substring(0,key.indexOf("."))+'',attribs[key]);
								obj_array.push(eventStripped.key);
								obj_array.push(eventStripped.value);								
							}else{								
								if(typeof attribs[key] === "string" && attribs[key].indexOf("${") === 0){
									obj_array.push(''+key+'');
									obj_array.push(appendContext(attribs[key]));
								}else{	
									obj_array_static.push(''+key+'');								
									obj_array_static.push(attribs[key]);
								}
							}							
						}
						var mod_tmp_attr_str_ = '"'+obj_array.join('","')+'"';
						var mod_tmp_static_attr_str =  '["'+obj_array_static.join('","')+'"]';
						
						var mod_tmp_attr_str = mod_tmp_attr_str_.replace(/\"\$\{([^}]*)\}\"/g,function($1,$2){
  							return "("+$2+")";
						});	
						mod_tmp_attr_str = mod_tmp_attr_str.replace(/\"#{#/g,"(");
						mod_tmp_attr_str = mod_tmp_attr_str.replace(/#}#\"/g,")");
						var static_key = (attribs.id)?attribs.id+'"':"key_"+nextUID()+'_"+'+(index_array?index_array:'""');
						//console.log(static_key);
				    	renderIDOMHTML += '_idom.elementOpen("'+name+'","'+static_key+','+mod_tmp_static_attr_str+','+mod_tmp_attr_str+');\n';
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
							//console.log(text);
						}else if(["template","if","each","require","style"].indexOf(lastTag) < 0){
							renderIDOMHTML += '_idom.text("'+text.trim().replace(/\$\{([^}]*)\}/g,function($1,$2){
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
				       
				    }else if(tagname === "compose"){
				       renderIDOMHTML += ' });\n';
				    }else if(tagname.indexOf("-") > -1 || tagname.indexOf(":") > -1){				    	
				    	renderIDOMHTML += ' }).refresh();\n';
				    	mod_temp_inst = '';
				    }else if(["if"].indexOf(tagname) > -1){
				    	renderIDOMHTML += '\n\t};\n';
				    }else if(["for"].indexOf(tagname) > -1){
				    	renderIDOMHTML += '\n\t});\n';
				    	index_array = "";
				    }else if(["require","style","compose","else","elseif"].indexOf(tagname) < 0){
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

			buffer.push('\n'+tmp_mod_name+'[_'+tmp_mod_name+'_tmp].prototype.$className$ref_style_name$ = "'+className+'";');
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


