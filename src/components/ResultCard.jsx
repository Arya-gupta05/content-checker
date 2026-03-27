"use client";

import styles from "./ResultCard.module.css";

const STATUS_CONFIG = {
    matched: { icon: "✅", label: "Match", className: "matched" },
    mismatched: { icon: "❌", label: "Mismatch", className: "mismatched" },
    missing_from_website: { icon: "⚠️", label: "Missing from Website", className: "missing" },
    extra_on_website: { icon: "➕", label: "Extra on Website", className: "extra" },
};

const TYPE_ICONS = {
    title: "🏷️",
    meta_description: "📝",
    heading: "📌",
    paragraph: "📄",
    button: "🔘",
};

const TYPE_LABELS = {
    title: "Page Title",
    meta_description: "Meta Description",
    heading: "Heading",
    paragraph: "Paragraph",
    button: "Button",
};

export default function ResultCard({ item }) {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.mismatched;
    const typeIcon = TYPE_ICONS[item.type] || "📋";
    const typeLabel = TYPE_LABELS[item.type] || item.type;
    const headingTag = item.type === "heading" ? `H${item.expectedLevel || item.actualLevel || ""}` : null;

    return (
        <div className={`${styles.card} ${styles[config.className]}`}>
            <div className={styles.header}>
                <span className={styles.icon}>{typeIcon}</span>
                <div className={styles.headerInfo}>
                    <span className={styles.typeLabel}>
                        {headingTag || typeLabel}
                    </span>
                </div>
                <span className={`${styles.badge} ${styles[`badge_${config.className}`]}`}>
                    {config.icon} {config.label}
                    {item.similarity > 0 && item.similarity < 100 && (
                        <span className={styles.simPercent}> ({item.similarity}%)</span>
                    )}
                </span>
            </div>

            {item.status === "matched" && (
                <div className={styles.matchedContent}>
                    <p className={styles.matchedText}>{item.actual}</p>
                </div>
            )}

            {item.status === "mismatched" && (
                <div className={styles.diffContainer}>
                    <div className={styles.diffRow}>
                        <span className={styles.diffLabel}>Expected</span>
                        <span className={styles.diffExpected}>{item.expected}</span>
                    </div>
                    <div className={styles.diffRow}>
                        <span className={styles.diffLabel}>Actual</span>
                        <span className={styles.diffActual}>{item.actual}</span>
                    </div>
                </div>
            )}

            {item.status === "missing_from_website" && (
                <div className={styles.diffContainer}>
                    <div className={styles.diffRow}>
                        <span className={styles.diffLabel}>Expected</span>
                        <span className={styles.diffExpected}>{item.expected}</span>
                    </div>
                    <div className={styles.diffRow}>
                        <span className={styles.diffLabel}>Actual</span>
                        <span className={styles.diffMissing}>Not found on website</span>
                    </div>
                </div>
            )}

            {item.status === "extra_on_website" && (
                <div className={styles.diffContainer}>
                    <div className={styles.diffRow}>
                        <span className={styles.diffLabel}>Found</span>
                        <span className={styles.diffActual}>{item.actual}</span>
                    </div>
                    <div className={styles.diffRow}>
                        <span className={styles.diffLabel}>Expected</span>
                        <span className={styles.diffMissing}>Not in document</span>
                    </div>
                </div>
            )}
        </div>
    );
}
