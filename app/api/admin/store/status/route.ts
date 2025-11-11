import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
type Body={storeSlug:string;enabled:boolean};
export async function POST(req:Request){
  const b=await req.json() as Partial<Body>;
  const {storeSlug,enabled}=b||{};
  if(!storeSlug||typeof enabled!=="boolean") return NextResponse.json({error:"missing storeSlug/enabled"},{status:400});
  const ids=(await kv.smembers<string[]>(`store:index:${storeSlug}`))||[];
  for(const id of ids){
    const key=`counter:meta:${id}`; const meta=await kv.get<any>(key); if(!meta) continue;
    meta.enabled=!!enabled; await kv.set(key,meta);
  }
  return NextResponse.json({ok:true,updated:ids.length});
}
