import { NextResponse } from "next/server";



export async function GET() {

  return new NextResponse(

    "dh=597ffd250bf15c035af2e117aeff40f31b1ef415", 

    {

      status: 200,

      headers: {

        "Content-Type": "text/plain; charset=utf-8",

      },

    }

  );

}
