const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {test} = require('node:test');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g,'\n');
const start = source.indexOf('<script>\n/* ================= SVG 戦術ボード部品');
const main = source.slice(start + 8, source.indexOf('</script>', start));
function stubNode(){
  const fn=()=>proxy;
  const proxy=new Proxy(fn,{get(_,key){
    if(typeof key==='symbol')return key===Symbol.toPrimitive?()=> '':undefined;
    if(key==='then')return undefined;
    if(key==='length')return 0;
    if(key==='toString'||key==='valueOf')return ()=>'';
    if(key==='matches')return false;
    return proxy;
  },set(){return true;},apply(){return proxy;}});
  return proxy;
}
const stub=stubNode();
const context=vm.createContext({window:stub,document:stub,navigator:stub,localStorage:stub,history:stub,
  location:{hash:'',pathname:'/',search:''},matchMedia:()=>({matches:false}),setTimeout:()=>0,
  clearTimeout(){},requestAnimationFrame:()=>0,prompt:()=>'',alert(){},console,gtag(){},dataLayer:[],
  encodeURIComponent,decodeURIComponent,URLSearchParams});
vm.runInContext(main,context,{timeout:3000});
const api=vm.runInContext('({TERMS,matchingTerms,shortTermName})',context);
const find=q=>Array.from(api.matchingTerms(q),t=>t.id);
const jsonld=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));

test('Japanese question and soccer qualifier resolve to the intended term',()=>{
  for(const query of ['ワンツーとは','サッカー ワンツーとは','サッカーワンツーの意味','壁パス'])assert.equal(find(query)[0],'wallpass');
});
test('width, case, kana and multiple search words are supported',()=>{
  for(const query of ['ｘＧ','Ｘｇ','xG meaning'])assert.equal(find(query)[0],'xg');
  assert.equal(find('ﾊｲﾌﾟﾚｽ')[0],'press');
  assert.equal(find('わんつー 壁パス')[0],'wallpass');
});
test('a matching name wins over a mention inside another definition',()=>{
  assert.equal(find('ハイプレス')[0],'press');
  assert.equal(find('what is one two?')[0],'wallpass');
});
test('unmatched user input stays unmatched and term labels never become empty',()=>{
  assert.equal(find('<script>alert(1)</script>').length,0);
  assert.equal(api.shortTermName(api.TERMS.find(t=>t.id==='arrow')),'攻守の矢印');
  assert.equal(api.TERMS.length,118);
  for(const term of api.TERMS)assert.ok(api.shortTermName(term).trim());
});
test('all generated term pages preserve canonical/hreflang, readable definitions and same-origin search',()=>{
  for(const lang of ['ja','en'])for(const term of api.TERMS){
    const relative=(lang==='ja'?'terms/':'en/terms/')+term.id+'/index.html';
    const html=fs.readFileSync(path.join(root,relative),'utf8');
    const url='https://pitch.kokokikaku.com/'+relative.replace('index.html','');
    assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),relative);
    assert.ok(html.includes('hreflang="ja"')&&html.includes('hreflang="en"'),relative);
    assert.ok(html.includes("form-action 'self'"),relative);
    assert.ok(/<form class="tsearch" action="\/" method="get"/.test(html),relative);
    assert.ok(!/<title>とは/.test(html),relative);
    const objects=jsonld(html),defined=objects.find(o=>o['@type']==='DefinedTerm');
    assert.ok(defined.name&&defined.description&&defined.url===url,relative);
    assert.ok(html.includes('<p class="tlead">'),relative);
    const before=execFileSync('git',['show','origin/main:'+relative],{cwd:root,encoding:'utf8'});
    const oldDate=jsonld(before).find(o=>o['@type']==='Article').dateModified;
    const newDate=objects.find(o=>o['@type']==='Article').dateModified;
    if(lang==='ja'&&['arrow','wallpass'].includes(term.id))assert.equal(newDate,'2026-11-11');
    else assert.equal(newDate,oldDate,'unrelated content date changed: '+relative);
  }
});
test('home FAQ structured answers are also visible, and introductory links exist without JS',()=>{
  const body=source.slice(source.indexOf('<body'));
  for(const q of jsonld(source).find(o=>o['@type']==='FAQPage').mainEntity){
    assert.ok(body.includes(q.name),q.name);
    assert.ok(q.acceptedAnswer.text.trim());
  }
  assert.ok(source.includes('aria-label="サッカー用語を検索"'));
  for(const id of ['offside','press','buildup','negatrans','xg','wallpass'])assert.ok(source.match(/<nav class="watchterms"[\s\S]*?<\/nav>/)[0].includes('/terms/'+id+'/'));
  assert.ok(body.includes('まだ保存されていないページは通信が必要'));
});
test('sitemap keeps all 241 canonical pages and does not invent a new privacy update date',()=>{
  const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  assert.equal([...sitemap.matchAll(/<url>/g)].length,241);
  const old=execFileSync('git',['show','origin/main:sitemap.xml'],{cwd:root,encoding:'utf8'});
  const privacy=xml=>xml.match(/<loc>https:\/\/pitch.kokokikaku.com\/privacy.html<\/loc><lastmod>([^<]+)/)[1];
  assert.equal(privacy(sitemap),privacy(old));
});
