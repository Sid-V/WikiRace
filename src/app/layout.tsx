import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "~/components/providers";

export const metadata: Metadata = {
  title: "Wiki Race",
  description: "A Wikipedia racing game",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} dark`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
