import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileText, Mail } from "lucide-react";

const LegalLayout = ({ type, title, subtitle, lastUpdated, children }) => {
  const isPrivacy = type === "privacy";

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border-soft)] bg-[var(--glass-panel-bg)] backdrop-blur-[var(--overlay-blur)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-[var(--text-primary)] transition-opacity hover:opacity-70"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-blue)] text-white shadow-sm">
              {isPrivacy ? (
                <ShieldCheck size={19} />
              ) : (
                <FileText size={19} />
              )}
            </span>

            <div>
              <p className="text-[15px] font-semibold leading-none">
                Instagram Clone
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Independent project
              </p>
            </div>
          </Link>

          <Link
            to="/home"
            className="flex items-center gap-2 rounded-lg border border-[var(--border-container)] bg-[var(--bg-secondary-btn)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary-btn-hover)]"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to website</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[var(--border-soft)] bg-[var(--bg-panel)]">
        <div className="mx-auto max-w-4xl px-5 py-12 text-center sm:px-8 sm:py-16">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] text-[var(--brand-blue)]">
            {isPrivacy ? (
              <ShieldCheck size={28} />
            ) : (
              <FileText size={28} />
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            {subtitle}
          </p>

          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <article className="overflow-hidden rounded-2xl border border-[var(--border-container)] bg-[var(--bg-panel)] shadow-sm">
          <div className="p-5 sm:p-8 lg:p-10">
            {children}
          </div>
        </article>

        {/* Developer card */}
        <section className="mt-6 rounded-2xl border border-[var(--border-container)] bg-[var(--bg-panel)] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-blue)]">
                Developer
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Adarsh Pattanayak
              </h2>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Independent educational and personal project
              </p>
            </div>

            <a
              href="mailto:adarshpattanayak2004@gmail.com"
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-[var(--brand-blue)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-blue-hover)]"
            >
              <Mail size={16} />
              Contact developer
            </a>
          </div>
        </section>

        {/* Navigation */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isPrivacy ? (
            <Link
              to="/terms"
              className="rounded-lg border border-[var(--border-container)] bg-[var(--bg-panel)] px-5 py-3 text-center text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-row-hover)]"
            >
              Read Terms of Service
            </Link>
          ) : (
            <Link
              to="/privacy-policy"
              className="rounded-lg border border-[var(--border-container)] bg-[var(--bg-panel)] px-5 py-3 text-center text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-row-hover)]"
            >
              Read Privacy Policy
            </Link>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-soft)] px-5 py-8 text-center">
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          This website is an independent educational/personal project and is
          not affiliated with, sponsored by, or endorsed by Instagram or Meta
          Platforms, Inc.
        </p>

        <p className="mt-2 text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} Adarsh Pattanayak. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LegalLayout;