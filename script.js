const $=s=>document.querySelector(s), panels=["tasksPanel","gamePanel","revivePanel","clawPanel","defeatedPanel"];
let tasks=JSON.parse(localStorage.getItem('taskcade-tasks')||'[]');
let unlocked=false, soundOn=true, score=0, lives=3, level=1, running=false, raf;
let highScore=+(localStorage.getItem('taskcade-high')||0),runStartHigh=highScore,nextMilestone=5000,beatHighRewarded=false,clawActive=false,clawX=50,rewardQueue=[];
const SKINS=[
 {id:'classic',name:'CLASSIC',color:'#ffe95b',rarity:'common',weight:28},{id:'lime',name:'LIME',color:'#a8f04f',rarity:'common',weight:25},{id:'tangerine',name:'TANGERINE',color:'#ff9c38',rarity:'common',weight:25},{id:'bubblegum',name:'BUBBLEGUM',color:'#ff78c8',rarity:'common',weight:24},{id:'sky',name:'SKY',color:'#55cfff',rarity:'common',weight:24},{id:'coral',name:'CORAL',color:'#ff746b',rarity:'common',weight:23},
 {id:'mint',name:'MINT',color:'#52ffb0',rarity:'rare',weight:12},{id:'cherry',name:'CHERRY',color:'#ff3159',rarity:'rare',weight:12},{id:'ice',name:'ICE',color:'#b9f4ff',rarity:'rare',weight:11},{id:'grape',name:'GRAPE',color:'#a75cff',rarity:'rare',weight:11},{id:'ocean',name:'OCEAN',color:'#287cff',rarity:'rare',weight:10},{id:'rose',name:'ROSE',color:'#ff4f8f',rarity:'rare',weight:10},
 {id:'neon',name:'NEON',color:'#52ff43',rarity:'epic',weight:5},{id:'violet',name:'VIOLET',color:'#dc4dff',rarity:'epic',weight:5},{id:'electric',name:'ELECTRIC',color:'#29f4ff',rarity:'epic',weight:4},{id:'crimson',name:'CRIMSON',color:'#c81945',rarity:'epic',weight:4},{id:'midnight',name:'MIDNIGHT',color:'#3439a8',rarity:'epic',weight:4},{id:'pearl',name:'PEARL',color:'#fff4db',rarity:'epic',weight:3},
 {id:'gold',name:'GOLD',color:'#ffcc32',rarity:'legendary',weight:1.5},{id:'chrome',name:'CHROME',color:'#e6e9ff',rarity:'legendary',weight:1.2},{id:'plasma',name:'PLASMA',color:'#ff3df2',rarity:'legendary',weight:1},{id:'void',name:'VOID',color:'#57506e',rarity:'legendary',weight:.8},{id:'aurora',name:'AURORA',color:'#76ffd8',rarity:'legendary',weight:.7},{id:'royal',name:'ROYAL',color:'#7b4dff',rarity:'legendary',weight:.6}
];
let ownedSkins=JSON.parse(localStorage.getItem('taskcade-skins')||'["classic"]'),activeSkin=localStorage.getItem('taskcade-active-skin')||'classic',clawPrizes=[];
if(!tasks.length) tasks=[{id:Date.now(),text:'Finish one important thing',done:false},{id:Date.now()+1,text:'Take a 10 minute reset',done:false}];
function save(){localStorage.setItem('taskcade-tasks',JSON.stringify(tasks))}
function show(id){panels.forEach(p=>$('#'+p).classList.toggle('active',p===id))}
function render(){
 const list=$('#taskList'); list.innerHTML='';
 tasks.forEach(t=>{let el=document.createElement('div');el.className='task'+(t.done?' done':'');el.innerHTML=`<button class="done-btn" aria-label="Mark done">${t.done?'✓':''}</button><span>${escapeHtml(t.text)}</span><button class="delete-btn" aria-label="Delete">×</button>`;el.children[0].onclick=()=>complete(t.id);el.children[2].onclick=()=>{tasks=tasks.filter(x=>x.id!==t.id);save();render()};list.append(el)});
 const done=tasks.filter(t=>t.done).length; $('#doneCount').textContent=String(done).padStart(2,'0');$('#taskProgress').textContent=`${done} / ${tasks.length} CLEARED`;$('#clearDoneBtn').disabled=!done;
 $('#playBtn').disabled=!unlocked;$('#playBtn').innerHTML=unlocked?'<span>▶</span> INSERT FOCUS — PLAY NOW':'<span>▶</span> COMPLETE A TASK TO PLAY';
 renderRevive();
}
function complete(id,revive=false){let t=tasks.find(x=>x.id===id);if(!t)return;t.done=!t.done;if(t.done){unlocked=true;beep(620,.08)}save();render();if(revive&&t.done){lives=Math.max(1,lives);startGame(true)}}
function escapeHtml(s){let d=document.createElement('div');d.textContent=s;return d.innerHTML}
$('#taskForm').onsubmit=e=>{e.preventDefault();let v=$('#taskInput').value.trim();if(!v)return;tasks.unshift({id:Date.now(),text:v,done:false});$('#taskInput').value='';save();render();beep(360,.05)};
$('#clearDoneBtn').onclick=()=>{tasks=tasks.filter(t=>!t.done);save();render();beep(260,.06)};
$('#playBtn').onclick=()=>startGame(false);$('#cabinetBtn').onclick=()=>{if(clawActive){dropClaw();return}if($('#tasksPanel').classList.contains('active')&&!$('#playBtn').disabled)startGame(false)};
$('#cabinetBtn').addEventListener('pointerdown',()=>{if(!clawActive)return;$('#cabinetBtn').classList.add('pressed');dropClaw()});
['pointerup','pointercancel','pointerleave'].forEach(type=>$('#cabinetBtn').addEventListener(type,()=>$('#cabinetBtn').classList.remove('pressed')));
$('#quitBtn').onclick=()=>{running=false;cancelAnimationFrame(raf);show('tasksPanel')};$('#defeatedQuitBtn').onclick=()=>{running=false;cancelAnimationFrame(raf);show('tasksPanel')};$('#playAgainBtn').onclick=()=>startGame(false);
$('#soundBtn').onclick=()=>{soundOn=!soundOn;$('#soundBtn').textContent='SOUND: '+(soundOn?'ON':'OFF')};
function renderRevive(){let open=tasks.filter(t=>!t.done);$('#reviveTasks').innerHTML=open.length?open.slice(0,3).map(t=>`<button data-id="${t.id}">□ ${escapeHtml(t.text)} <b>— DONE</b></button>`).join(''):'<button id="quickTask">＋ ADD A QUICK TASK TO REVIVE</button>';document.querySelectorAll('#reviveTasks [data-id]').forEach(b=>b.onclick=()=>complete(+b.dataset.id,true));let q=$('#quickTask');if(q)q.onclick=()=>{let text=prompt('What did you just complete?');if(text){tasks.push({id:Date.now(),text,done:true});save();unlocked=true;startGame(true)}}}
function beep(freq,dur){if(!soundOn)return;try{let a=new (AudioContext||webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;o.type='square';g.gain.setValueAtTime(.035,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+dur);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+dur)}catch(e){}}
function renderSkins(){
 $('#skinCollection').innerHTML=SKINS.map(s=>`<div class="skin-card ${ownedSkins.includes(s.id)?'':'locked'}" data-rarity="${s.rarity}" id="skin-${s.id}" title="${s.name} — ${s.rarity}"><i class="skin-dot" style="--skin:${s.color}"></i><em class="rarity">${s.rarity[0]}</em><small>${s.name}</small></div>`).join('');
}
function award(points){
 let old=score;score+=points;if(score>highScore){highScore=score;localStorage.setItem('taskcade-high',highScore)}
 while(score>=nextMilestone){queueReward('5,000 POINT BONUS');nextMilestone+=5000}
 if(runStartHigh>0&&!beatHighRewarded&&old<=runStartHigh&&score>runStartHigh){beatHighRewarded=true;queueReward('NEW HIGH SCORE')}
}
function queueReward(reason){rewardQueue.push(reason);if(!clawActive)openClaw()}
function openClaw(){
 if(!rewardQueue.length)return;clawActive=true;running=false;cancelAnimationFrame(raf);show('clawPanel');$('#clawReason').textContent=rewardQueue.shift();clawX=50;$('#claw').style.left=clawX+'%';
 let locked=SKINS.filter(s=>!ownedSkins.includes(s.id));if(!locked.length){lives++;setTimeout(closeClaw,900);$('#prizeRow').innerHTML='<span class="alert">VAULT COMPLETE — EXTRA HEART!</span>';return}
 clawPrizes=Array.from({length:140},(_,i)=>{let skin=weightedSkin(locked),row=Math.floor(i/28),x=3+(i%28)*3.5+(Math.random()*2-1),y=row*25+Math.random()*5;return {skin,x,y,turn:(Math.random()*22-11).toFixed(1)+'deg'}});
 $('#prizeRow').innerHTML=clawPrizes.map((p,i)=>`<i class="chest ${p.skin.rarity}" data-index="${i}" title="Mystery ${p.skin.rarity} chest" style="--chest:${p.skin.color};--turn:${p.turn};--z:${10+Math.floor(p.y)};left:${p.x}%;bottom:${p.y}px"></i>`).join('');
}
function weightedSkin(list){let total=list.reduce((n,s)=>n+s.weight,0),roll=Math.random()*total;for(let s of list){roll-=s.weight;if(roll<=0)return s}return list[0]}
function moveClaw(amount){if(!clawActive||$('#claw').classList.contains('dropping'))return;clawX=Math.max(12,Math.min(88,clawX+amount));$('#claw').style.left=clawX+'%'}
function dropClaw(){
 if(!clawActive||!clawPrizes.length||$('#claw').classList.contains('dropping'))return;$('#claw').classList.add('dropping');let nearby=[...clawPrizes].sort((a,b)=>Math.abs(a.x-clawX)-Math.abs(b.x-clawX)).slice(0,10),pick=nearby[Math.floor(Math.random()*Math.min(5,nearby.length))],skin=pick.skin;
 setTimeout(()=>{let chest=document.querySelector(`.chest[data-index="${clawPrizes.indexOf(pick)}"]`);if(chest)chest.style.opacity='0';unlockSkin(skin)},700);
}
function unlockSkin(skin){
 let target=$('#skin-'+skin.id),from=$('#claw').getBoundingClientRect(),to=target.getBoundingClientRect(),fly=document.createElement('i');fly.className='flying-skin';fly.style.cssText=`--skin:${skin.color};left:${from.left}px;top:${from.top+190}px`;document.body.append(fly);requestAnimationFrame(()=>{fly.style.left=(to.left+to.width/2-12)+'px';fly.style.top=(to.top+to.height/2-12)+'px';fly.style.transform='scale(.65) rotate(360deg)'});setTimeout(()=>{fly.remove();target.classList.add('unlocking','reward-flash');beep(920,.25);setTimeout(()=>{ownedSkins.push(skin.id);activeSkin=skin.id;localStorage.setItem('taskcade-skins',JSON.stringify(ownedSkins));localStorage.setItem('taskcade-active-skin',activeSkin);renderSkins();closeClaw()},750)},850)
}
function closeClaw(){$('#claw').classList.remove('dropping');clawActive=false;if(rewardQueue.length){openClaw();return}show('gamePanel');running=true;updateHud();cancelAnimationFrame(raf);loop()}

const canvas=$('#game'),ctx=canvas.getContext('2d'),W=520,H=400,CELL=24,OX=8,OY=8,JAIL={x:32,y:300,w:96,h:68};
let MAZE=[
 '##########.##########','#...................#','#.###.###.#.###.###.#',
 '#.#.....#...#.....#.#','#.#.###.#####.###.#.#','#...................#',
 '#.###.#.#####.#.###.#','......#.......#......','#####.##....###.#####',
 '#.........#.........#','#.###.###.#.###.###.#','#...#...........#...#',
 '###.#.#.#####.#.#.###','#.....#...#...#.....#','#...................#','##########.##########'
];
const MAZE_VARIANTS=[MAZE,[
 '##########.##########','#...................#','#.#####.#####.#####.#',
 '#.....#...#...#.....#','###.#.#.#.#.#.#.#.###','#...#...........#...#',
 '#.#.###.#####.###.#.#','......#.......#......','#####.##....###.#####',
 '#.....#...#...#.....#','#.###.#.#.#.#.#.###.#','#...#...........#...#',
 '###.#.###.#.###.#.###','#.....#.......#.....#','#.........#.........#','##########.##########'
],[
 '##########.##########','#.........#.........#','#.#####.#.#.#.#####.#',
 '#...#...#...#...#...#','#.#.#.#####.#####.#.#','#.#.................#',
 '#.###.###.#####.###.#','......#.......#......','#####.##....###.#####',
 '#.........#.........#','#.###.#####.#####.###','#...#...........#...#',
 '#.#.#.###.#.###.#.#.#','#.#.....#...#.....#.#','#.........#.........#','##########.##########'
]];
MAZE_VARIANTS[1][8]='#####.##....###.#####';
const DIRS=[{x:1,y:0,a:0},{x:-1,y:0,a:Math.PI},{x:0,y:1,a:Math.PI/2},{x:0,y:-1,a:-Math.PI/2}];
let player,ghosts,dots,apples,keys={},wanted={x:0,y:0},frightenedUntil=0,hitLock=false;
const center=(c,r)=>({x:OX+c*CELL+CELL/2,y:OY+r*CELL+CELL/2});
const tileAt=(x,y)=>({c:Math.floor((x-OX)/CELL),r:Math.floor((y-OY)/CELL)});
const open=(c,r)=>r===7&&(c===-1||c===MAZE[0].length)||c===10&&(r===-1||r===MAZE.length)||r>=0&&r<MAZE.length&&c>=0&&c<MAZE[0].length&&MAZE[r][c]!=='#';
function canStand(x,y,r=9,escapePlayer=false){let outsideJail=x+r<JAIL.x||x-r>JAIL.x+JAIL.w||y+r<JAIL.y||y-r>JAIL.y+JAIL.h;let playerInside=escapePlayer&&player&&player.x>JAIL.x-r&&player.x<JAIL.x+JAIL.w+r&&player.y>JAIL.y-r&&player.y<JAIL.y+JAIL.h+r;let jailOkay=outsideJail||playerInside;return jailOkay&&[[-r,-r],[r,-r],[-r,r],[r,r]].every(([dx,dy])=>{let t=tileAt(x+dx,y+dy);return open(t.c,t.r)})}
function wrapTunnel(o){let t=tileAt(o.x,o.y);if(t.r===7){if(o.x<center(0,7).x)o.x=center(20,7).x;if(o.x>center(20,7).x)o.x=center(0,7).x}if(t.c===10){if(o.y<center(10,0).y)o.y=center(10,15).y;if(o.y>center(10,15).y)o.y=center(10,0).y}}
function jailSpot(g){let i=ghosts.indexOf(g);return {x:JAIL.x+17+i*21,y:JAIL.y+39}}
function resetGame(){
 let p=center(9,14);player={...p,r:10,a:0,dir:{x:0,y:0}};wanted={x:0,y:0};frightenedUntil=0;
 let specs=[
  {name:'Blinky',kind:'blinky',home:[8,8],c:'#ff304f',speed:1.62},
  {name:'Pinky',kind:'pinky',home:[9,8],c:'#ff76d7',speed:1.58},
  {name:'Inky',kind:'inky',home:[10,8],c:'#35e8f2',speed:1.6},
  {name:'Clyde',kind:'clyde',home:[11,8],c:'#ff9e3d',speed:1.54}
 ];
 ghosts=specs.map((g,i)=>({...g,...center(...g.home),dir:DIRS[i%2],decisionTile:'',jailedUntil:0}));
 dots=[];for(let r=0;r<MAZE.length;r++)for(let c=0;c<MAZE[r].length;c++){let d=center(c,r),inJail=d.x>JAIL.x&&d.x<JAIL.x+JAIL.w&&d.y>JAIL.y&&d.y<JAIL.y+JAIL.h;if(open(c,r)&&!inJail&&!(r===8&&c>=8&&c<=11)&&!(r===14&&c===9))dots.push({...d,eaten:false})}
 let choices=dots.filter((_,i)=>i%9===0),count=1+Math.floor(Math.random()*2);apples=[];
 while(apples.length<count&&choices.length){let i=Math.floor(Math.random()*choices.length),d=choices.splice(i,1)[0];apples.push({x:d.x,y:d.y,eaten:false})}
}
function startGame(revive){show('gamePanel');running=true;if(!revive){score=0;lives=3;level=1;MAZE=MAZE_VARIANTS[0];runStartHigh=highScore;nextMilestone=5000;beatHighRewarded=false;rewardQueue=[];resetGame()}else{let p=center(9,14);Object.assign(player,p,{dir:{x:0,y:0}});wanted={x:0,y:0};ghosts.filter(g=>!g.jailedUntil).forEach((g,i)=>Object.assign(g,center(...g.home),{dir:DIRS[i%2],decisionTile:''}));frightenedUntil=Date.now()+5000}updateHud();cancelAnimationFrame(raf);loop()}
function speedScale(){return 1+Math.floor(level/5)*.08}
function updateHud(){let max=Math.max(3,lives);$('#score').textContent=String(score).padStart(4,'0');$('#highScore').textContent=String(highScore).padStart(4,'0');$('#level').textContent=String(level).padStart(2,'0');$('#lives').textContent='●'.repeat(lives)+'○'.repeat(max-lives)}
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(clawActive){e.preventDefault();return}keys[k]=true;if(['arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='arrowleft'||k==='a')setDirection(-1,0);if(k==='arrowright'||k==='d')setDirection(1,0);if(k==='arrowup'||k==='w')setDirection(0,-1);if(k==='arrowdown'||k==='s')setDirection(0,1);if(e.key==='Escape'){running=false;show('tasksPanel')}});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
function setDirection(x,y){wanted={x,y};if(player&&player.dir&&x===-player.dir.x&&y===-player.dir.y)player.dir={x,y}}
const joystick=$('#joystick'),joystickStick=$('#joystickStick');let joystickHeld=false,joystickVector={x:0,y:0},joystickRepeat;
function aimJoystick(e){let r=joystick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),distance=Math.hypot(dx,dy),limit=19;if(distance<5)return;let scale=Math.min(limit,distance)/distance,visualX=dx*scale,visualY=dy*scale,cardinal={x:Math.sign(dx),y:0,name:dx<0?'LEFT':'RIGHT'};joystickVector=cardinal;joystick.style.setProperty('--joy-x',visualX+'px');joystick.style.setProperty('--joy-y',visualY+'px');joystick.dataset.direction=cardinal.name;if(cardinal.x)moveClaw(cardinal.x*4)}
function releaseJoystick(){joystickHeld=false;joystick.classList.remove('engaged');joystick.style.setProperty('--joy-x','0px');joystick.style.setProperty('--joy-y','0px');joystickVector={x:0,y:0};clearInterval(joystickRepeat)}
joystick.addEventListener('pointerdown',e=>{if(!clawActive)return;joystickHeld=true;joystick.classList.add('engaged');joystick.setPointerCapture(e.pointerId);aimJoystick(e);clearInterval(joystickRepeat);joystickRepeat=setInterval(()=>{if(joystickHeld&&clawActive&&joystickVector.x)moveClaw(joystickVector.x*3)},90)});
joystick.addEventListener('pointermove',e=>{if(joystickHeld)aimJoystick(e)});joystick.addEventListener('pointerup',releaseJoystick);joystick.addEventListener('pointercancel',releaseJoystick);
function loop(){if(!running)return;update();draw();raf=requestAnimationFrame(loop)}
function nearCenter(o,tolerance=2.2){let t=tileAt(o.x,o.y),p=center(t.c,t.r);return {t,p,near:Math.abs(o.x-p.x)<tolerance&&Math.abs(o.y-p.y)<tolerance}}
function updatePlayer(){
 let playerSpeed=2.55*speedScale(),{t,p,near}=nearCenter(player,playerSpeed/2+.25);
 if(near){player.x=p.x;player.y=p.y;if((wanted.x||wanted.y)&&open(t.c+wanted.x,t.r+wanted.y))player.dir={...wanted};if(!open(t.c+player.dir.x,t.r+player.dir.y))player.dir={x:0,y:0}}
 let nx=player.x+player.dir.x*playerSpeed,ny=player.y+player.dir.y*playerSpeed;if(canStand(nx,ny,9,true)){player.x=nx;player.y=ny;wrapTunnel(player)}if(player.dir.x||player.dir.y)player.a=Math.atan2(player.dir.y,player.dir.x);
}
function chooseGhostDir(g){
 let {t,p}=nearCenter(g);g.x=p.x;g.y=p.y;let pt=tileAt(player.x,player.y),fright=Date.now()<frightenedUntil,target=fright?pt:ghostTarget(g,pt);
 // Ghosts only consider maze walls. Other ghosts never block a tile, so they can overlap and pass through one another.
 let passable=d=>open(t.c+d.x,t.r+d.y);
 let options=DIRS.filter(d=>passable(d)&&!(d.x===-g.dir.x&&d.y===-g.dir.y));if(!options.length)options=DIRS.filter(passable);
 options.sort((a,b)=>{let da=Math.abs(t.c+a.x-target.c)+Math.abs(t.r+a.y-target.r),db=Math.abs(t.c+b.x-target.c)+Math.abs(t.r+b.y-target.r);return fright?db-da:da-db});
 g.dir=options[0]||g.dir;
}
function ghostTarget(g,pac){
 let ahead={c:pac.c+player.dir.x*4,r:pac.r+player.dir.y*4};
 if(g.kind==='pinky')return ahead;
 if(g.kind==='inky'){let two={c:pac.c+player.dir.x*2,r:pac.r+player.dir.y*2},b=ghosts.find(x=>x.kind==='blinky'),bt=tileAt(b.x,b.y);return {c:two.c+(two.c-bt.c),r:two.r+(two.r-bt.r)}}
 if(g.kind==='clyde'){let gt=tileAt(g.x,g.y);return Math.hypot(gt.c-pac.c,gt.r-pac.r)<=8?{c:1,r:14}:pac}
 return pac;
}
function updateGhost(g){
 if(g.jailedUntil){if(Date.now()<g.jailedUntil){Object.assign(g,jailSpot(g));return}g.jailedUntil=0;Object.assign(g,center(...g.home),{dir:DIRS[Math.floor(Math.random()*4)],decisionTile:'',stall:0})}
 let oldX=g.x,oldY=g.y,q=nearCenter(g),tileKey=q.t.c+','+q.t.r;if(q.near&&g.decisionTile!==tileKey){chooseGhostDir(g);g.decisionTile=tileKey}if(!q.near&&g.decisionTile===tileKey)g.decisionTile='';let speed=g.speed;
 if(g.kind==='blinky'){let left=dots.filter(d=>!d.eaten).length/dots.length;if(left<.2)speed+=.38;else if(left<.45)speed+=.2}
 if(Date.now()<frightenedUntil)speed=1.15;speed*=speedScale();let nx=g.x+g.dir.x*speed,ny=g.y+g.dir.y*speed;if(canStand(nx,ny,8)){g.x=nx;g.y=ny;wrapTunnel(g)}else chooseGhostDir(g);
 g.stall=Math.hypot(g.x-oldX,g.y-oldY)<.1?(g.stall||0)+1:0;
 if(g.stall>12){let t=tileAt(g.x,g.y),escape=DIRS.filter(d=>open(t.c+d.x,t.r+d.y));g.dir=escape[Math.floor(Math.random()*escape.length)]||g.dir;g.stall=0}
}
function update(){
 updatePlayer();dots.forEach(d=>{if(!d.eaten&&Math.hypot(player.x-d.x,player.y-d.y)<11){d.eaten=true;award(10);beep(420,.025)}});
 apples.forEach(a=>{if(!a.eaten&&Math.hypot(player.x-a.x,player.y-a.y)<15){a.eaten=true;lives++;award(100);beep(820,.12)}});
 ghosts.forEach(g=>{updateGhost(g);if(!g.jailedUntil&&Math.hypot(player.x-g.x,player.y-g.y)<19){if(Date.now()<frightenedUntil){award(200);beep(700,.12);g.jailedUntil=Date.now()+10000;Object.assign(g,jailSpot(g),{dir:{x:0,y:0},decisionTile:''})}else hit()}});
 updateHud();if(dots.every(d=>d.eaten)){award(500);level++;MAZE=MAZE_VARIANTS[level%MAZE_VARIANTS.length];resetGame();updateHud()}
}
function hit(){if(hitLock)return;hitLock=true;lives--;updateHud();beep(100,.3);running=false;if(lives<=0){let final=score;setTimeout(()=>{hitLock=false;$('#finalScore').textContent=String(final).padStart(4,'0');$('#defeatedHigh').textContent=String(highScore).padStart(4,'0');show('defeatedPanel')},500);return}setTimeout(()=>{hitLock=false;renderRevive();show('revivePanel')},250)}
function wall(x,y){ctx.fillStyle='#151154';ctx.strokeStyle='#5a3cff';ctx.lineWidth=2;ctx.shadowBlur=7;ctx.shadowColor='#563cff';ctx.fillRect(x+2,y+2,CELL-4,CELL-4);ctx.strokeRect(x+3,y+3,CELL-6,CELL-6);ctx.shadowBlur=0}
function drawGhost(g,fright){
 let color=fright?'#315cff':g.c;ctx.fillStyle=color;ctx.shadowBlur=fright?8:14;ctx.shadowColor=color;ctx.beginPath();ctx.arc(g.x,g.y-3,11,Math.PI,0);ctx.lineTo(g.x+11,g.y+11);ctx.lineTo(g.x+5,g.y+6);ctx.lineTo(g.x,g.y+11);ctx.lineTo(g.x-5,g.y+6);ctx.lineTo(g.x-11,g.y+11);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(g.x-5,g.y-4,3.2,0,7);ctx.arc(g.x+5,g.y-4,3.2,0,7);ctx.fill();ctx.fillStyle=fright?'#cce3ff':'#18133a';ctx.beginPath();ctx.arc(g.x-5,g.y-3,1.5,0,7);ctx.arc(g.x+5,g.y-3,1.5,0,7);ctx.fill();if(fright){ctx.strokeStyle='#d8e5ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(g.x,g.y+6,4,Math.PI,0);ctx.stroke()}
}
function drawJail(){
 ctx.fillStyle='#090916';ctx.fillRect(JAIL.x,JAIL.y,JAIL.w,JAIL.h);ctx.strokeStyle='#b7c0d8';ctx.lineWidth=3;ctx.shadowBlur=7;ctx.shadowColor='#42f5ff';ctx.strokeRect(JAIL.x,JAIL.y,JAIL.w,JAIL.h);ctx.shadowBlur=0;
 ctx.fillStyle='#42f5ff';ctx.font='bold 8px Courier New';ctx.textAlign='center';ctx.fillText('GHOST JAIL',JAIL.x+JAIL.w/2,JAIL.y+11);
 ctx.strokeStyle='#78839d';ctx.lineWidth=2;for(let x=JAIL.x+8;x<JAIL.x+JAIL.w;x+=12){ctx.beginPath();ctx.moveTo(x,JAIL.y+15);ctx.lineTo(x,JAIL.y+JAIL.h);ctx.stroke()}
 let jailed=ghosts.filter(g=>g.jailedUntil);if(jailed.length){let left=Math.max(...jailed.map(g=>g.jailedUntil-Date.now()));ctx.fillStyle='#ffdf63';ctx.font='bold 8px Courier New';ctx.fillText(Math.max(1,Math.ceil(left/1000))+'s',JAIL.x+JAIL.w/2,JAIL.y+JAIL.h-5)}
}
function drawJailBars(){ctx.strokeStyle='#aeb8d0';ctx.lineWidth=2;for(let x=JAIL.x+8;x<JAIL.x+JAIL.w;x+=12){ctx.beginPath();ctx.moveTo(x,JAIL.y+15);ctx.lineTo(x,JAIL.y+JAIL.h);ctx.stroke()}}
function draw(){
 ctx.fillStyle='#050512';ctx.fillRect(0,0,W,H);for(let r=0;r<MAZE.length;r++)for(let c=0;c<MAZE[r].length;c++)if(MAZE[r][c]==='#')wall(OX+c*CELL,OY+r*CELL);
 let ty=center(0,7).y,tx=center(10,0).x;ctx.fillStyle='#42f5ff';ctx.font='bold 13px Courier New';ctx.textAlign='left';ctx.fillText('‹',1,ty+5);ctx.textAlign='right';ctx.fillText('›',W-1,ty+5);ctx.textAlign='center';ctx.fillText('⌃',tx,11);ctx.fillText('⌄',tx,H-2);
 dots.forEach(d=>{if(!d.eaten){ctx.fillStyle='#ffe95b';ctx.beginPath();ctx.arc(d.x,d.y,2.2,0,7);ctx.fill()}});
 apples.forEach(a=>{if(!a.eaten){ctx.fillStyle='#ff3159';ctx.shadowBlur=10;ctx.shadowColor='#ff3159';ctx.beginPath();ctx.arc(a.x-4,a.y+1,6,0,7);ctx.arc(a.x+4,a.y+1,6,0,7);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#66e879';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y-4);ctx.quadraticCurveTo(a.x+5,a.y-10,a.x+9,a.y-7);ctx.stroke()}});
 let fright=Date.now()<frightenedUntil;drawJail();ghosts.forEach(g=>drawGhost(g,fright&&!g.jailedUntil));drawJailBars();
 let skin=SKINS.find(s=>s.id===activeSkin)||SKINS[0],moving=player.dir.x||player.dir.y,mouth=moving ? .18+Math.abs(Math.sin(Date.now()/85))*.34 : .25;
 ctx.fillStyle=skin.color;ctx.shadowBlur=15;ctx.shadowColor=skin.color;ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.arc(player.x,player.y,player.r,player.a+mouth,player.a+Math.PI*2-mouth);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
 let eyeAngle=player.a-Math.PI/2,eyeX=player.x+Math.cos(eyeAngle)*4.5,eyeY=player.y+Math.sin(eyeAngle)*4.5;ctx.fillStyle='#090914';ctx.beginPath();ctx.arc(eyeX,eyeY,1.7,0,Math.PI*2);ctx.fill();
 if(fright){ctx.fillStyle='#42f5ff';ctx.font='bold 9px Courier New';ctx.textAlign='center';ctx.fillText('POWER MODE  '+Math.max(1,Math.ceil((frightenedUntil-Date.now())/1000))+'s',W/2,H-3)}
}
renderSkins();render();updateHud();
