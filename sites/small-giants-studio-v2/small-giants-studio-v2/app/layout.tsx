import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/ui/CookieConsent";
import { JsonLd } from "@/components/ui/JsonLd";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://smallgiantsstudio.co.uk"),
  title: {
    default: "Small Giants Studio | Digital Transformation for UK SMEs & Charities",
    template: "%s | Small Giants Studio",
  },
  description:
    "Helping human-led businesses compete with the giants. Enterprise-level marketing, automation, and tech — at budgets that actually work. Based in Birmingham, serving UK SMEs, charities, and social enterprises.",
  keywords: [
    "digital transformation",
    "digital transformation consultant",
    "digital transformation Birmingham",
    "UK SME consultant",
    "small business digital services",
    "charity digital services",
    "charity digital transformation",
    "nonprofit digital consultant",
    "social enterprise consultant",
    "marketing automation UK",
    "marketing strategy SME",
    "AI for small business",
    "AI automation SME",
    "business automation",
    "CRM setup UK",
    "CRM implementation SME",
    "website development Birmingham",
    "website development UK",
    "SEO consultant UK",
    "digital marketing consultant",
    "enterprise systems SME budget",
    "affordable digital transformation",
    "Birmingham",
    "West Midlands",
    "values-driven business consultant",
  ],
  authors: [{ name: "Ibraheem Mustafa", url: "https://smallgiantsstudio.co.uk" }],
  creator: "Small Giants Studio",
  publisher: "Small Giants Studio Ltd",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Small Giants Studio",
    title: "Small Giants Studio | Digital Transformation for UK SMEs & Charities",
    description:
      "Helping human-led businesses compete with the giants. Enterprise-level marketing, automation, and tech — at budgets that actually work.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Small Giants Studio — Digital Transformation for UK SMEs & Charities",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here
    // google: "your-google-verification-code",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement,t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <link rel="icon" href="/images/sgs-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/images/sgs-logo.jpg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1C1917" />
        <link rel="preload" href="/images/sgs-horizontal-logo.png" as="image" />
      </head>
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "@id": "https://smallgiantsstudio.co.uk",
            name: "Small Giants Studio",
            image: "https://smallgiantsstudio.co.uk/images/sgs-logo.jpg",
            description:
              "Digital transformation, marketing, and automation consultancy for UK SMEs, charities, and social enterprises.",
            url: "https://smallgiantsstudio.co.uk",
            telephone: "+447424449555",
            email: "hello@smallgiantsstudio.co.uk",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Birmingham",
              addressRegion: "West Midlands",
              addressCountry: "GB",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: 52.4862,
              longitude: -1.8904,
            },
            priceRange: "$$",
            founder: {
              "@type": "Person",
              "@id": "https://smallgiantsstudio.co.uk/about#founder",
              name: "Ibraheem Mustafa",
            },
            areaServed: {
              "@type": "Country",
              name: "United Kingdom",
            },
            knowsAbout: [
              "Digital Transformation",
              "Marketing Strategy",
              "AI Automation",
              "CRM Systems",
              "Website Development",
              "SEO",
            ],
          }}
        />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
