import stringSimilarity from "string-similarity";

const SIMILARITY_THRESHOLD = 0.6;

/**
 * Compare scraped website items against document items.
 *
 * Scraped items have types: { type, value, level? }
 * Document items are raw lines: { type: 'raw', value }
 *
 * We match each document line to the best matching scraped item
 * using fuzzy string similarity, preserving order.
 */
export function compareContent(scrapedItems, expectedItems) {
    const results = [];
    const matchedScrapedIndices = new Set();

    // For each expected (document) item, find the best fuzzy match in scraped items
    for (const expected of expectedItems) {
        let bestMatch = null;
        let bestSimilarity = 0;
        let bestIndex = -1;

        for (let si = 0; si < scrapedItems.length; si++) {
            if (matchedScrapedIndices.has(si)) continue;

            const sim = computeSimilarity(expected.value, scrapedItems[si].value);
            if (sim > bestSimilarity) {
                bestSimilarity = sim;
                bestMatch = scrapedItems[si];
                bestIndex = si;
            }
        }

        if (bestMatch && bestSimilarity >= SIMILARITY_THRESHOLD) {
            matchedScrapedIndices.add(bestIndex);

            const isExact = bestSimilarity >= 0.98;
            results.push({
                type: bestMatch.type,
                label: getLabel(bestMatch),
                status: isExact ? "matched" : "mismatched",
                expected: expected.value,
                actual: bestMatch.value,
                similarity: Math.round(bestSimilarity * 100),
                ...(bestMatch.level && { actualLevel: bestMatch.level }),
            });
        } else {
            // No good match — missing from website
            results.push({
                type: "unknown",
                label: truncate(expected.value),
                status: "missing_from_website",
                expected: expected.value,
                actual: null,
                similarity: 0,
            });
        }
    }

    // Any scraped items not matched are "extra on website"
    for (let i = 0; i < scrapedItems.length; i++) {
        if (matchedScrapedIndices.has(i)) continue;
        const item = scrapedItems[i];
        results.push({
            type: item.type,
            label: getLabel(item),
            status: "extra_on_website",
            expected: null,
            actual: item.value,
            similarity: 0,
        });
    }

    // Build summary
    const matched = results.filter((r) => r.status === "matched").length;
    const mismatched = results.filter((r) => r.status === "mismatched").length;
    const missing = results.filter(
        (r) => r.status === "missing_from_website"
    ).length;
    const extra = results.filter(
        (r) => r.status === "extra_on_website"
    ).length;
    const total = results.length;

    return {
        items: results,
        summary: {
            total,
            matched,
            mismatched,
            missingFromWebsite: missing,
            extraOnWebsite: extra,
            score: total > 0 ? Math.round((matched / total) * 100) : 100,
        },
    };
}

function normalize(text) {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function computeSimilarity(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    // Also check if one contains the other
    if (na.includes(nb) || nb.includes(na)) {
        const longer = Math.max(na.length, nb.length);
        const shorter = Math.min(na.length, nb.length);
        const containScore = shorter / longer;
        const fuzzyScore = stringSimilarity.compareTwoStrings(na, nb);
        return Math.max(containScore, fuzzyScore);
    }
    return stringSimilarity.compareTwoStrings(na, nb);
}

function truncate(text, max = 50) {
    if (!text) return "";
    return text.length > max ? text.substring(0, max) + "..." : text;
}

function getLabel(item) {
    const typeLabels = {
        title: "Title",
        meta_description: "Meta Description",
        heading: `H${item.level || ""}`,
        paragraph: "Paragraph",
        button: "Button",
        raw: "Content",
        unknown: "Content",
    };
    return typeLabels[item.type] || item.type;
}
