import { NextResponse } from "next/server";
import { compareContent } from "@/lib/comparator";

export async function POST(request) {
    try {
        const { scrapedItems, expectedItems } = await request.json();

        if (!scrapedItems || !Array.isArray(scrapedItems)) {
            return NextResponse.json(
                { error: "Scraped items array is required" },
                { status: 400 }
            );
        }

        if (!expectedItems || !Array.isArray(expectedItems)) {
            return NextResponse.json(
                { error: "Expected items array is required" },
                { status: 400 }
            );
        }

        // Compare content
        const report = compareContent(scrapedItems, expectedItems);

        return NextResponse.json({
            success: true,
            report,
            scrapedItems,
            expectedItems,
        });
    } catch (error) {
        console.error("Compare error:", error.message);
        return NextResponse.json(
            { error: `Comparison failed: ${error.message}` },
            { status: 500 }
        );
    }
}
