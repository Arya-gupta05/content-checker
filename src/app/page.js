"use client";

import { useState, useRef } from "react";
import FileUpload from "@/components/FileUpload";
import ResultCard from "@/components/ResultCard";
import styles from "./page.module.css";

export default function Home() {
  const [baseUrl, setBaseUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [pageReports, setPageReports] = useState(null);
  const [activePageIdx, setActivePageIdx] = useState(null);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showScraped, setShowScraped] = useState(false);
  const [showExpected, setShowExpected] = useState(false);
  const resultsRef = useRef(null);
  const detailsRef = useRef(null);

  const handleCheck = async () => {
    if (!baseUrl.trim()) {
      setError("Please enter a base website URL");
      return;
    }
    if (!file) {
      setError("Please upload a content document");
      return;
    }

    let formattedBaseUrl = baseUrl.trim();
    if (!/^https?:\/\//i.test(formattedBaseUrl)) {
      formattedBaseUrl = `https://${formattedBaseUrl}`;
    }
    // Remove trailing slash
    formattedBaseUrl = formattedBaseUrl.replace(/\/$/, "");

    setError("");
    setLoading(true);
    setPageReports(null);
    setActivePageIdx(null);

    try {
      // Step 1: Parse the document
      setStatus("Parsing document...");
      const formData = new FormData();
      formData.append("document", file);

      const parseRes = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });
      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        throw new Error(parseData.error || "Failed to parse document");
      }

      const pagesToCheck = parseData.pages;
      if (!pagesToCheck || pagesToCheck.length === 0) {
        throw new Error("No pages found in the document");
      }

      const reports = [];

      // Step 2: Loop and check every page
      for (let i = 0; i < pagesToCheck.length; i++) {
        const page = pagesToCheck[i];
        setStatus(`Checking page ${i + 1} of ${pagesToCheck.length}: ${page.name}...`);

        const targetUrl = `${formattedBaseUrl}${page.slug}`;

        try {
          // Scrape
          const scrapeRes = await fetch("/api/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl }),
          });
          const scrapeData = await scrapeRes.json();
          if (!scrapeRes.ok) throw new Error(scrapeData.error || "Scrape failed");

          // Compare
          const compareRes = await fetch("/api/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scrapedItems: scrapeData.data,
              expectedItems: page.items,
            }),
          });
          const compareData = await compareRes.json();
          if (!compareRes.ok) throw new Error(compareData.error || "Compare failed");

          reports.push({
            name: page.name,
            slug: page.slug,
            url: targetUrl,
            report: compareData.report,
            scrapedItems: compareData.scrapedItems || [],
            expectedItems: compareData.expectedItems || [],
            error: null,
          });
        } catch (pageErr) {
          // Store error for this specific page, but continue to others
          reports.push({
            name: page.name,
            slug: page.slug,
            url: targetUrl,
            report: null,
            scrapedItems: [],
            expectedItems: page.items,
            error: pageErr.message,
          });
        }
      }

      setPageReports(reports);
      setStatus("");
      setActiveFilter("all");
      setShowScraped(false);
      setShowExpected(false);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const activePage = activePageIdx !== null && pageReports ? pageReports[activePageIdx] : null;

  const getFilteredItems = () => {
    if (!activePage || !activePage.report) return [];
    if (activeFilter === "all") return activePage.report.items;
    return activePage.report.items.filter((item) => item.status === activeFilter);
  };

  const typeLabels = {
    title: "Title",
    meta_description: "Meta Desc",
    heading: "Heading",
    paragraph: "Paragraph",
    button: "Button",
    raw: "Line",
    unknown: "Content",
  };

  const renderPreviewItem = (item, index) => {
    let label;
    if (item.type === "heading") {
      label = `H${item.level}`;
    } else if (item.type === "raw") {
      label = `Line ${index + 1}`;
    } else {
      label = typeLabels[item.type] || item.type;
    }
    return (
      <div key={index} className={styles.previewItem}>
        <span className={styles.previewType}>{label}</span>
        <span className={styles.previewValue}>{item.value}</span>
      </div>
    );
  };

  const viewPageDetails = (idx) => {
    setActivePageIdx(idx);
    setActiveFilter("all");
    setShowScraped(false);
    setShowExpected(false);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroGlow}></div>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeDot}></span>
            Multi-Page Content Checker
          </div>
          <h1 className={styles.heading}>
            Content <span className={styles.gradientText}>Checker</span>
          </h1>
          <p className={styles.subtitle}>
            Check multiple pages at once by providing a single document! Validate titles, meta descriptions, headings, paragraphs, and buttons across your site in page order.
          </p>
        </div>
      </header>

      {/* Input Section */}
      <main className={styles.main}>
        <div className={styles.inputSection}>
          <div className={styles.inputCard}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Base Website URL
              </label>
              <div className={styles.urlWrapper}>
                <input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className={styles.urlInput}
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Content Document
              </label>
              <FileUpload onFileSelect={setFile} disabled={loading} />
            </div>

            {/* Document Format Guide */}
            <div className={styles.formatGuide}>
              <p className={styles.formatTitle}>📋 Multi-Page Format Guide</p>
              <p className={styles.formatHint}>
                Start each page with its name on a new line (e.g. <code>Home</code> or <code>Tree Surgery (Page 2)</code>), followed by its raw content.
              </p>
              <div className={styles.formatContent}>
                <code className={styles.formatCode}>
                  Home{"\n"}
                  My Page Title{"\n"}
                  Meta description here{"\n"}
                  Main Heading{"\n"}
                  First paragraph text goes here{"\n"}
                  {"\n"}
                  Tree Surgery (Page 2){"\n"}
                  Tree Surgery Services{"\n"}
                  Expert surgeons ready to help
                </code>
              </div>
            </div>

            {error && (
              <div className={styles.error}>
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              id="check-btn"
              className={styles.checkButton}
              onClick={handleCheck}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.loadingContent}>
                  <span className={styles.spinner}></span>
                  {status || "Processing..."}
                </span>
              ) : (
                <span className={styles.buttonContent}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Check Content
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Dashboard Section */}
        {pageReports && (
          <div ref={resultsRef} className={styles.dashboardSection}>
            <h2 className={styles.dashboardTitle}>Overall Report ({pageReports.length} pages)</h2>
            <div className={styles.pagesGrid}>
              {pageReports.map((page, idx) => (
                <div
                  key={idx}
                  className={`${styles.pageCard} ${activePageIdx === idx ? styles.activePageCard : ""}`}
                  onClick={() => viewPageDetails(idx)}
                >
                  <div className={styles.pageCardHeader}>
                    <h3 className={styles.pageCardTitle}>{page.name}</h3>
                    {page.report ? (
                      <span
                        className={styles.pageCardScore}
                        style={{ background: `${getScoreColor(page.report.summary.score)}20`, color: getScoreColor(page.report.summary.score) }}
                      >
                        {page.report.summary.score}%
                      </span>
                    ) : (
                      <span className={styles.pageCardErrorBadge}>Error</span>
                    )}
                  </div>
                  <div className={styles.pageCardUrl}>{page.slug}</div>

                  {page.error ? (
                    <div className={styles.pageCardErrorText}>{page.error}</div>
                  ) : page.report ? (
                    <div className={styles.pageCardStats}>
                      <span style={{ color: "#4ade80" }}>{page.report.summary.matched} match</span>
                      <span style={{ color: "#f87171" }}>{page.report.summary.mismatched} mis</span>
                      <span style={{ color: "#fbbf24" }}>{page.report.summary.missingFromWebsite} miss</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Results Section */}
        {activePage && (
          <div ref={detailsRef} className={styles.resultsSection}>
            <div className={styles.detailsHeader}>
              <h2 className={styles.detailsTitle}>Details: {activePage.name}</h2>
              <a href={activePage.url} target="_blank" rel="noopener noreferrer" className={styles.detailsUrl}>
                {activePage.url} ↗
              </a>
            </div>

            {activePage.error ? (
              <div className={styles.errorCard}>
                <h3>Failed to check this page</h3>
                <p>{activePage.error}</p>
              </div>
            ) : (
              <>
                {/* Score Overview */}
                <div className={styles.scoreOverview}>
                  <div className={styles.scoreCard}>
                    <div
                      className={styles.scoreRing}
                      style={{
                        background: `conic-gradient(${getScoreColor(activePage.report.summary.score)} ${activePage.report.summary.score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                      }}
                    >
                      <div className={styles.scoreInner}>
                        <span
                          className={styles.scoreValue}
                          style={{ color: getScoreColor(activePage.report.summary.score) }}
                        >
                          {activePage.report.summary.score}%
                        </span>
                        <span className={styles.scoreLabel}>Match Score</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                      <span className={styles.statValue} style={{ color: "#22c55e" }}>
                        {activePage.report.summary.matched}
                      </span>
                      <span className={styles.statLabel}>Matched</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statValue} style={{ color: "#ef4444" }}>
                        {activePage.report.summary.mismatched}
                      </span>
                      <span className={styles.statLabel}>Mismatched</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statValue} style={{ color: "#f59e0b" }}>
                        {activePage.report.summary.missingFromWebsite}
                      </span>
                      <span className={styles.statLabel}>Missing</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statValue} style={{ color: "#3b82f6" }}>
                        {activePage.report.summary.extraOnWebsite}
                      </span>
                      <span className={styles.statLabel}>Extra</span>
                    </div>
                  </div>
                </div>

                {/* Scraped & Document Data Preview */}
                <div className={styles.previewPanels}>
                  {/* Scraped from Website */}
                  <div className={styles.previewPanel}>
                    <button
                      className={styles.previewToggle}
                      onClick={() => setShowScraped(!showScraped)}
                    >
                      <span>🌐 Scraped from Website ({activePage.scrapedItems?.length || 0} items)</span>
                      <span className={styles.toggleArrow}>{showScraped ? "▲" : "▼"}</span>
                    </button>
                    {showScraped && (
                      <div className={styles.previewContent}>
                        {activePage.scrapedItems && activePage.scrapedItems.length > 0 ? (
                          activePage.scrapedItems.map((item, i) => renderPreviewItem(item, i))
                        ) : (
                          <p className={styles.previewEmpty}>No content scraped</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Parsed from Document */}
                  <div className={styles.previewPanel}>
                    <button
                      className={styles.previewToggle}
                      onClick={() => setShowExpected(!showExpected)}
                    >
                      <span>📄 Parsed from Document ({activePage.expectedItems?.length || 0} items)</span>
                      <span className={styles.toggleArrow}>{showExpected ? "▲" : "▼"}</span>
                    </button>
                    {showExpected && (
                      <div className={styles.previewContent}>
                        {activePage.expectedItems && activePage.expectedItems.length > 0 ? (
                          activePage.expectedItems.map((item, i) => renderPreviewItem(item, i))
                        ) : (
                          <p className={styles.previewEmpty}>No content parsed</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className={styles.filterTabs}>
                  {[
                    { key: "all", label: "All", count: activePage.report.summary.total },
                    { key: "matched", label: "Matched", count: activePage.report.summary.matched, color: "#22c55e" },
                    { key: "mismatched", label: "Mismatched", count: activePage.report.summary.mismatched, color: "#ef4444" },
                    { key: "missing_from_website", label: "Missing", count: activePage.report.summary.missingFromWebsite, color: "#f59e0b" },
                    { key: "extra_on_website", label: "Extra", count: activePage.report.summary.extraOnWebsite, color: "#3b82f6" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      className={`${styles.filterTab} ${activeFilter === f.key ? styles.filterActive : ""}`}
                      onClick={() => setActiveFilter(f.key)}
                      style={activeFilter === f.key && f.color ? { borderColor: f.color } : {}}
                    >
                      {f.label}
                      {f.count !== undefined && (
                        <span className={styles.filterCount}>{f.count}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Sequential Result Cards */}
                <div className={styles.resultsGrid}>
                  {getFilteredItems().length === 0 ? (
                    <div className={styles.noResults}>
                      No items to show for this filter.
                    </div>
                  ) : (
                    getFilteredItems().map((item, index) => (
                      <ResultCard key={index} item={item} />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Content Checker — Built for content verification workflows</p>
      </footer>
    </div>
  );
}
