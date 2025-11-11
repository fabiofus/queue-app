import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
type Body={id:string;enabled:boolean};
export async function POST(req:Request){
  const b=await req.json() as Partial<Body>;
  const {id,enabled}=b||{};
  if(!id||typeof enabled!=="boolean") return NextResponse.json({error:"missing id/enabled"},{status:400});
  const key=`counter:meta:${id}`; const meta=await kv.get<any>(key);
  if(!meta) return NextResponse.json({error:"not found"},{status:404});
  meta.enabled=!!enabled; await kv.set(key,meta);
  return NextResponse.json({ok:true});
}
