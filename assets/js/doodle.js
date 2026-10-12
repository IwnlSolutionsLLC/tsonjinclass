/* A shared sketchbook: completed marks are additive; finished pages are read-only. */
(function () {
  'use strict';
  var C = window.C122, root = document.getElementById('view-doodle');
  if (!C || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('doodleCanvas'), ctx = canvas.getContext('2d'), stage = $('doodleCanvasStage');
  var W = 1600, H = 1000;
  var colors = ['#254536','#000000','#737373','#FFFFFF','#CE5965','#EB8373','#FFB45C','#EBCB66','#99B576','#468977','#73B9AF','#A2D3EB','#527CB9','#7667A1','#B493CB','#DC99B6','#955A48','#E9D7B5','#8C9D89','#F15479','#337CE8','#F0BB00','#82D477','#BE73EF'];
  var stickers = { smile:'🙂',heart:'❤️',star:'⭐',sparkles:'✨',party:'🥳',sun:'☀️',flower:'🌼',graduate:'🎓',coffee:'☕',cat:'🐱',rocket:'🚀',rainbow:'🌈',clap:'👏',fire:'🔥','dancing-heart':'💖','twinkle-star':'🌟','party-confetti':'🎉' };
  var animated = { 'dancing-heart':'bounce', 'twinkle-star':'twinkle', 'party-confetti':'spin' };
  var state = { page:null, ops:[], revision:0, pending:[], batch:null, drawing:null, drawPointer:null, pan:null, spacePan:false, fitMode:true, place:null, tool:'pen', color:'#254536', width:5, scale:1, generation:0, saving:false, pageLoading:false, pagesLoading:false, nextCursor:null, pages:[], totalPages:0, pageFilter:'all', search:'', thumbnails:new Map(), thumbQueue:[], thumbBusy:0, thumbEpoch:0, thumbObserver:null, pin:null, images:new Map(), saveTimer:null, retryTimer:null, retryDelay:3000, pollTimer:null, picker:null, statusError:'', refreshPromise:null };
  try { var brush=JSON.parse(localStorage.getItem('c122:doodle-brush')||'null');if(brush){if(/^#[a-f0-9]{6}$/i.test(brush.color))state.color=brush.color;if(Number(brush.width)>=1 && Number(brush.width)<=48)state.width=Number(brush.width);if(brush.tool==='pen' || brush.tool==='highlight')state.tool=brush.tool;} } catch (_) {}
  function uuid() { return window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'doodle-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2); }
  function visible() { return !root.hidden && C.state.member; }
  function draftKey(page) { return 'c122:doodle-draft:' + page; }
  function remember() {
    if (!state.page) return;
    try {
      if (!state.pending.length && !state.batch) localStorage.removeItem(draftKey(state.page.id));
      else localStorage.setItem(draftKey(state.page.id), JSON.stringify({ pending:state.pending, batch:state.batch }));
    } catch (_) { status('Браузер ноорог хадгалж чадсангүй. «Хадгалах» товчийг дарна уу.', true); }
  }
  function restore(page) {
    state.pending=[]; state.batch=null;
    try {
      var saved=JSON.parse(localStorage.getItem(draftKey(page)) || 'null');
      if (saved && Array.isArray(saved.pending)) state.pending=saved.pending.slice(0,1000);
      if (saved && saved.batch && typeof saved.batch.requestId==='string' && Array.isArray(saved.batch.ops)) state.batch=saved.batch;
    } catch (_) { /* Invalid browser drafts never affect server data. */ }
  }
  function status(message, error) { var el=$('doodleSaveStatus');el.textContent=message || '';el.classList.toggle('error',!!error);el.dataset.state=error?'error':state.saving?'saving':(state.pending.length || state.batch)?'pending':'saved'; }
  function brushPreview() { var el=$('doodleBrushPreview');el.style.setProperty('--brush-color',state.color);el.style.setProperty('--brush-width',Math.max(3,Math.min(24,state.width))+'px');el.classList.toggle('highlight',state.tool==='highlight');$('doodleColorValue').textContent=state.color;try{localStorage.setItem('c122:doodle-brush',JSON.stringify({color:state.color,width:state.width,tool:state.tool}));}catch(_){} }
  function cursor() { canvas.style.cursor=state.pan?'grabbing':state.place?'crosshair':state.tool==='pan' || state.spacePan || (state.page && state.page.sealed)?'grab':'crosshair'; }
  function updateControls() {
    var page=state.page, readonly=!!(page && page.sealed), busy=state.saving || state.pageLoading;
    $('doodleSave').disabled=!page || busy || readonly || (!state.pending.length && !state.batch);
    $('doodleFinalize').disabled=!page || busy || readonly;
    $('doodleFinalize').textContent=readonly ? 'Дууссан хуудас' : 'Хуудсыг дуусгах';
    C.$$('.doodle-tools button, #doodleColors button, #doodleColor, #doodleWidth',root).forEach(function (button) {
      if (button.id!=='doodleSave' && button.id!=='doodleFinalize') button.disabled=!page || state.pageLoading || (readonly && button.dataset.doodleTool!=='pan');
    });
    cursor();$('doodleRetry').hidden=!state.statusError || (!state.pending.length && !state.batch) || readonly;$('doodleRetry').disabled=busy;
    if (page) $('doodlePageMeta').textContent=(page.author ? page.author+' · ' : '') + (page.sealed ? 'Дууссан · Дахин зурж, арилгахгүй' : 'Нээлттэй · Хадгалсан зурлага арилгахгүй') + ' · '+state.ops.length+' дурсамж';
    if (!state.statusError) status(state.saving ? 'Вэбсайтад хадгалж байна…' : (state.pending.length || state.batch) ? navigator.onLine===false?'Холболтгүй · Ноорог энэ төхөөрөмжид хадгалагдсан':'Шинэ зурлага байна · Автоматаар хадгална' : readonly ? 'Вэбсайтад хадгалагдсан · Шинэ хуудсанд үргэлжлүүлээрэй' : 'Вэбсайтад хадгалагдсан · Бүх төхөөрөмжөөс нээнэ');
  }
  function setColor(value) { state.color=value.toUpperCase(); $('doodleColor').value=value; C.$$('.doodle-swatch',root).forEach(function (button) { var on=button.dataset.color===state.color;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on)); });brushPreview(); }
  colors.forEach(function (color) { var button=C.el('<button type="button" class="doodle-swatch" data-color="'+color+'" style="background:'+color+'" aria-label="Өнгө '+color+'" title="'+color+'" aria-pressed="false"></button>');button.onclick=function () {setColor(color);};$('doodleColors').appendChild(button); });
  setColor(state.color);
  function chooseTool(tool) { if(state.drawing || state.pan)completeStroke();state.tool=tool;state.place=null;$('doodlePlacement').hidden=true;C.$$('[data-doodle-tool]',root).forEach(function (button) {var on=button.dataset.doodleTool===tool;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));});cursor();brushPreview(); }
  C.$$('[data-doodle-tool]',root).forEach(function (button) {button.onclick=function () {chooseTool(button.dataset.doodleTool);};});
  $('doodleColor').oninput=function (event) {setColor(event.target.value);};
  function setWidth(value) {state.width=Math.max(1,Math.min(48,Number(value)||5));$('doodleWidth').value=state.width;$('doodleWidthValue').textContent=state.width;C.$$('[data-doodle-width]',root).forEach(function(button){var on=Number(button.dataset.doodleWidth)===state.width;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));});brushPreview();}
  $('doodleWidth').oninput=function (event) {setWidth(event.target.value);};C.$$('[data-doodle-width]',root).forEach(function(button){button.onclick=function(){setWidth(button.dataset.doodleWidth);};});setWidth(state.width);chooseTool(state.tool);
  function api(action, options, retry) { return C.api(action,options).catch(function (error) {if(error.status===403 && !retry && C.state.member) return C.refreshStatus().then(function () {return api(action,options,true);});throw error;}); }
  function planSave() { clearTimeout(state.saveTimer);state.saveTimer=setTimeout(function () {save().catch(function () {});},1500); }
  function addOperation(op) { if(!state.page || state.page.sealed) return;state.pending.push(op);state.statusError='';remember();render();updateControls();planSave(); }
  function batchSize(ops) { var count=0,points=0;for(var i=0;i<ops.length && i<64;i++){var next=ops[i].points?ops[i].points.length:0;if(count && points+next>19000)break;count++;points+=next;}return count; }
  async function save() {
    if (!state.page || !C.state.member || state.saving) return;
    var pageId=state.page.id,generation=state.generation;
    clearTimeout(state.saveTimer);clearTimeout(state.retryTimer);if(state.drawing)completeStroke();
    state.saving=true;state.statusError='';updateControls();
    try {
      while(state.batch || state.pending.length) {
        if (!state.batch) {state.batch={requestId:uuid(),ops:state.pending.splice(0,batchSize(state.pending))};remember();}
        var batch=state.batch, result=await api('doodle_append',{body:{page:pageId,requestId:batch.requestId,ops:batch.ops}});
        if(generation!==state.generation || !state.page || state.page.id!==pageId) return;
        appendServer(result.ops || []);state.batch=null;remember();render();
      }
      await refreshPage();state.retryDelay=3000;
    } catch(error) {
      if(generation!==state.generation)return;
      state.statusError=error.message;
      if(error.status===409){state.statusError='Энэ хуудсыг дуусгасан байна. Хадгалаагүй зурлагаа шинэ хуудсанд үргэлжлүүлээрэй.';refreshPage().catch(function () {});}
      status(state.statusError,true);remember();
      if((error.status===0 || error.status>=500) && state.page && !state.page.sealed && visible()) {state.retryTimer=setTimeout(function(){if(visible() && navigator.onLine!==false)save().catch(function(){});},state.retryDelay);state.retryDelay=Math.min(30000,state.retryDelay*2);}
      throw error;
    } finally {if(generation===state.generation){state.saving=false;updateControls();}}
  }
  function appendServer(ops) {
    var known=new Set(state.ops.map(function (op) {return op.serverid || op.id || op.revision;}));
    ops.forEach(function (op) {var key=op.serverid || op.id || op.revision;if(!known.has(key)){state.ops.push(op);known.add(key);}});
    state.ops.sort(function (a,b) {return (a.revision || 0)-(b.revision || 0);});
  }
  async function refreshPage() {
    if(!state.page || state.refreshPromise || !C.state.member)return state.refreshPromise;
    var pageId=state.page.id,generation=state.generation;
    state.refreshPromise=(async function () {
      var more=true;
      while(more) {
        var result=await api('doodle_page',{query:{page:pageId,after:state.revision}});
        if(generation!==state.generation || !state.page || state.page.id!==pageId)return;
        state.page=result.page;appendServer(result.ops || []);more=!!result.hasMore;
        state.revision=Math.max(state.revision,Number(result.nextAfter)||0);
        if(!more)state.revision=Math.max(state.revision,Number(result.version)||0);
      }
      render();updateControls();
    })();
    try{return await state.refreshPromise;}finally{if(generation===state.generation)state.refreshPromise=null;}
  }
  function background(context,page) {
    var dark=page && page.background==='dark';context.fillStyle=dark?'#263f35':'#fffdf5';context.fillRect(0,0,W,H);
    if(page && page.background==='grid'){context.beginPath();context.strokeStyle='#dce2d8';context.lineWidth=1;for(var x=0;x<=W;x+=40){context.moveTo(x,0);context.lineTo(x,H);}for(var y=0;y<=H;y+=40){context.moveTo(0,y);context.lineTo(W,y);}context.stroke();}
    else if(page && page.background==='dots'){context.fillStyle='#c3cbbc';for(var dx=20;dx<W;dx+=30)for(var dy=20;dy<H;dy+=30){context.beginPath();context.arc(dx,dy,1.2,0,Math.PI*2);context.fill();}}
  }
  function assetImage(op) {
    var key=op.asset, existing=state.images.get(key);if(existing)return existing;
    var img=new Image(), generation=state.generation;var item={img:img,ready:false,error:false};state.images.set(key,item);
    img.onload=function () {if(generation!==state.generation)return;item.ready=true;render();};img.onerror=function () {item.error=true;if(generation===state.generation)status('Зарим зураг ачаалагдсангүй. Холболт сэргэсний дараа хуудсаа дахин нээгээрэй.',true);};
    img.src=op.assetUrl || 'api.php?action=doodle_asset&asset='+encodeURIComponent(key);return item;
  }
  function wrapText(context,text,x,y,maxWidth,lineHeight) {
    String(text).split('\n').forEach(function (paragraph) {
      if(!paragraph){y+=lineHeight;return;}
      var words=Array.from(paragraph),line='';
      words.forEach(function (letter) {if(context.measureText(line+letter).width>maxWidth && line){context.fillText(line,x,y);y+=lineHeight;line=letter;}else line+=letter;});
      if(line){context.fillText(line,x,y);y+=lineHeight;}
    });
  }
  function paint(context,op,resolveImage) {
    context.save();
    if(op.type==='stroke') {
      var points=op.points || [];context.lineCap='round';context.lineJoin='round';context.strokeStyle=op.color;context.fillStyle=op.color;context.lineWidth=op.width;context.globalAlpha=op.tool==='highlight'?.3:1;
      if(points.length===1){context.beginPath();context.arc(points[0][0],points[0][1],op.width/2,0,Math.PI*2);context.fill();}
      else if(points.length){context.beginPath();context.moveTo(points[0][0],points[0][1]);for(var i=1;i<points.length;i++)context.lineTo(points[i][0],points[i][1]);context.stroke();}
    } else if(op.type==='text') {context.fillStyle=op.color;context.font=op.fontSize+'px "Manrope",sans-serif';context.textBaseline='top';wrapText(context,op.text,op.x,op.y,Math.min(700,W-op.x),op.fontSize*1.3);}
    else if(op.type==='sticker') {context.font=Math.min(op.width,op.height)*.8+'px "Apple Color Emoji","Segoe UI Emoji",sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(stickers[op.sticker]||'✦',op.x+op.width/2,op.y+op.height/2);}
    else if(op.type==='image') {var image=(resolveImage||assetImage)(op);if(image.ready)context.drawImage(image.img,op.x,op.y,op.width,op.height);else{context.fillStyle='#ececdf';context.fillRect(op.x,op.y,op.width,op.height);}}
    context.restore();
  }
  function render() {
    background(ctx,state.page);
    var all=state.ops.concat(state.batch?state.batch.ops:[],state.pending);all.forEach(function (op) {paint(ctx,op);});
    if(state.drawing)paint(ctx,state.drawing);
    // GIFs and animated emoji remain live, while the PNG export captures their current frame.
    var fragment=document.createDocumentFragment();
    all.forEach(function (op) {
      var overlay=null;
      if(op.type==='image' && op.assetMime==='image/gif'){overlay=document.createElement('img');overlay.className='doodle-image-overlay';overlay.alt='';overlay.src=op.assetUrl || 'api.php?action=doodle_asset&asset='+encodeURIComponent(op.asset);}
      else if(op.type==='sticker' && animated[op.sticker]){overlay=document.createElement('span');overlay.className='doodle-sticker-overlay '+animated[op.sticker];overlay.textContent=stickers[op.sticker];overlay.style.fontSize=(Math.min(op.width,op.height)*.8)+'px';}
      if(overlay){overlay.style.left=op.x+'px';overlay.style.top=op.y+'px';overlay.style.width=op.width+'px';overlay.style.height=op.height+'px';fragment.appendChild(overlay);}
    });
    $('doodleOverlays').replaceChildren(fragment);
  }
  function setScale(scale,anchor) {
    var shell=$('doodleCanvasShell'),old=state.scale,style=getComputedStyle(shell),px=parseFloat(style.paddingLeft)||0,py=parseFloat(style.paddingTop)||0;
    var center=anchor===false?null:anchor||{x:shell.clientWidth/2,y:shell.clientHeight/2};
    var at=center?{x:(shell.scrollLeft+center.x-px)/old,y:(shell.scrollTop+center.y-py)/old}:null;
    state.scale=Math.max(.12,Math.min(3,scale));var width=W*state.scale,height=H*state.scale;stage.style.width=width+'px';stage.style.height=height+'px';canvas.style.width=width+'px';canvas.style.height=height+'px';$('doodleOverlays').style.width=W+'px';$('doodleOverlays').style.height=H+'px';$('doodleOverlays').style.transform='scale('+state.scale+')';$('doodleOverlays').style.transformOrigin='top left';$('doodleZoomValue').textContent=Math.round(state.scale*100)+'%';
    if(at){shell.scrollLeft=at.x*state.scale+px-center.x;shell.scrollTop=at.y*state.scale+py-center.y;}
  }
  function fit() {var shell=$('doodleCanvasShell'),style=getComputedStyle(shell),width=shell.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)-2,height=(parseFloat(style.maxHeight)||window.innerHeight*.7)-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0)-2;state.fitMode=true;setScale(Math.min(width/W,height/H),false);shell.scrollLeft=0;shell.scrollTop=0;}
  function zoom(scale,anchor){state.fitMode=false;setScale(scale,anchor);}
  function point(event) {var rect=canvas.getBoundingClientRect();return [Math.round(Math.max(0,Math.min(W,(event.clientX-rect.left)*W/rect.width))*10)/10,Math.round(Math.max(0,Math.min(H,(event.clientY-rect.top)*H/rect.height))*10)/10];}
  canvas.addEventListener('pointerdown',function (event) {
    if(!state.page || state.pageLoading || state.drawing || state.pan || (event.pointerType==='mouse' && event.button!==0 && event.button!==1))return;
    event.preventDefault();canvas.focus({preventScroll:true});
    if((state.tool==='pan' && !state.place) || state.spacePan || state.page.sealed || event.button===1){state.pan={id:event.pointerId,x:event.clientX,y:event.clientY,left:$('doodleCanvasShell').scrollLeft,top:$('doodleCanvasShell').scrollTop};canvas.setPointerCapture(event.pointerId);cursor();return;}
    var position=point(event);
    if(state.place){var op=Object.assign({},state.place);op.x=Math.min(W-(op.width||20),position[0]);op.y=Math.min(H-(op.height||30),position[1]);delete op.label;addOperation(op);chooseTool(state.tool);return;}
    state.drawPointer=event.pointerId;state.drawing={type:'stroke',points:[position],color:state.color,width:state.width,tool:state.tool};canvas.setPointerCapture(event.pointerId);paint(ctx,state.drawing);
  });
  canvas.addEventListener('pointermove',function (event) {
    if(state.pan && state.pan.id===event.pointerId){event.preventDefault();$('doodleCanvasShell').scrollLeft=state.pan.left+state.pan.x-event.clientX;$('doodleCanvasShell').scrollTop=state.pan.top+state.pan.y-event.clientY;return;}
    if(!state.drawing || state.drawPointer!==event.pointerId)return;event.preventDefault();var events=event.getCoalescedEvents?event.getCoalescedEvents():[event];events.forEach(function (sample) {var p=point(sample),last=state.drawing.points[state.drawing.points.length-1];if(Math.hypot(p[0]-last[0],p[1]-last[1])<.8)return;if(state.drawing.points.length<7900){state.drawing.points.push(p);paint(ctx,{type:'stroke',points:[last,p],color:state.drawing.color,width:state.drawing.width,tool:state.drawing.tool});}});
  });
  function completeStroke(event) {if(state.pan && (!event || state.pan.id===event.pointerId)){var panId=state.pan.id;state.pan=null;if(canvas.hasPointerCapture(panId))canvas.releasePointerCapture(panId);cursor();return;}if(!state.drawing || (event && state.drawPointer!==event.pointerId))return;var stroke=state.drawing,pointer=state.drawPointer;state.drawing=null;state.drawPointer=null;if(pointer!==null && canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);addOperation(stroke);}
  canvas.addEventListener('pointerup',completeStroke);canvas.addEventListener('pointercancel',completeStroke);canvas.addEventListener('lostpointercapture',completeStroke);
  function placement(op,label) {if(!state.page || state.page.sealed)return;state.place=op;$('doodlePlacement').hidden=false;$('doodlePlacement').querySelector('span').textContent=label+' · Самбарын хүссэн хэсэгт дарж байрлуулна уу.';cursor();canvas.focus({preventScroll:true});}
  $('doodleCancelPlace').onclick=function () {chooseTool(state.tool);};
  canvas.addEventListener('keydown',function (event) {if(event.key==='Escape')chooseTool(state.tool);if(event.key==='Enter' && state.place){event.preventDefault();var op=Object.assign({},state.place,{x:Math.max(0,W/2-(state.place.width||200)/2),y:Math.max(0,H/2-(state.place.height||100)/2)});addOperation(op);chooseTool(state.tool);}});
  function textModal(sticky) {
    var modal=C.openModal('<h3>'+(sticky?'Наадаг тэмдэглэл':'Бичвэр нэмэх')+'</h3><p class="doodle-picker-note">Бичээд самбарын хүссэн хэсэгт байрлуулна уу. Хадгалсан бичвэрийг арилгахгүй.</p><form><div class="field"><label for="doodleNote">Бичвэр</label><textarea class="input doodle-text-input" id="doodleNote" maxlength="800" placeholder="Бидний хэлэхийг хүссэн үг…" autofocus required></textarea></div><div class="field"><label for="doodleFontSize">Үсгийн хэмжээ</label><select class="input" id="doodleFontSize"><option value="22">Жижиг — 22</option><option value="32" selected>Дунд — 32</option><option value="48">Том — 48</option><option value="72">Маш том — 72</option></select></div><div class="err" role="status"></div><div class="actions"><button class="btn btn-ghost" type="button" data-close>Цуцлах</button><button class="btn btn-primary" type="submit">Байрлуулах</button></div></form>');
    modal.el.querySelector('form').onsubmit=async function (event) {
      event.preventDefault();var text=modal.el.querySelector('textarea').value.trim();if(!text)return;var size=Number(modal.el.querySelector('select').value);
      if(!sticky){modal.close();placement({type:'text',text:text,color:state.color,fontSize:size},'Бичвэр');return;}
      var button=modal.el.querySelector('[type=submit]');button.disabled=true;
      try {
        var note=document.createElement('canvas');note.width=500;note.height=Math.min(800,Math.max(220,Math.ceil(text.length/22)*size*1.4+70));var nc=note.getContext('2d');nc.fillStyle='#fff0ac';nc.fillRect(0,0,note.width,note.height);nc.fillStyle=state.color;nc.font=size+'px "Manrope",sans-serif';nc.textBaseline='top';wrapText(nc,text,28,28,444,size*1.4);var blob=await new Promise(function(resolve){note.toBlob(resolve,'image/png');});var result=await api('doodle_upload',{query:{name:'Тэмдэглэл.png'},raw:blob,type:'image/png'});modal.close();placeAsset(result.asset,'Тэмдэглэл');
      } catch(error){modal.el.querySelector('.err').textContent=error.message;button.disabled=false;}
    };
  }
  $('doodleText').onclick=function () {textModal(false);};$('doodleSticky').onclick=function () {textModal(true);};
  function stickerModal(gifs) {
    var ids=Object.keys(stickers).filter(function (key) {return gifs?!!animated[key]:!animated[key];});
    var gifNames={heart:'Зүрх',star:'Од',confetti:'Баяр',rainbow:'Солонго',flower:'Цэцэг',smile:'Инээмсэглэл'};
    var gifHtml=gifs?'<div class="doodle-picker-grid doodle-builtin-gifs">'+Object.keys(gifNames).map(function(name){return '<button class="doodle-pick-image" data-builtin-gif="'+name+'.gif"><img src="assets/img/doodle/'+name+'.gif" alt=""><span>'+gifNames[name]+'</span></button>';}).join('')+'</div><p class="doodle-picker-note">Хөдөлгөөнт стикерүүд</p>':'';
    var modal=C.openModal('<h3>'+(gifs?'GIF & хөдөлгөөнт стикер':'Стикер сонгох')+'</h3><p class="doodle-picker-note">Сонгоод самбар дээр дарж байрлуулна уу.</p>'+gifHtml+'<div class="doodle-sticker-grid">'+ids.map(function(id){return '<button class="doodle-sticker-choice" data-sticker="'+id+'" aria-label="Стикер '+C.esc(id)+'">'+stickers[id]+(animated[id]?'<small>Хөдөлгөөнт</small>':'')+'</button>';}).join('')+'</div>'+(gifs?'<p class="doodle-picker-note">Өөрийн GIF-ээ нэмэхэд хөдөлгөөн нь хадгалагдана. 8 МБ хүртэл.</p><button class="btn btn-primary" data-upload-gif>'+C.icon('upload')+'GIF нэмэх</button><div class="err" role="status"></div>':'')+'<div class="actions"><button class="btn btn-ghost" data-close>Хаах</button></div>');
    C.$$('[data-sticker]',modal.el).forEach(function (button) {button.onclick=function () {var id=button.dataset.sticker;modal.close();placement({type:'sticker',sticker:id,width:140,height:140},'Стикер');};});
    C.$$('[data-builtin-gif]',modal.el).forEach(function(button){button.onclick=async function(){button.disabled=true;try{var result=await api('doodle_import',{body:{source:'builtin',name:button.dataset.builtinGif}});if(!modal.el.isConnected)return;modal.close();placeAsset(result.asset,'GIF');}catch(error){if(modal.el.isConnected){modal.el.querySelector('.err').textContent=error.message;button.disabled=false;}}};});
    var upload=modal.el.querySelector('[data-upload-gif]');if(upload)upload.onclick=function () {modal.close();$('doodleImageInput').accept='image/gif';$('doodleImageInput').click();};
  }
  $('doodleStickers').onclick=function () {stickerModal(false);};$('doodleGifs').onclick=function () {stickerModal(true);};
  function placeAsset(asset,label) {var width=Math.min(420,Math.max(120,asset.width||320)),height=width*(asset.height||240)/(asset.width||320);if(height>400){width*=400/height;height=400;}placement({type:'image',asset:asset.id,assetUrl:asset.url,assetMime:asset.mime,width:Math.round(width),height:Math.max(20,Math.round(height))},label || asset.name || 'Зураг');}
  $('doodleImageInput').onchange=async function () {
    var file=this.files[0];this.value='';if(!file)return;if(file.size>8*1024*1024){C.toast('Зураг болон GIF 8 МБ хүртэл байна.','error');return;}status('Зургийг самбарт хуулж байна…');
    try{var result=await api('doodle_upload',{query:{name:file.name},raw:file,type:file.type || 'application/octet-stream'});placeAsset(result.asset,file.name);updateControls();}catch(error){status(error.message,true);C.toast(error.message,'error');}
  };
  function folderRequest(action,options) {
    options=options||{};var url='api.php?action='+encodeURIComponent(action);Object.keys(options.query||{}).forEach(function(k){url+='&'+encodeURIComponent(k)+'='+encodeURIComponent(options.query[k]);});var init={credentials:'same-origin',cache:'no-store',method:options.body?'POST':'GET',headers:{}};if(options.body){init.headers['Content-Type']='application/json';init.body=JSON.stringify(options.body);}return fetch(url,init).then(async function(response){var data=await response.json();if(!response.ok || !data.ok){var error=new Error(data.error||'Хавтас нээгдсэнгүй');error.status=response.status;throw error;}return data;});
  }
  function unlockFolder(folder) {
    return new Promise(function(resolve) {
      var modal=C.openModal('<h3>'+C.esc(folder.name)+'</h3><p class="doodle-picker-note">Энэ сурагчийн хавтасны 4 оронтой нууц үгийг оруулна уу.</p><form><div class="field"><label for="doodleFolderPin">Нууц үг</label><input class="input" id="doodleFolderPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" autofocus></div><div class="err" role="status"></div><div class="actions"><button class="btn btn-ghost" type="button" data-close>Цуцлах</button><button class="btn btn-primary" type="submit">Нээх</button></div></form>',{onClose:function(ok){resolve(!!ok);}});
      modal.el.querySelector('input').oninput=function(){this.value=this.value.replace(/[^0-9]/g,'').slice(0,4);};modal.el.querySelector('form').onsubmit=async function(event){event.preventDefault();var pin=modal.el.querySelector('input').value,button=modal.el.querySelector('[type=submit]');if(!/^\d{4}$/.test(pin))return;button.disabled=true;try{await folderRequest('folder_unlock',{body:{folder:folder.id,pin:pin}});modal.close(true);}catch(error){modal.el.querySelector('.err').textContent=error.message;button.disabled=false;}};
    });
  }
  function imagePicker() {
    var modal=C.openModal('<h3>Дурсамжийн зураг нэмэх</h3><div class="doodle-picker-tabs"><button class="btn btn-ghost btn-sm on" data-source="album">Цомгоос</button><button class="btn btn-ghost btn-sm" data-source="folders">Хавтаснаас</button><button class="btn btn-ghost btn-sm" data-source="device">Төхөөрөмжөөс</button></div><div class="doodle-picker-content"></div><p class="doodle-picker-note">Сонгосон зургийн хуулбар самбарт үлдэнэ. Эх зураг устсан ч дурсамж хадгалагдана.</p><div class="err" role="status"></div><div class="actions"><button class="btn btn-ghost" data-close>Хаах</button></div>',{wide:true,onClose:function(){alive=false;state.picker=null;}});
    state.picker=modal;var body=modal.el.querySelector('.doodle-picker-content'),errorBox=modal.el.querySelector('.err'),alive=true,seq=0,offset=0;
    function fail(error){if(alive){errorBox.textContent=error.message;body.textContent='Зургуудаа дахин ачаалж үзээрэй.';}}
    async function importImage(data,csrf) {
      C.$$('button',body).forEach(function(button){button.disabled=true;});errorBox.textContent='Зургийн хуулбарыг хадгалж байна…';
      try {
        var result;
        if(data.source==='album')result=await api('doodle_import',{body:data});
        else{var response=await fetch('api.php?action=doodle_import',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF':C.state.csrf || '','X-Folder-CSRF':csrf || ''},body:JSON.stringify(data)});result=await response.json();if(!response.ok || !result.ok)throw new Error(result.error || 'Зургийг хуулж чадсангүй');}
        if(!alive)return;modal.close();placeAsset(result.asset);
      } catch(error){if(alive){errorBox.textContent=error.message;C.$$('button',body).forEach(function(button){button.disabled=false;});}}
    }
    async function album(more) {
      var token=++seq;errorBox.textContent='';if(!more){offset=0;body.innerHTML='<p class="doodle-picker-note">Цомгийн зургуудыг ачаалж байна…</p>';}
      try {
        var data=await api('media',{query:{type:'image',offset:offset,limit:60}});if(!alive || token!==seq)return;
        var items=data.items || [],grid=more?body.querySelector('.doodle-picker-grid'):null;
        if(!grid){body.innerHTML='';grid=C.el('<div class="doodle-picker-grid"></div>');body.appendChild(grid);}
        items.forEach(function(item){var button=C.el('<button class="doodle-pick-image"><img src="'+C.esc(item.thumb||item.url)+'" alt="" loading="lazy"><span>'+C.esc(item.original||item.name)+'</span></button>');button.onclick=function(){importImage({source:'album',name:item.name});};grid.appendChild(button);});offset+=items.length;
        var old=body.querySelector('[data-more]');if(old)old.remove();if(items.length===60){var next=C.el('<button class="btn btn-ghost btn-sm" data-more style="margin-top:14px">Дараагийн зургууд</button>');next.onclick=function(){album(true);};body.appendChild(next);}if(!items.length && !offset)body.textContent='Цомогт зураг хараахан нэмээгүй байна.';
      }catch(error){fail(error);}
    }
    async function folders() {
      var token=++seq;errorBox.textContent='';body.textContent='Сурагчдын хавтас…';try{var data=await folderRequest('folders');if(!alive||token!==seq)return;body.innerHTML='<div class="doodle-picker-grid"></div>';var grid=body.firstElementChild;(data.folders||[]).forEach(function(folder){var button=C.el('<button class="doodle-pick-folder">📁 '+C.esc(folder.name)+(folder.unlocked?'':' · 🔒')+'</button>');button.onclick=async function(){if(!folder.unlocked && !await unlockFolder(folder))return;folder.unlocked=true;files(folder,'');};grid.appendChild(button);});}catch(error){fail(error);}
    }
    async function files(folder,parent) {
      var token=++seq;errorBox.textContent='';body.textContent='Хавтасны зургууд…';try{var data=await folderRequest('folder_files',{query:{folder:folder.id,parent:parent}});if(!alive||token!==seq)return;body.innerHTML='<div class="doodle-picker-path"><button class="btn btn-ghost btn-sm" data-root>← Хавтаснууд</button><span>'+C.esc(folder.name)+'</span></div><div class="doodle-picker-grid"></div>';body.querySelector('[data-root]').onclick=folders;var grid=body.querySelector('.doodle-picker-grid');(data.directories||[]).forEach(function(dir){var button=C.el('<button class="doodle-pick-folder">📁 '+C.esc(dir.name)+'</button>');button.onclick=function(){files(folder,dir.id);};grid.appendChild(button);});var photos=(data.files||[]).filter(function(file){return file.preview==='image'||/^image\//.test(file.mime||'');});photos.forEach(function(file){var button=C.el('<button class="doodle-pick-image"><img src="'+C.esc(file.url)+'" alt="" loading="lazy"><span>'+C.esc(file.name)+'</span></button>');button.onclick=function(){importImage({source:'folder',folder:folder.id,file:file.id},data.csrf);};grid.appendChild(button);});if(!photos.length && !(data.directories||[]).length)grid.textContent='Энэ хавтаст зураг алга байна.';if(parent){var back=C.el('<button class="btn btn-ghost btn-sm" style="margin-top:14px">← Үндсэн хавтас</button>');back.onclick=function(){files(folder,'');};body.appendChild(back);}}catch(error){if(error.status===401){folder.unlocked=false;if(await unlockFolder(folder))return files(folder,parent);}fail(error);}
    }
    C.$$('[data-source]',modal.el).forEach(function(button){button.onclick=function(){C.$$('[data-source]',modal.el).forEach(function(b){b.classList.toggle('on',b===button);});if(button.dataset.source==='album')album(false);else if(button.dataset.source==='folders')folders();else{modal.close();$('doodleImageInput').accept='image/png,image/jpeg,image/webp,image/gif';$('doodleImageInput').click();}};});album(false);
  }
  $('doodleImages').onclick=imagePicker;
  function showThumbnail(page,src) {var button=$('doodlePages').querySelector('[data-doodle-page="'+page.id+'"]');if(!button)return;var paper=button.querySelector('.doodle-page-paper'),img=paper.querySelector('img');if(!img){img=document.createElement('img');img.alt='';paper.appendChild(img);}img.src=src;paper.classList.add('has-preview');}
  function cacheThumbnail(page,context,ops,resolveImage) {
    background(context,page);ops.forEach(function(op){if(op.type==='stroke' && op.points && op.points.length>400){var stride=Math.ceil(op.points.length/400),points=op.points.filter(function(_,index){return index%stride===0 || index===op.points.length-1;});paint(context,Object.assign({},op,{points:points}),resolveImage);}else paint(context,op,resolveImage);});
    var src=context.canvas.toDataURL('image/png');state.thumbnails.set(page.id,{version:page.version,src:src});if(state.thumbnails.size>48)state.thumbnails.delete(state.thumbnails.keys().next().value);showThumbnail(page,src);
  }
  function enqueueThumbnail(page) {var cached=state.thumbnails.get(page.id);if(cached && cached.version===page.version){showThumbnail(page,cached.src);return;}if(!state.thumbQueue.some(function(item){return item.page.id===page.id;}))state.thumbQueue.push({page:page,epoch:state.thumbEpoch});runThumbnails();}
  function runThumbnails() {
    if(!visible() || $('doodleHome').hidden)return;
    while(state.thumbBusy<3 && state.thumbQueue.length){var job=state.thumbQueue.shift();if(job.epoch!==state.thumbEpoch)continue;state.thumbBusy++;(function(item){api('doodle_page',{query:{page:item.page.id,after:0}}).then(function(data){
      if(item.epoch!==state.thumbEpoch || !C.state.member)return;var paper=document.createElement('canvas');paper.width=320;paper.height=200;var context=paper.getContext('2d');context.scale(.2,.2);var ops=data.ops||[],images=new Map(),redrawQueued=false;
      function redraw(){if(redrawQueued)return;redrawQueued=true;requestAnimationFrame(function(){redrawQueued=false;if(item.epoch===state.thumbEpoch && C.state.member)cacheThumbnail(data.page,context,ops,resolveImage);});}
      function resolveImage(op){var found=images.get(op.asset);if(found)return found;if(images.size>=12)return {ready:false};var image=new Image(),entry={img:image,ready:false};images.set(op.asset,entry);image.onload=function(){entry.ready=true;redraw();};image.onerror=function(){};image.src=op.assetUrl||'api.php?action=doodle_asset&asset='+encodeURIComponent(op.asset);return entry;}
      cacheThumbnail(data.page,context,ops,resolveImage);
    }).catch(function(){/* A page remains usable when its small preview cannot load. */}).finally(function(){state.thumbBusy--;runThumbnails();});})(job);}
  }
  function paintPages() {
    var container=$('doodlePages');if(state.thumbObserver)state.thumbObserver.disconnect();container.innerHTML='';state.thumbQueue=[];
    if(!state.pages.length){container.innerHTML='<div class="doodle-empty"><b>Эхний хуудсаа хамт бүтээе.</b><span>Зурлага, зураг, бичвэр, GIF-ээр ангийнхаа дурсамжийг үлдээгээрэй.</span></div>';return;}
    var pages=state.pages.filter(function(page){return(state.pageFilter==='all' || (state.pageFilter==='sealed')===!!page.sealed) && (!state.search || (page.title+' '+(page.author||'')).toLocaleLowerCase().includes(state.search));});
    if(!pages.length){container.innerHTML='<div class="doodle-empty"><b>Тохирох хуудас алга байна.</b><span>Хайлт эсвэл шүүлтүүрээ өөрчлөөрэй.'+(state.nextCursor?' Доороос дараагийн хуудсуудыг ачаалж болно.':'')+'</span></div>';return;}
    if('IntersectionObserver' in window)state.thumbObserver=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;state.thumbObserver.unobserve(entry.target);var page=state.pages.find(function(p){return p.id===entry.target.dataset.doodlePage;});if(page)enqueueThumbnail(page);});},{rootMargin:'100px'});
    pages.forEach(function(page,index){var number=page.sequence||state.pages.length-index,button=C.el('<button class="doodle-page-card" data-doodle-page="'+C.esc(page.id)+'"><div class="doodle-page-paper '+C.esc(page.background)+'" aria-hidden="true"><span>PAGE '+String(number).padStart(2,'0')+'</span><small class="doodle-page-number">'+String(number).padStart(2,'0')+'</small><small class="doodle-page-badge '+(page.sealed?'sealed':'open')+'">'+(page.sealed?'Дурсамж':'Зурж болно')+'</small></div><div class="doodle-page-info"><h3>'+C.esc(page.title)+'</h3><p>'+C.esc(page.author||'12–2 анги')+' · '+C.esc(formatDate(page.created))+'</p><span class="doodle-page-count">'+(page.count||0)+' дурсамж<span aria-hidden="true">↗</span></span></div></button>');button.onclick=function(){openPage(page).catch(function(error){C.toast(error.message,'error');});};container.appendChild(button);var cached=state.thumbnails.get(page.id);if(cached && cached.version===page.version)showThumbnail(page,cached.src);else if(state.thumbObserver)state.thumbObserver.observe(button);else if(index<3)enqueueThumbnail(page);});
  }
  function formatDate(value){var date=new Date(typeof value==='number'?value*1000:value);return isNaN(date.getTime())?'':date.toLocaleDateString((window.C122I18n ? window.C122I18n.locale() : 'mn-MN'),{timeZone:'Asia/Ulaanbaatar',month:'short',day:'numeric'});}
  async function loadPages(more) {
    if(state.pagesLoading || !C.state.member)return;state.pagesLoading=true;var generation=state.generation;$('doodlePagesStatus').textContent='Хуудсуудыг ачаалж байна…';
    $('doodleRefresh').disabled=true;
    try{var data=await api('doodle_pages',{query:more && state.nextCursor?{cursor:state.nextCursor}:{}});if(generation!==state.generation)return;state.pages=more?state.pages.concat(data.pages||[]):(data.pages||[]);state.totalPages=data.total||state.pages.length;state.nextCursor=data.nextCursor||null;paintPages();$('doodlePagesStatus').textContent=state.totalPages+' хуудас · Бидний төгсөх жилийн дурсамж';$('doodleMore').hidden=!state.nextCursor;}
    catch(error){if(generation===state.generation)$('doodlePagesStatus').textContent=error.message;}
    finally{if(generation===state.generation){state.pagesLoading=false;$('doodleRefresh').disabled=false;}}
  }
  async function openPage(page) {
    if(state.saving)return;
    if(state.page && (state.pending.length || state.batch)){try{await save();}catch(_){/* Retained local drafts are restored on return. */}}
    clearTimeout(state.retryTimer);state.generation++;state.refreshPromise=null;state.pagesLoading=false;state.page=page;state.ops=[];state.revision=0;state.images.clear();state.statusError='';state.drawing=null;state.drawPointer=null;state.pan=null;chooseTool(state.tool);restore(page.id);$('doodleHome').hidden=true;$('doodleEditor').hidden=false;$('doodlePageTitle').textContent=page.title;state.pageLoading=true;updateControls();render();fit();
    try{await refreshPage();}finally{state.pageLoading=false;updateControls();}
    if(!state.page.sealed && (state.pending.length || state.batch))planSave();
    if(state.page.sealed && (state.pending.length || state.batch)){status('Хадгалаагүй ноорог энэ браузерт байна. Шинэ хуудас үүсгэн үргэлжлүүлээрэй.',true);}
  }
  async function newPage() {
    var alias='';try{alias=localStorage.getItem('c122:doodle-author') || '';}catch(_){}
    var requestId=uuid(),modal=C.openModal('<h3>Шинэ дурсамжийн хуудас</h3><p class="doodle-picker-note">Энд зурсан дурсамжууд хадгалагдана. Дууссан хуудсыг арилгахгүй; дараагийн дурсамжаа шинэ хуудсанд нэмнэ.</p><form><div class="field"><label for="doodleNewTitle">Хуудасны нэр</label><input class="input" id="doodleNewTitle" maxlength="100" placeholder="Бидний төгсөх жил…" required autofocus></div><div class="field"><label for="doodleAuthor">Таны нэр / хоч <small>(заавал биш)</small></label><input class="input" id="doodleAuthor" maxlength="50" value="'+C.esc(alias)+'"></div><div class="field"><label>Хуудасны дэвсгэр</label><div class="doodle-backgrounds">'+[['paper','Цаас'],['dots','Цэгтэй'],['grid','Дөрвөлжин'],['dark','Хар самбар']].map(function(pair,index){return '<label class="doodle-background-option"><input type="radio" name="background" value="'+pair[0]+'" '+(index===0?'checked':'')+'>'+pair[1]+'</label>';}).join('')+'</div></div><div class="err" role="status"></div><div class="actions"><button class="btn btn-ghost" type="button" data-close>Цуцлах</button><button class="btn btn-primary" type="submit">Үүсгэх</button></div></form>');
    modal.el.querySelector('form').onsubmit=async function(event){event.preventDefault();var button=modal.el.querySelector('[type=submit]'),title=modal.el.querySelector('#doodleNewTitle').value.trim();if(!title)return;button.disabled=true;try{var author=modal.el.querySelector('#doodleAuthor').value.trim(),result=await api('doodle_create',{body:{title:title,author:author,background:modal.el.querySelector('[name=background]:checked').value,requestId:requestId}});try{localStorage.setItem('c122:doodle-author',author);}catch(_){}var carry=state.page && state.page.sealed?state.pending.concat(state.batch?state.batch.ops:[]):[];if(carry.length){state.pending=[];state.batch=null;remember();}modal.close();await openPage(result.page);if(carry.length){state.pending=carry;remember();render();updateControls();planSave();}}catch(error){if(modal.el.isConnected){modal.el.querySelector('.err').textContent=error.message;button.disabled=false;}}};
  }
  $('doodleNew').onclick=newPage;$('doodleEditorNew').onclick=newPage;
  $('doodleMore').onclick=function(){loadPages(true);};
  $('doodleSearch').oninput=function(){state.search=this.value.trim().toLocaleLowerCase();paintPages();};
  C.$$('[data-doodle-filter]',root).forEach(function(button){button.onclick=function(){state.pageFilter=button.dataset.doodleFilter;C.$$('[data-doodle-filter]',root).forEach(function(b){var on=b===button;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});paintPages();};});
  $('doodleRefresh').onclick=function(){state.thumbnails.clear();state.thumbEpoch++;loadPages(false);};
  function focusMode(enabled){$('doodleEditor').classList.toggle('focus-mode',enabled);root.classList.toggle('doodle-focused',enabled);$('doodleFocus').setAttribute('aria-pressed',String(enabled));$('doodleFocus').setAttribute('aria-label',enabled?'Зургийн орчныг хэвийн болгох':'Зургийн орчныг томруулах');$('doodleFocus').title=enabled?'Хэвийн болгох (Esc)':'Зургийн орчныг томруулах';requestAnimationFrame(function(){if(state.page && state.fitMode)fit();});}
  $('doodleFocus').onclick=function(){focusMode(!$('doodleEditor').classList.contains('focus-mode'));};
  $('doodleBack').onclick=async function(){if(state.saving)return;try{await save();}catch(_){}clearTimeout(state.saveTimer);clearTimeout(state.retryTimer);focusMode(false);state.generation++;state.refreshPromise=null;state.page=null;state.ops=[];state.pending=[];state.batch=null;state.images.clear();$('doodleEditor').hidden=true;$('doodleHome').hidden=false;loadPages(false);};
  $('doodleSave').onclick=function(){save().catch(function(error){C.toast(error.message,'error');});};
  $('doodleRetry').onclick=$('doodleSave').onclick;
  $('doodleFinalize').onclick=async function(){if(!state.page || state.page.sealed || state.saving)return;var pageId=state.page.id;var yes=await C.confirm({title:'Энэ хуудсыг дуусгах уу?',text:'Хуудас дурсамж болон үлдэнэ. Дахин зурж, өөрчилж, арилгах боломжгүй. Дараагийн зургаа шинэ хуудсанд зурна.',ok:'Хуудсыг дуусгах',icon:'check'});if(!yes || !state.page || state.page.id!==pageId)return;try{await save();if(state.pending.length || state.batch)throw new Error('Эхлээд бүх зурлагаа хадгална уу.');var result=await api('doodle_finalize',{body:{page:pageId,requestId:uuid()}});if(state.page && state.page.id===pageId){state.page=result.page;chooseTool(state.tool);updateControls();C.toast('Хуудас дурсамж болон хадгалагдлаа.');}}catch(error){C.toast(error.message,'error');}};
  $('doodleExport').onclick=async function(){if(!state.page)return;var button=this;button.disabled=true;try{var all=state.ops.concat(state.batch?state.batch.ops:[],state.pending);await Promise.all(all.filter(function(op){return op.type==='image';}).map(function(op){var img=assetImage(op);if(img.ready || img.error)return Promise.resolve();return new Promise(function(resolve){img.img.addEventListener('load',resolve,{once:true});img.img.addEventListener('error',resolve,{once:true});setTimeout(resolve,10000);});}));var output=document.createElement('canvas');output.width=W;output.height=H;var context=output.getContext('2d');background(context,state.page);all.forEach(function(op){paint(context,op);});var blob=await new Promise(function(resolve){output.toBlob(resolve,'image/png');});if(!blob)throw new Error('Зургийг татаж чадсангүй.');var url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=state.page.title+'.png';link.click();setTimeout(function(){URL.revokeObjectURL(url);},2000);}catch(error){C.toast(error.message,'error');}finally{button.disabled=false;}};
  $('doodleFit').onclick=fit;$('doodleZoomIn').onclick=function(){zoom(state.scale*1.25);};$('doodleZoomOut').onclick=function(){zoom(state.scale/1.25);};$('doodleActual').onclick=function(){zoom(1);};
  $('doodleCanvasShell').addEventListener('wheel',function(event){if(!state.page || (!event.ctrlKey && !event.metaKey))return;event.preventDefault();var rect=this.getBoundingClientRect();zoom(state.scale*Math.exp(-event.deltaY*.004),{x:event.clientX-rect.left,y:event.clientY-rect.top});},{passive:false});
  document.addEventListener('keydown',function(event){if(!visible() || !state.page || !root.contains(event.target) || event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(event.key==='Escape'){focusMode(false);chooseTool(state.tool);return;}
    if(event.ctrlKey || event.metaKey){if(event.key.toLowerCase()==='s'){event.preventDefault();save().catch(function(error){C.toast(error.message,'error');});}return;}
    var key=event.key.toLowerCase();if(key===' '){event.preventDefault();state.spacePan=true;cursor();return;}
    if(key==='v'){event.preventDefault();chooseTool('pan');}else if(key==='f'){event.preventDefault();fit();}else if(key==='+' || key==='='){event.preventDefault();zoom(state.scale*1.25);}else if(key==='-'){event.preventDefault();zoom(state.scale/1.25);}else if(!state.page.sealed && !state.pageLoading){if(key==='p'){event.preventDefault();chooseTool('pen');}else if(key==='h'){event.preventDefault();chooseTool('highlight');}else if(key==='t'){event.preventDefault();textModal(false);}}
  });
  document.addEventListener('keyup',function(event){if(event.key===' '){state.spacePan=false;cursor();}});
  window.addEventListener('blur',function(){state.spacePan=false;if(state.drawing || state.pan)completeStroke();cursor();});
  $('doodleLockBtn').onclick=async function(){try{await save();}catch(_){}api('album_lock',{body:{}}).then(C.applyStatus).catch(function(error){C.toast(error.message,'error');});};
  function gate() {
    $('doodleLock').hidden=C.state.member;$('doodleBody').hidden=!C.state.member;
    if(C.state.member){if(state.pin){state.pin.destroy();state.pin=null;}return;}
    if(!state.pin)state.pin=C.pinPad($('doodlePin'),{onSuccess:function(){show();}});
  }
  function show(){gate();if(!C.state.member)return;if(!state.page)loadPages(false);else refreshPage().catch(function(error){status(error.message,true);});if(!state.pollTimer)state.pollTimer=setInterval(function(){if(visible() && state.page && !state.pageLoading && !state.drawing && !state.saving)refreshPage().catch(function(error){if(error.status===401)gate();});},10000);}
  function hide(){clearTimeout(state.saveTimer);clearTimeout(state.retryTimer);focusMode(false);state.spacePan=false;if(state.drawing || state.pan)completeStroke();if(state.page && (state.pending.length || state.batch) && C.state.member)save().catch(function(){});if(state.pin){state.pin.destroy();state.pin=null;}}
  document.addEventListener('c122:auth',function(){if(!C.state.member){if(state.drawing || state.pan)completeStroke();remember();clearTimeout(state.saveTimer);clearTimeout(state.retryTimer);focusMode(false);state.generation++;state.thumbEpoch++;state.thumbQueue=[];state.thumbnails.clear();if(state.thumbObserver)state.thumbObserver.disconnect();state.refreshPromise=null;state.page=null;state.ops=[];state.pending=[];state.batch=null;state.images.clear();state.saving=false;state.pageLoading=false;state.pagesLoading=false;state.pages=[];$('doodleRefresh').disabled=false;$('doodlePages').innerHTML='';$('doodleEditor').hidden=true;$('doodleHome').hidden=false;render();if(state.picker)state.picker.close();}if(!root.hidden){gate();if(C.state.member && !state.page)loadPages(false);}});
  window.addEventListener('online',function(){if(visible() && state.page && !state.page.sealed && (state.pending.length || state.batch))save().catch(function(){});else updateControls();});
  window.addEventListener('offline',function(){remember();updateControls();});
  document.addEventListener('visibilitychange',function(){if(document.hidden && state.page){if(state.drawing || state.pan)completeStroke();remember();if(C.state.member && !state.page.sealed && (state.pending.length || state.batch))save().catch(function(){});}else if(visible())show();});
  window.addEventListener('beforeunload',function(event){if(state.drawing)completeStroke();remember();if(state.pending.length || state.batch){event.preventDefault();event.returnValue='';}});
  window.addEventListener('resize',function(){if(visible() && state.page && state.fitMode)fit();});
  C.Doodle={show:show,hide:hide};
})();
