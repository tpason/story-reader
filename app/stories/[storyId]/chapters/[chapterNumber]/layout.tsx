import "./reader.css";

export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Reader font alternatives — only load on reader pages */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Noto+Serif:wght@400;500;600;700&family=Sora:wght@400;500;600&display=swap"
      />
      {children}
    </>
  );
}
