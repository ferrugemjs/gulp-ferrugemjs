var fjsparse = require("../parse/parse");


//<template view-model="ops">
//<template no-view-model="true">
var rawHtml 
= 
`<template no-view-model="true">
	<require from="tpl-a"></require>
	<require from="./test/tpl-b"></require>
	<require from="./test/tpl-c as tpl-c1"></require>
	<require from="./test/style-a.css!"></require>
	<require from="css!./test/style-b.css"></require>
	<require from="style!./test/style-c.css"></require>
	<script></script>
	<style>
		.test{
			color:pink;
			font-size:14px;
			background-color:#fa404a
		}
	</style>
	<div 
		class="sein viu my frient" 
		title="okboy" 
		alt="\${this.test}" 
		click.trigger="this.test" 
	>
		<custom-tag 
		myattr1="this.ops"
		myattr2="\${this.title}"
		on-first-loader.once="this.test"
		></custom-tag>
		<label if="1==2">texto condicional</label>
		<span
		    key:id="abracadabra"
		    id="gread1"
			alt="ops"
			title="lololo"
			tooltip="\${this.title}"
			click.trigger="this.test" 
		>Test with common dom element</span>
		<span key:id="hummm">
		 <p key:id="\${this.test}"></p>
		</span>
		<compose 
			view:from="./newview/statck-plz"
		></compose>
		<compose
			quenada="\${this.opse}" 
			id="dinamiccompose1" 
			other-dinamic="\${this.title}"
			view:from="\${this.myview}"
		>
		</compose>
		<ul>
		<li each="item in this.itens">epa</li>
		</ul>
		<hhh:test-t1 key-ops="humm" id:key="123"/>
		<ui-template>
			<ui-test>Um lixo</ui-test>
		</ui-template>
		<input class="simple" type="text" placeholder="...new name" keyup.bind="this.name"></input>
		<content></content>
		<register-for
			on-close
			on-open.subscribe
			on-start.once
			on-digit:args="bonb-sign"
		>
			$(".super-modal").dialogmodal();
			$("#especial-picker").datapicker();
		</register-for>
	</div>
</template>`;

console.log(

fjsparse(rawHtml,{formatCode:true})

)
