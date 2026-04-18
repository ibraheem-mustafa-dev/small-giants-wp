import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Small Giants Studio Ltd. The terms and conditions governing use of our website and services.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Terms of Service" }]} />
      <section className="bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Terms of Service</h1>
        <p className="mt-4 text-text-secondary">Last updated: February 2026</p>

        <div className="prose prose-lg mt-8 max-w-none text-text-secondary">
          <h2 className="text-xl font-semibold text-text-primary">1. Introduction</h2>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of the Small Giants Studio Ltd
            website at smallgiantsstudio.co.uk (&quot;Website&quot;) and any services we provide
            (&quot;Services&quot;).
          </p>
          <p>
            By accessing our Website or using our Services, you agree to be bound by these Terms.
            If you do not agree to these Terms, please do not use our Website or Services.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">2. About Us</h2>
          <p>
            Small Giants Studio Ltd is a company registered in England and Wales (company number 16959564). We provide
            digital transformation, marketing, and technology consulting services to UK SMEs,
            charities, and social enterprises.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">3. Use of Our Website</h2>
          <p>You may use our Website for lawful purposes only. You must not:</p>
          <ul className="list-disc pl-6">
            <li>Use our Website in any way that breaches any applicable local, national, or international law</li>
            <li>Use our Website to transmit any unsolicited or unauthorised advertising or promotional material</li>
            <li>Attempt to gain unauthorised access to our Website, servers, or databases</li>
            <li>Use our Website to knowingly transmit any malicious code or data</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">4. Our Services</h2>
          <p>
            Specific terms for our consulting and development services will be agreed in writing
            before work commences. These Terms provide a general framework but individual project
            agreements will take precedence where applicable.
          </p>
          <p>
            We reserve the right to refuse service to anyone for any reason at any time. We only
            work with values-driven businesses that align with our principles.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">5. Intellectual Property</h2>
          <p>
            The content on our Website, including text, graphics, logos, and images, is owned by
            or licensed to Small Giants Studio Ltd and is protected by copyright and other
            intellectual property laws.
          </p>
          <p>
            You may not reproduce, distribute, modify, or create derivative works from any
            content on our Website without our prior written consent.
          </p>
          <p>
            Intellectual property rights for work created as part of our Services will be
            addressed in individual project agreements.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">6. Third-Party Links</h2>
          <p>
            Our Website may contain links to third-party websites. These links are provided for
            your convenience only. We have no control over the content of these sites and accept
            no responsibility for them or for any loss or damage that may arise from your use of
            them.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">7. Disclaimer</h2>
          <p>
            The information on our Website is provided for general informational purposes only.
            While we strive to keep the information up to date and correct, we make no
            representations or warranties of any kind, express or implied, about the
            completeness, accuracy, reliability, suitability, or availability of the information,
            products, services, or related graphics contained on the Website.
          </p>
          <p>
            Any reliance you place on such information is strictly at your own risk. We will not
            be liable for any loss or damage arising from your use of our Website.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Small Giants Studio Ltd excludes all
            liability for any direct, indirect, incidental, consequential, or punitive damages
            arising out of your access to, or use of, our Website or Services.
          </p>
          <p>
            Nothing in these Terms excludes or limits our liability for death or personal injury
            arising from our negligence, fraud or fraudulent misrepresentation, or any other
            liability that cannot be excluded or limited by English law.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">9. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Small Giants Studio Ltd and its directors,
            officers, employees, and agents from any claims, damages, losses, liabilities, costs,
            or expenses arising out of your use of our Website or Services, or your breach of
            these Terms.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">10. Changes to These Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of any
            changes by posting the new Terms on this page. Your continued use of our Website or
            Services after any changes constitutes your acceptance of the new Terms.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">11. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of England and
            Wales. Any disputes arising out of or in connection with these Terms shall be subject
            to the exclusive jurisdiction of the courts of England and Wales.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-text-primary">12. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us:</p>
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
        </div>
      </div>
    </section>
    </>
  );
}
