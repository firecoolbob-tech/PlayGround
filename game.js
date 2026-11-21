(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 1200, H = 760, CX = 600, CY = 380, TRACK_W = 132, HALF = TRACK_W / 2;
  const TAU = Math.PI * 2, N = 720;
  const $ = id => document.getElementById(id);
  const ui = {menu:$('menuOverlay'), result:$('resultOverlay'), hud:$('raceHud'), countdown:$('countdown'), hint:$('controlsHint'), position:$('position'), lap:$('lap'), lapProgress:$('lapProgress'), timer:$('timer'), speed:$('speed'), speedBar:$('speedBar'), surface:$('surfaceLabel'), trackLabel:$('trackLabel'), toast:$('toast')};
  const tracks = {
    dirt:{name:'RED ROCK OVAL',surface:'DIRT', maxSpeed:252, grip:.87, road:'#9a6840', shoulder:'#76523a', edge:'#4b392e', line:'#d8a56a', mud:false},
    mud:{name:'BLACKWATER BOWL',surface:'MUD',maxSpeed:211,grip:.66,road:'#51463a',shoulder:'#39392f',edge:'#272c25',line:'#817157',mud:true}
  };
  let track = tracks.dirt, selectedTrack = 'dirt', playing = false, started = false, finished = false;
  let dpr = 1, scale = 1, ox = 0, oy = 0, lastTime = 0, elapsed = 0, countdownUntil = 0, lapStarted = 0, bestLap = Infinity, raceTime = 0, cameraShake = 0, bumpToast = 0;
  let audioOn = true, audioCtx = null, cars = [], player = null, skidMarks = [], particles = [];
  const keys = Object.create(null), touch = {left:false,right:false,gas:false,brake:false};
  const rand = (a,b) => a + Math.random() * (b-a);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const mod = (v,n) => ((v%n)+n)%n;
  const nodes = [];
  let totalLength = 0;
  function pathPoint(u) {
    const t = u - Math.PI / 2;
    return {x:CX + 398*Math.cos(t) + 18*Math.cos(3*t), y:CY + 206*Math.sin(t) + 12*Math.sin(2*t)};
  }
  for(let i=0;i<=N;i++){
    const u=TAU*i/N, p=pathPoint(u);
    if(i){const prev=nodes[i-1];totalLength+=Math.hypot(p.x-prev.x,p.y-prev.y);}
    nodes.push({...p,u,s:totalLength});
  }
  function pointAt(s){
    s=mod(s,totalLength);let lo=0,hi=N;
    while(lo<hi){const m=(lo+hi)>>1;if(nodes[m].s<s)lo=m+1;else hi=m;}
    const b=nodes[lo],a=nodes[Math.max(0,lo-1)],f=(s-a.s)/Math.max(.001,b.s-a.s);
    const x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
    return {x,y,tx:dx/len,ty:dy/len,nx:-dy/len,ny:dx/len};
  }
  function nearest(x,y){
    let best=Infinity,idx=0;
    for(let i=0;i<N;i+=2){const p=nodes[i],d=(x-p.x)**2+(y-p.y)**2;if(d<best){best=d;idx=i;}}
    const a=nodes[idx],b=nodes[idx+1],dx=b.x-a.x,dy=b.y-a.y,f=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);
    const px=a.x+dx*f,py=a.y+dy*f,len=Math.hypot(dx,dy)||1;
    return {s:a.s+(b.s-a.s)*f,dist:Math.hypot(x-px,y-py),x:px,y:py,tx:dx/len,ty:dy/len,nx:-dy/len,ny:dx/len};
  }
  const colors=['#d95d39','#d6d5bd','#477c9d','#d5a636','#bd534c','#547b4d','#a9a49a','#67588d','#e07f35','#438a79','#b6c3c4','#9d513b'];
  function makeCar(i, progress, lane){
    const p=pointAt(progress),angle=Math.atan2(p.tx,-p.ty);
    return {id:i,player:i===5,x:p.x+p.nx*lane,y:p.y+p.ny*lane,angle,speed:0,progress,lap:0,lane,color:colors[i],damage:0,stun:0,hitCd:0,steer:0,boost:rand(.9,1.08),aiPhase:rand(0,TAU),wobble:rand(0,TAU),lastS:mod(progress,totalLength),collisions:0};
  }
  function makeGrid(){
    cars=[];
    const start=totalLength-93;
    for(let row=0;row<6;row++){
      const s=start-row*39;
      for(let col=0;col<2;col++){
        const idx=row*2+col, lane=(col===0?-25:25)+rand(-3,3);
        const c=makeCar(idx,s,lane);c.progress=s;
        if(idx>0){c.speed=0;c.lane+=rand(-4,4);}
        cars.push(c);
      }
    }
    player=cars[5];player.player=true;player.speed=0;player.progress=start-2*39;player.lane=23;
    cars.forEach(c=>{const p=pointAt(c.progress);c.x=p.x+p.nx*c.lane;c.y=p.y+p.ny*c.lane;c.angle=Math.atan2(p.tx,-p.ty);c.lastS=mod(c.progress,totalLength);});
    skidMarks=[];particles=[];elapsed=0;raceTime=0;bestLap=Infinity;finished=false;started=false;playing=true;lapStarted=0;lastTime=performance.now();
  }
  const bg=document.createElement('canvas');bg.width=W;bg.height=H;const bgc=bg.getContext('2d');
  function buildBackground(){
    bgc.fillStyle='#414c36';bgc.fillRect(0,0,W,H);
    let seed=81293;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<6200;i++){
      const x=random()*W,y=random()*H,r=.4+random()*2.2;
      bgc.globalAlpha=.06+random()*.13;bgc.fillStyle=random()>.48?'#c2bd81':'#18251b';
      bgc.beginPath();bgc.ellipse(x,y,r*1.7,r,random()*3.14,0,TAU);bgc.fill();
    }
    bgc.globalAlpha=1;
    for(let i=0;i<68;i++){
      const x=rand(115,1085),y=rand(105,655),n=nearest(x,y);
      if(n.dist>103&&n.dist<182){bgc.fillStyle=Math.random()>.5?'#4b5437':'#343e30';bgc.globalAlpha=.6;bgc.beginPath();bgc.ellipse(x,y,rand(2,7),rand(1,3),rand(0,6),0,TAU);bgc.fill();}
    }
    bgc.globalAlpha=1;
  }
  buildBackground();
  function resize(){
    const rect=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
    scale=Math.min(canvas.width/W,canvas.height/H);ox=(canvas.width-W*scale)/2;oy=(canvas.height-H*scale)/2;
  }
  window.addEventListener('resize',resize);resize();
  function pathOnCanvas(c){c.beginPath();for(let i=0;i<nodes.length;i++){const p=nodes[i];if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);}c.closePath();}
  function ellipseIsland(c){c.beginPath();c.ellipse(CX,CY,327,133,-.025,0,TAU);c.closePath();}
  function drawTrack(){
    ctx.drawImage(bg,0,0);
    pathOnCanvas(ctx);ctx.lineJoin='round';ctx.strokeStyle='#282d24';ctx.lineWidth=TRACK_W+42;ctx.stroke();
    pathOnCanvas(ctx);ctx.strokeStyle=track.edge;ctx.lineWidth=TRACK_W+23;ctx.stroke();
    pathOnCanvas(ctx);ctx.strokeStyle=track.shoulder;ctx.lineWidth=TRACK_W+7;ctx.stroke();
    pathOnCanvas(ctx);ctx.strokeStyle=track.road;ctx.lineWidth=TRACK_W-4;ctx.stroke();
    pathOnCanvas(ctx);ctx.strokeStyle=track.mud?'rgba(152,132,103,.12)':'rgba(238,188,119,.15)';ctx.lineWidth=70;ctx.stroke();
    ctx.save();ctx.setLineDash([17,15]);ctx.lineWidth=3;ctx.strokeStyle=track.mud?'rgba(32,34,29,.28)':'rgba(62,42,29,.27)';pathOnCanvas(ctx);ctx.stroke();ctx.restore();
    for(let i=0;i<260;i++){
      const s=i/260*totalLength,p=pointAt(s),side=(i%2?1:-1)*rand(39,70),x=p.x+p.nx*side,y=p.y+p.ny*side;
      ctx.globalAlpha=rand(.08,.27);ctx.fillStyle=track.mud?(i%3?'#1e211c':'#b09a78'):(i%3?'#503c2d':'#e6bb7c');
      ctx.beginPath();ctx.ellipse(x,y,rand(1,4),rand(.7,1.8),Math.atan2(p.ty,p.tx),0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
    ellipseIsland(ctx);ctx.fillStyle='#566344';ctx.fill();ctx.strokeStyle='#303c2c';ctx.lineWidth=8;ctx.stroke();
    ctx.save();ctx.beginPath();ctx.ellipse(CX,CY,315,121,-.025,0,TAU);ctx.clip();
    for(let i=0;i<540;i++){let x=CX+rand(-315,315),y=CY+rand(-125,125);if(((x-CX)/325)**2+((y-CY)/133)**2<.92){ctx.globalAlpha=rand(.08,.25);ctx.fillStyle=Math.random()>.5?'#a1a06b':'#283a2b';ctx.beginPath();ctx.ellipse(x,y,rand(2,8),rand(1,3),rand(0,6),0,TAU);ctx.fill();}}
    ctx.globalAlpha=1;ctx.restore();
    for(let i=0;i<92;i++){
      const p=pointAt(i/92*totalLength),side=i%2?1:-1,x=p.x+p.nx*side*88,y=p.y+p.ny*side*88;
      ctx.fillStyle='#20241e';ctx.beginPath();ctx.ellipse(x+2,y+3,7,5,0,0,TAU);ctx.fill();ctx.fillStyle=i%4===0?'#d7cba7':'#3c4038';ctx.beginPath();ctx.ellipse(x,y,6,4.4,0,0,TAU);ctx.fill();ctx.strokeStyle='#191d19';ctx.lineWidth=1.5;ctx.stroke();
    }
    const p=pointAt(0),across=HALF-3;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.ty,p.tx));
    for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#f0eee3':'#282b25';ctx.fillRect(-6,-across+i*(across*2/10),12,across*2/10+1);}
    ctx.restore();
    drawFlag(575,82,'#e7e2d0');drawFlag(1090,378,'#ed7247');drawFlag(111,492,'#d4eb67');
    for(let i=0;i<8;i++){const p=pointAt(totalLength*(i+.48)/8),x=p.x+p.nx*100,y=p.y+p.ny*100;ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(p.ty,p.tx));ctx.fillStyle='rgba(243,226,179,.43)';ctx.beginPath();ctx.moveTo(-7,-5);ctx.lineTo(3,-5);ctx.lineTo(3,-9);ctx.lineTo(11,0);ctx.lineTo(3,9);ctx.lineTo(3,5);ctx.lineTo(-7,5);ctx.closePath();ctx.fill();ctx.restore();}
  }
  function drawFlag(x,y,color){ctx.strokeStyle='#242821';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+31);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+14,y+4);ctx.lineTo(x,y+10);ctx.closePath();ctx.fill();}
  function drawCar(car){
    const w=car.player?22:20,h=car.player?38:35;
    ctx.save();ctx.translate(car.x,car.y);ctx.rotate(car.angle+(car.player&&car.hitCd>0?Math.sin(elapsed*34)*.06:0));
    ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(2,5,w*.66,h*.56,0,0,TAU);ctx.fill();
    ctx.fillStyle='#171915';
    for(const sy of [-10,10])for(const sx of [-w*.53,w*.53]){ctx.beginPath();ctx.roundRect(sx-2.8,sy-4,5.6,9,1.3);ctx.fill();}
    ctx.fillStyle=car.color;ctx.beginPath();ctx.moveTo(-w*.39,-h*.5);ctx.quadraticCurveTo(-w*.47,-h*.2,-w*.46,h*.28);ctx.quadraticCurveTo(-w*.4,h*.5,0,h*.5);ctx.quadraticCurveTo(w*.4,h*.5,w*.46,h*.28);ctx.lineTo(w*.39,-h*.5);ctx.quadraticCurveTo(0,-h*.58,-w*.39,-h*.5);ctx.closePath();ctx.fill();
    ctx.strokeStyle=car.player?'#e6f49b':'rgba(18,20,17,.75)';ctx.lineWidth=car.player?1.8:1;ctx.stroke();
    ctx.fillStyle=car.player?'#eff4cf':'rgba(24,33,32,.92)';ctx.beginPath();ctx.moveTo(-w*.26,-h*.27);ctx.lineTo(w*.26,-h*.27);ctx.lineTo(w*.31,-h*.08);ctx.lineTo(-w*.31,-h*.08);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(20,29,30,.95)';ctx.beginPath();ctx.moveTo(-w*.32,h*.03);ctx.lineTo(w*.32,h*.03);ctx.lineTo(w*.28,h*.27);ctx.lineTo(-w*.28,h*.27);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(248,246,225,.85)';ctx.fillRect(-w*.34,h*.34,w*.19,2);ctx.fillRect(w*.15,h*.34,w*.19,2);
    ctx.fillStyle=car.player?'#1d2419':'rgba(16,18,16,.82)';ctx.font=`700 ${car.player?9:8}px 'DM Mono',monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(car.player?'06':String(car.id+1).padStart(2,'0'),0,-h*.02);
    if(car.player){ctx.fillStyle='#e2f56f';ctx.beginPath();ctx.arc(0,-h*.66,3,0,TAU);ctx.fill();}
    if(car.damage>0){ctx.strokeStyle=`rgba(36,24,17,${Math.min(.7,car.damage*.13)})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w*.22,-h*.39);ctx.lineTo(w*.2,-h*.14);ctx.stroke();}
    ctx.restore();
  }
  function drawRace(){
    drawTrack();ctx.lineCap='round';for(const mark of skidMarks){ctx.globalAlpha=mark.life*.24;ctx.strokeStyle='#211e19';ctx.lineWidth=mark.width;ctx.beginPath();ctx.moveTo(mark.x1,mark.y1);ctx.lineTo(mark.x2,mark.y2);ctx.stroke();}ctx.globalAlpha=1;
    for(const c of cars.filter(x=>!x.player))drawCar(c);if(player)drawCar(player);
    for(const p of particles){ctx.globalAlpha=clamp(p.life,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill();}ctx.globalAlpha=1;
  }
  function emitDust(x,y,count,force=1){
    for(let i=0;i<count;i++){const a=rand(0,TAU),v=rand(15,100)*force;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,size:rand(1.5,4.2),life:rand(.35,.8),max:.8,color:track.mud?(Math.random()>.4?'#5c4d3e':'#8c745a'):(Math.random()>.45?'#bb8b5c':'#d3ae79')});}
  }
  function update(dt,now){
    if(!playing)return;
    if(!started){if(now>=countdownUntil){started=true;lapStarted=now;ui.countdown.textContent='GO!';beep(720,.17);setTimeout(()=>{if(started)ui.countdown.textContent='';},580);}else{
        const left=Math.ceil((countdownUntil-now)/1000);ui.countdown.textContent=left>0?String(left):'READY';if(left!==update.lastCount){update.lastCount=left;if(left>0)beep(420+left*55,.09);}return;
      }}
    if(finished)return;
    elapsed=(now-countdownUntil)/1000;raceTime=elapsed;
    for(const c of cars){if(c.player)continue;
      c.hitCd=Math.max(0,c.hitCd-dt);c.stun=Math.max(0,c.stun-dt);
      const target=(track.maxSpeed*(.53+.16*c.boost)+Math.sin(elapsed*.52+c.aiPhase)*8)*(c.stun>0?.48:1);
      c.speed+=(target-c.speed)*Math.min(1,dt*(c.speed<target?1.05:1.6));
      c.progress+=c.speed*dt;const wrapped=c.progress>=totalLength;c.progress=mod(c.progress,totalLength);
      if(wrapped)c.crossings=(c.crossings||0)+1;
      const q=pointAt(c.progress),sway=Math.sin(elapsed*.45+c.aiPhase)*3;
      c.x=q.x+q.nx*(c.lane+sway);c.y=q.y+q.ny*(c.lane+sway);c.angle=Math.atan2(q.tx,-q.ty)+Math.sin(elapsed*1.3+c.aiPhase)*.025;
    }
    if(player){
      player.hitCd=Math.max(0,player.hitCd-dt);player.stun=Math.max(0,player.stun-dt);
      const gas=keys.KeyW||keys.ArrowUp||touch.gas,brake=keys.KeyS||keys.ArrowDown||touch.brake;
      const left=keys.KeyA||keys.ArrowLeft||touch.left,right=keys.KeyD||keys.ArrowRight||touch.right,hand=keys.Space;
      const steer=(right?1:0)-(left?1:0),onTrack=nearest(player.x,player.y).dist<HALF-5;
      const grip=track.grip*(onTrack?1:.49),max=track.maxSpeed*(onTrack?1:.6);
      if(gas)player.speed+=(track.mud?105:140)*dt;if(brake)player.speed-=(player.speed>8?220:90)*dt;
      if(!gas&&!brake)player.speed*=Math.pow(onTrack?.986:.952,dt*60);if(hand)player.speed*=Math.pow(.955,dt*60);
      player.speed=clamp(player.speed,-58,max);
      const speedFactor=clamp(Math.abs(player.speed)/92,.08,1.22);
      player.angle+=steer*speedFactor*(hand?2.45:1.75)*dt*(player.speed<0?-1:1)*(.78+grip*.3);
      if(!onTrack){player.speed*=Math.pow(track.mud?.91:.94,dt*60);cameraShake=Math.max(cameraShake,.3);if(Math.random()<dt*4)emitDust(player.x,player.y,2,.55);}
      player.x+=Math.sin(player.angle)*player.speed*dt;player.y-=Math.cos(player.angle)*player.speed*dt;
      const after=nearest(player.x,player.y);
      if(after.dist>HALF+16){const over=after.dist-(HALF+16),side=Math.sign((player.x-after.x)*after.nx+(player.y-after.y)*after.ny)||1;player.x-=after.nx*side*Math.min(over*.18,1.8);player.y-=after.ny*side*Math.min(over*.18,1.8);player.speed*=Math.pow(.87,dt*60);}
      if(steer&&Math.abs(player.speed)>70&&Math.random()<dt*22){const rx=player.x-Math.sin(player.angle)*15,ry=player.y+Math.cos(player.angle)*15;skidMarks.push({x1:rx,y1:ry,x2:rx+rand(-2,2),y2:ry+rand(-2,2),life:1,width:rand(1.5,3)});if(Math.random()<dt*10)emitDust(rx,ry,1,.4);}
      for(const c of cars){if(c.player)continue;const dx=player.x-c.x,dy=player.y-c.y,dist=Math.hypot(dx,dy);if(dist<26&&dist>0){
        const nx=dx/dist,ny=dy/dist,impact=Math.max(0,Math.abs(player.speed)-55),push=(26-dist)*.72;player.x+=nx*push;player.y+=ny*push;c.x-=nx*push*.42;c.y-=ny*push*.42;
        if(player.hitCd<=0&&impact>5){player.speed*=.68;c.stun=.38;c.speed*=.78;c.progress-=Math.sign(c.speed||1)*8;player.angle+=((dx*Math.cos(player.angle)+dy*Math.sin(player.angle))>0?1:-1)*.14;player.hitCd=.8;player.damage++;cameraShake=Math.min(5,impact*.035);emitDust((player.x+c.x)/2,(player.y+c.y)/2,12,1.25);beep(115,.06);if(now-bumpToast>1600){showToast('BUMP & RUN — KEEP IT CLEAN');bumpToast=now;}}
      }}
      const projected=nearest(player.x,player.y),old=player.lastS;player.progress=projected.s;
      if(old>totalLength*.78&&projected.s<totalLength*.22){player.crossings=(player.crossings||0)+1;if(player.crossings>1){bestLap=Math.min(bestLap,now-lapStarted);lapStarted=now;}else lapStarted=now;beep(840,.1);if(player.crossings>=4)finishRace();}
      player.lastS=projected.s;
    }
    for(let i=1;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){const a=cars[i],b=cars[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>0&&d<22){const shove=(22-d)*.09;a.lane-=Math.sign(dx||1)*shove;b.lane+=Math.sign(dx||1)*shove;if(d<14){a.stun=Math.max(a.stun,.12);b.stun=Math.max(b.stun,.12);}}}
    skidMarks.forEach(m=>m.life-=dt*.06);skidMarks=skidMarks.filter(m=>m.life>0).slice(-600);
    particles.forEach(p=>{p.life-=dt*1.5;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;});particles=particles.filter(p=>p.life>0).slice(-180);
    cameraShake=Math.max(0,cameraShake-dt*9);updateHud(now);
  }
  update.lastCount=-1;
  function formatTime(ms){const t=Math.max(0,ms)/1000;const m=Math.floor(t/60),s=t-m*60;return `${String(m).padStart(2,'0')}:${s.toFixed(1).padStart(4,'0')}`;}
  function standings(){
    return [...cars].sort((a,b)=>{
      const ac=(a.crossings||0)*totalLength+a.progress,bc=(b.crossings||0)*totalLength+b.progress;
      return bc-ac;
    });
  }
  function updateHud(now){
    if(!player)return;
    const rank=standings().indexOf(player)+1,lap=Math.min(3,(player.crossings||0)+1);
    ui.position.textContent=String(rank).padStart(2,'0');ui.lap.textContent=String(lap).padStart(2,'0');
    const lapFraction=mod(player.progress,totalLength)/totalLength;ui.lapProgress.style.width=`${lapFraction*100}%`;
    ui.timer.textContent=formatTime(raceTime*1000);const mph=Math.round(Math.abs(player.speed)*.36);ui.speed.textContent=String(mph).padStart(3,'0');
    ui.speedBar.style.width=`${clamp(Math.abs(player.speed)/track.maxSpeed*100,0,100)}%`;
  }
  function finishRace(){
    if(finished)return;finished=true;started=false;const rank=standings().indexOf(player)+1;
    ui.countdown.textContent='';ui.result.classList.remove('hidden');
    $('resultTitle').textContent=rank===1?'VICTORY LAP':'RACE COMPLETE';$('resultCopy').textContent=rank===1?'You ruled the dirt and took the checkered flag.':'You left it all on the track.';
    $('resultPosition').textContent=`${String(rank).padStart(2,'0')} / 12`;$('resultTime').textContent=formatTime(raceTime*1000);
    $('bestLap').textContent=bestLap===Infinity?'--:--.-':formatTime(bestLap);beep(rank===1?980:620,.25);
  }
  function showToast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>ui.toast.classList.remove('show'),1800);}
  function beep(freq,duration){
    if(!audioOn)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='square';o.frequency.value=freq;g.gain.setValueAtTime(.055,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(e){}
  }
  function startRace(){
    initAudio();track=tracks[selectedTrack];makeGrid();ui.menu.classList.add('hidden');ui.result.classList.add('hidden');ui.hud.classList.add('visible');ui.hint.classList.add('visible');ui.trackLabel.classList.add('visible');
    ui.trackLabel.innerHTML=`<span class="track-label-dot"></span><span>${track.name}</span><small>${track.surface}</small>`;ui.surface.textContent=`${track.surface} / GRIP ${Math.round(track.grip*100)}%`;
    ui.countdown.textContent='READY';countdownUntil=performance.now()+3000;update.lastCount=-1;buildBackground();
  }
  function initAudio(){if(!audioCtx&&audioOn)try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}
  function loop(now){const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;if(cameraShake>0){ctx.save();ctx.translate(rand(-cameraShake,cameraShake),rand(-cameraShake,cameraShake));ctx.drawImage(document.createElement('canvas'),0,0);ctx.restore();}update(dt,now);ctx.save();ctx.setTransform(dpr*scale,0,0,dpr*scale,ox*dpr,oy*dpr);if(cameraShake>0)ctx.translate(rand(-cameraShake,cameraShake),rand(-cameraShake,cameraShake));drawRace();ctx.restore();requestAnimationFrame(loop);}
  document.querySelectorAll('.track-option').forEach(button=>button.addEventListener('click',()=>{selectedTrack=button.dataset.track;document.querySelectorAll('.track-option').forEach(b=>b.classList.toggle('selected',b===button));track=tracks[selectedTrack];}));
  $('startButton').addEventListener('click',startRace);$('againButton').addEventListener('click',startRace);$('menuButton').addEventListener('click',()=>{playing=false;ui.result.classList.add('hidden');ui.hud.classList.remove('visible');ui.hint.classList.remove('visible');ui.trackLabel.classList.remove('visible');ui.menu.classList.remove('hidden');});
  $('soundBtn').addEventListener('click',()=>{audioOn=!audioOn;$('soundBtn').querySelector('span:last-child').textContent=audioOn?'SOUND ON':'SOUND OFF';if(audioOn)initAudio();});
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();});
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;});
  window.addEventListener('keyup',e=>{keys[e.code]=false;});
  document.querySelectorAll('[data-control]').forEach(button => {
    const control = button.dataset.control;
    const set = value => { touch[control] = value; };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      set(true);
    });
    button.addEventListener('pointerup', () => set(false));
    button.addEventListener('pointercancel', () => set(false));
    button.addEventListener('pointerleave', () => set(false));
  });
  makeGrid();drawRace();requestAnimationFrame(loop);
})();
