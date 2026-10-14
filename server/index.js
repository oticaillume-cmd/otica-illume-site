import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import {createHmac, randomBytes, timingSafeEqual, scryptSync} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {ADMIN_PASSWORD,SESSION_SECRET,NODE_ENV}=process.env;
if(!ADMIN_PASSWORD||ADMIN_PASSWORD.length<16||!SESSION_SECRET||SESSION_SECRET.length<32)throw Error('Configure ADMIN_PASSWORD (16+ caracteres) e SESSION_SECRET (32+ caracteres)');
const db=new Database(path.join(root,'illume.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,price_cents INTEGER NOT NULL CHECK(price_cents>=0),stock INTEGER NOT NULL CHECK(stock>=0),image TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP);CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,status TEXT NOT NULL DEFAULT 'rascunho',items_json TEXT NOT NULL,total_cents INTEGER NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
const app=express();app.set('trust proxy', 1);app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'32kb'}));
const secure=NODE_ENV==='production';const sessions=new Map();
const sign=t=>createHmac('sha256',SESSION_SECRET).update(t).digest('hex');
function auth(req,res,next){const cookie=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('illume_session='))?.split('=')[1];if(!cookie)return res.status(401).json({error:'Acesso não autorizado'});const [id,sig]=cookie.split('.');if(!id||!sig||sig.length!==64||!timingSafeEqual(Buffer.from(sign(id)),Buffer.from(sig))||!sessions.has(id)||sessions.get(id)<Date.now())return res.status(401).json({error:'Sessão inválida'});next()}
app.post('/api/login',rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false}), (req,res)=>{const input=String(req.body?.password||'');const salt='illume-admin-login';const a=scryptSync(input,salt,64),b=scryptSync(ADMIN_PASSWORD,salt,64);if(!timingSafeEqual(a,b))return res.status(401).json({error:'Credenciais inválidas'});const id=randomBytes(32).toString('hex');sessions.set(id,Date.now()+8*3600*1000);res.setHeader('Set-Cookie',`illume_session=${id}.${sign(id)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800${secure?'; Secure':''}`);res.json({ok:true})});
app.post('/api/logout',auth,(req,res)=>{const id=req.headers.cookie.split('illume_session=')[1].split('.')[0];sessions.delete(id);res.setHeader('Set-Cookie',`illume_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure?'; Secure':''}`);res.json({ok:true})});
app.get('/api/session',auth,(req,res)=>res.json({ok:true}));
app.get('/api/products',(req,res)=>res.json(db.prepare('SELECT id,name,category,price_cents,stock,image FROM products WHERE active=1 ORDER BY id DESC').all()));
app.get('/api/admin/products',auth,(req,res)=>res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all()));
function validate(p){if(typeof p?.name!=='string'||!p.name.trim()||p.name.length>120||!['grau','sol','clipon'].includes(p.category)||!Number.isSafeInteger(p.price_cents)||p.price_cents<0||!Number.isSafeInteger(p.stock)||p.stock<0||typeof p.image!=='string'||p.image.length>1000|| (p.image&&!/^https:\/\//.test(p.image)))return false;return true}
app.post('/api/admin/products',auth,(req,res)=>{const p=req.body;if(!validate(p))return res.status(400).json({error:'Dados inválidos'});const result=db.prepare('INSERT INTO products(name,category,price_cents,stock,image) VALUES(?,?,?,?,?)').run(p.name.trim(),p.category,p.price_cents,p.stock,p.image);res.status(201).json({id:result.lastInsertRowid.toString()})});
app.put('/api/admin/products/:id',auth,(req,res)=>{const p=req.body;if(!validate(p))return res.status(400).json({error:'Dados inválidos'});const result=db.prepare('UPDATE products SET name=?,category=?,price_cents=?,stock=?,image=? WHERE id=?').run(p.name.trim(),p.category,p.price_cents,p.stock,p.image,req.params.id);res.status(result.changes?200:404).json({ok:!!result.changes})});
app.delete('/api/admin/products/:id',auth,(req,res)=>{const result=db.prepare('UPDATE products SET active=0 WHERE id=?').run(req.params.id);res.status(result.changes?200:404).json({ok:!!result.changes})});
app.get('/api/admin/orders',auth,(req,res)=>res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC').all()));
app.use(express.static(root,{extensions:['html']}));app.listen(Number(process.env.PORT)||3000,()=>console.log('Illume local: http://localhost:'+(process.env.PORT||3000)));
