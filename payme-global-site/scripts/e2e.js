const {chromium,devices}=require('playwright');const D=(process.argv[2]||'test-shots')+'/';require('fs').mkdirSync(D,{recursive:true});const B='http://localhost:4173';
(async()=>{const b=await chromium.launch();const log=[];const errs=[];
 const desk=await b.newContext({viewport:{width:1440,height:900}});const app=await desk.newPage();app.on('pageerror',e=>errs.push('app: '+e.message));
 const ph=await b.newContext({...devices['iPhone 13'],deviceScaleFactor:1});const cl=await ph.newPage();cl.on('pageerror',e=>errs.push('client: '+e.message));
 // 1. dashboard
 await app.goto(B+'/app');await app.waitForTimeout(1500);log.push('dashboard projects: '+await app.locator('.prow').count());
 // 2. create an invoice
 const nw=await desk.newPage();nw.on('pageerror',e=>errs.push('new: '+e.message));
 await nw.goto(B+'/new#profile');await nw.waitForTimeout(800);await nw.fill('#f-name','Ada Okafor');await nw.fill('#f-head','Brand designer');await nw.evaluate(()=>{location.hash='#editor'});await nw.waitForTimeout(500);await nw.fill('#c-name','Amara Okafor');await nw.fill('#c-email','amara@sunbird.co');await nw.fill('#c-co','Sunbird Bakery');await nw.fill('#p-title','Sunbird brand refresh');await nw.fill('#it0d','Brand identity');await nw.fill('#it0p','600');
 await nw.click('#send-d');await nw.waitForTimeout(1200);const link=await nw.textContent('#sh-link');log.push('share link: '+link);
 const code=link.split('/i/')[1];
 // 3. client opens and pays
 await cl.goto(B+'/i/'+code);await cl.waitForTimeout(5200);log.push('client headline: '+await cl.textContent('#headline'));
 await cl.screenshot({path:D+'e1.png'});
 await cl.tap('#bar-btn');await cl.waitForTimeout(600);await cl.tap('#go-usdt');await cl.waitForTimeout(4500);
 log.push('client after pay: '+await cl.textContent('#headline')+' | bar: '+await cl.textContent('#bar-btn'));
 // 4. app hears about it
 await app.waitForTimeout(3500);log.push('app toast: '+await app.textContent('#toast'));log.push('app unread badge: '+await app.textContent('.nav .badge').catch(()=>'-'));
 // 5. client requests an update
 await cl.tap('#bar-btn');await cl.waitForTimeout(600);await cl.fill('#req-note','Could you share the moodboard?');await cl.tap('#send-req');await cl.waitForTimeout(800);
 log.push('client bar after request: '+await cl.textContent('#bar-btn'));
 await app.waitForTimeout(3500);log.push('app request banner: '+(await app.locator('.req b').first().textContent().catch(()=>'none')));
 // 6. freelancer replies
 await app.click('.req .btn');await app.waitForTimeout(500);await app.fill('#up-text','Moodboard attached: warm terracotta and cream. First logo routes on Friday.');await app.fill('#up-link','figma.com/file/sunbird');
 await app.click('#compose button[type=submit]');await app.waitForTimeout(800);log.push('app answered: '+await app.textContent('.answered').catch(()=>'none'));
 await app.screenshot({path:D+'e2.png'});
 await cl.waitForTimeout(4000);log.push('client toast: '+await cl.textContent('#toast'));log.push('client updates: '+await cl.locator('.up').count()+' | bar: '+await cl.textContent('#bar-btn'));
 await cl.evaluate(()=>document.querySelector('#progress').scrollIntoView());await cl.waitForTimeout(300);await cl.screenshot({path:D+'e3.png'});
 // 7. bad link + landing
 const bad=await ph.newPage();await bad.goto(B+'/i/nope123');await bad.waitForTimeout(800);log.push('bad link: '+await bad.textContent('h1'));
 const land=await desk.newPage();land.on('pageerror',e=>errs.push('landing: '+e.message));await land.goto(B+'/');await land.waitForTimeout(1500);log.push('landing ok: '+await land.title());
 const ap2=await desk.newPage();await ap2.goto(B+'/app');await ap2.waitForTimeout(1200);log.push('app sidebar: '+(await ap2.textContent('#me')));await ap2.click('#demo-d summary');await ap2.click('[data-demo=fresh]');await ap2.waitForTimeout(900);log.push('after clear: projects '+await ap2.locator('.prow').count()+' | '+(await ap2.textContent('h1')));await ap2.click('[data-demo=sample]');await ap2.waitForTimeout(900);log.push('after sample: projects '+await ap2.locator('.prow').count()+' | '+(await ap2.textContent('#me')));
 const c2=await ph.newPage();await c2.goto(B+'/i/Lx4Hn8Wq2cVb');await c2.waitForTimeout(5000);log.push('sample client: '+await c2.textContent('#from')+' | '+await c2.textContent('#bar-fine'));await c2.screenshot({path:D+'e4.png'});
 console.log(log.join('\n'));console.log(errs.join('\n')||'no page errors');await b.close()})();
