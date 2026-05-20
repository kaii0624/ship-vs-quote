import "./globals.css";

export const metadata = {
  title: "Ship vs. Quote",
  description: "A playable satire demo comparing GPT-5.5 instant app shipping with a traditional vendor estimate pyramid.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
