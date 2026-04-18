import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Small Giants Studio Ltd. How we collect, use, and protect your personal data.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
      <section className="bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Privacy Policy</h1>
        <p className="mt-4 text-text-secondary">Last updated: February 2026</p>

        <div className="prose prose-lg mt-8 max-w-none text-text-secondary">
          <h2 className="text-xl font-semibold text-text-primary">1. Introduction</h2>
          <p>
            Small Giants Studio Ltd (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you visit our website smallgiantsstudio.co.uk or engage our
            services.
          </p>
          <p>
            We are registered in England and Wales (company number 16959564). For the purposes of the UK General Data
            Protection Regulation (UK GDPR) and the Data Protection Act 2018, we are the data
            controller.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">2. Information We Collect</h2>
          <h3 className="text-lg font-medium text-text-primary">Information you provide</h3>
          <ul className="list-disc pl-6">
            <li>Name and contact details (email, phone number)</li>
            <li>Business information</li>
            <li>Messages and communications you send us</li>
            <li>Any other information you choose to provide</li>
          </ul>

          <h3 className="text-lg font-medium text-text-primary">Information collected automatically</h3>
          <ul className="list-disc pl-6">
            <li>Device and browser information</li>
            <li>IP address and location data</li>
            <li>Pages visited and time spent on our website</li>
            <li>Referring website or source</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6">
            <li>Respond to your enquiries and provide our services</li>
            <li>Send you information about our services (with your consent)</li>
            <li>Improve our website and services</li>
            <li>Comply with legal obligations</li>
            <li>Protect against fraudulent or illegal activity</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">4. Legal Basis for Processing</h2>
          <p>We process your personal data on the following legal bases:</p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Consent:</strong> Where you have given us consent to process your data
            </li>
            <li>
              <strong>Contract:</strong> Where processing is necessary to perform a contract with
              you
            </li>
            <li>
              <strong>Legitimate interests:</strong> Where processing is necessary for our
              legitimate business interests
            </li>
            <li>
              <strong>Legal obligation:</strong> Where we are required to process data by law
            </li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">5. Data Sharing</h2>
          <p>
            We do not sell your personal data. We may share your information with trusted third
            parties who assist us in operating our website and delivering our services, including:
          </p>
          <ul className="list-disc pl-6">
            <li>Website hosting providers</li>
            <li>Email service providers</li>
            <li>Analytics providers</li>
            <li>Professional advisers (accountants, lawyers)</li>
          </ul>
          <p>
            All third parties are required to respect the security of your personal data and
            process it in accordance with applicable law.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">6. Data Retention</h2>
          <p>
            We retain your personal data only for as long as necessary to fulfil the purposes we
            collected it for, including satisfying any legal, accounting, or reporting
            requirements. The retention period depends on the type of data and the purpose for
            which it was collected.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">7. Your Rights</h2>
          <p>Under UK GDPR, you have the right to:</p>
          <ul className="list-disc pl-6">
            <li>Access your personal data</li>
            <li>Rectify inaccurate personal data</li>
            <li>Request erasure of your personal data</li>
            <li>Object to processing of your personal data</li>
            <li>Request restriction of processing</li>
            <li>Data portability</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at{" "}
            <a href="mailto:hello@smallgiantsstudio.co.uk" className="text-primary-700 dark:text-primary-300 underline">
              hello@smallgiantsstudio.co.uk
            </a>
            .
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">8. Cookies</h2>
          <p>
            Our website uses cookies to enhance your experience. You can control cookies through
            your browser settings. We use:
          </p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Essential cookies:</strong> Required for the website to function
            </li>
            <li>
              <strong>Analytics cookies:</strong> Help us understand how visitors use our site
              (with your consent)
            </li>
          </ul>
          <p>
            By default, we only use essential cookies. Analytics cookies are only enabled with
            your explicit consent.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">9. Security</h2>
          <p>
            We implement appropriate technical and organisational measures to protect your
            personal data against unauthorised access, alteration, disclosure, or destruction.
            However, no method of transmission over the Internet is 100% secure.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any
            changes by posting the new Privacy Policy on this page and updating the &quot;Last
            updated&quot; date.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please
            contact us:
          </p>
          <ul className="list-none pl-0">
            <li>
              Email:{" "}
              <a href="mailto:hello@smallgiantsstudio.co.uk" className="text-primary-700 dark:text-primary-300 underline">
                hello@smallgiantsstudio.co.uk
              </a>
            </li>
            <li>Phone: 07424 449555</li>
            <li>Address: Birmingham, UK</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">12. Complaints</h2>
          <p>
            You have the right to make a complaint at any time to the Information
            Commissioner&apos;s Office (ICO), the UK supervisory authority for data protection
            issues (
            <a
              href="https://www.ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-700 dark:text-primary-300 underline"
            >
              www.ico.org.uk
            </a>
            ). We would, however, appreciate the chance to deal with your concerns before you
            approach the ICO, so please contact us in the first instance.
          </p>
        </div>
      </div>
    </section>
    </>
  );
}
