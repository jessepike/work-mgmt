import type { Metadata } from "next";
import { IBM_Plex_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ToastContainer } from "@/components/ui/Toast";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Work Management",
  description: "Central system of record for all work",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexSans.variable} ${inter.variable} antialiased bg-zed-main text-text-primary selection:bg-primary/30 selection:text-text-primary overflow-hidden h-screen flex`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('wm.theme');
                  var theme = (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
                  var html = document.documentElement;
                  html.classList.remove('theme-light', 'theme-dark');
                  if (theme === 'light') html.classList.add('theme-light');
                  else if (theme === 'dark') html.classList.add('theme-dark');
                  else html.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light');
                } catch (e) {
                  document.documentElement.classList.add('theme-dark');
                }
              })();
            `
          }}
        />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          <Header />
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            {children}
          </main>
        </div>
        <ToastContainer />
      </body>
    </html>
  );
}
