var htmlparser = require("htmlparser2");
var beautify = require('js-beautify').js_beautify;

var buffer = [];
var context_alias = '$_this_$';

var incrementalUID = new Date().getTime();

function nextUID(){
	incrementalUID++;
	return incrementalUID;
}

function appendBuffer(txt){
	buffer.push(txt);
}

function flush () {
  buffer.length = 0;
  buffer = [];
}

function pathToAlias(p_resource_url){
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

function contextToAlias(str){
	var list_ignore = list_ignore || [];
	if(typeof str === "string"){
		var nstr = str.replace(/this\.([_$a-zA-Z]+[a-zA-Z0-9_$]*)/g,function($0,$1){
			if(list_ignore.indexOf($1) > -1 ){
				return $1;
			}
			return context_alias+"."+$1;
		});
		return nstr;
	}
	return str; 
}

function encodeValue(value){
	return value
		.replace(/"\$\{/g,'(')
		.replace(/\}"/g,')');
}

function attrToContext(attribs){
	var mod_tmp_attr_str = encodeValue(JSON.stringify(attribs));									
	return mod_tmp_attr_str;
}


function encodeAndSetContext(str){
		return str.replace(/\$\{([^}]*)\}/g,function($1,$2){		
  			return '"+('+contextToAlias($2)+')+"';
		});	
}

function adjustEvents(key,value){
	var argslist = '('+context_alias+')';
	value = contextToAlias(value);								
	var argsInitIndex = value.indexOf("(");
	if(argsInitIndex > 0){								
		argslist = value.substring(argsInitIndex+1,value.length);
		argslist = '('+context_alias+','+argslist;									
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
				dinamic_attr[key] = contextToAlias(attribs[key]);
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

function objStaticAttrToStr(attribs){	
	var bindField = "";	
	var obj_array_static = [];			
	for(var key in attribs){
		obj_array_static.push(''+key+'');								
		obj_array_static.push(attribs[key]);									
	}	
	var mod_tmp_static_attr_str =  '["'+obj_array_static.join('","')+'"]';
	return 	mod_tmp_static_attr_str;				

}

function objDinamicAttrToStr(attribs,tagName){
	var obj_array = [];		
	var bindField = "";			
	for(var key in attribs){
		var indxBind = 	key.indexOf(".bind");
		if(indxBind > -1 && (tagName=="input" || tagName=="textarea" || tagName=="select")){
			var evtstr = "on"+key.substring(0,indxBind);
			obj_array.push(evtstr);
			if(tagName=="select"){									
				obj_array.push('#{#function($evt){\nvar tmp_$target$_evt=$evt.target;\n'+contextToAlias(attribs[key])+'=tmp_$target$_evt.options[tmp_$target$_evt.selectedIndex].value;\n'+context_alias+'.refresh();\n}#}#');
			}else{									
				obj_array.push('#{#function($evt){\n'+contextToAlias(attribs[key])+'=$evt.target.value;\n'+context_alias+'.refresh()\n}\n#}#');
			}
			console.log(attribs[key])								
		}else if(key.indexOf(".") > 0){
			
			//talvez certo?
			//obj_array.push('on'+key.substring(0,key.indexOf("."))+'');
			//obj_array.push(attribs[key]);	


			var eventStripped =	adjustEvents('on'+key.substring(0,key.indexOf("."))+'',attribs[key]);
			obj_array.push(eventStripped.key);
			obj_array.push(eventStripped.value);

			//console.log(`aqui hoooo--->`,attribs[key])					
		}else{								
			if(typeof attribs[key] === "string" && attribs[key].indexOf("${") === 0){
				obj_array.push(''+key+'');
				obj_array.push(contextToAlias(attribs[key]));
			}
		}							
	}
	var mod_tmp_attr_str_ = '"'+obj_array.join('","')+'"';	
	var mod_tmp_attr_str = mod_tmp_attr_str_.replace(/\"\$\{([^}]*)\}\"/g,function($1,$2){
			return "("+$2+")";
	});	
	mod_tmp_attr_str = mod_tmp_attr_str.replace(/\"#{#/g,"(");
	mod_tmp_attr_str = mod_tmp_attr_str.replace(/#}#\"/g,")");


	return 	mod_tmp_attr_str;				

}




function tagIfToStr(comp){
	var txtIf = '\tif('+contextToAlias(comp.attribs.condition)+'){';
	comp.children.forEach(sub_comp => txtIf += '\t'+componentToStr(sub_comp));
	txtIf += '\t};';
	return txtIf;
}

function tagForToStr(comp){
	var array_each = comp.attribs.each.split(" in ");
	var sub_array_each = array_each[0].split(",");
	var index_array = "$key_tmp_"+nextUID();
	if(sub_array_each.length > 1){
		index_array = sub_array_each[1];
		//lasts_index_alias.push(sub_array_each[1]);
	}
	//lasts_item_alias.push(sub_array_each[0]);
	//renderIDOMHTML += '\t'+appendContext(array_each[1])+'.forEach(function('+sub_array_each[0]+','+index_array+'){\n';
	
	var txtFor = '\t'+contextToAlias(array_each[1])+'.forEach(function('+sub_array_each[0]+','+index_array+'){';
	comp.children.forEach(sub_comp => txtFor += '\t'+componentToStr(sub_comp));
	txtFor += '\t});';
	return txtFor;
}

function tagTextToStr(comp){
	var text = comp.data;
	if(text && text.trim()){
		return '\t_idom.text("'+text.trim().replace(/\$\{([^}]*)\}/g,function($1,$2){  								
  			return '"+('+contextToAlias($2)+')+"';
		})+'");\t';
	}
	return "";
}

function tagCustomToStr(comp){

	//provendo um key caso nao exista, mas nao eh funcional em caso de foreach
	var static_key = '"tmp_key_inst_custom_comp'+nextUID()+'"';
	if(comp.attribs && comp.attribs["key:id"]){
		static_key =  '"'+encodeAndSetContext(comp.attribs["key:id"])+'"';
		delete comp.attribs["key:id"];
	}
	//comp.attribs["is"] = "compose-view";

	var namespace = "";
	var tagname = "";
	var tagname_underscore = "";
	var tagname_with_namespace = "";
	var tagname_constructor = "";
	var name = comp.name;

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


	var separate_attrs = separateAttribs(comp.attribs);
   	separate_attrs.static.is = comp.name;
	//var _tmp_host_vars_ = objDinamicAttrToStr(separate_attrs.dinamic);
	var  _tmp_host_vars_ = attrToContext(separate_attrs.dinamic);
	var _tmp_static_vars = JSON.stringify(separate_attrs.static);
	
	//console.log('aqui----->',separate_attrs.dinamic)

	basicTag = '\t(function(){ var _$_inst_$_ = _libfjs_mod_.default.build({"classFactory":'+tagname_constructor+',"tag":"div","alias":"'+name+'","target":"","hostVars":'+_tmp_host_vars_+',"staticVars":'+_tmp_static_vars+'});';
	basicTag += '\t_$_inst_$_.content(function(){';

	if(comp.children){
		comp.children.forEach(sub_comp => basicTag += '\t'+componentToStr(sub_comp));
	}

	basicTag += '\t});';	    	
	basicTag += '\t_libfjs_mod_.default.reDraw.call(_$_inst_$_);';
	basicTag += '\t})();';

	return basicTag;
}

function tagComposeToStr(comp){
	var attrview = "view:from";

	if(!comp.attribs[attrview]){
		return "";
	}
	//provendo um key caso nao exista, mas nao eh funcional em caso de foreach
	var static_key = '"tmp_key_inst_compose_view'+nextUID()+'"';
	if(comp.attribs && comp.attribs["key:id"]){
		static_key =  '"'+encodeAndSetContext(comp.attribs["key:id"])+'"';
		delete comp.attribs["key:id"];
	}

	comp.attribs["is"] = "compose-view";

	var separateAttrsElement = separateAttribs(comp.attribs);

	var tmp_view = 	(separateAttrsElement.static[attrview]?separateAttrsElement.static[attrview]:encodeAndSetContext(separateAttrsElement.dinamic[attrview]));		    	
	
	delete separateAttrsElement.static[attrview];
	delete separateAttrsElement.dinamic[attrview];

	var mod_tmp_static_attr_str = JSON.stringify(separateAttrsElement.static);
	var mod_tmp_static_attr_str_array_flat = objStaticAttrToStr(separateAttrsElement.static);
	
	//var mod_tmp_static_attr_str=objStaticAttrToStr(separateAttrsElement.static);
	
	var mod_tmp_attr_str = objDinamicAttrToStr(separateAttrsElement.dinamic);
	//var mod_tmp_attr_str = attrToContext(separate_attrs.dinamic);
	
	

	var basicTag = '\t_idom.elementOpen("compose-view",'+static_key+','+mod_tmp_static_attr_str_array_flat+','+mod_tmp_attr_str+');';
	basicTag += '\t_idom.elementClose("compose-view");'
	
	basicTag += '\t_libfjs_mod_.default.compose("'+tmp_view+'",'+static_key+','+attrToContext(separateAttrsElement.dinamic)+','+mod_tmp_static_attr_str+',function(){';


	if(comp.children){
		comp.children.forEach(sub_comp => basicTag += '\t'+componentToStr(sub_comp));
	}

	basicTag += '\t});';



	return basicTag;
}

function tagBasicToStr(comp){
	var static_key = 'null';
	if(comp.attribs && comp.attribs["key:id"]){
		static_key =  '"'+encodeAndSetContext(comp.attribs["key:id"])+'"';
		delete comp.attribs["key:id"];
	}

	var separateAttrsElement = separateAttribs(comp.attribs)


	var mod_tmp_static_attr_str=objStaticAttrToStr(separateAttrsElement.static);
	var mod_tmp_attr_str = objDinamicAttrToStr(separateAttrsElement.dinamic,comp.name);
	
	var basicTag = '\t_idom.elementOpen("'+comp.name+'",'+static_key+','+mod_tmp_static_attr_str+','+mod_tmp_attr_str+');';
	if(comp.children){
		comp.children.forEach(sub_comp => basicTag += '\t'+componentToStr(sub_comp));
	}
	basicTag += '\t_idom.elementClose("'+comp.name+'");'
	return basicTag;
}

function tagTemplateToStr(comp){

	var viewModel = "";
	var stylesStr = "";
	var templatePre = "";
	var tmp_mod_name = "_mod_$_"+nextUID();
	var requiresComp = [];
	
	if(comp.attribs && comp.attribs["no-view-model"]){
		viewModel = "";
	}else if(comp.attribs && comp.attribs["view-model"]){
		viewModel = comp.attribs["view-model"];

		requiresComp.push({type: 'controller', path: viewModel, alias: pathToAlias(viewModel).url});
	}

	var _tmp_constructor_no_view_ = '"_tmp_constructor_no_view_'+tmp_mod_name+'"';

	var firstElementArray = comp
						   .children
						   .filter(sub_comp => sub_comp.type=='tag' && ['require','style','script','command'].indexOf(sub_comp.name) < 0)
						   //.filter(sub_comp => sub_comp.type=='tag' && ['require','style','script','command'].indexOf(sub_comp.name) < -1 )

 	var	firstElementAttrs = {name:'div'};

    if(firstElementArray.length){

    	var separateAttrsFirstElement = separateAttribs(firstElementArray[0].attribs)
      
         var flat_static_array = [];
    	for(key in separateAttrsFirstElement.static){
    		//console.log(`aqui oooo::: ${key}`)
    		flat_static_array.push(key,separateAttrsFirstElement.static[key])
    	} 
    	//console.log('its ok');	

      	firstElementAttrs = {
			name:firstElementArray[0].name
			//,key:static_key
			//,static: separateAttrsFirstElement.static.map((item)=>re) 
			,static:flat_static_array 
			// ,static:objStaticAttrToStr(separateAttrsFirstElement.static)
			,dinamic:objDinamicAttrToStr(separateAttrsFirstElement.dinamic,firstElementArray[0].name)
		};

    }else{
    	console.warn('warn: you need a root element into a "template" element!')
    }						   

    //console.log(firstElementAttrs);

	comp
		.children
		.filter(sub_comp => sub_comp.type=='tag' && sub_comp.name == 'require' && sub_comp.attribs["from"])
		.forEach(sub_comp => requiresComp.push(resolveTagRequire(sub_comp)));

	//console.log(requiresComp);

	var modAlias = requiresComp
		.filter(item=>item.type!="style")
		.sort(item=>item.type=="style")
		.map(req_comp=> req_comp.alias);

	var requiresPath = requiresComp
		.sort(item=>item.type=="style")
		.map(req_comp=> '"'+req_comp.path+'"');

	templatePre += 'define(["exports","incremental-dom","ferrugemjs"';
	/*
	if(viewModel){
		templatePre += ',"'+viewModel+'"';
	}	
	*/
	if(requiresPath.length){
		templatePre += ',';
	}

	templatePre += 	
		requiresPath.join();		

	templatePre += '], function (exports,_idom,_libfjs_mod_';

	if(modAlias.length){
		templatePre += ',';
	}

	templatePre += modAlias.join();

	templatePre += '){';

	if(viewModel){
		templatePre += '\n var _'+tmp_mod_name+'_tmp = Object.keys('+tmp_mod_name+')[0];';
	}else{
		templatePre +='\n var _'+tmp_mod_name+'_tmp = '+_tmp_constructor_no_view_+';';
	}

		
	


	comp
		.children
		.filter(sub_comp => sub_comp.type=='style' && sub_comp.name == 'style')
		.forEach(sub_comp => stylesStr += '\t'+tagStyleToStr(sub_comp));

	templatePre +=  stylesStr+'\t';

	
/*

	comp.children.filter( sub_comp => sub_comp.type=='tag' && ['require','style','script'].indexOf(sub_comp.name) > -1 )[0].children.forEach(sub_comp => childrenstr += '\t\t'+componentToStr(sub_comp));

*/
	
	var subClazzName = '\t_clazz_sub_'+nextUID()+'_tmp';
	templatePre += '\texports.default = (function(super_clazz){';
	templatePre += '\tfunction '+subClazzName+'(){';
	templatePre += '\tsuper_clazz.call(this);';
	templatePre += '\t}';
	templatePre += '\t'+subClazzName+'.prototype = Object.create(super_clazz.prototype);';
	templatePre += '\t'+subClazzName+'.prototype.constructor = '+subClazzName+';';

	templatePre += '\t'+subClazzName+'.prototype._$attrs$_ = '+JSON.stringify(firstElementAttrs)+';';

	templatePre += '\t'+subClazzName+'.prototype.render = ';
	
	var childrenstr = '';
	childrenstr += '\tfunction('+context_alias+'){';




	comp.children.filter( sub_comp => sub_comp.type=='tag' && ['require','style','script'].indexOf(sub_comp.name) == -1 )[0].children.forEach(sub_comp => childrenstr += '\t'+componentToStr(sub_comp));


	childrenstr += '\t}';
	
	templatePre += childrenstr;
	
	templatePre += '\treturn '+subClazzName+';';
	
	
	if(viewModel){
		//templatePre += ' })('+tmp_mod_name+'[_'+tmp_mod_name+'_tmp]);';
		templatePre += '\t})(function(){});';
	}else{
		templatePre += '\t})(function(){});';
	}		
	
	templatePre += '\t});';
	
	/*
	console.log(
		modules_to_import
		,modules_alias_to_import
		,modules_css_to_import
	)
	*/
	
	return templatePre;
	//return childrenstr;
}

function tagStyleToStr(comp){
	//console.log(comp);
	var text = comp.children && comp.children[0] && comp.children[0].data;
	if(text && text.trim()){
		var styletxt = "";
		styletxt += "\tvar tmp_style = document.createElement('style');";
		styletxt += "\ttmp_style.type = 'text/css';";
		styletxt += "\ttmp_style.innerHTML = '"+text.replace(/'/g,'"').replace(/\n/g,'')+"';";
		styletxt += "\tdocument.getElementsByTagName('head')[0].appendChild(tmp_style);";
		return styletxt;
	}
	return "";
}
function resolveTagRequire(comp){	
	var fromstr = comp.attribs["from"];	
	//suporte aos plugins mais conhecidos
	if(fromstr.lastIndexOf(".css!") > -1 || fromstr.indexOf("css!") == 0 || fromstr.indexOf("style!") == 0){
		return {
			type:"style"
			,path:fromstr
			,alias:""
		};
	}

	var tagobject = pathToAlias(fromstr);

	if(comp.attribs.type && comp.attribs.type=="script"){			
		return {
			type:comp.attribs.type
			,path:tagobject.url
			,alias:tagobject.alias.replace(/-/g,"_")	
		}			    		
	}
	if(comp.attribs.type && comp.attribs.type=="namespace"){			
		return {
			type:comp.attribs.type
			,path:tagobject.url
			,alias:"_"+tagobject.alias.replace(/-/g,"_")	
		}					    		
	}
											
	return {
		type:'template'
		,path:tagobject.url+'.html'
		,alias:"_"+tagobject.alias.replace(/-/g,"_")	
	}		
	
		
}

function ifConditionExtractor(comp){	
	var ifcomp = {
		type:"tag"
		,name:"if"
		,attribs:{condition:comp.attribs["if"]}
	};
	delete comp.attribs["if"];
	ifcomp.children=[comp];	
	return componentToStr(ifcomp);
}

function forConditionExtractor(comp){	
	//console.log(comp);
	var forcomp = {
		type:"tag"
		,name:"for"
		,attribs:{"each":comp.attribs["each"],"dinamic":true}
	};
	delete comp.attribs["each"];
	forcomp.children=[comp];	
	return componentToStr(forcomp);
}

function componentToStr(comp){
	if(comp.name=='template'){		
		return tagTemplateToStr(comp);
	}
	//eliminando os textos vazios
	if(comp.type=='text'){
		return tagTextToStr(comp);
	}
	//tratando os ifs embutidos
	if(comp.attribs && comp.attribs["if"]){
		return ifConditionExtractor(comp);
	}
	//precisa esta aqui para evitar deadlock
	if(comp.name=='for'){
		return tagForToStr(comp);
	}

	if(comp.attribs && comp.attribs["each"]){
		return forConditionExtractor(comp);
	}

	if(comp.name=='if'){
		return tagIfToStr(comp);
	}

	if(comp.name=='compose'){		
		return tagComposeToStr(comp);
	}

	if([':','-'].indexOf(comp.name) > -1){
		return tagCustomToStr(comp);
	}	

	return tagBasicToStr(comp);
}






module.exports = function(rawHtml,config){
	flush();
	var finalBuffer = "";
	var handler = new htmlparser.DomHandler(function (error, dom) {
	    if (error){
	     	console.log(error)   
	    }else{
			dom.forEach(root_comp => appendBuffer(componentToStr(root_comp)));
			finalBuffer = buffer.join('');
		}
	});
	var parser = new htmlparser.Parser(handler,{decodeEntities: true,recognizeSelfClosing:true});
	parser.write(rawHtml.replace(/[\n\t\r]/g," "));
	parser.done();

	if(config && config.formatCode){
		finalBuffer = beautify(finalBuffer, { indent_size: 4 });
	}
	//liberando a memoria
	flush();
	return finalBuffer;

}