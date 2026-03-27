import { NextResponse } from "next/server";
import { parseDocument } from "@/lib/parser";

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get("document");

        if (!file) {
            return NextResponse.json(
                { error: "Document file is required" },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const pages = await parseDocument(buffer, file.name);

        return NextResponse.json({
            success: true,
            pages,
        });
    } catch (error) {
        console.error("Parse error:", error.message);
        return NextResponse.json(
            { error: `Parsing failed: ${error.message}` },
            { status: 500 }
        );
    }
}
