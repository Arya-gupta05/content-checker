import "./globals.css";

export const metadata = {
  title: "Content Checker — Verify Website Content Accuracy",
  description:
    "Compare your live website content against a reference document. Check page titles, meta descriptions, headings, paragraphs, and button text for mismatches.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
