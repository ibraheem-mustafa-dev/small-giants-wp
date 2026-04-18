"use client";

import { LinkedInEmbed } from "react-social-media-embed";

const featuredPosts = [
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7400240860266778625/",
    label: "Working with Indus Foods",
  },
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7416811297943494656/",
    label: "ADHD, finance and running a business",
  },
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7424005665347686401/",
    label: "Small Giants Studio launch",
  },
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7401037425168306176/",
    label: "Muslims In Construction networking",
  },
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7401319295278014465/",
    label: "First project live",
  },
];

export function LinkedInFeed() {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {featuredPosts.map((post) => (
        <article
          key={post.url}
          aria-label={post.label}
          className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
        >
          <LinkedInEmbed
            url={post.url}
            width="100%"
            height={500}
          />
        </article>
      ))}
    </div>
  );
}
