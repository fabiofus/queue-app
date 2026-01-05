{\rtf1\ansi\ansicpg1252\cocoartf2818
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import type \{ NextRequest \} from "next/server";\
import \{ NextResponse \} from "next/server";\
import \{ supabaseAdmin \} from "@/lib/supabase";\
\
export const runtime = "nodejs";\
\
function startOfTodayIso() \{\
  const d = new Date();\
  d.setHours(0, 0, 0, 0);\
  return d.toISOString();\
\}\
\
function endOfTodayIso() \{\
  const d = new Date();\
  d.setHours(23, 59, 59, 999);\
  return d.toISOString();\
\}\
\
function toCsvValue(v: unknown): string \{\
  if (v == null) return "";\
  const s = String(v);\
  const escaped = s.replace(/"/g, '""');\
  return `"$\{escaped\}"`;\
\}\
\
export async function GET(req: NextRequest) \{\
  try \{\
    const url = req.nextUrl;\
    const slug = url.searchParams.get("slug") || "";\
\
    if (!slug) \{\
      return NextResponse.json(\{ error: "missing_slug" \}, \{ status: 400 \});\
    \}\
\
    const from = startOfTodayIso();\
    const to = endOfTodayIso();\
\
    const \{ data, error \} = await supabaseAdmin\
      .from("contacts")\
      .select("ticket_number, full_name, phone, seats, notes, created_at")\
      .eq("counter_slug", slug)\
      .gte("created_at", from)\
      .lte("created_at", to)\
      .order("ticket_number", \{ ascending: true \});\
\
    if (error) \{\
      console.error("clerk_contacts_csv_query_failed", error);\
      return NextResponse.json(\
        \{ error: "contacts_query_failed" \},\
        \{ status: 500 \},\
      );\
    \}\
\
    const rows = data || [];\
\
    const header = [\
      "ticket_number",\
      "full_name",\
      "phone",\
      "seats",\
      "notes",\
      "created_at",\
    ];\
\
    const lines: string[] = [];\
    lines.push(header.join(","));\
\
    for (const row of rows) \{\
      lines.push(\
        [\
          toCsvValue(row.ticket_number),\
          toCsvValue(row.full_name),\
          toCsvValue(row.phone),\
          toCsvValue(row.seats),\
          toCsvValue(row.notes),\
          toCsvValue(row.created_at),\
        ].join(","),\
      );\
    \}\
\
    const csv = lines.join("\\n");\
\
    const today = new Date();\
    const yyyy = today.getFullYear();\
    const mm = String(today.getMonth() + 1).padStart(2, "0");\
    const dd = String(today.getDate()).padStart(2, "0");\
    const filename = `report_$\{slug\}_$\{yyyy\}-$\{mm\}-$\{dd\}.csv`;\
\
    return new Response(csv, \{\
      status: 200,\
      headers: \{\
        "Content-Type": "text/csv; charset=utf-8",\
        "Content-Disposition": `attachment; filename="$\{filename\}"`,\
      \},\
    \});\
  \} catch (e: any) \{\
    console.error("clerk_contacts_csv_unhandled", e);\
    return NextResponse.json(\
      \{ error: e?.message ?? "server_error" \},\
      \{ status: 500 \},\
    );\
  \}\
\}\
}