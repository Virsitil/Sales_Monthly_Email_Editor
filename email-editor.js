/* Email editor — shared by every *Editor.html in this project.
   Load with: <script src="email-editor.js" data-editor="1" data-key="unique-key" data-content-width="570"></script>
   Labels it reads from the email markup (see CLAUDE.md):
     tr[data-ed-section]  first row of a movable section (the eyebrow row)
     tr[data-ed-divider]  divider row that closes a section
     tr[data-ed-end]      first row after the last section (footer); nothing below is a section
     table[data-ed-cols="2|3"]  row of td.wl-col columns; columns can be duplicated/deleted, max N
     [data-ed-item]       stacked item (card, row); data-ed-space="12" = gap below, data-ed-rule="1" = 1px rule between rows
     img[data-orig-src]   editor preview only: src is a local copy, data-orig-src is the hosted URL used in the email */
(function(){
  var me = document.currentScript;
  var KEY = (me && me.getAttribute('data-key')) || ('email-editor:' + document.title);
  var CW = +((me && me.getAttribute('data-content-width')) || 570);
  var F = "'Poppins',Helvetica,Arial,sans-serif";
  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
  var root = document.querySelector('.email-body'); if (!root) return;
  function TB(){ return root.tBodies[0]; }
  root.setAttribute('contenteditable','true'); root.style.outline = 'none';

  var bs = 'font-family:inherit;font-size:13px;line-height:12px;padding:12px 16px;border:1px solid #ffffff;border-radius:3px;background:transparent;color:#ffffff;cursor:pointer;';
  var bar = document.createElement('div'); bar.setAttribute('data-editor','1');
  bar.style.cssText = 'position:sticky;top:0;z-index:10002;background:#052140;color:#ffffff;font-family:'+F+';font-size:13px;line-height:18px;padding:10px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;';
  bar.innerHTML = '<span>Edit text directly. Hover a section or item to move, duplicate or delete it. Click a link or image to change it.</span>'
    + '<span id="ed-status" style="color:#D6E8FC;"></span>'
    + '<select id="ed-versions" style="font-family:inherit;font-size:13px;line-height:18px;padding:9px 8px;border:1px solid #ffffff;border-radius:3px;background:#052140;color:#ffffff;max-width:220px;"></select>'
    + '<button type="button" id="ed-delver" style="'+bs+'display:none;">Delete version</button>'
    + '<input id="ed-vname" type="text" placeholder="Version name" style="font-family:inherit;font-size:13px;line-height:18px;padding:9px 10px;border:1px solid #ffffff;border-radius:3px;background:#ffffff;color:#052140;width:140px;">'
    + '<button type="button" id="ed-save" style="'+bs+'">Save version</button>'
    + '<button type="button" id="ed-open" style="'+bs+'">Open file</button>'
    + '<input id="ed-openfile" type="file" accept=".html,text/html" style="display:none;">'
    + '<button type="button" id="ed-copy" style="font-family:inherit;font-size:13px;line-height:12px;padding:12px 16px;border:0;border-radius:3px;background:#ffffff;color:#052140;cursor:pointer;">Copy HTML</button>';
  document.body.insertBefore(bar, document.body.firstChild);
  function $(id){ return document.getElementById(id); }

  var statusEl = $('ed-status'), stT;
  function status(m){ statusEl.textContent = m; clearTimeout(stT); stT = setTimeout(function(){ statusEl.textContent=''; }, 3500); }
  function el(tag, css){ var e=document.createElement(tag); e.setAttribute('data-editor','1'); e.style.cssText=css; document.body.appendChild(e); return e; }
  var barCss = 'position:absolute;z-index:10000;display:none;gap:4px;align-items:center;background:#052140;padding:4px;border-radius:3px;font-family:'+F+';box-shadow:0 2px 8px rgba(5,33,64,0.25);';
  var secBox = el('div','position:absolute;z-index:9998;display:none;pointer-events:none;border:2px dashed #758CE5;box-sizing:border-box;');
  var itemBox = el('div','position:absolute;z-index:9999;display:none;pointer-events:none;border:2px solid #4040D9;box-sizing:border-box;');
  var secBar = el('div', barCss), itemBar = el('div', barCss);
  function lab(b, t){ var s=document.createElement('span'); s.textContent=t; s.style.cssText='color:#D6E8FC;font-size:11px;line-height:16px;padding:0 6px;'; b.appendChild(s); }
  function btn(b, t, fn){ var x=document.createElement('button'); x.type='button'; x.textContent=t; x.style.cssText='font-family:inherit;font-size:12px;line-height:16px;padding:5px 9px;border:0;border-radius:2px;background:#ffffff;color:#052140;cursor:pointer;'; x.addEventListener('mousedown',function(e){e.preventDefault();}); x.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();fn();}); b.appendChild(x); return x; }
  lab(secBar,'Section'); btn(secBar,'\u2191',function(){moveSec(-1);}); btn(secBar,'\u2193',function(){moveSec(1);}); btn(secBar,'Duplicate',dupSec); btn(secBar,'Delete',delSec);
  lab(itemBar,'Item'); var dupBtn = btn(itemBar,'Duplicate',dupItem); btn(itemBar,'Delete',delItem);

  /* Older saved versions have no labels: infer them from the styling conventions. */
  function autoLabel(){
    if (root.querySelector('[data-ed-section]')) return;
    Array.prototype.forEach.call(TB().children, function(tr){
      var td = tr.firstElementChild; if (!td) return;
      if (td.style.textTransform==='uppercase' && td.style.fontSize==='16px') tr.setAttribute('data-ed-section','1');
      else if ((td.getAttribute('style')||'').indexOf('padding:20px;')===0 && td.querySelector('td[style*="height:1px"]')) tr.setAttribute('data-ed-divider','1');
      else if (td.classList.contains('cta-bar-cell')) tr.setAttribute('data-ed-end','1');
    });
    root.querySelectorAll('table.wl-cols').forEach(function(t){ if (!t.querySelector('.wl-spot-img')) t.setAttribute('data-ed-cols', t.classList.contains('wl-max2') ? '2' : '3'); });
    root.querySelectorAll('td[width="116"]').forEach(function(td){ var t=td.closest('table'); t.setAttribute('data-ed-item','1'); t.setAttribute('data-ed-space','12'); });
    root.querySelectorAll('tr.wl-share').forEach(function(t){ t.setAttribute('data-ed-item','1'); t.setAttribute('data-ed-rule','1'); });
  }
  autoLabel();

  function rows(){ return Array.prototype.slice.call(TB().children); }
  function has(tr, a){ return tr.hasAttribute(a); }
  function sections(){
    var out=[], cur=null;
    rows().some(function(tr){
      if (has(tr,'data-ed-end')) { if(cur) out.push(cur); cur=null; return true; }
      if (has(tr,'data-ed-section')) { if(cur) out.push(cur); cur=[tr]; }
      else if (cur) { cur.push(tr); if (has(tr,'data-ed-divider')) { out.push(cur); cur=null; } }
      return false;
    });
    if (cur) out.push(cur);
    return out;
  }
  var d0 = root.querySelector('tr[data-ed-divider]'), dividerTpl = d0 ? d0.cloneNode(true) : null;
  function normalize(){
    var s = sections();
    s.forEach(function(sec,i){
      var last = sec[sec.length-1], hd = has(last,'data-ed-divider');
      if (i < s.length-1 && !hd && dividerTpl) last.after(dividerTpl.cloneNode(true));
      if (i === s.length-1 && hd) last.remove();
    });
  }
  function secIndex(s, sec){ for (var i=0;i<s.length;i++) if (s[i][0]===sec[0]) return i; return -1; }
  var curSec=null, curItem=null;
  function hide(){ [secBox,itemBox,secBar,itemBar].forEach(function(e){e.style.display='none';}); curSec=null; curItem=null; }
  function moveSec(d){
    if(!curSec) return; var s=sections(), i=secIndex(s,curSec), j=i+d;
    if (j<0 || j>=s.length) { status(d<0?'Already the first section.':'Already the last section.'); return; }
    var frag=document.createDocumentFragment(); curSec.forEach(function(r){frag.appendChild(r);});
    if (d<0) s[j][0].before(frag); else s[j][s[j].length-1].after(frag);
    normalize(); hide(); status('Section moved.');
  }
  function dupSec(){
    if(!curSec) return; var frag=document.createDocumentFragment();
    curSec.forEach(function(r){frag.appendChild(r.cloneNode(true));});
    curSec[curSec.length-1].after(frag); normalize(); hide(); status('Section duplicated.');
  }
  function delSec(){
    if(!curSec) return; if (sections().length<=1) { status('Can\'t delete the only section.'); return; }
    curSec.forEach(function(r){r.remove();}); normalize(); hide(); status('Section deleted.');
  }

  function colTable(td){ var t = td.closest('table'); return t && t.hasAttribute('data-ed-cols') ? t : null; }
  function cols(tr){ return Array.prototype.filter.call(tr.children,function(c){return c.classList.contains('wl-col');}); }
  function maxCols(tr){ return +(tr.closest('table').getAttribute('data-ed-cols')) || 3; }
  function relayout(tr){
    var cs=cols(tr), n=cs.length, w=((100-4*(n-1))/n).toFixed(2)+'%';
    cs.forEach(function(c,i){ c.setAttribute('width',w); c.style.width=w; c.classList.toggle('wl-col-last', i===n-1);
      c.querySelectorAll('img').forEach(function(im){ if (!/width:\s*100%/.test(im.getAttribute('style')||'')) return; var ow=+im.getAttribute('width'), oh=+im.getAttribute('height'); if(!ow||!oh) return; var nw=Math.round(CW*parseFloat(w)/100); im.setAttribute('width', nw); im.setAttribute('height', Math.round(oh*nw/ow)); }); });
  }
  function respace(p){
    var a=Array.prototype.filter.call(p.children, function(c){ return c.hasAttribute('data-ed-item'); });
    a.forEach(function(t,i){
      var last = i===a.length-1;
      if (t.hasAttribute('data-ed-rule')) { Array.prototype.forEach.call(t.children,function(td){ td.style.borderBottom = last ? '' : '1px solid #BBBBBB'; }); return; }
      var sp = t.getAttribute('data-ed-space'); if (sp) t.style.margin = last ? '0' : '0 0 '+sp+'px 0';
    });
  }
  function itemOf(t){
    var c=t.closest('td.wl-col');
    if (c && root.contains(c) && colTable(c)) return c;
    var k=t.closest('[data-ed-item]'); return k && root.contains(k) ? k : null;
  }
  function mkGap(){ var g=document.createElement('td'); g.className='wl-gap'; g.setAttribute('width','4%'); g.style.cssText='width:4%;font-size:0;line-height:0;'; g.innerHTML='&nbsp;'; return g; }
  function dupItem(){
    var it=curItem; if(!it) return;
    if (it.classList.contains('wl-col')) {
      var tr=it.parentNode, mx=maxCols(tr); if (cols(tr).length>=mx) { status('Maximum '+mx+' across.'); return; }
      var g=tr.querySelector('td.wl-gap'); g = g ? g.cloneNode(true) : mkGap();
      it.after(g); g.after(it.cloneNode(true)); relayout(tr);
    } else { it.after(it.cloneNode(true)); respace(it.parentNode); }
    hide(); status('Item duplicated.');
  }
  function delItem(){
    var it=curItem; if(!it) return;
    if (it.classList.contains('wl-col')) {
      var tr=it.parentNode; if (cols(tr).length<=1) { status('Last item here. Delete the section instead.'); return; }
      var p=it.previousElementSibling, n=it.nextElementSibling;
      var g=(p && p.classList.contains('wl-gap')) ? p : n; if (g && g.classList.contains('wl-gap')) g.remove();
      it.remove(); relayout(tr);
    } else {
      var par=it.parentNode; if (Array.prototype.filter.call(par.children,function(c){return c.hasAttribute('data-ed-item');}).length<=1) { status('Last item here. Delete the section instead.'); return; }
      it.remove(); respace(par);
    }
    hide(); status('Item deleted.');
  }

  function rectOf(list){
    var a=list[0].getBoundingClientRect(), b=list[list.length-1].getBoundingClientRect();
    return { top:a.top+scrollY, left:Math.min(a.left,b.left)+scrollX, right:Math.max(a.right,b.right)+scrollX, bottom:b.bottom+scrollY };
  }
  function place(box, b, r){
    box.style.display='block'; box.style.top=r.top+'px'; box.style.left=r.left+'px'; box.style.width=(r.right-r.left)+'px'; box.style.height=(r.bottom-r.top)+'px';
    b.style.display='flex'; b.style.top=(r.top+4)+'px'; b.style.left=Math.max(4, r.right-b.offsetWidth-4)+'px';
  }
  document.addEventListener('mousemove', function(e){
    var t=e.target; if (!t.closest || panel.contains(t) || secBar.contains(t) || itemBar.contains(t)) return;
    var tr=t.closest('tr'), top=null;
    while (tr) { if (tr.parentNode===TB()) { top=tr; break; } tr = tr.parentNode.closest('tr'); }
    var sec=null; if (top) { var s=sections(); for (var i=0;i<s.length;i++) if (s[i].indexOf(top)>-1) { sec=s[i]; break; } }
    curSec=sec;
    if (sec) place(secBox, secBar, rectOf(sec)); else { secBox.style.display='none'; secBar.style.display='none'; }
    var it=itemOf(t); curItem=it;
    if (it) { dupBtn.style.display = (it.classList.contains('wl-col') && cols(it.parentNode).length >= maxCols(it.parentNode)) ? 'none' : ''; place(itemBox, itemBar, rectOf([it])); }
    else { itemBox.style.display='none'; itemBar.style.display='none'; }
  });
  window.addEventListener('resize', hide);

  var panel = el('div','position:absolute;z-index:10001;display:none;background:#ffffff;border:1px solid #BBBBBB;box-shadow:0 4px 16px rgba(5,33,64,0.18);padding:14px;width:320px;box-sizing:border-box;font-family:'+F+';font-size:12px;line-height:18px;color:#052140;');
  var target=null;
  function closePanel(){ panel.style.display='none'; target=null; }
  var inS='width:100%;box-sizing:border-box;font-family:inherit;font-size:12px;padding:8px;border:1px solid #BBBBBB;border-radius:3px;margin:0 0 10px 0;';
  function openPanel(t, kind){
    target=t;
    var url = kind==='image' ? (t.getAttribute('data-orig-src') || t.getAttribute('src')) : (t.getAttribute('href')||'');
    panel.innerHTML = '<div style="font-weight:700;font-size:13px;margin:0 0 8px 0;">' + (kind==='image'?'Image':'Link') + '</div>'
      + '<label style="display:block;margin:0 0 4px 0;">' + (kind==='image'?'Hosted image URL (used in the email)':'Link URL') + '</label>'
      + '<input id="ed-url" type="text" style="'+inS+'">'
      + (kind==='image' ? '<label style="display:block;margin:0 0 4px 0;">Alt text</label><input id="ed-alt" type="text" style="'+inS+'"><label style="display:block;margin:0 0 4px 0;">Or upload a file to preview it here</label><input id="ed-file" type="file" accept="image/*" style="font-family:inherit;font-size:12px;margin:0 0 6px 0;"><div style="color:#555555;font-size:11px;line-height:16px;margin:0 0 10px 0;">Uploads are preview only. The copied email uses the URL above, so add the hosted URL too.</div>' : '')
      + '<div style="display:flex;gap:8px;"><button id="ed-apply" type="button" style="font-family:inherit;font-size:12px;padding:8px 12px;border:0;border-radius:3px;background:#052140;color:#ffffff;cursor:pointer;">Apply</button><button id="ed-cancel" type="button" style="font-family:inherit;font-size:12px;padding:8px 12px;border:1px solid #BBBBBB;border-radius:3px;background:#ffffff;color:#052140;cursor:pointer;">Cancel</button></div>';
    panel.querySelector('#ed-url').value = url;
    var altIn = panel.querySelector('#ed-alt'); if (altIn) altIn.value = t.getAttribute('alt') || '';
    var r=t.getBoundingClientRect();
    panel.style.display='block';
    panel.style.top=(r.bottom+scrollY+6)+'px';
    panel.style.left=Math.max(8, Math.min(r.left+scrollX, scrollX+document.documentElement.clientWidth-328))+'px';
    var orig=url;
    panel.querySelector('#ed-apply').onclick=function(){
      var v=panel.querySelector('#ed-url').value.trim();
      if (kind==='image') {
        if (v && v!==orig) { target.setAttribute('src', v); target.setAttribute('data-orig-src', v); target.removeAttribute('data-ed-preview'); }
        var al = altIn.value.trim(); target.setAttribute('alt', al); if (target.hasAttribute('title')) target.setAttribute('title', al);
      } else target.setAttribute('href', v);
      closePanel(); status(kind==='image'?'Image updated.':'Link updated.');
    };
    panel.querySelector('#ed-cancel').onclick=closePanel;
    var f=panel.querySelector('#ed-file');
    if (f) f.onchange=function(){ var file=f.files[0]; if(!file) return; var rd=new FileReader(); rd.onload=function(){ target.setAttribute('src', rd.result); target.setAttribute('data-ed-preview','1'); target.style.objectFit='contain'; }; rd.readAsDataURL(file); };
  }
  document.addEventListener('keydown', function(e){ if (e.key==='Escape') closePanel(); });
  document.addEventListener('click', function(e){
    var t=e.target; if (!t.closest || t.closest('[data-editor]')) return;
    var a=t.closest('a'), img=t.closest('img');
    if (img && root.contains(img)) { e.preventDefault(); openPanel(img,'image'); return; }
    if (a && root.contains(a)) { e.preventDefault(); openPanel(a,'link'); return; }
    closePanel();
  }, true);

  var ORIGINAL = root.innerHTML;
  var imgMap = {}; root.querySelectorAll('img[data-orig-src]').forEach(function(i){ imgMap[i.getAttribute('data-orig-src')] = i.getAttribute('src'); });
  var sel = $('ed-versions'), delBtn = $('ed-delver'), nameIn = $('ed-vname');
  function store(){ try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e){ return null; } }
  function persist(list){ try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch(e){ return false; } }
  function fill(selected){
    var list = store() || [];
    sel.innerHTML = '<option value="orig">Original template</option>' + list.map(function(v,i){ return '<option value="'+i+'">'+v.name.replace(/</g,'&lt;')+'</option>'; }).join('');
    sel.value = selected == null ? 'orig' : String(selected);
    delBtn.style.display = sel.value === 'orig' ? 'none' : '';
  }
  function load(html){
    closePanel(); hide();
    root.innerHTML = html;
    root.querySelectorAll('img').forEach(function(i){
      var o = i.getAttribute('data-orig-src') || i.getAttribute('src');
      if (imgMap[o]) { i.setAttribute('data-orig-src', o); if (!i.hasAttribute('data-ed-preview') && !i.hasAttribute('data-wl-preview')) i.setAttribute('src', imgMap[o]); }
    });
    autoLabel();
  }
  sel.addEventListener('change', function(){
    if (sel.value === 'orig') { load(ORIGINAL); status('Original template loaded.'); }
    else { var v = (store()||[])[+sel.value]; if (v) { load(v.html); nameIn.value = v.name; status('Loaded "' + v.name + '".'); } }
    delBtn.style.display = sel.value === 'orig' ? 'none' : '';
  });
  $('ed-save').addEventListener('click', function(){
    var list = store();
    if (!list) { status('Saving isn\'t available here. Use Copy HTML.'); return; }
    var d = new Date(), name = nameIn.value.trim() || ('Version ' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    var html = root.innerHTML, idx = -1;
    list.forEach(function(v,i){ if (v.name === name) idx = i; });
    if (idx > -1) list[idx] = {name:name, html:html, date:d.toISOString()}; else { list.push({name:name, html:html, date:d.toISOString()}); idx = list.length-1; }
    if (!persist(list)) { status('Not enough space to save. Use Copy HTML.'); return; }
    nameIn.value = name; fill(idx); status('Saved "' + name + '". The original template is unchanged.');
  });
  delBtn.addEventListener('click', function(){
    var list = store() || [], i = +sel.value; if (isNaN(i) || !list[i]) return;
    var n = list[i].name; list.splice(i,1); persist(list); nameIn.value = ''; load(ORIGINAL); fill(null); status('Deleted "' + n + '".');
  });
  var openIn = $('ed-openfile');
  $('ed-open').addEventListener('click', function(){ openIn.click(); });
  openIn.addEventListener('change', function(){
    var f = openIn.files[0]; if (!f) return; var rd = new FileReader();
    rd.onload = function(){
      var d = new DOMParser().parseFromString(rd.result, 'text/html'), body = d.querySelector('.email-body');
      if (!body) { status('That file isn\'t an email built from this template.'); return; }
      load(body.innerHTML); nameIn.value = f.name.replace(/\.html?$/i,''); sel.value = 'orig'; delBtn.style.display='none';
      status('Opened ' + f.name + '. Save version to keep it here.');
    };
    rd.readAsText(f); openIn.value = '';
  });
  fill(null);

  function buildHtml(){
    var doc = document.documentElement.cloneNode(true);
    doc.querySelectorAll('[data-editor], template#__bundler_thumbnail').forEach(function(n){ n.remove(); });
    doc.querySelectorAll('img[data-orig-src]').forEach(function(i){ i.setAttribute('src', i.getAttribute('data-orig-src')); i.removeAttribute('data-orig-src'); i.removeAttribute('data-ed-preview'); i.removeAttribute('data-wl-preview'); });
    doc.querySelectorAll('[contenteditable]').forEach(function(n){ n.removeAttribute('contenteditable'); n.style.outline=''; });
    return '<!DOCTYPE html>' + doc.outerHTML;
  }
  var copyBox = el('div','position:fixed;inset:0;z-index:10003;display:none;background:rgba(5,33,64,0.6);align-items:center;justify-content:center;padding:24px;box-sizing:border-box;');
  copyBox.innerHTML = '<div style="background:#ffffff;width:100%;max-width:720px;padding:20px;box-sizing:border-box;font-family:'+F+';color:#052140;font-size:13px;line-height:20px;"><div style="font-weight:700;font-size:16px;margin:0 0 6px 0;">Email HTML</div><div id="ed-copymsg" style="margin:0 0 10px 0;color:#555555;"></div><textarea id="ed-copyta" readonly style="width:100%;height:300px;box-sizing:border-box;font-family:Consolas,monospace;font-size:11px;line-height:16px;border:1px solid #BBBBBB;padding:8px;"></textarea><div style="display:flex;gap:8px;margin:12px 0 0 0;"><button id="ed-copyagain" type="button" style="font-family:inherit;font-size:13px;padding:10px 14px;border:0;border-radius:3px;background:#052140;color:#ffffff;cursor:pointer;">Copy</button><button id="ed-copyclose" type="button" style="font-family:inherit;font-size:13px;padding:10px 14px;border:1px solid #BBBBBB;border-radius:3px;background:#ffffff;color:#052140;cursor:pointer;">Close</button></div></div>';
  var ta = copyBox.querySelector('#ed-copyta'), cmsg = copyBox.querySelector('#ed-copymsg');
  var OK = 'Copied. Paste it into your email platform\'s HTML editor or a new .html file.', MANUAL = 'Press Ctrl+C (Cmd+C on Mac) to copy the selected HTML.';
  function tryCopy(){
    ta.focus(); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch(e){}
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(function(){ cmsg.textContent=OK; }, function(){ if(!ok) cmsg.textContent=MANUAL; });
    cmsg.textContent = ok ? OK : MANUAL;
  }
  copyBox.querySelector('#ed-copyagain').addEventListener('click', tryCopy);
  copyBox.querySelector('#ed-copyclose').addEventListener('click', function(){ copyBox.style.display='none'; });
  $('ed-copy').addEventListener('click', function(){ ta.value = buildHtml(); copyBox.style.display='flex'; tryCopy(); });
  });
})();
