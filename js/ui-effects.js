// ─── UI EFFECTS ───────────────────────────────────────────────────────────────
function spawnRipple(btn, e) {
  var r = document.createElement('span');
  r.className = 'ripple-el';
  var rect = btn.getBoundingClientRect();
  r.style.top  = (e.clientY - rect.top)  + 'px';
  r.style.left = (e.clientX - rect.left) + 'px';
  btn.appendChild(r);
  setTimeout(function() { r.remove(); }, 600);
}

function spawnParticles(btn, color) {
  var rect = btn.getBoundingClientRect();
  var cx = rect.left + rect.width / 2;
  var cy = rect.top  + rect.height / 2;
  var container = document.createElement('div');
  container.className = 'hint-particles';
  document.body.appendChild(container);
  var colors = color === 'green'
    ? ['#4fffb0','#a0ffda','#00e87a','#fff']
    : ['#ffb34f','#ffd08a','#ff8c00','#fff'];
  for (var i = 0; i < 14; i++) {
    var p = document.createElement('div');
    p.className = 'hint-particle';
    var angle = (i / 14) * Math.PI * 2;
    var dist  = 40 + Math.random() * 55;
    var tx = Math.cos(angle) * dist;
    var ty = Math.sin(angle) * dist;
    var dur = (0.45 + Math.random() * 0.3) + 's';
    p.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;background:' + colors[i % colors.length] + ';--tx:' + tx + 'px;--ty:' + ty + 'px;--dur:' + dur + ';animation-delay:' + (Math.random() * 0.05) + 's';
    container.appendChild(p);
  }
  setTimeout(function() { container.remove(); }, 900);
}

function flashScore() {
  var el = document.getElementById('total-score');
  el.classList.remove('score-flash');
  void el.offsetWidth; // reflow
  el.classList.add('score-flash');
  setTimeout(function() { el.classList.remove('score-flash'); }, 500);
}

function burstStars(cx,cy){
  var burst=document.createElement('div'); burst.className='star-burst'; document.body.appendChild(burst);
  for(var i=0;i<12;i++){
    var p=document.createElement('div'); p.className='star-particle'; p.textContent='⭐';
    var angle=Math.random()*360,dist=90+Math.random()*140;
    var tx=Math.round(Math.cos(angle*Math.PI/180)*dist),ty=Math.round(Math.sin(angle*Math.PI/180)*dist);
    p.style.cssText='left:'+cx+'px;top:'+cy+'px;--tx:'+tx+'px;--ty:'+ty+'px;--rot:'+Math.round(Math.random()*360)+'deg;animation-delay:'+(Math.random()*0.18)+'s';
    burst.appendChild(p);
  }
  setTimeout(function(){burst.remove();},1400);
}


// ─── TWEMOJI HELPER ──────────────────────────────────────────────────────────────
function applyEmoji(el) {
  if (typeof twemoji !== 'undefined') {
    twemoji.parse(el, {
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
    });
  }
}

