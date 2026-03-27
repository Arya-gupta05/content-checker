import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Scrape a website and return content as a sequential list of items
 * in the order they appear in the DOM.
 */
export async function POST(request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Validate URL
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }

        // Fetch the page
        const response = await axios.get(parsedUrl.href, {
            timeout: 15000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Remove unwanted elements: scripts, styles, headers, and footers
        $("script, style, noscript, svg, iframe, header, footer, nav, .header, .footer, #header, #footer, .navbar").remove();

        const items = [];

        // 1. Extract title (always first)
        const title = $("title").first().text().trim();
        if (title) {
            items.push({ type: "title", value: title });
        }

        // 2. Extract meta description (always second)
        const metaDesc =
            $('meta[name="description"]').attr("content")?.trim() ||
            $('meta[property="og:description"]').attr("content")?.trim() ||
            null;
        if (metaDesc) {
            items.push({ type: "meta_description", value: metaDesc });
        }

        // 3. Walk the body elements in DOM order
        const bodyElements = $("body *");
        const seenTexts = new Set();

        bodyElements.each((_, el) => {
            const $el = $(el);
            const tagName = el.tagName?.toLowerCase();

            if (!tagName) return;

            // Headings
            if (/^h[1-6]$/.test(tagName)) {
                const text = $el.text().replace(/\s+/g, " ").trim();
                if (text && text.length > 0 && !seenTexts.has(text)) {
                    seenTexts.add(text);
                    items.push({
                        type: "heading",
                        level: parseInt(tagName.replace("h", "")),
                        value: text,
                    });
                }
                return;
            }

            // Paragraphs
            if (tagName === "p") {
                const text = $el.text().replace(/\s+/g, " ").trim();
                if (text && text.length > 5 && !seenTexts.has(text)) {
                    seenTexts.add(text);
                    items.push({ type: "paragraph", value: text });
                }
                return;
            }

            // Buttons
            if (
                tagName === "button" ||
                (tagName === "input" &&
                    ["submit", "button"].includes($el.attr("type"))) ||
                (tagName === "a" &&
                    ($el.attr("class") || "").match(/btn|button/i)) ||
                $el.attr("role") === "button"
            ) {
                let text = "";
                if (tagName === "input") {
                    text = $el.attr("value") || $el.attr("title") || "";
                } else {
                    text = $el.text().replace(/\s+/g, " ").trim();
                }
                text = text.trim();
                if (text && text.length > 0 && text.length < 100 && !seenTexts.has("btn:" + text)) {
                    seenTexts.add("btn:" + text);
                    items.push({ type: "button", value: text });
                }
                return;
            }
        });

        return NextResponse.json({
            success: true,
            url: parsedUrl.href,
            data: items,
        });
    } catch (error) {
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
            return NextResponse.json(
                { error: "Could not reach the website. Please check the URL." },
                { status: 400 }
            );
        }
        if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
            return NextResponse.json(
                { error: "Request timed out. The website took too long to respond." },
                { status: 408 }
            );
        }

        console.error("Scrape error:", error.message);
        return NextResponse.json(
            { error: `Failed to scrape website: ${error.message}` },
            { status: 500 }
        );
    }
}
