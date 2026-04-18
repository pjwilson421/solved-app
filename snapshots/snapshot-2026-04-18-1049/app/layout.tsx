import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Cormorant_Garamond,
  Geist,
  Geist_Mono,
} from "next/font/google";
import { EditorImageProvider } from "@/components/create-image/editor-image-context";
import { AppProviders } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Image Editor Text tool — loaded once on `html` for dropdown + overlay. */
const editorTextBricolage = Bricolage_Grotesque({
  variable: "--font-editor-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const editorTextCormorant = Cormorant_Garamond({
  variable: "--font-editor-cormorant",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SOLVED",
  description: "AI creative workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${editorTextBricolage.variable} ${editorTextCormorant.variable} h-full antialiased`}
    >
      <body className="ui-stroke-free flex min-h-dvh flex-col bg-app-bg">
        <EditorImageProvider>
          <AppProviders>{children}</AppProviders>
        </EditorImageProvider>
      </body>
    </html>
  );
}
