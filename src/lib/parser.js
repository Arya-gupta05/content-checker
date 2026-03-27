import mammoth from "mammoth";

/**
 * Parse uploaded document into a list of page objects.
 *
 * Page delimiters:
 * - "Home" -> slug: "/"
 * - "{Page Name} (Page {N})" -> slug: "page-name"
 *
 * Example:
 *   Home
 *   Welcome text
 *
 *   Tree Surgery (Page 2)
 *   Expert surgery text
 *
 * Each page has:
 * {
 *   name: "Home",
 *   slug: "/",
 *   items: [{ type: "raw", value: "Welcome text" }]
 * }
 */

export async function parseDocument(buffer, filename) {
  let text = "";

  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "txt") {
    text = buffer.toString("utf-8");
  } else if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    throw new Error(
      `Unsupported file type: .${ext}. Please upload a .txt or .docx file.`
    );
  }

  return parseTextContent(text);
}

function parseTextContent(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const pages = [];
  let currentPage = null;
  let homeCount = 0;

  const ignoredLines = [
    "page/meta title",
    "meta description",
    "h1 (hero image text)",
    "cta",
    "text",
    "hero image button:",
    "page title",
    "testimonials (if required)"
  ];

  for (let line of lines) {
    const pageInfo = detectPage(line);

    if (pageInfo) {
      if (pageInfo.slug === "/") {
        homeCount++;
        // If it's the first "Home", ignore it and any content before the next one
        if (homeCount === 1) {
          currentPage = null;
          continue;
        }
      }

      currentPage = {
        name: pageInfo.name,
        slug: pageInfo.slug,
        items: [],
      };
      pages.push(currentPage);
    } else {
      if (!currentPage) {
        // Ignore any content before the first page delimiter
        continue;
      }

      // 0. Check if page reading is finished (ignore content after "Name*")
      if (currentPage.pageCompleted) {
        continue;
      }

      let lowerLine = line.toLowerCase();

      // Stop parsing this page's content when we see "Name*"
      if (lowerLine.startsWith("name*")) {
        currentPage.pageCompleted = true;
        continue;
      }

      // 1. Strip specific prefixes before processing
      if (lowerLine.startsWith("hero image button:")) {
        line = line.substring(18).trim();
        lowerLine = line.toLowerCase();
      } else if (lowerLine.startsWith("button:")) {
        line = line.substring(7).trim();
        lowerLine = line.toLowerCase();
      }

      // 2. Clean up button/link formatting (e.g., "[Enquire Now] > Button" -> "Enquire Now")
      if (line.includes(" > ")) {
        line = line.split(" > ")[0].trim();
        // Remove surrounding square brackets if present
        if (line.startsWith("[") && line.endsWith("]")) {
          line = line.slice(1, -1).trim();
        }
        lowerLine = line.toLowerCase();
      }

      // 3. Ignore specific label lines & developer notes
      if (
        ignoredLines.includes(lowerLine) ||
        lowerLine.startsWith("note for the designer:")
      ) {
        continue;
      }

      if (line.length === 0) continue;

      currentPage.items.push({
        type: "raw",
        value: line,
      });
    }
  }

  return pages;
}

function detectPage(line) {
  const lowerLine = line.toLowerCase();

  // Exact match for Home page
  if (lowerLine === "home") {
    return { name: "Home", slug: "/" };
  }

  // Regex to match "Any Page Name (Page X)"
  const pageRegex = /^(.*?)\s*\(Page\s*\d+\)$/i;
  const match = line.match(pageRegex);

  if (match) {
    const name = match[1].trim();
    // Convert "Tree Surgery" to "tree-surgery"
    const slug = "/" + name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphen
      .replace(/^-|-$/g, "");      // remove leading/trailing hyphens

    return { name: line, slug };
  }

  return null;
}
