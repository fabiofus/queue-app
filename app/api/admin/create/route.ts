import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
type Body={storeName:string;storeSlug:string;counterName:string;counterSlug:string};
export async function POST(req:Request){
  const b=await req.json() as Partial<Body>;
  const {storeName,storeSlug,counterName,counterSlug}=b||{};
  if(!storeName||!storeSlug||!counterName||!counterSlug) return NextResponse.json({error:"missing fields"},{status:400});
  const id=`${storeSlug}:${counterSlug}`; const now=new Date().toISOString();
  const meta={id,name:counterName,slug:counterSlug,store:storeName,storeSlug,enabled:true,createdAt:now};
  await kv.set(`counter:meta:${id}`,meta);
  await kv.sadd("counters:index",id);
  await kv.sadd(`store:index:${storeSlug}`,id);
  const base=process.env.NEXT_PUBLIC_BASE_URL||(process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:"");
  const takeUrl=`${base}/take?slug=${encodeURIComponent(counterSlug)}`;
  const clerkUrl=`${base}/clerk?slug=${encodeURIComponent(counterSlug)}`;
  return NextResponse.json({store:{name:storeName,slug:storeSlug},counter:{name:counterName,slug:counterSlug},urls:{take:takeUrl,clerk:clerkUrl}});
}
