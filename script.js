
const API='https://api.github.com',$=id=>document.getElementById(id);
const NAME=/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,PAGE=30;
const LC={TypeScript:'#4f8ff7',JavaScript:'#f5cf47',Python:'#3ecf9a',HTML:'#f0663c',CSS:'#a98bfa',Go:'#2dd4e6',Rust:'#f59a5c',Shell:'#9aa8b8',Java:'#e8845f',C:'#8a95a5','C++':'#6f9fd8','C#':'#5fb36a',Ruby:'#e0556b',PHP:'#8f8fd0',Swift:'#f2784b',Kotlin:'#b48af0',Dart:'#46c2d9',Vue:'#42b883',Lua:'#5b7cd6',Other:'#7b857e'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n>=1e6?(n/1e6).toFixed(1).replace('.0','')+'M':n>=1e3?(n/1e3).toFixed(1).replace('.0','')+'k':''+n;
const hue=s=>{let h=7;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h};
const date=d=>new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const ago=iso=>{const m=Math.max(0,(Date.now()-Date.parse(iso))/6e4);if(m<2)return'just now';if(m<60)return Math.round(m)+'m ago';const h=m/60;if(h<24)return Math.round(h)+'h ago';const d=h/24;if(d<30)return Math.round(d)+'d ago';if(d<365)return Math.round(d/30)+'mo ago';return Math.round(d/365)+'y ago'};
const P=d=>`<svg class="ic" viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
const I={
star:P('<path d="M8 1.8l1.9 4 4.4.5-3.2 3 .9 4.3L8 11.4l-4 2.2.9-4.3-3.2-3 4.4-.5L8 1.8z"/>'),
fork:P('<circle cx="4" cy="3.5" r="1.6"/><circle cx="12" cy="3.5" r="1.6"/><circle cx="8" cy="12.5" r="1.6"/><path d="M4 5.1V8a3 3 0 0 0 3 3M12 5.1V8a3 3 0 0 1-3 3"/>'),
issue:P('<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/>'),
clock:P('<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>'),
repo:P('<path d="M4 1.8h6.5L13 4.3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V1.8a1 1 0 0 1 1-1zM6 8h4M6 10.5h4"/>'),
dots:P('<circle cx="3.5" cy="8" r=".6" fill="currentColor"/><circle cx="8" cy="8" r=".6" fill="currentColor"/><circle cx="12.5" cy="8" r=".6" fill="currentColor"/>'),
pulse:P('<path d="M1.5 8.5h3l2-5 3 9 2-4h3"/>'),
warn:P('<circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11v.1"/>'),
push:P('<circle cx="4" cy="3.5" r="1.6"/><circle cx="4" cy="12.5" r="1.6"/><circle cx="12" cy="8" r="1.6"/><path d="M4 5.1v5.8M5.6 8h4.8"/>'),
plus:P('<path d="M8 3v10M3 8h10"/>'),
pr:P('<circle cx="4" cy="3.5" r="1.6"/><circle cx="4" cy="12.5" r="1.6"/><circle cx="12" cy="12.5" r="1.6"/><path d="M4 5.1v5.8M12 10.9V7a2.5 2.5 0 0 0-2.5-2.5H8"/>')};

/* Landing grid: lit squares spell SMART */
(function(){
  const F={S:['01111','10000','10000','01110','00001','00001','11110'],M:['10001','11011','10101','10101','10001','10001','10001'],A:['01110','10001','10001','11111','10001','10001','10001'],R:['11110','10001','10001','11110','10100','10010','10001'],T:['11111','00100','00100','00100','00100','00100','00100']};
  const cols=[];let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const blank=()=>Array(7).fill(0);
  cols.push(blank(),blank());
  [...'SMART'].forEach((ch,i)=>{if(i)cols.push(blank());for(let x=0;x<5;x++)cols.push(F[ch].map(r=>r[x]==='1'?2:0))});
  cols.push(blank(),blank());
  $('cells').innerHTML=cols.map((col,x)=>col.map(v=>{
    if(v)return`<i class="on" style="--c:${x}"></i>`;
    const r=rnd();return`<i class="${r<.12?'l2':r<.3?'l1':''}"></i>`}).join('')).join('');
})();

const S={user:'',profile:null,repos:[],events:[],cur:'all',q:'',shown:PAGE};
const cache=new Map();
let token=0,ctrl=null,lastName='',mb=null,tt;

function show(v){['landing','load','err','app'].forEach(k=>{$(k).hidden=k!==v});$('me').hidden=v!=='app'}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2400)}

async function gh(path,sig){
  const r=await fetch(API+path,{signal:sig,headers:{Accept:'application/vnd.github+json'}});
  const rem=r.headers.get('x-ratelimit-remaining'),lim=r.headers.get('x-ratelimit-limit');
  if(rem!==null){$('api').hidden=false;$('api').textContent=`API ${rem}/${lim||60}`}
  if(r.status===404)throw{code:404};
  if(r.status===429||(r.status===403&&rem==='0')){const t=r.headers.get('x-ratelimit-reset');throw{code:'rate',reset:t?new Date(t*1000):null}}
  if(!r.ok)throw{code:r.status};
  return r.json();
}

async function loadUser(name){
  const my=++token;
  if(ctrl)ctrl.abort();
  ctrl=new AbortController();lastName=name;
  show('load');$('ltxt').textContent=`Loading @${name}…`;
  try{
    let d=cache.get(name.toLowerCase());
    if(!d){
      const[profile,first,events]=await Promise.all([
        gh(`/users/${name}`,ctrl.signal),
        gh(`/users/${name}/repos?per_page=100&sort=pushed`,ctrl.signal),
        gh(`/users/${name}/events/public?per_page=100`,ctrl.signal).catch(e=>{if(e&&e.name==='AbortError')throw e;return[]})
      ]);
      let repos=first;
      for(let p=2;p<=3&&repos.length===(p-1)*100;p++)repos=repos.concat(await gh(`/users/${name}/repos?per_page=100&sort=pushed&page=${p}`,ctrl.signal));
      d={profile,repos,events};cache.set(name.toLowerCase(),d);
    }
    if(my!==token)return;
    Object.assign(S,{user:d.profile.login,profile:d.profile,repos:d.repos,events:d.events,cur:'all',q:'',shown:PAGE});
    $('q').value='';$('sort').value='updated';
    renderAll();show('app');window.scrollTo(0,0);
    document.title=`@${d.profile.login} · GitSmart`;
  }catch(e){
    if(my!==token||(e&&e.name==='AbortError'))return;
    let t='Couldn’t reach GitHub',m='Check your connection and try again.';
    if(e&&e.code===404){t='User not found';m=`There is no GitHub account named “@${name}”. Check the spelling and try again.`}
    else if(e&&e.code==='rate'){t='GitHub rate limit reached';m='GitHub allows 60 requests per hour without sign-in.'+(e.reset?` Try again after ${e.reset.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}.`:'')}
    else if(e&&typeof e.code==='number'){t='GitHub error';m=`GitHub returned status ${e.code}. Try again in a moment.`}
    $('et').textContent=t;$('em').textContent=m;document.title='GitSmart';
    show('err');$('et').focus();
  }
}

function go(name){const h='#/u/'+encodeURIComponent(name);if(location.hash===h)loadUser(name);else location.hash=h}
function parse(v){v=v.trim().replace(/^@/,'').replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i,'').split(/[/?#]/)[0];return NAME.test(v)?v:null}
function route(){
  const m=location.hash.match(/^#\/u\/([^/]+)$/);
  if(m){let n='';try{n=decodeURIComponent(m[1])}catch(e){}
    if(NAME.test(n))return loadUser(n);
    $('hint').textContent='That is not a valid GitHub username.'}
  token++;if(ctrl)ctrl.abort();
  document.title='GitSmart · Explore any GitHub profile';
  show('landing');
  if(matchMedia('(pointer:fine)').matches)$('hq').focus();
}

$('hform').addEventListener('submit',e=>{e.preventDefault();const v=$('hq').value,n=parse(v);
  if(!n){$('hint').textContent=v.trim()?'Enter a valid GitHub username.':'Enter a GitHub username to continue.';$('hq').focus();return}
  $('hint').textContent='';$('hq').value='';go(n)});
$('gform').addEventListener('submit',e=>{e.preventDefault();const n=parse($('gq').value);
  if(!n){toast('Enter a valid username');return}
  $('gq').value='';$('gq').blur();go(n)});
$('retry').addEventListener('click',()=>loadUser(lastName));
$('nHome').addEventListener('click',()=>{location.hash='#/'});
$('nRepos').addEventListener('click',()=>$('list').scrollIntoView({behavior:'smooth',block:'start'}));
window.addEventListener('hashchange',route);

const pushed=r=>Date.parse(r.pushed_at||r.updated_at);
function health(r){
  if(r.archived)return['Archived','mu',I.clock];
  if((Date.now()-pushed(r))/864e5>180)return['Inactive','mu',I.clock];
  if(r.open_issues_count>15)return['Many open issues','bad',I.warn];
  if(r.open_issues_count>=8)return['Needs attention','wn',I.warn];
  return['Active','ok',I.pulse];
}
const FILTERS=[['all','All',()=>1,'Every public repository'],['sources','Sources',r=>!r.fork,'Repositories that are not forks'],['forks','Forks',r=>r.fork,'Forked repositories'],['issues','Open issues',r=>r.open_issues_count>0,'Repositories with open issues']];
const SORT={updated:(a,b)=>pushed(b)-pushed(a),stars:(a,b)=>b.stargazers_count-a.stargazers_count,forks:(a,b)=>b.forks_count-a.forks_count,issues:(a,b)=>b.open_issues_count-a.open_issues_count,name:(a,b)=>a.name.localeCompare(b.name)};

function evInfo(e){
  const rn=(e.repo&&e.repo.name)||'',sn=rn.split('/')[1]||rn,p=e.payload||{},cap=s=>s?s[0].toUpperCase()+s.slice(1):'';
  switch(e.type){
    case'PushEvent':return[I.push,215,`Pushed to ${(p.ref||'').replace('refs/heads/','')||'branch'} in ${sn}`];
    case'CreateEvent':return[I.plus,150,p.ref_type==='repository'?`Created ${sn}`:`Created ${p.ref_type} in ${sn}`];
    case'PullRequestEvent':return[I.pr,270,`${p.pull_request&&p.pull_request.merged?'Merged':cap(p.action)} PR in ${sn}`];
    case'IssuesEvent':return[I.issue,38,`${cap(p.action)} issue in ${sn}`];
    case'WatchEvent':return[I.star,48,`Starred ${rn}`];
    case'ForkEvent':return[I.fork,200,`Forked ${rn}`];
    default:return[I.repo,200,`${e.type.replace('Event','')} in ${sn}`];
  }
}

function renderAll(){
  const{profile:p,repos}=S;
  const stars=repos.reduce((a,r)=>a+r.stargazers_count,0),forks=repos.reduce((a,r)=>a+r.forks_count,0);
  const more=p.public_repos>repos.length?'+':'';
  $('proAv').innerHTML=`<img src="${esc(p.avatar_url)}" alt="" width="56" height="56">`;
  $('me').innerHTML=`<img src="${esc(p.avatar_url)}" alt="" width="32" height="32"><span>@${esc(p.login)}</span>`;
  $('me').href=p.html_url;
  $('hd').textContent='@'+p.login;
  $('rl').textContent=[p.name,p.location].filter(Boolean).join(' · ')||(p.type==='Organization'?'Organization':'GitHub user');
  $('bio').textContent=p.bio||'No bio provided.';
  $('pR').textContent=fmt(p.public_repos);$('pS').textContent=fmt(stars)+more;$('pF').textContent=fmt(forks)+more;$('pW').textContent=fmt(p.followers);
  $('hp').textContent=`Public repositories for @${p.login}`;
  $('kT').textContent=p.public_repos;
  const wk=repos.filter(r=>Date.now()-pushed(r)<7*864e5).length;
  $('kS').textContent=`${wk} pushed this week`;

  const lc={};repos.forEach(r=>{if(r.language)lc[r.language]=(lc[r.language]||0)+1});
  const ls=Object.entries(lc).sort((a,b)=>b[1]-a[1]),tot=ls.reduce((a,x)=>a+x[1],0);
  const top=ls.slice(0,5),rest=ls.slice(5).reduce((a,x)=>a+x[1],0);
  if(rest)top.push(['Other',rest]);
  const mx=Math.max(1,...top.map(x=>x[1]));
  $('lg').innerHTML=tot?top.map(([l,n])=>`<li style="--c:${LC[l]||LC.Other}"><span class="d"></span><span>${esc(l)}</span><em>${Math.round(n/tot*100)}%</em><div class="tr"><i style="width:${n/mx*100}%"></i></div></li>`).join(''):'<li class="none">No language data</li>';

  const ev=S.events.slice(0,5);
  $('act').innerHTML=ev.length?ev.map(e=>{const[ic,h,t]=evInfo(e);return`<li style="--h:${h}"><span class="b">${ic}</span><div>${esc(t)}<time datetime="${esc(e.created_at)}">${ago(e.created_at)}</time></div></li>`}).join(''):'<li class="none">No recent public activity</li>';

  $('pills').innerHTML=FILTERS.map(([k,l,f,t])=>`<button type="button" class="pill" data-k="${k}" aria-pressed="${k===S.cur}" title="${t}">${l}<sup>${repos.filter(f).length}</sup></button>`).join('');
  renderGrid();
  renderList();
}

function renderGrid(){
  const W=26,cnt={},key=d=>d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();
  S.events.forEach(e=>{const k=key(new Date(e.created_at));cnt[k]=(cnt[k]||0)+1});
  S.repos.forEach(r=>{const k=key(new Date(pushed(r)));cnt[k]=(cnt[k]||0)+1});
  const today=new Date();today.setHours(0,0,0,0);
  const start=new Date(today);start.setDate(start.getDate()-today.getDay()-(W-1)*7);
  let h='',act=0;
  for(let i=0;i<W*7;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    if(d>today){h+='<i class="fut"></i>';continue}
    const n=cnt[key(d)]||0;if(n)act++;
    const lv=n?n>=5?4:n>=3?3:n>=2?2:1:0;
    h+=`<i class="g${lv}" style="--c:${Math.floor(i/7)}" title="${n} ${n===1?'event':'events'} on ${esc(date(d))}"></i>`;
  }
  $('pcells').innerHTML=h;
  $('gsum').textContent=`${act} active ${act===1?'day':'days'} in the last 26 weeks`;
  $('pcells').setAttribute('aria-label',`Activity grid for @${S.user}: ${act} active days in the last 26 weeks`);
}

function row(r){
  const[hl,hc,hi]=health(r),h=hue(r.name),lang=r.language,tags=(r.topics||[]).slice(0,3);
  return`<article class="row" style="--h:${h}">
    <div class="bd">
      <div class="nm"><a href="${esc(r.html_url)}" target="_blank" rel="noopener">${esc(r.name)}</a><span class="vb">${r.archived?'Archived':r.fork?'Fork':'Public'}</span></div>
      <p class="ds">${esc(r.description||'No description provided.')}</p>
      <div class="tg">${lang?`<span class="tag" style="--c:${LC[lang]||LC.Other};--h:${hue(lang)}"><span class="d"></span>${esc(lang)}</span>`:''}${tags.map(t=>`<span class="tag" style="--h:${hue(t)}">${esc(t)}</span>`).join('')}</div>
    </div>
    <div class="mt">
      <span class="hb ${hc}">${hi}${hl}</span>
      <div class="st"><span title="Stars">${I.star}${fmt(r.stargazers_count)}</span><span title="Forks">${I.fork}${fmt(r.forks_count)}</span><span title="Open issues">${I.issue}${r.open_issues_count}</span></div>
      <span class="up">Pushed ${esc(date(pushed(r)))}</span>
    </div>
    <button class="mn" type="button" data-n="${esc(r.name)}" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ${esc(r.name)}">${I.dots}</button>
  </article>`;
}

function renderList(){
  closeMenu();
  const f=FILTERS.find(x=>x[0]===S.cur)[2],t=S.q.trim().toLowerCase();
  const rows=S.repos.filter(f).filter(r=>!t||[r.name,r.description,r.language,...(r.topics||[])].join(' ').toLowerCase().includes(t)).sort(SORT[$('sort').value]);
  const vis=rows.slice(0,S.shown);
  $('cnt').textContent=`Showing ${vis.length} of ${rows.length} ${rows.length===1?'repository':'repositories'}`;
  $('list').innerHTML=vis.length?vis.map(row).join(''):(S.repos.length?'<div class="empty"><p>No repositories match these filters.</p><button type="button" id="rs">Clear filters</button></div>':'<div class="empty"><p>This account has no public repositories.</p></div>');
  const left=rows.length-vis.length;
  $('more').hidden=left<=0;
  $('more').textContent=`Show ${Math.min(left,PAGE)} more (${left} remaining)`;
}
const reset=()=>{S.shown=PAGE;renderList()};
$('q').addEventListener('input',e=>{S.q=e.target.value;reset()});
$('sort').addEventListener('change',reset);
$('pills').addEventListener('click',e=>{const b=e.target.closest('.pill');if(!b)return;S.cur=b.dataset.k;document.querySelectorAll('.pill').forEach(p=>p.setAttribute('aria-pressed',p===b));reset()});
$('more').addEventListener('click',()=>{S.shown+=PAGE;renderList()});

const menu=$('menu');
function closeMenu(refocus){
  const b=mb;menu.hidden=true;
  if(mb){mb.setAttribute('aria-expanded','false');mb=null;if(refocus&&b.isConnected)b.focus()}
}
function copy(txt,msg){
  const ok=()=>toast(msg),bad=()=>toast('Copy failed');
  try{navigator.clipboard.writeText(txt).then(ok,bad)}catch(e){bad()}
  closeMenu(true);
}
document.addEventListener('click',e=>{
  const c=e.target.closest('[data-u]');
  if(c){go(c.dataset.u);return}
  if(e.target.id==='rs'){S.cur='all';S.q='';$('q').value='';document.querySelectorAll('.pill').forEach(p=>p.setAttribute('aria-pressed',p.dataset.k==='all'));reset();return}
  const m=e.target.closest('.mn');
  if(m){
    const open=mb===m;closeMenu();if(open)return;
    const r=S.repos.find(x=>x.name===m.dataset.n);if(!r)return;
    mb=m;m.setAttribute('aria-expanded','true');menu.dataset.n=r.name;
    menu.innerHTML=`<button role="menuitem" data-a="url">Copy clone URL</button><button role="menuitem" data-a="name">Copy repository name</button><button role="menuitem" data-a="gh">Open on GitHub</button>${r.homepage&&/^https?:\/\//i.test(r.homepage)?'<button role="menuitem" data-a="home">Open homepage</button>':''}`;
    menu.hidden=false;
    const b=m.getBoundingClientRect();
    menu.style.top=Math.max(8,Math.min(b.bottom+6,innerHeight-menu.offsetHeight-8))+'px';
    menu.style.left=Math.max(8,Math.min(b.right-menu.offsetWidth,innerWidth-menu.offsetWidth-8))+'px';
    menu.querySelector('button').focus();
    return;
  }
  const mi=e.target.closest('#menu button');
  if(mi){
    const r=S.repos.find(x=>x.name===menu.dataset.n),a=mi.dataset.a;
    if(!r)return closeMenu();
    if(a==='url')copy(r.clone_url,'Clone URL copied');
    else if(a==='name')copy(r.full_name,'Repository name copied');
    else{closeMenu(true);window.open(a==='home'?r.homepage:r.html_url,'_blank','noopener')}
    return;
  }
  if(!e.target.closest('#menu'))closeMenu();
});
window.addEventListener('resize',()=>closeMenu());

if(!/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent))$('kb').textContent='Ctrl K';
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('gq').focus();$('gq').select()}
  else if(e.key==='Escape')closeMenu(true);
  else if(!menu.hidden&&(e.key==='ArrowDown'||e.key==='ArrowUp')){
    e.preventDefault();const it=[...menu.querySelectorAll('button')],i=it.indexOf(document.activeElement);
    it[(i+(e.key==='ArrowDown'?1:-1)+it.length)%it.length].focus();
  }
  else if(e.key==='/'&&!$('app').hidden&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();$('q').focus()}
});

route();
