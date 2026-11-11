/* Pitch Dictionary: first useful interaction, using the real glossary and boards. */
(function(){
  'use strict';
  const panel=document.getElementById('heroDemo');
  if(!panel||typeof TERMS==='undefined'||typeof VIZ==='undefined')return;
  const mount=document.getElementById('heroSearchMount'),search=document.querySelector('header .search');
  if(mount&&search)mount.appendChild(search);
  const header=document.querySelector('.hbar');
  if(header){
    const back=document.createElement('a');back.href='#q';back.className='header-search-link';back.id='backToSearch';header.appendChild(back);
    back.addEventListener('click',()=>{const input=document.getElementById('q');if(input)input.focus({preventScroll:false});});
  }
  let selected='press',paused=false,visible=true;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  paused=reduce.matches;
  const motion=document.getElementById('heroMotion');
  const english=()=>typeof lang!=='undefined'&&lang==='en';
  function updateMotion(){
    const stopped=paused||reduce.matches||document.hidden;
    document.documentElement.dataset.motion=stopped?'paused':'playing';
    panel.dataset.paused=String(stopped||!visible);
    motion.disabled=reduce.matches;
    motion.setAttribute('aria-pressed',String(stopped));
    motion.textContent=reduce.matches?(english()?'Motion reduced':'静止表示中'):(paused?(english()?'Play motion':'動きを再生'):(english()?'Pause motion':'動きを止める'));
  }
  function selectTerm(id){
    const term=TERMS.find(t=>t.id===id);if(!term||!VIZ[term.viz])return;
    selected=id;
    document.getElementById('heroViz').innerHTML=trViz(VIZ[term.viz]());
    document.getElementById('heroTerm').textContent=english()?term.en:shortTermName(term);
    document.getElementById('heroMeaning').textContent=english()?TR_EN[id].one:term.one;
    const more=document.getElementById('heroMore');more.href=(english()?'/en/terms/':'/terms/')+id+'/';more.textContent=english()?'Read the explanation →':'この用語を詳しく →';
    document.getElementById('heroExpand').setAttribute('aria-label',(english()?term.en:shortTermName(term))+(english()?' diagram: open larger':'の図解を大きく見る'));
    document.getElementById('heroDemoLabel').textContent=english()?'Try an animated explanation.':'動く図解を、試してみよう。';
    document.querySelectorAll('[data-hero-term]').forEach(button=>{
      const t=TERMS.find(t=>t.id===button.dataset.heroTerm);button.setAttribute('aria-pressed',String(t.id===selected));button.textContent=english()?t.en:shortTermName(t);
    });
    const back=document.getElementById('backToSearch');if(back)back.textContent=english()?'Find a term':'用語を探す';
    const all=document.querySelector('.all-terms-link');if(all){all.textContent=english()?'Browse all 118 terms →':'全118語の一覧を見る →';all.href=english()?'/en/terms/':'/terms/';}
    updateMotion();
  }
  panel.querySelectorAll('[data-hero-term]').forEach(button=>button.addEventListener('click',()=>selectTerm(button.dataset.heroTerm)));
  document.getElementById('heroExpand').addEventListener('click',()=>openModal(selected));
  motion.addEventListener('click',()=>{paused=!paused;updateMotion();});
  document.getElementById('langtog').addEventListener('click',()=>selectTerm(selected));
  document.addEventListener('visibilitychange',updateMotion);
  if(reduce.addEventListener)reduce.addEventListener('change',()=>{paused=reduce.matches;updateMotion();});
  if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;updateMotion();},{threshold:0.05}).observe(panel);
  selectTerm(selected);
})();
