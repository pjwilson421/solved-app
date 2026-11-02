const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const mem=new Map();
class Logic { setState(patch,cb){const p=typeof patch==='function'?patch(this.state):patch;if(p)this.state={...this.state,...p};cb?.();} }
const idb={open(){return {}}};
const context={console,DCLogic:Logic,React:{createRef:()=>({current:null})},localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)},sessionStorage:{removeItem(){},getItem(){return null}},indexedDB:idb,window:{scrollTo(){},__solved:{current:'legacy',registry:()=>[{id:'legacy',created:0}],get:k=>mem.get(k)||null,set:(k,v)=>mem.set(k,v)},location:{},SOLVED_HF:{get:()=>({ready:true,live:false}),connected:()=>false}},document:{},Image:class{},URL,Date,Math,JSON,Object,Array,Map,Set,Promise,setTimeout:()=>{},clearInterval(){},FileReader:class{},Blob};
vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../studio/index.html'),'utf8').match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]+'\n globalThis.TestComponent=Component;',context);
const app=new context.TestComponent();
app.state={...app.state,gallery:[],videos:[],uploads:[],edits:[],deliveries:[],timeline:[],pLoaded:true,sLoaded:true,covers:{}};
const pages=['BRIEF','IMAGES','TALENT','PRODUCT','LOCATION','WARDROBE','SETDESIGN','KEYFRAMES','VIDEOS','EDITING','DELIVERY','LIBRARY'];
for(const page of pages){app.state.page=page;let v=app.renderVals();assert(v.screenTitle,`title: ${page}`);assert.equal(v.nav.length,4);console.log('PASS render data:',page);}
app.state.page='IMAGES';let v=app.renderVals();assert.equal(v.x.galEmpty,true);assert.equal(v.x.hasActive,false);assert.equal(v.x.refSummary.length,3);assert.equal(v.x.imageTabs.length,6);
v.nav.find(n=>n.label==='Videos').pick();assert.equal(app.state.page,'VIDEOS');v=app.renderVals();v.nav.find(n=>n.label==='Images').pick();assert.equal(app.state.page,'IMAGES');
app.state.gallery=[{uid:'one',status:'done',src:'data:image/png;base64,A',prompt:'First shot',aspect:'16:9'},{uid:'two',status:'done',src:'data:image/png;base64,B',prompt:'Second shot',aspect:'1:1'}];
v=app.renderVals();assert.equal(v.x.active.uid,'one');v.x.gal[1].select();v=app.renderVals();assert.equal(v.x.active.uid,'two');v.x.active.variations();assert.equal(app.state.prompt,'Second shot');assert.equal(app.state.castAtt[0],'data:image/png;base64,B');
v.x.active.edit();assert.equal(app.state.page,'EDITING');assert.equal(app.state.ed.src,'data:image/png;base64,B');
app.state.page='IMAGES';app.state.canvasImage='deleted';v=app.renderVals();assert.equal(v.x.active.uid,'one');
v.x.toggleReferences();assert.equal(app.state.referencesOpen,true);v=app.renderVals();assert.equal(v.x.referencesOpen,true);
v.quickImageOptions[1].change({target:{value:'4k'}});assert.equal(app.tcfg('IMAGES:main').resolution,'4k');
v=app.renderVals();v.hfOpen();assert.equal(app.state.hfShow,true);v=app.renderVals();v.hfClose();assert.equal(app.state.hfShow,false);
console.log('PASS selected canvas, variations, edit, deleted selection fallback, reference drawer, quick settings, connection settings');
app.state.page='IMAGES';app.state.store.TALENT=[{uid:'char',name:'Character',main:'portrait',sheet:{front:'front',left:'left'},fields:{},versions:[],refs:[],events:[],usage:[],gens:[],variations:[]}];
app.state.kfPick={'c:char:sheet':true};assert(app.kfRefs().srcs.includes('front'));v=app.renderVals();assert.equal(v.x.refSummary[0].info,'1 selected');
app.state.gallery=[{uid:'run',status:'running',prompt:'Working',aspect:'16:9'}];v=app.renderVals();assert.equal(v.x.active.running,true);
app.state.gallery=[{uid:'fail',status:'failed',prompt:'Oops',error:'Test error',aspect:'16:9'}];v=app.renderVals();assert.equal(v.x.active.failed,true);assert.equal(v.x.active.err,'Test error');
console.log('PASS sheet reference resolution and generation status states');
