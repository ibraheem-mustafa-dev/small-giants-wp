"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const howDidYouFindUs = [
  "Google search",
  "AI / Chatbot (ChatGPT, Gemini, etc.)",
  "LinkedIn",
  "Referral from someone",
  "Muslims in Construction",
  "Association of Muslim Engineers",
  "Other",
];

const interests = [
  "Digital Transformation",
  "Marketing Strategy",
  "Website Design",
  "CRM & Operations",
  "AI & Automation",
  "SEO, GEO & Digital Marketing",
  "Not sure yet \u2014 let\u2019s chat",
];

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const selectedInterests = formData.getAll("interests").join(", ");

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      source: formData.get("source"),
      interests: selectedInterests || "Not specified",
      message: formData.get("message"),
    };

    try {
      const response = await fetch("https://formspree.io/f/xeeloran", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Form submission failed");
      }

      setIsSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or email me directly at hello@smallgiantsstudio.co.uk");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div role="status" aria-live="polite" className="rounded-xl border border-primary-200 bg-primary-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <svg
            className="h-6 w-6 text-primary-700 dark:text-primary-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-text-primary">Message sent!</h3>
        <p className="mt-2 text-text-secondary">
          Thanks for getting in touch. I&apos;ll get back to you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot field for spam protection */}
      <input type="text" name="_honeypot" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" aria-label="Leave this field empty" />

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-text-primary">
          Name <span className="text-accent-700 dark:text-accent-400">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          autoComplete="name"
          className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 text-text-primary placeholder-text-muted transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-300 dark:focus:border-primary-300"
          placeholder="Your name"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text-primary">
          Email <span className="text-accent-700 dark:text-accent-400">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          autoComplete="email"
          className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 text-text-primary placeholder-text-muted transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-300 dark:focus:border-primary-300"
          placeholder="you@example.com"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-text-primary">
          Phone <span className="text-text-muted">(optional)</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          autoComplete="tel"
          className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 text-text-primary placeholder-text-muted transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-300 dark:focus:border-primary-300"
          placeholder="07xxx xxxxxx"
        />
      </div>

      {/* How did you find us */}
      <div>
        <label htmlFor="source" className="block text-sm font-medium text-text-primary">
          How did you find me? <span className="text-text-muted">(optional)</span>
        </label>
        <select
          id="source"
          name="source"
          className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 text-text-primary transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-300 dark:focus:border-primary-300"
        >
          <option value="">Select an option</option>
          {howDidYouFindUs.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* What are you interested in */}
      <fieldset>
        <legend className="block text-sm font-medium text-text-primary">
          What are you interested in? <span className="text-text-muted">(select all that apply)</span>
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {interests.map((interest) => (
            <label
              key={interest}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 hover:border-primary-300"
            >
              <input
                type="checkbox"
                name="interests"
                value={interest}
                className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-300"
              />
              <span className="text-sm text-text-primary">{interest}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-text-primary">
          Message <span className="text-accent-700 dark:text-accent-400">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-3 text-text-primary placeholder-text-muted transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-300 dark:focus:border-primary-300"
          placeholder="Tell me a bit about your business and what you're looking for..."
        />
      </div>

      {/* Error message */}
      {error && (
        <div role="alert" aria-live="assertive" className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>

      <p className="text-center text-sm text-text-muted">
        I&apos;ll get back to you within 24 hours. No spam, ever.
      </p>
    </form>
  );
}
