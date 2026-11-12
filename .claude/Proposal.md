# Blueprint: The AI-Native Proprietary Component CMS & Agency Platform

## 1. Core Vision & Strategic Goal

We are designing and building a proprietary, high-performance Web Engine and Visual CMS framework to permanently replace WordPress.

- **The Workflow:** It must act as the ultimate native engine for Claude Code and Claude Design outputs. When an AI generates a layout, an automated or semi-automated pipeline should ingest it into our custom component system as editable, structured parts.
- **The Foundation (80-90% Time Saver):** We will NOT build everything from scratch. We want to identify, evaluate, and reverse-engineer the absolute best open-source foundations and component libraries (e.g., `@measured/puck` or Craft.js for the visual canvas; DaisyUI, HeroUI, and 21st.dev patterns for components; open-source multi-tenant starter architectures).
- **The Long-Term SaaS Horizon:** The architecture built for our internal agency today must be structurally ready to scale into a commercial multi-tenant SaaS tomorrow (allowing external users/agencies to log in, manage sites, and handle custom domains via API).

## 2. Key Architectural Pillars to Research & Design

1. **The Open-Source Foundation & Component Ecosystem:**
   - Research and reverse-engineer top-tier open-source visual editors and component libraries. How do we stitch them together into a cohesive builder?
   - How do DaisyUI, HeroUI, and Tailwind design tokens map cleanly into a global theme config (`theme.config.json`)?
2. **Advanced Features & Surface Types:**
   - **Data-Driven Templates:** Static vs. dynamic pages (blogs, product catalogs with automated supplier inventory/pricing feeds via APIs/webhooks, membership areas, forums, marketing choice-flow questionnaires).
   - **Global & Interactive Overlays:** Global headers, footers, dynamic modals, and floating utility widgets (e.g., WhatsApp buttons) managed via central state and toggled per page.
3. **Multi-Tenancy & Infrastructure:**
   - Agency Tier: Hosting static exports on Hostinger Shared, or dynamic client apps on a Hostinger KVM 2 VPS using Coolify, Docker, Nginx, and Next.js Middleware domain routing (`/site/[domain]`).
   - SaaS Tier: Database scoping (PostgreSQL/Prisma) designed for future tenant isolation without a rewrite.
4. **Legacy Code Audit (Final Stage Only):**
   - Only _after_ the ideal architecture is mapped out, we will inspect our old WordPress theme repository to see what specific logic, calculations, or functional ideas are worth adapting into TypeScript.
