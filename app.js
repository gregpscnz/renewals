(function(){
"use strict";
var LSK='renewalPortal.v1';
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function money(n){n=Number(n);return isNaN(n)?'':'$'+n.toLocaleString('en-NZ',{maximumFractionDigits:0})}
function num(v){var n=parseFloat(String(v==null?'':v).replace(/[^0-9.\-]/g,''));return isNaN(n)?0:n}
function fmtDate(d){if(!d)return '';var p=String(d).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d}

var S={v:1,step:0,seg:'',ind:'',lines:[],c:{},p:{},l:{},calc:{},notes:{},decl:{name:'',ok:false}};
var prefillMsg='',dbOK=false,errMsg='',calcOpen='',sugg='',packed=null,sendBusy=false;
try{var raw=localStorage.getItem(LSK);if(raw){var o=JSON.parse(raw);if(o&&o.v===1){S=Object.assign(S,o);if(!S.calc)S.calc={};if(!S.notes)S.notes={};if(!S.decl)S.decl={name:'',ok:false}}}}catch(e){}
var saveT=null;
function save(){clearTimeout(saveT);saveT=setTimeout(function(){try{localStorage.setItem(LSK,JSON.stringify(S));$('saved').textContent='Saved on this device'}catch(e){$('saved').textContent=''}},250)}

/* ---------- model helpers ---------- */
function indKey(){return S.seg==='commercial'?(IND[S.ind]?S.ind:'other'):'domestic'}
function hasFeat(f){if(!f)return true;if(S.seg!=='commercial')return true;var d=IND[S.ind];if(!d||S.ind==='other'||!S.ind)return true;return d.feat.indexOf(f)>-1}
function matchIf(v,eq){eq=String(eq);return eq.charAt(0)==='!'?(v!=null&&v!==''&&v!==eq.slice(1)):eq.split('|').indexOf(v)>-1;}
function shown(vals,q){if(q.seg&&q.seg!==S.seg)return false;if(q.f&&!hasFeat(q.f))return false;return !q.showIf||matchIf((vals||{})[q.showIf[0]],q.showIf[1])}
function profileQs(){var b=PROFILE[S.seg].q.slice();if(S.seg==='commercial'&&IND[S.ind])b=b.concat(IND[S.ind].profile);return b}
function spliceInd(base,ind,l){if(!ind||!ind.length)return base;var a=l==='mdamage'?'valn':l==='liab'?'liabNote':'appetite',i=-1;base.forEach(function(q,n){if(i<0&&q.id===a)i=n});if(i<0)i=base.length;return base.slice(0,i).concat(ind,base.slice(i))}
function lineQs(l){var b=LINES[l].q.slice();var d=S.seg==='commercial'&&IND[S.ind]?IND[S.ind]:null;b=spliceInd(b,d&&d.lineQ[l],l);if(l==='bi'&&d&&MOBILE_TRADES[S.ind])b=mobileBI(b);return b}
function availLines(){if(S.seg==='domestic')return SEG.domestic.lines.slice();var x=(IND[S.ind]&&IND[S.ind].xlines)||[];return x.concat(SEG.commercial.lines)}
function defaultLines(){
  if(S.seg==='domestic')return ['house','contents','vehicle'];
  var av=availLines(),d=IND[S.ind]&&S.ind!=='other'?IND[S.ind].lines.filter(function(l){return av.indexOf(l)>-1}):[];
  return d.length?d:['mdamage','bi','liab','statutory'];
}
var CL_TAIL=['email','address','renewal','insurer','policyNo','premium'];
function clIds(){return (S.seg==='domestic'?['name','dob','phone','contact','dob2']:['name','contact','phone']).concat(CL_TAIL)}
function clientQs(){
  return clIds().map(function(id){return CLIENT.filter(function(q){return q.id===id})[0]}).filter(Boolean).filter(function(q){return !q.seg||q.seg===S.seg}).map(function(q){
    var c=Object.assign({},q),id=q.id;
    if(id==='dob'){c.label='Your date of birth'}
    if(id==='dob2'){c.label='Their date of birth (optional)'}
    if(id==='name'){c.label=S.seg==='commercial'?'Business name':'Your name (as on the policy)';c.ph=''}
    if(id==='contact'){c.label=S.seg==='commercial'?'Best person to contact':'Partner or joint policyholder (optional)'}
    if(id==='email'){c.label='Email'}
    if(id==='address'){c.label=S.seg==='commercial'?'Main business address':'Home address';c.hint='Start typing the number and street, then pick your address from the list. You can also type it in.'}
    if(id==='renewal'){c.label='Renewal date (from your current policy)'}
    if(id==='insurer'){c.label='Current insurer (if you know)'}
    if(id==='policyNo'){c.label='Policy number (if you have it)'}
    if(id==='premium'){c.label='Last year\'s premium (if you have it)';c.hint=''}
    return c;
  });
}
function onLines(){var o=S.off||{};return S.lines.filter(function(l){return !o[l]})}
function steps(){
  var a=['welcome','you'];if(S.seg==='commercial')a.push('biz');
  a.push('covers','about');S.lines.forEach(function(l){if(LINES[l])a.push('line:'+l)});
  a.push('review','send');return a;
}
function stepTitle(s){
  if(s==='welcome')return 'Welcome';if(s==='you')return 'About you';if(s==='biz')return 'Your business';if(s==='covers')return 'Your covers';
  if(s==='about')return S.seg==='commercial'?'About the business':'About the household';
  if(s==='review')return 'Review';if(s==='send')return 'Send to us';
  if(s.indexOf('line:')===0)return LINES[s.slice(5)].name;return s;
}

/* ---------- field rendering ---------- */
function getVal(sc,id){if(sc==='c')return S.c[id];if(sc==='p')return S.p[id];var l=sc.slice(2);return (S.l[l]||{})[id]}
function setVal(sc,id,v){if(sc==='c')S.c[id]=v;else if(sc==='p')S.p[id]=v;else{var l=sc.slice(2);S.l[l]=S.l[l]||{};S.l[l][id]=v}}
function valsOf(sc){if(sc==='c')return S.c;if(sc==='p')return S.p;return S.l[sc.slice(2)]||{}}
function fid(sc,id){return 'f_'+sc.replace(/[^a-z0-9]/gi,'_')+'_'+id}
function field(sc,q){
  var id=fid(sc,q.id),v=getVal(sc,q.id),h=q.hint?'<span class="hint">'+esc(q.hint)+'</span>':'';
  var d=' data-sc="'+sc+'" data-q="'+q.id+'"'+(q.addr?' data-addr="1"':'');var full=(q.full||q.type==='area'||q.type==='yn'||q.type==='multi'||q.type==='opt')?' full':'';
  var out='';
  if(q.type==='yn'){
    out='<div class="chips" role="radiogroup" aria-labelledby="'+id+'_l">'+['Yes','No'].map(function(o){return '<label class="chip"><input type="radio" name="'+id+'" value="'+o+'"'+d+(v===o?' checked':'')+'>'+o+'</label>'}).join('')+'</div>';
    return '<div class="f'+full+'"><span class="lab" id="'+id+'_l">'+esc(q.label)+'</span>'+h+out+'</div>';
  }
  if(q.type==='opt'){
    if(q.opts.length>4)out='<select class="in" id="'+id+'"'+d+'><option value="">Choose</option>'+q.opts.map(function(o){return '<option'+(v===o?' selected':'')+'>'+esc(o)+'</option>'}).join('')+'</select>';
    else out='<div class="chips" role="radiogroup" aria-labelledby="'+id+'_l">'+q.opts.map(function(o){return '<label class="chip"><input type="radio" name="'+id+'" value="'+esc(o)+'"'+d+(v===o?' checked':'')+'>'+esc(o)+'</label>'}).join('')+'</div>';
    return '<div class="f'+full+'"><span class="lab" id="'+id+'_l">'+esc(q.label)+'</span>'+h+out+'</div>';
  }
  if(q.type==='multi'){
    var arr=Array.isArray(v)?v:[];
    out='<div class="chips" role="group" aria-labelledby="'+id+'_l">'+q.opts.map(function(o){return '<label class="chip"'+(q.tips&&q.tips[o]?' title="'+esc(q.tips[o])+'"':'')+'><input type="checkbox" value="'+esc(o)+'"'+d+(arr.indexOf(o)>-1?' checked':'')+'>'+esc(o)+'</label>'}).join('')+'</div>';
    return '<div class="f'+full+'"><span class="lab" id="'+id+'_l">'+esc(q.label)+'</span>'+h+out+'</div>';
  }
  if(q.type==='claims')return claimsField(sc,q,id,h);
  if(q.type==='vlist')return vlField(sc,q,id,h);
  if(q.type==='area'){
    return '<div class="f full"><label for="'+id+'">'+esc(q.label)+'</label>'+h+'<textarea class="in" id="'+id+'"'+d+'>'+esc(v||'')+'</textarea></div>';
  }
  var type=q.type==='date'?'date':q.type==='tel'?'tel':q.type==='email'?'email':'text';
  var mode=(q.type==='num'||q.type==='int')?' inputmode="decimal"':q.type==='tel'?' inputmode="tel"':'';
  var inp='<input class="in" id="'+id+'" type="'+type+'"'+mode+d+' value="'+esc(v==null?'':v)+'"'+(q.ph?' placeholder="'+esc(q.ph)+'"':'')+' autocomplete="'+(q.id==='email'?'email':q.id==='phone'?'tel':q.id==='name'?'name':q.addr?'off':q.id==='dob'?'bday':'off')+'">';
  if(q.addr)inp+='<div class="ac" id="ac_'+id+'" hidden></div>'+(sc==='l:house'?'<div class="lk" id="lk_'+id+'">'+lkHTML(v)+'</div>':'');
  if(q.type==='num')inp='<div class="money">'+inp+'</div>';
  if(sc==='l:vehicle'&&q.id==='rego')inp+='<div class="lk" id="lk_'+id+'">'+regoHTML(v)+'</div>';
  var key=sc.replace(/^l:/,'')+'.'+q.id,cal=CALC_FOR[key],btn='';
  if(cal&&q.type==='num'){btn='<button class="btn sm calcbtn" type="button" data-calc="'+key+'" aria-expanded="'+(calcOpen===key)+'">'+(calcOpen===key?'Close the helper':'Help me work this out')+'</button>'+(calcOpen===key?calcPanel(key,cal,sc,q):'')}
  var g=GUIDE[sc.replace(/^l:/,'')];if(g&&g[q.id])h+='<span class="hint">'+esc(g[q.id])+'</span>';
  return '<div class="f'+(q.full?' full':'')+'"><label for="'+id+'">'+esc(q.label)+'</label>'+h+inp+btn+'</div>';
}
function fields(sc,qs){
  var vals=valsOf(sc);
  return '<div class="grid">'+qs.filter(function(q){return shown(vals,q)}).map(function(q){return field(sc,q)}).join('')+'</div>';
}

/* ---------- calculators ---------- */
function calcPanel(key,name,sc,q){
  var C=CALCS[name],st=S.calc[key]=S.calc[key]||{};
  var rows=C.rows.map(function(r,i){
    var cid=fid('calc',key.replace(/\./g,'_')+'_'+r[0]);
    var val=st[r[0]];if(val==null&&r[3]&&r[3].from==='profile.turnover'&&S.p.turnover)val=S.p.turnover;
    var lab=C.label?'<input class="in" id="'+cid+'_t" data-cl="'+key+'" data-r="t_'+r[0]+'" value="'+esc(st['t_'+r[0]]||'')+'" placeholder="'+esc(r[1])+'" aria-label="'+esc(r[1])+' description">':'<label for="'+cid+'">'+esc(r[1])+'</label>';
    var box=r[2]==='%'?'<input class="in" id="'+cid+'" inputmode="decimal" data-cl="'+key+'" data-r="'+r[0]+'" value="'+esc(val==null?'':val)+'" aria-label="'+esc(r[1])+'">':'<div class="money"><input class="in" id="'+cid+'" inputmode="decimal" data-cl="'+key+'" data-r="'+r[0]+'" value="'+esc(val==null?'':val)+'" aria-label="'+esc(r[1])+'"></div>';
    return '<div class="row">'+lab+box+'</div>';
  }).join('');
  var links=(C.links||[]).map(function(l){return '<a href="'+l[1]+'" target="_blank" rel="noopener">'+esc(l[0])+'</a>'}).join(' &middot; ');
  var res=calcResult(key,name);
  return '<div class="calc" id="calc_'+key.replace(/\./g,'_')+'"><h3>'+esc(C.title)+'</h3><p>'+esc(C.intro)+'</p>'+(links?'<p>'+links+'</p>':'')+'<div class="rows">'+rows+'</div><div class="out"><span>'+esc(C.result)+'</span><em id="calcres">'+money(res.total)+'</em></div><div class="brk" id="calcbrk">'+brk(res)+'</div><p class="hint">'+esc(C.note)+'</p><div class="chips"><button class="btn pri sm" type="button" data-use="'+key+'">Use this figure</button></div></div>';
}
function brk(res){return res.lines.map(function(l){return esc(l[0])+': '+money(l[1])}).join(' &middot; ')}
function calcResult(key,name){
  var C=CALCS[name],st=S.calc[key]||{},v={};
  C.rows.forEach(function(r){var x=st[r[0]];if(x==null&&r[3]&&r[3].from==='profile.turnover')x=S.p.turnover;v[r[0]]=num(x)});
  if(C.compute)return C.compute(v);
  var t=0,ls=[];C.rows.forEach(function(r){t+=v[r[0]];if(v[r[0]])ls.push([C.label&&st['t_'+r[0]]?st['t_'+r[0]]:r[1],v[r[0]]])});
  return {total:t,lines:ls};
}

/* ---------- aside (guidance) ---------- */
function asideHTML(s){
  var open=window.matchMedia&&window.matchMedia('(min-width:920px)').matches?' open':'';
  if(s.indexOf('line:')===0){
    var l=s.slice(5),H=LINE_HELP[l];if(!H)return '';
    return '<details class="help"'+open+'><summary>About this cover</summary><div class="hb"><p>'+esc(H.short)+'</p><div><h4>Generally covers</h4><ul>'+H.covers.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div><div><h4>Generally does not cover</h4><ul>'+H.notCovers.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div><div class="tip"><b>Good to know.</b> '+esc(H.tip)+'</div><p class="hint">Descriptions are general. Your policy wording decides what is covered.</p></div></details>';
  }
  var txt={
    welcome:['How this works',['Answer what you can. Skip anything you are unsure of and we will follow up.','Your answers save on this device as you go, so you can close this page and come back.','At the end you send your answers to us by email.']],
    you:['Why we ask',['We need your contact details to send quotes and to check anything with you.','Your renewal date tells us how much time we have to go to market.']],
    biz:['Choosing your industry',['The industry sets the questions and covers we suggest. Pick the closest match.','If nothing fits, choose Not listed and describe the business.']],
    covers:['Choosing covers',['Tick what you have now and anything you would like us to look at.','We have pre-selected the covers most businesses in your line of work hold. You can change them.','Select the box to read what each cover generally does.']],
    about:['A note on honesty',['Insurers price on your answers. Tell us about claims and changes even if they seem small.','If you are unsure, say so and we will check with you.']],
    review:['Before you send',['Check your answers. Use Edit to change any section.','Read the important information at the bottom.']],
    send:['Nothing has been sent yet',['Your answers are only passed to us when you send the email in the last step.']]
  }[s];
  if(!txt)return '';
  return '<details class="help"'+open+'><summary>'+esc(txt[0])+'</summary><div class="hb"><ul>'+txt[1].map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul><p class="hint">'+esc(DISCLAIMER_SHORT)+'</p></div></details>';
}

/* ---------- step views ---------- */
function nav(back,nextLabel,noNext){
  return (errMsg?'<p class="err" role="alert">'+esc(errMsg)+'</p>':'')+'<div class="nav">'+(back?'<button class="btn" type="button" data-nav="back">Back</button>':'<span></span>')+(noNext?'':'<button class="btn pri" type="button" data-nav="next">'+(nextLabel||'Continue')+'</button>')+'</div>';
}
function view(s){
  if(s==='welcome')return '<div class="card"><div><h1>Let\'s get your renewal sorted.</h1></div><p class="lead">This takes about 15 minutes. It saves as you go, and you can stop and come back. At the end you send us your answers and we take it from there.</p><div class="grid"><div class="notice"><b>Have these handy</b><br>Your current policy schedules, last year\'s sales figures if you are a business, values of buildings, plant and vehicles, and details of any claims in the last three years.</div><div class="notice"><b>Not sure of an answer?</b><br>Leave it blank or tell us. We would rather you skip it than guess.</div></div><details class="rsec"'+(prefillMsg?' open':'')+'><summary style="cursor:pointer;font-weight:600">Did your broker send you a pre-fill code?</summary><div class="f" style="margin-top:10px"><label for="prefillbox">Paste the code from the email</label><textarea class="in" id="prefillbox" placeholder="-----BEGIN PREFILL DATA R1G-----"></textarea><div><button class="btn sm pri" type="button" id="prefillgo">Use my last details</button></div>'+(prefillMsg?'<p class="err" role="alert">'+esc(prefillMsg)+'</p>':'<p class="hint">This fills in what we already hold so you only need to check and update it. Nothing is sent anywhere.</p>')+'</div></details>'+nav(false,'Start')+'</div>';
  if(s==='you'){
    return '<div class="card"><h2>About you</h2>'+(S.pre?'<div class="notice"><b>Pre-filled from your last renewal.</b> Please check every answer and update anything that has changed. Questions you have not answered before are still blank.</div>':'')+'<div class="f"><span class="lab" id="seg_l">Is this for your home or for a business?</span><div class="cards" role="radiogroup" aria-labelledby="seg_l"><label class="pick"><input type="radio" name="seg" value="domestic"'+(S.seg==='domestic'?' checked':'')+'><b>Home and personal</b><span>House, contents, vehicles, boat, caravan, valuables</span></label><label class="pick"><input type="radio" name="seg" value="commercial"'+(S.seg==='commercial'?' checked':'')+'><b>Business</b><span>Property, income, liability, vehicles, professional and cyber</span></label></div></div>'+(S.seg?fields('c',clientQs()):'<p class="hint">Choose one to continue.</p>')+nav(true)+'</div>';
  }
  if(s==='biz'){
    var groups={};Object.keys(IND).forEach(function(k){if(k==='domestic')return;var g=IND[k].group||'Other';(groups[g]=groups[g]||[]).push(k)});
    var opts='<option value="">Choose your industry</option>'+Object.keys(groups).sort().map(function(g){return '<optgroup label="'+esc(g)+'">'+groups[g].sort(function(a,b){return IND[a].name.localeCompare(IND[b].name)}).map(function(k){return '<option value="'+k+'"'+(S.ind===k?' selected':'')+'>'+esc(IND[k].name)+'</option>'}).join('')+'</optgroup>'}).join('');
    var cur=IND[S.ind];
    return '<div class="card"><h2>Your business</h2><div class="f"><label for="indsel">What is your main line of work?</label><select class="in" id="indsel">'+opts+'</select>'+(cur?'<span class="hint">'+esc(cur.desc||'')+'</span>':'')+'</div><div class="f"><label for="trade">Describe what the business does</label><textarea class="in" id="trade" data-sc="p" data-q="trading">'+esc(S.p.trading||'')+'</textarea><span class="hint">A sentence or two. If your industry is not in the list, choose Other business above.</span></div>'+(sugg&&IND[sugg]&&!S.ind?'<div class="sugg"><span>Sounds like <b>'+esc(IND[sugg].name)+'</b>.</span><button class="btn sm" type="button" data-sugg="'+sugg+'">Use this</button></div>':'')+nav(true)+'</div>';
  }
  if(s==='covers'){
    var av=availLines();
    return '<div class="card"><h2>Your covers</h2><p class="lead">Tick the covers you have now, and any you want us to look at. Tap the guide on a step to see what each one generally covers.</p><div class="cards" role="group" aria-label="Covers">'+av.map(function(l){var H=LINE_HELP[l]||{};return '<label class="pick"><input type="checkbox" data-line="'+l+'"'+(S.lines.indexOf(l)>-1?' checked':'')+'><b>'+esc(LINES[l].name)+'</b><span>'+esc(H.short||LINES[l].desc||'')+'</span></label>'}).join('')+'</div>'+nav(true)+'</div>';
  }
  if(s==='about'){
    return '<div class="card"><h2>'+(S.seg==='commercial'?'About the business':'About the household')+'</h2><p class="lead">'+esc(PROFILE[S.seg].lead)+'</p>'+fields('p',profileQs().filter(function(q){return q.id!=='trading'}))+nav(true)+'</div>';
  }
  if(s.indexOf('line:')===0){
    var l=s.slice(5);
    var off=!!(S.off&&S.off[l]);
    return '<div class="card"><h2>'+esc(LINES[l].name)+'</h2><p class="lead">'+esc(LINE_HELP[l]?LINE_HELP[l].short:LINES[l].desc)+'</p><div class="chips"><label class="chip"><input type="checkbox" data-lineoff="'+l+'"'+(off?'':' checked')+'>Include this cover in the renewal</label></div>'+(off?'<div class="notice">This cover is left out of the renewal and none of its answers will be sent. Tick the box above to put it back.</div>':fields('l:'+l,lineQs(l)))+nav(true)+'</div>';
  }
  if(s==='review')return reviewView();
  if(s==='send')return sendView();
  return '';
}
function disp(q,v){if(isLst(q))return lstJoin(q,v);if(Array.isArray(v))return v.join('; ');if(q.type==='num')return money(v);if(q.type==='date')return fmtDate(v);return String(v)}
function sections(){
  var out=[];
  function sec(title,step,sc,qs){
    var vals=valsOf(sc),rows=[];
    qs.forEach(function(q){if(!shown(vals,q))return;var v=getVal(sc,q.id);if(v==null||v===''||(Array.isArray(v)&&!v.length))return;var dv=disp(q,v);if(!dv)return;rows.push([q.label,dv])});
    out.push({title:title,step:step,rows:rows});
  }
  sec('About you','you','c',clientQs());
  if(S.seg==='commercial'){
    var rows=[];if(IND[S.ind])rows.push(['Industry',IND[S.ind].name]);if(S.p.trading)rows.push(['What the business does',S.p.trading]);out.push({title:'Your business',step:'biz',rows:rows});
  }
  sec(S.seg==='commercial'?'About the business':'About the household','about','p',profileQs().filter(function(q){return q.id!=='trading'}));
  onLines().forEach(function(l){if(LINES[l])sec(LINES[l].name,'line:'+l,'l:'+l,lineQs(l))});
  return out;
}
function reviewView(){
  var secs=sections();
  var h='<div class="card"><h2>Review your answers</h2><p class="lead">Check these look right. Use Edit to change anything.</p><div class="review">'+secs.map(function(s){return '<div class="rsec"><h3>'+esc(s.title)+'<button class="btn sm" type="button" data-go="'+esc(s.step)+'">Edit</button></h3>'+(s.rows.length?'<dl class="kv">'+s.rows.map(function(r){return '<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd>'}).join('')+'</dl>':'<p class="hint">Nothing entered.</p>')+'</div>'}).join('')+'</div>';
  h+='<div class="legal"><h3>Important information</h3>'+DISCLAIMER_FULL.map(function(d){return '<div><b>'+esc(d[0])+'</b>'+esc(d[1])+'</div>'}).join('')+'</div>';
  h+='<div class="grid"><div class="f"><label for="dname">Your full name</label><input class="in" id="dname" value="'+esc(S.decl.name||'')+'" autocomplete="name"></div><div class="f"><label for="ddate">Date</label><input class="in" id="ddate" type="date" value="'+today()+'" disabled></div><div class="f full"><span class="hint">Click the disclosure statement to confirm.</span><label class="chip" style="border-radius:12px;align-items:flex-start"><input type="checkbox" id="dok"'+(S.decl.ok?' checked':'')+'><span>I have read the important information above. I confirm the answers are true and complete to the best of my knowledge, and I understand this does not arrange cover.</span></label></div></div>';
  return h+nav(true,'Continue')+'</div>';
}
function summaryText(){
  var L=[],nm=S.c.name||'Client';
  L.push('Renewal information: '+nm);
  L.push('Completed by: '+(S.decl.name||'')+' on '+fmtDate(today()));
  L.push('Type: '+(S.seg==='commercial'?'Business':'Home and personal')+(IND[S.ind]?' ('+IND[S.ind].name+')':''));
  L.push('Covers: '+onLines().map(function(l){return LINES[l].name}).join(', '));
  sections().forEach(function(s){
    if(!s.rows.length)return;L.push('','== '+s.title+' ==');s.rows.forEach(function(r){L.push(r[0]+': '+r[1])});
  });
  var cn=Object.keys(S.notes);if(cn.length){L.push('','== Notes from the sum insured helpers ==');cn.forEach(function(k){L.push(k+': '+S.notes[k])})}
  return L.join('\n');
}

/* ---------- claims list (month, year, fault, details, cost) ---------- */
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function claimEmpty(r){return !r||!(r.m||r.y||r.f||(r.d||'').trim()||(r.c||'').trim())}
function claimClean(v){return Array.isArray(v)?v.filter(function(r){return !claimEmpty(r)}):[]}
function claimLine(r){
  var p=[];if(r.m||r.y)p.push(((r.m||'')+' '+(r.y||'')).trim());if(r.f)p.push(r.f.toLowerCase());if((r.d||'').trim())p.push(r.d.trim());if((r.c||'').trim())p.push('cost '+(isNaN(num(r.c))||!num(r.c)?r.c:money(num(r.c))));
  return p.join(', ');
}
function claimsField(sc,q,id,h){
  var arr=Array.isArray(getVal(sc,q.id))?getVal(sc,q.id):[],rows=arr.length?arr:[{}],yr=new Date().getFullYear(),years=[];
  for(var y=yr;y>=yr-9;y--)years.push(String(y));
  var key=sc+'|'+q.id;
  var out=rows.map(function(r,i){
    var b=id+'_'+i;
    return '<div class="claimrow"><div class="f"><label for="'+b+'_m">Month</label><select class="in" id="'+b+'_m" data-ck="'+key+'|'+i+'|m"><option value="">Not sure</option>'+MONTHS.map(function(m){return '<option'+(r.m===m?' selected':'')+'>'+m+'</option>'}).join('')+'</select></div>'
     +'<div class="f"><label for="'+b+'_y">Year</label><select class="in" id="'+b+'_y" data-ck="'+key+'|'+i+'|y"><option value="">Choose</option>'+years.map(function(y){return '<option'+(r.y===y?' selected':'')+'>'+y+'</option>'}).join('')+'</select></div>'
     +'<div class="f full"><span class="lab" id="'+b+'_fl">Whose fault?</span><div class="chips" role="radiogroup" aria-labelledby="'+b+'_fl">'+['At fault','Not at fault','Not sure'].map(function(o){return '<label class="chip"><input type="radio" name="'+b+'_f" value="'+o+'" data-ck="'+key+'|'+i+'|f"'+(r.f===o?' checked':'')+'>'+o+'</label>'}).join('')+'</div></div>'
     +'<div class="f full"><label for="'+b+'_d">What happened</label><input class="in" id="'+b+'_d" data-ck="'+key+'|'+i+'|d" value="'+esc(r.d||'')+'" placeholder="e.g. Rear-ended at lights, windscreen chip, hit a parked car" autocomplete="off"></div>'
     +'<div class="f"><label for="'+b+'_c">Cost, if known</label><div class="money"><input class="in" id="'+b+'_c" inputmode="decimal" data-ck="'+key+'|'+i+'|c" value="'+esc(r.c||'')+'" autocomplete="off"></div></div>'
     +'<div class="f" style="justify-content:flex-end">'+(rows.length>1||!claimEmpty(r)?'<button class="btn sm" type="button" data-claimdel="'+key+'|'+i+'">Remove this claim</button>':'')+'</div></div>';
  }).join('');
  return '<div class="f full"><span class="lab">'+esc(q.label)+'</span>'+h+'<div class="claims">'+out+'</div><div><button class="btn sm" type="button" data-claimadd="'+key+'">Add another claim</button></div></div>';
}
function vlEmpty(r){return !r||!(r.y||(r.mk||'').trim()||(r.md||'').trim()||(r.rg||'').trim()||(r.v||'').trim()||(r.ac||'').trim());}
function vlClean(v){return Array.isArray(v)?v.filter(function(r){return !vlEmpty(r);}):[];}
function vlLine(r){var p=[[r.y,(r.mk||'').trim(),(r.md||'').trim()].filter(Boolean).join(' ')];if((r.rg||'').trim())p.push('rego '+r.rg.trim().toUpperCase());if((r.v||'').trim())p.push('value '+money(r.v));if((r.ac||'').trim())p.push('accessories '+money(r.ac));return p.filter(Boolean).join(', ');}
function isLst(q){return q.type==='claims'||q.type==='vlist';}
function lstClean(q,v){return q.type==='vlist'?vlClean(v):claimClean(v);}
function lstJoin(q,v){return lstClean(q,v).map(function(r){return q.type==='vlist'?vlLine(r):claimLine(r);}).join('; ');}
function vlRows(key,id,rows,lab,wrapMoney){
  var yr=new Date().getFullYear()+1,ys=[];for(var y=yr;y>=yr-30;y--)ys.push(String(y));
  return rows.map(function(r,i){var b=id+'_'+i;
    function inp(f,l,ph,mode){return '<div class="f"><label'+lab+' for="'+b+'_'+f+'">'+l+'</label><input class="in" id="'+b+'_'+f+'" data-ck="'+key+'|'+i+'|'+f+'"'+(mode?' inputmode="decimal"':'')+' value="'+esc(r[f]||'')+'" placeholder="'+ph+'" autocomplete="off"></div>';}
    return '<div class="claimrow"><div class="f"><label'+lab+' for="'+b+'_y">Year</label><select class="in" id="'+b+'_y" data-ck="'+key+'|'+i+'|y"><option value="">Choose</option>'+ys.map(function(y){return '<option'+(r.y===y?' selected':'')+'>'+y+'</option>';}).join('')+'</select></div>'
    +inp('mk','Make','e.g. Toyota')+inp('md','Model','e.g. Hilux')+inp('rg','Registration','e.g. ABC123')+inp('v','Value ($)','','n')+inp('ac','Accessories value ($)','Signwriting, racking, tow bar','n')
    +'<div class="f" style="justify-content:flex-end">'+((rows.length>1||!vlEmpty(r))?'<button class="btn sm" type="button" '+wrapMoney.del+'="'+key+'|'+i+'">Remove this vehicle</button>':'')+'</div></div>';}).join('');
}
function vlField(sc,q,id,h){var arr=Array.isArray(getVal(sc,q.id))?getVal(sc,q.id):[],rows=arr.length?arr:[{}],key=sc+'|'+q.id;
  return '<div class="f full"><span class="lab">'+esc(q.label)+'</span>'+h+'<div class="claims">'+vlRows(key,id,rows,'',{del:'data-claimdel'})+'</div><div><button class="btn sm" type="button" data-claimadd="'+key+'">Add another vehicle</button></div></div>';}
function claimSet(ck,val){
  var p=ck.split('|'),sc=p[0],qid=p[1],i=Number(p[2]),f=p[3];
  var arr=Array.isArray(getVal(sc,qid))?getVal(sc,qid).map(function(r){return Object.assign({},r)}):[];
  while(arr.length<=i)arr.push({});
  arr[i][f]=val;setVal(sc,qid,arr);save();
  if(qid==='veh'){var tot=0;arr.forEach(function(r){tot+=num(r.v)+num(r.ac)});if(tot>0){setVal(sc,'value',String(tot));save();var el=document.getElementById(fid(sc,'value'));if(el)el.value=String(tot)}}
}

function liveVals(sc,qs){
  var vals=valsOf(sc),o={};
  qs.forEach(function(q){if(!shown(vals,q))return;var v=vals[q.id];if(isLst(q))v=lstClean(q,v);if(v==null||v===''||(Array.isArray(v)&&!v.length))return;o[q.id]=v});
  return o;
}
function payload(){
  var l={};onLines().forEach(function(k){if(LINES[k]){var o=liveVals('l:'+k,lineQs(k));if(Object.keys(o).length)l[k]=o}});
  var pq=profileQs();if(S.seg==='commercial'&&PROFILE.commercial.q.every(function(q){return q.id!=='trading'}))pq=pq.concat([{id:'trading',type:'area'}]);
  return {v:1,at:new Date().toISOString(),seg:S.seg,ind:S.ind,indName:IND[S.ind]?IND[S.ind].name:'',lines:onLines().filter(function(k){return LINES[k]}),c:liveVals('c',clientQs()),p:liveVals('p',pq),l:l,notes:S.notes,decl:{name:S.decl.name,date:today()}};
}
function b64(u8){var s='';for(var i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s)}
async function encode(obj){
  var raw=new TextEncoder().encode(JSON.stringify(obj)),tag='R1G',bytes=raw;
  try{
    if(typeof CompressionStream==='function'){
      var cs=new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
      bytes=new Uint8Array(await new Response(cs).arrayBuffer());
    }else tag='R1J';
  }catch(e){tag='R1J';bytes=raw}
  var t=b64(bytes).replace(/(.{72})/g,'$1\n');
  return '-----BEGIN RENEWAL DATA '+tag+'-----\n'+t+'\n-----END RENEWAL DATA-----';
}
function sendViewManual(){
  var subj=encodeURIComponent('Renewal information: '+(S.c.name||''));
  var body=encodeURIComponent('Hi '+BROKER.name.split(' ')[0]+',\n\nMy renewal information is below.\n\n');
  return '<div class="card"><h2>Send your answers to us</h2><p class="lead">Almost done. Nothing has gone to us yet. Copy your answers and send them in an email.</p><ol class="steps"><li><div><b>Copy your answers</b><br><button class="btn pri" type="button" id="copyall"'+(packed?'':' disabled')+'>'+(packed?'Copy my answers':'Preparing…')+'</button> <span class="hint" id="copied"></span></div></li><li><div><b>Paste them into an email to</b><br><span style="font-family:var(--mono);overflow-wrap:anywhere" id="toaddr">'+BROKER.email+'</span> <button class="btn sm" type="button" id="copyaddr">Copy address</button><br><a href="mailto:'+BROKER.email+'?subject='+subj+'&body='+body+'" target="_blank" rel="noopener">Open my email app</a> <span class="hint">(this link may not work on every device, so the address is above)</span></div></li><li><div><b>Add anything else you have</b><br>Attach your current policy schedule, photos, valuations or sales figures to the same email if you can.</div></li></ol><div class="f"><label for="outtext">Your answers (select and copy if the button does not work)</label><textarea class="in out-text" id="outtext" readonly>'+esc(packed||'')+'</textarea></div><div class="notice">Questions? Call '+BROKER.name+' on '+BROKER.phone+(BROKER.mobile?' or '+BROKER.mobile:'')+'. Your answers stay on this device until you send the email.</div>'+nav(true,'',true)+'<div class="nav"><span></span><button class="btn sm" type="button" id="restart" data-arm="">Clear my answers from this device</button></div></div>';
}

var SEND_ST='',SEND_ID='';
function sendView(){
  if(!SEND_URL)return sendViewManual();
  if(SEND_ST==='ok')return '<div class="card"><h2>Thank you, your answers have been sent</h2><p class="lead">'+esc(BROKER.name.split(' ')[0])+' will review them and be in touch. If you need to add anything, you can attach it to a reply or call '+esc(BROKER.phone)+'.</p><div class="nav"><span></span><button class="btn sm" type="button" id="restart" data-arm="">Clear my answers from this device</button></div></div>';
  var msg=SEND_ST==='err'?'<p class="err" role="alert">We could not confirm that your answers were sent. Please try again, or use the email option below.</p>':'';
  return '<div class="card"><h2>Send your answers to us</h2><p class="lead">Almost done. Nothing has gone to us yet. When you press the button, your answers are sent to '+esc(BROKER.name.split(' ')[0])+' securely.</p>'+msg+'<div><button class="btn pri" type="button" id="sendnow"'+(packed&&SEND_ST!=='busy'?'':' disabled')+'>'+(SEND_ST==='busy'?'Sending…':packed?'Send my answers':'Preparing…')+'</button></div><div class="notice">Questions? Call '+esc(BROKER.name)+' on '+esc(BROKER.phone)+'. You can attach your current policy schedule, photos or valuations by replying to the email we send you.</div>'+nav(true,'',true)+'</div><details class="help" style="margin-top:14px"><summary>Prefer to email it yourself?</summary><div class="hb">'+sendViewManual()+'</div></details>';
}
function doSend(){
  if(!packed||SEND_ST==='busy')return;
  if(!SEND_ID)SEND_ID='r'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  SEND_ST='busy';render();
  fetch(SEND_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({v:1,id:SEND_ID,name:S.c.name||'',email:S.c.email||'',summary:summaryText(),code:packed})})
   .then(function(r){return r.json()}).then(function(j){if(!j||!j.ok)throw new Error('x');SEND_ST='ok'}).catch(function(){SEND_ST='err'}).then(function(){render()});
}
function hashPrefill(){
  var m=/^#p=([GJ])\.([A-Za-z0-9_-]+)/.exec(location.hash||'');
  if(!m)return Promise.resolve(false);
  return (async function(){
    try{
      var b=m[2].replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';
      var bytes=b64u8(b),txt;
      if(m[1]==='G'){txt=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}else txt=new TextDecoder().decode(bytes);
      applyPrefill(JSON.parse(txt));packed=null;S.step=1;save();
      try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
      return true;
    }catch(e){return false}
  })();
}

/* ---------- render ---------- */
function render(keepFocus){
  var a=steps();if(S.step>=a.length)S.step=a.length-1;if(S.step<0)S.step=0;
  var s=a[S.step],ae=document.activeElement,fid0=keepFocus&&ae&&ae.id?ae.id:'',selStart=null;
  if(fid0&&ae.selectionStart!=null)try{selStart=ae.selectionStart}catch(e){}
  $('main').innerHTML=view(s);$('aside').innerHTML=asideHTML(s);
  $('prog').innerHTML='<div class="bar" aria-hidden="true">'+a.map(function(_,i){return '<i class="'+(i<=S.step?'on':'')+'"></i>'}).join('')+'</div><small><span>Step '+(S.step+1)+' of '+a.length+'</span><span>'+esc(stepTitle(s))+'</span></small>';
  document.title='Renewal Portal';var bn=document.querySelector('.brand b');if(bn)bn.textContent=BROKER.firm||'Renewal Portal';
  $('foot').innerHTML='<span>'+esc(DISCLAIMER_SHORT)+'</span><span>'+esc(BROKER.who)+' &middot; FSP '+BROKER.fsp+' &middot; '+esc(BROKER.phone)+'</span>';
  if(fid0){var e=$(fid0);if(e){e.focus();if(selStart!=null)try{e.setSelectionRange(selStart,selStart)}catch(x){}}}
  if(s==='send'&&!packed&&!sendBusy){sendBusy=true;var t=summaryText();encode(payload()).then(function(code){packed=t+'\n\n'+code;sendBusy=false;if(steps()[S.step]==='send')render()})}
}
function flush(){clearTimeout(saveT);try{localStorage.setItem(LSK,JSON.stringify(S));$('saved').textContent='Saved on this device'}catch(e){$('saved').textContent=''}}
window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',function(){if(document.hidden)flush()});
function go(n,keep){S.step=n;errMsg='';calcOpen='';window.scrollTo(0,0);flush();render()}
function validate(s){
  if(s==='you'){if(!S.seg)return 'Choose home or business first.';if(!(S.c.name||'').trim())return 'Please enter a name.';if(!(S.c.email||'').trim()&&!(S.c.phone||'').trim())return 'Add an email or a phone number so we can reach you.'}
  if(s==='biz'&&!S.ind)return 'Choose your industry, or Other business if nothing fits.';
  if(s==='covers'&&!S.lines.length)return 'Choose at least one cover.';
  if(s==='review'){var nm0=!(S.decl.name||'').trim();if(nm0&&!S.decl.ok)return 'Enter your full name and click the disclosure statement to confirm.';if(nm0)return 'Enter your full name.';if(!S.decl.ok)return 'Click the disclosure statement to confirm.'}
  return '';
}


function b64u8(b){var t=atob(b),u=new Uint8Array(t.length);for(var i=0;i<t.length;i++)u[i]=t.charCodeAt(i);return u}
async function decodePrefill(text){
  var m=/-----BEGIN (?:PSC )?[A-Z ]*DATA (?:PSC1|R1)([GJ])-----([\s\S]*?)-----END (?:PSC )?[A-Z ]*DATA-----/.exec(text);
  if(!m)throw new Error('block');
  var bytes=b64u8(m[2].replace(/[^A-Za-z0-9+\/=]/g,''));
  if(m[1]==='G'){
    if(typeof DecompressionStream!=='function')throw new Error('gz');
    var st=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(st).text());
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
function applyPrefill(p){
  if(!p||(p.seg!=='commercial'&&p.seg!=='domestic'))throw new Error('shape');
  S.seg=p.seg;S.ind='';
  if(p.seg==='commercial'){var k=IND[p.ind]?p.ind:(p.indName?indFromName(p.indName):'');S.ind=IND[k]?k:''}
  var av=availLines();
  var ls=(p.lines||[]).filter(function(l){return LINES[l]&&av.indexOf(l)>-1});
  S.lines=ls.length?ls:defaultLines();
  S.lines.sort(function(x,y){return av.indexOf(x)-av.indexOf(y)});
  S.c=Object.assign({},p.c||{});S.p=Object.assign({},p.p||{});S.l=JSON.parse(JSON.stringify(p.l||{}));
  S.calc={};S.notes={};S.decl={name:'',ok:false};S.pre=true;
}

/* ---------- address look-up (LINZ open data, South Island and Auckland) ---------- */
var AC={cache:{},list:[],tm:null,seq:0};
var ACABB={rd:'road',st:'street',ave:'avenue',av:'avenue',dr:'drive',pl:'place',cres:'crescent',tce:'terrace',ln:'lane',hwy:'highway',cl:'close',ct:'court',pde:'parade',sq:'square',bvd:'boulevard',blvd:'boulevard',esp:'esplanade'};
function acNorm(x){return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
async function gunz(b64){var bin=atob(String(b64).trim()),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}
function acShard(k){if(AC.cache[k])return Promise.resolve(AC.cache[k]);return fetch('data/addr/'+k+'.txt').then(function(r){if(!r.ok)throw new Error('x');return r.text()}).then(gunz).then(function(t){var j=JSON.parse(t);AC.cache[k]=j;return j}).catch(function(){return null})}
function acParse(q){
  var raw=String(q||'').trim(),num='',unit='',rest=acNorm(raw),mm=/^(?:(?:unit|flat)\s*)?([a-z0-9]+)\s*\/\s*(\d+[a-z]?)\s+(.*)$/i.exec(raw);
  if(mm){unit=mm[1].toLowerCase();num=mm[2].toLowerCase();rest=acNorm(mm[3])}
  else{var m2=/^(\d+[a-z]?)\s+(.*)$/i.exec(raw);if(m2){num=m2[1].toLowerCase();rest=acNorm(m2[2])}}
  rest=rest.split(' ').map(function(w){return ACABB[w]||w}).join(' ');
  return {num:num,unit:unit,rest:rest};
}
function regoHTML(v){var p=String(v||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();if(p.length<2)return '<span class="hint">Enter the plate to get a look-up link for the make, model and year.</span>';return '<a href="https://www.trademe.co.nz/a/value-my-car" target="_blank" rel="noopener noreferrer">Trade Me: value my car (enter '+p+' for make, model, year and value)</a> &middot; <a href="https://transact.nzta.govt.nz/v2/check-expiry" target="_blank" rel="noopener noreferrer">NZTA expiry check</a> &middot; <a href="https://www.carjam.co.nz/car/?plate='+encodeURIComponent(p)+'" target="_blank" rel="noopener noreferrer">CarJam report</a>'}
function lkHTML(v){
  var a=String(v||'').trim();if(!a)return '';var w=encodeURIComponent(a+' New Zealand');
  return '<span class="hint">Not sure of the year built or size? Look your address up: </span>'+[['QV','https://www.google.com/search?q=site%3Aqv.co.nz+'+w],['homes.co.nz','https://www.google.com/search?q=site%3Ahomes.co.nz+'+w],['Council property record','https://www.google.com/search?q='+w+'+council+property+file+year+built']].map(function(x){return '<a href="'+x[1]+'" target="_blank" rel="noopener noreferrer">'+x[0]+'</a>'}).join(' &middot; ');
}
function acFmt(road,rec,sub,town){var a=(rec[1]?rec[1]+'/':'')+rec[0]+' '+road;return a+(sub?', '+sub:'')+(town&&town!==sub?', '+town:'')}
function acSuggest(inp){
  clearTimeout(AC.tm);var my=++AC.seq;
  AC.tm=setTimeout(function(){
    var box=$('ac_'+inp.id);if(!box)return;var P=acParse(inp.value);
    if(P.rest.length<2){box.hidden=true;box.innerHTML='';return}
    var k=P.rest.charAt(0);if(!/[a-z]/.test(k))k='_';
    acShard(k).then(function(sh){
      if(my!==AC.seq)return;if(!sh){box.hidden=true;return}
      var out=[];
      for(var i=0;i<sh.roads.length&&out.length<40;i++){
        var rd=sh.roads[i],rn=acNorm(rd[0]),okm=rn.indexOf(P.rest)===0||(' '+rn).indexOf(' '+P.rest)>-1;
        if(!okm){var ws=P.rest.split(' '),loc=acNorm((rd[1]||'')+' '+(rd[2]||''));for(var q=ws.length-1;q>=1&&!okm;q--){var pre=ws.slice(0,q).join(' '),suf=ws.slice(q).join(' ');if(rn.indexOf(pre)===0&&(' '+loc).indexOf(' '+suf)>-1)okm=true}}
        if(!okm)continue;
        var recs=rd[3];
        for(var j=0;j<recs.length&&out.length<40;j++){var rc=recs[j],n=rc[0].toLowerCase();if(P.num&&n.indexOf(P.num)!==0)continue;if(P.unit&&String(rc[1]).toLowerCase().indexOf(P.unit)!==0)continue;out.push({road:rd[0],sub:rd[1],town:rd[2],rec:rc,ex:(P.num&&n===P.num)?0:1,st:rn.indexOf(P.rest)===0?0:1})}
      }
      out.sort(function(a,b){return a.ex-b.ex||a.st-b.st});out=out.slice(0,8);AC.list=out;
      if(!out.length){box.innerHTML='<div class="acn">No match found. Keep typing, or type the address in full.</div>';box.hidden=false;return}
      box.innerHTML=out.map(function(o,i){return '<button type="button" class="aci" data-acpick="'+i+'" data-acfor="'+esc(inp.id)+'">'+esc(acFmt(o.road,o.rec,o.sub,o.town))+'</button>'}).join('');box.hidden=false;
    });
  },180);
}

/* ---------- events ---------- */
document.addEventListener('click',function(e){
  var t=e.target.closest('button,a');if(!t)return;
  var a=steps(),s=a[S.step];
  if(t.dataset.nav==='next'){var m=validate(s);if(m){errMsg=m;render();return}packed=null;if(s==='covers'){var av0=availLines();S.lines.sort(function(x,y){return av0.indexOf(x)-av0.indexOf(y)})}go(S.step+1)}
  else if(t.dataset.nav==='back')go(S.step-1);
  else if(t.dataset.go){var i=a.indexOf(t.dataset.go);if(i>-1)go(i)}
  else if(t.dataset.calc){calcOpen=calcOpen===t.dataset.calc?'':t.dataset.calc;render(false)}
  else if(t.dataset.use){
    var key=t.dataset.use,name=CALC_FOR[key],r=calcResult(key,name),sc=key.split('.')[0],qid=key.split('.')[1];
    var scope=(sc==='c'||sc==='p')?sc:'l:'+sc;
    setVal(scope,qid,String(Math.round(r.total)));
    var C=CALCS[name];if(C.label){var st=S.calc[key]||{},ls=[];C.rows.forEach(function(rw){var v=num(st[rw[0]]);if(v)ls.push((st['t_'+rw[0]]||rw[1])+' '+money(v))});if(ls.length)S.notes[LINES[sc]?LINES[sc].name+' - '+qid:key]=ls.join('; ')}
    calcOpen='';save();render();
  }
  else if(t.dataset.sugg){S.ind=t.dataset.sugg;S.lines=defaultLines();sugg='';save();render()}
  else if(t.id==='prefillgo'){
    var box=$('prefillbox');prefillMsg='';
    decodePrefill(box?box.value:'').then(function(p){applyPrefill(p);packed=null;prefillMsg='';go(1)},function(er){prefillMsg=er.message==='gz'?'This browser cannot unpack the code. Try Chrome or Safari, or just start from scratch.':'That does not look like a pre-fill code. Paste the whole block from the email, from the BEGIN line to the END line.';render()});
  }
  else if(t.dataset.claimadd){var ca=t.dataset.claimadd.split('|'),cur=Array.isArray(getVal(ca[0],ca[1]))?getVal(ca[0],ca[1]).slice():[];if(!cur.length)cur.push({});cur.push({});setVal(ca[0],ca[1],cur);save();render(false);var rs=document.querySelectorAll('.claimrow');if(rs.length){var lr=rs[rs.length-1].querySelector('select,input');if(lr)lr.focus()}}
  else if(t.dataset.claimdel){var cd=t.dataset.claimdel.split('|'),cl=Array.isArray(getVal(cd[0],cd[1]))?getVal(cd[0],cd[1]).slice():[];cl.splice(Number(cd[2]),1);setVal(cd[0],cd[1],cl);save();render(false)}
  else if(t.dataset.acpick!=null){
    var o=AC.list[Number(t.dataset.acpick)],ai=$(t.dataset.acfor);
    if(o&&ai){var txt=acFmt(o.road,o.rec,o.sub,o.town);ai.value=txt;setVal(ai.dataset.sc,ai.dataset.q,txt);var lk2=$('lk_'+ai.id);if(lk2)lk2.innerHTML=lkHTML(txt);var bx=$('ac_'+ai.id);if(bx){bx.hidden=true;bx.innerHTML=''}save();ai.focus()}
  }
  else if(t.id==='sendnow'){doSend()}
  else if(t.id==='copyall'&&packed){copy(packed,'copied')}
  else if(t.id==='copyaddr'){copy(BROKER.email,'copied')}
  else if(t.id==='restart'){if(t.dataset.arm!=='1'){t.dataset.arm='1';t.textContent='Press again to clear everything';return}try{localStorage.removeItem(LSK)}catch(x){}S={v:1,step:0,seg:'',ind:'',lines:[],c:{},p:{},l:{},calc:{},notes:{},decl:{name:'',ok:false}};packed=null;go(0)}
});
function copy(text,id){
  var done=function(ok){var el=$(id);if(el)el.textContent=ok?'Copied. Now paste it into your email.':'Copying was blocked. Select the text in the box and copy it by hand.';if(!ok){var ta=$('outtext');if(ta){ta.focus();ta.select()}}};
  try{navigator.clipboard.writeText(text).then(function(){done(true)},function(){done(false)})}catch(e){done(false)}
}
document.addEventListener('input',function(e){
  var t=e.target;
  if(t.dataset&&t.dataset.ck&&t.tagName==='INPUT'&&t.type!=='radio'){claimSet(t.dataset.ck,t.value);return}
  if(t.dataset&&t.dataset.cl){var st=S.calc[t.dataset.cl]=S.calc[t.dataset.cl]||{};st[t.dataset.r]=t.value;var r=calcResult(t.dataset.cl,CALC_FOR[t.dataset.cl]);var o=$('calcres');if(o)o.textContent=money(r.total);var b=$('calcbrk');if(b)b.innerHTML=brk(r);save();return}
  if(t.id==='dname'){S.decl.name=t.value;save();return}
  if(t.dataset&&t.dataset.sc&&t.dataset.q&&t.type!=='radio'&&t.type!=='checkbox'&&t.tagName!=='SELECT'){
    setVal(t.dataset.sc,t.dataset.q,t.value);
    if(t.dataset.q==='trading'&&!S.ind&&t.value.length>3){var k=indFromName(t.value);if(k!==sugg){sugg=k;render(true)}}
    if(t.dataset.q==='rego'&&t.dataset.sc==='l:vehicle'){var lr=$('lk_'+t.id);if(lr)lr.innerHTML=regoHTML(t.value)}
    if(t.dataset.addr){acSuggest(t);var lk=$('lk_'+t.id);if(lk)lk.innerHTML=lkHTML(t.value)}
    save();
  }
});
document.addEventListener('change',function(e){
  var t=e.target;
  if(t.dataset&&t.dataset.ck&&(t.tagName==='SELECT'||t.type==='radio')){claimSet(t.dataset.ck,t.value);return}
  if(t.id==='dok'){S.decl.ok=t.checked;save();return}
  if(t.dataset&&t.dataset.lineoff){S.off=S.off||{};if(t.checked)delete S.off[t.dataset.lineoff];else S.off[t.dataset.lineoff]=true;packed=null;save();render();return}
  if(t.name==='seg'){S.seg=t.value;S.ind='';S.lines=defaultLines();S.p={};S.l={};S.off={};save();render();return}
  if(t.id==='indsel'){S.ind=t.value;S.lines=defaultLines();save();render();return}
  if(t.dataset&&t.dataset.line){var l=t.dataset.line,i=S.lines.indexOf(l);if(t.checked&&i<0){S.lines.push(l);var av=availLines();S.lines.sort(function(a,b){return av.indexOf(a)-av.indexOf(b)})}else if(!t.checked&&i>-1)S.lines.splice(i,1);save();return}
  if(t.dataset&&t.dataset.sc&&t.dataset.q){
    var sc=t.dataset.sc,q=t.dataset.q;
    if(t.type!=='checkbox'&&t.type!=='radio'&&t.tagName!=='SELECT'){setVal(sc,q,t.value);save();return}
    if(t.type==='checkbox'){var cur=Array.isArray(getVal(sc,q))?getVal(sc,q).slice():[],i2=cur.indexOf(t.value);if(t.checked&&i2<0)cur.push(t.value);else if(!t.checked&&i2>-1)cur.splice(i2,1);setVal(sc,q,cur)}
    else setVal(sc,q,t.value);
    save();render(true);
  }
});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='checkbox'&&e.target.type!=='radio'){e.preventDefault()}});

loadDB().then(function(n){dbOK=n>2;
  if(S.seg==='commercial'&&S.ind&&!IND[S.ind])S.ind='';
  render();
  hashPrefill().then(function(ok){if(ok)render()});
  if(!dbOK){$('main').insertAdjacentHTML('afterbegin','<div class="notice">The industry list did not load, so you will see the general business questions. You can still complete this and we will follow up.</div>')}
});
render();
})();

/* ---------- hover tips on jargon in question labels ---------- */
(function(){
  var T=[
   [/\bNBS\b|earthquake-prone/i,'NBS means New Building Standard. A building below 34% NBS is earthquake-prone under NZ law and may need strengthening.'],
   [/\bEPS\b|expanded polystyrene/i,'Expanded polystyrene foam panels can burn fast and spread fire, so insurers ask where they are used.'],
   [/\bFR\b\)|fire retardant/i,'Fire retardant (FR) grade EPS resists flame spread better than standard grade.'],
   [/\bGVM\b/,'Gross Vehicle Mass: the maximum loaded weight the vehicle is rated for.'],
   [/indemnity period/i,'How long cover keeps paying after damage, until the business is back to normal. Rebuilds and replacing special equipment often take 18 months or more.'],
   [/gross profit/i,'Sales less the costs that rise and fall with sales (stock, materials, freight, commissions). Wages and rent stay in, because they continue during a shutdown.'],
   [/increased costs of working|AICOW|extra costs of working/i,'Additional Increased Cost of Working: the extra you must spend above normal costs to keep trading after an insured loss, such as temporary premises or hire.'],
   [/sum insured/i,'The most the insurer will pay for that item. Set too low, a claim may be only part paid.'],
   [/rebuild cost/i,'What a builder would charge to rebuild to the same standard. It is not market value or rateable value.'],
   [/retroactive date/i,'The earliest date from which past work is covered for claims made now. Keeping it continuous avoids gaps.'],
   [/\bexcess\b/i,'The amount you pay towards each claim before the insurer pays.'],
   [/limit of (liability|indemnity)|limit required/i,'The most the insurer will pay for a claim (or in total for the period).'],
   [/multi-factor|\bMFA\b/i,'A second check when logging in, such as a code from your phone, on top of the password.'],
   [/endpoint protection|antivirus/i,'Security software on computers and servers that detects viruses and ransomware.'],
   [/telematics/i,'Devices that record a vehicle’s location and how it is driven.'],
   [/\bRUC\b/,'Road user charges, paid per distance travelled by diesel and heavy vehicles.'],
   [/\bFTE\b/,'Full-time equivalent. Two half-time staff count as one.'],
   [/producer statement/i,'A statement from a designer or installer confirming the work meets the Building Code.'],
   [/Healthy Homes/i,'NZ standards for rental homes covering heating, insulation, ventilation, moisture and drainage.'],
   [/limitation of liability|limit your liability/i,'A contract clause that caps how much you could owe a client or customer.'],
   [/dual authorisation/i,'Two people must approve a payment before it is made.'],
   [/agreed value|market value/i,'Agreed value: a fixed amount paid on a total loss. Market value: what it was worth at the time of the loss.'],
   [/belonging to others|care, custody/i,'Property you hold or work on for others is often excluded from liability policies unless the cover is extended.'],
   [/hazardous or flammable/i,'Includes fuels, solvents, gas bottles, paints, chemicals and aerosols stored in quantity.'],
   [/hot work/i,'Welding, grinding, cutting or any work that makes sparks or flame.'],
   [/trade plates/i,'Plates that let a motor trader drive unregistered or stock vehicles on the road.'],
   [/sprinkler/i,'An automatic fire sprinkler system. It can reduce premiums and the size of a fire loss.'],
   [/agreed|consignment/i,null]
  ].filter(function(x){return x[1]});
  function run(root){
    root.querySelectorAll('.lab, .f > label, label.lab').forEach(function(el){
      if(el.dataset.tipd||el.closest('.chip,.calcbox,.claimrow,.calc')||el.hasAttribute('title'))return;
      var tx=el.textContent||'';
      for(var i=0;i<T.length;i++){
        if(T[i][0].test(tx)){el.dataset.tipd='1';el.title=T[i][1];var m=document.createElement('span');m.textContent=' ⓘ';m.setAttribute('aria-hidden','true');m.style.cssText='color:var(--muted,#667);cursor:help;font-weight:400';el.appendChild(m);break;}
      }
    });
  }
  function start(){
    var root=document.getElementById('main')||document.querySelector('main');if(!root)return;
    var ob=new MutationObserver(function(){ob.disconnect();try{run(root);}catch(e){}ob.observe(root,{childList:true,subtree:true});});
    ob.observe(root,{childList:true,subtree:true});try{run(root);}catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
