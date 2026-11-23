// local stand-in for Vercel: static files + /api/state + rewrites
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=require('path').resolve(__dirname,'..');const handler=require(ROOT+'/api/state.js');
const HDR=(require(ROOT+'/vercel.json').headers||[])[0];
http.createServer((req,res)=>{
 if(HDR)HDR.headers.forEach(h=>res.setHeader(h.key,h.value.replace(' upgrade-insecure-requests','')));
 const u=new URL(req.url,'http://x');let p=u.pathname;
 if(p.startsWith('/api/state')){let b='';req.on('data',c=>b+=c);req.on('end',()=>{req.body=b?JSON.parse(b):{};
   const r={setHeader:(k,v)=>res.setHeader(k,v),status(c){res.statusCode=c;return r},json(o){res.setHeader('content-type','application/json');res.end(JSON.stringify(o))},send(b){res.end(b)}};handler(req,r)});return}
 if(/^\/i\/[A-Za-z0-9]+$/.test(p))p='/client.html';else if(p==='/')p='/index.html';else if(!path.extname(p))p+='.html';
 fs.readFile(ROOT+p,(e,d)=>{if(e){res.statusCode=404;return res.end('nf')}res.setHeader('content-type',({'.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(p)]||'text/html');res.end(d)})
}).listen(4173,()=>console.log('up'));
