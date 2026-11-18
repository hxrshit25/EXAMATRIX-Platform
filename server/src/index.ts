import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Student = { id:string; rollNo:string; name:string; department:string; semester:string };
type Room = { id:string; name:string; building:string; capacity:number; rows:number; columns:number };
type Exam = { id:string; subject:string; code:string; date:string; time:string; department:string; semester:string };
type Allocation = { id:string; examId:string; studentId:string; roomId:string; seat:string; createdAt:string };
type DB = { students:Student[]; rooms:Room[]; exams:Exam[]; allocations:Allocation[] };
const app=express(); app.use(cors()); app.use(express.json({limit:'2mb'}));
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.DATA_DIR || path.resolve(__dirname,'../data');
const dbFile=path.join(dataDir,'db.json');
const initial:DB={students:[
{id:'s1',rollNo:'124001',name:'Aarav Sharma',department:'CSE',semester:'3'},{id:'s2',rollNo:'124002',name:'Ananya Verma',department:'CSE',semester:'3'},{id:'s3',rollNo:'124003',name:'Rohan Kumar',department:'ECE',semester:'3'},{id:'s4',rollNo:'124004',name:'Priya Singh',department:'CSE',semester:'3'},{id:'s5',rollNo:'124005',name:'Kabir Das',department:'ECE',semester:'3'},{id:'s6',rollNo:'124006',name:'Meera Gupta',department:'CSE',semester:'3'}],
rooms:[{id:'r1',name:'Block 32 · Room 201',building:'Block 32',capacity:30,rows:5,columns:6},{id:'r2',name:'Block 32 · Room 202',building:'Block 32',capacity:24,rows:4,columns:6}],
exams:[{id:'e1',subject:'Data Structures',code:'CSE204',date:'2026-12-02',time:'09:30 AM',department:'CSE',semester:'3'},{id:'e2',subject:'Digital Electronics',code:'ECE202',date:'2026-12-04',time:'02:00 PM',department:'ECE',semester:'3'}],allocations:[]};
async function readDB():Promise<DB>{await fs.mkdir(dataDir,{recursive:true});try{return JSON.parse(await fs.readFile(dbFile,'utf8')) as DB}catch{await fs.writeFile(dbFile,JSON.stringify(initial,null,2));return structuredClone(initial)}}
async function writeDB(db:DB){await fs.writeFile(dbFile,JSON.stringify(db,null,2))}
const id=()=>Math.random().toString(36).slice(2,10);
app.get('/api/health',(_req,res)=>res.json({status:'ok',service:'EXAMATRIX API',version:'2.0.0'}));
app.get('/api/dashboard',async(_req,res)=>{const d=await readDB();res.json({students:d.students.length,rooms:d.rooms.length,exams:d.exams.length,allocations:d.allocations.length,allocatedStudents:new Set(d.allocations.map(a=>a.studentId)).size,upcomingExams:d.exams.filter(e=>e.date>=new Date().toISOString().slice(0,10)).length})});
for(const key of ['students','rooms','exams'] as const){
 app.get(`/api/${key}`,async(_req,res)=>res.json((await readDB())[key]));
 app.post(`/api/${key}`,async(req,res)=>{const d=await readDB();const item={...req.body,id:id()} as any;if(key==='students'&&d.students.some(s=>s.rollNo.toLowerCase()===String(item.rollNo).toLowerCase()))return res.status(409).json({error:'Roll number already exists'});d[key].push(item);await writeDB(d);res.status(201).json(item)});
 app.put(`/api/${key}/:id`,async(req,res)=>{const d=await readDB();const i=d[key].findIndex((x:any)=>x.id===req.params.id);if(i<0)return res.status(404).json({error:'Record not found'});d[key][i]={...d[key][i],...req.body,id:req.params.id} as any;await writeDB(d);res.json(d[key][i])});
 app.delete(`/api/${key}/:id`,async(req,res)=>{const d=await readDB();(d as any)[key]=d[key].filter((x:any)=>x.id!==req.params.id);if(key==='students')d.allocations=d.allocations.filter(a=>a.studentId!==req.params.id);if(key==='exams')d.allocations=d.allocations.filter(a=>a.examId!==req.params.id);if(key==='rooms')d.allocations=d.allocations.filter(a=>a.roomId!==req.params.id);await writeDB(d);res.json({success:true})});
}
app.get('/api/allocations',async(req,res)=>{const d=await readDB();const examId=String(req.query.examId||'');res.json(d.allocations.filter(a=>!examId||a.examId===examId).map(a=>({...a,student:d.students.find(s=>s.id===a.studentId),room:d.rooms.find(r=>r.id===a.roomId),exam:d.exams.find(e=>e.id===a.examId)})))});
app.post('/api/allocations/generate',async(req,res)=>{const d=await readDB();const exam=d.exams.find(e=>e.id===req.body.examId);if(!exam)return res.status(404).json({error:'Select a valid exam'});const eligible=d.students.filter(s=>(!exam.department||s.department===exam.department)&&(!exam.semester||s.semester===exam.semester)).sort((a,b)=>a.rollNo.localeCompare(b.rollNo,undefined,{numeric:true}));if(!eligible.length)return res.status(400).json({error:'No students match this exam department and semester'});const rooms=d.rooms.slice();if(!rooms.length)return res.status(400).json({error:'Add at least one room first'});const existing=d.allocations.filter(a=>a.examId===exam.id);if(existing.length)return res.status(409).json({error:'An allocation already exists for this exam. Clear it before generating again.'});const capacity=rooms.reduce((n,r)=>n+Math.min(r.capacity,r.rows*r.columns),0);if(eligible.length>capacity)return res.status(400).json({error:`Not enough capacity. ${eligible.length} students need seats, but room capacity is ${capacity}.`});let cursor=0;const made:Allocation[]=[];for(const room of rooms){const count=Math.min(room.capacity,room.rows*room.columns);for(let seatNo=0;seatNo<count&&cursor<eligible.length;seatNo++,cursor++){const row=Math.floor(seatNo/room.columns),col=seatNo%room.columns;made.push({id:id(),examId:exam.id,studentId:eligible[cursor].id,roomId:room.id,seat:`${String.fromCharCode(65+row)}${col+1}`,createdAt:new Date().toISOString()})}}d.allocations.push(...made);await writeDB(d);res.status(201).json({count:made.length,allocations:made})});
app.delete('/api/allocations/:examId',async(req,res)=>{const d=await readDB();d.allocations=d.allocations.filter(a=>a.examId!==req.params.examId);await writeDB(d);res.json({success:true})});
app.get('/api/export',async(_req,res)=>{const d=await readDB();res.json(d)});
const port=Number(process.env.PORT)||4000;app.listen(port,'0.0.0.0',()=>console.log(`EXAMATRIX API listening on ${port}`));
