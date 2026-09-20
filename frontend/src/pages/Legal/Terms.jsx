import LegalLayout from "./LegalLayout";

const Section = ({ number, title, children }) => (
  <section className="border-b border-[var(--border-soft)] py-7 first:pt-0 last:border-b-0">
    <h2 className="flex gap-3 text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
      <span className="shrink-0 text-[var(--brand-blue)]">
        {number}.
      </span>
      <span>{title}</span>
    </h2>

    <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
      {children}
    </div>
  </section>
);

const Terms = () => {
  return (
    <LegalLayout
      type="terms"
      title="Terms of Service"
      subtitle="These terms describe the rules and conditions for using the Instagram Clone website and its features."
      lastUpdated="September 20, 2026"
    >
      <div className="space-y-1">
        <Section number="1" title="About the service">
          <p>
            Instagram Clone is an independent educational and personal web
            development project created and maintained by Adarsh Pattanayak.
          </p>

          <p>
            The application provides social-media-style functionality,
            including user accounts, profiles, posts, reels, stories,
            comments, likes, follows, saves, direct messages, GIFs, music,
            and AI-powered features.
          </p>

          <p>
            The project is not affiliated with, sponsored by, or endorsed by
            Instagram or Meta Platforms, Inc.
          </p>
        </Section>

        <Section number="2" title="Acceptance of these terms">
          <p>
            By creating an account or using the application, you agree to use
            the service in accordance with these Terms of Service and
            applicable laws.
          </p>

          <p>
            If you do not agree with these terms, you should not use the
            application.
          </p>
        </Section>

        <Section number="3" title="Creating an account">
          <p>
            Users may create an account using the application's registration
            system or through Google authentication.
          </p>

          <p>
            You are responsible for providing accurate information and for
            maintaining the security of your account credentials.
          </p>

          <p>
            You should not knowingly create an account using another person's
            identity or information without authorization.
          </p>
        </Section>

        <Section number="4" title="User content">
          <p>
            Users may upload and create content including profile pictures,
            images, videos, reels, stories, captions, biographies, comments,
            GIFs, messages, and other supported content.
          </p>

          <p>
            You are responsible for the content you upload, publish, send, or
            otherwise make available through the application.
          </p>

          <p>
            You must have the necessary rights or permissions to use content
            that you upload or share.
          </p>
        </Section>

        <Section number="5" title="Prohibited content and activities">
          <p>
            You must not use the application to:
          </p>

          <ul className="list-disc space-y-2 pl-5">
            <li>Upload or distribute unlawful content</li>
            <li>Harass, threaten, or intentionally abuse other users</li>
            <li>Impersonate another person or organization</li>
            <li>Upload content that infringes another person's intellectual property rights</li>
            <li>Distribute malware, malicious code, or harmful files</li>
            <li>Attempt to gain unauthorized access to accounts or systems</li>
            <li>Interfere with the operation or security of the application</li>
            <li>Use automated methods to abuse or overload the service</li>
            <li>Use the application for fraudulent or deceptive activities</li>
            <li>Upload sexually explicit, exploitative, or otherwise prohibited material</li>
            <li>Use the service for activities that violate applicable law</li>
          </ul>
        </Section>

        <Section number="6" title="Copyright and intellectual property">
          <p>
            You retain responsibility for the original content that you
            contribute to the application, subject to the rights of any
            third-party material included in that content.
          </p>

          <p>
            You should not upload copyrighted material unless you have the
            necessary rights, permission, or other lawful basis to do so.
          </p>

          <p>
            The application's original interface, source code, branding,
            design elements, and developer-created materials remain subject to
            the rights of their respective owners.
          </p>
        </Section>

        <Section number="7" title="Third-party services">
          <p>
            Certain application features depend on third-party services,
            including Google authentication, Cloudinary media storage, GIPHY
            functionality, music/audio services, and AI services.
          </p>

          <p>
            Third-party services may have their own terms, licenses, privacy
            policies, and content restrictions. Your use of features supplied
            by those services may therefore also be subject to their
            respective rules.
          </p>
        </Section>

        <Section number="8" title="AI-generated content">
          <p>
            The application may provide AI-generated responses and suggestions,
            including chatbot responses, captions, biographies, comments, and
            suggested replies.
          </p>

          <p>
            AI-generated content may be incomplete, inaccurate, or unsuitable
            for a particular situation. Users are responsible for reviewing
            generated content before using or sharing it.
          </p>

          <p>
            AI features should not be treated as professional legal, medical,
            financial, or other specialized advice.
          </p>
        </Section>

        <Section number="9" title="Direct messaging">
          <p>
            The application provides one-to-one direct messaging.
          </p>

          <p>
            Users should understand that messages are stored by the
            application and are not currently protected by end-to-end
            encryption.
          </p>

          <p>
            Do not use the messaging system to send highly confidential,
            sensitive, or security-critical information.
          </p>
        </Section>

        <Section number="10" title="Moderation and administrator actions">
          <p>
            The application is operated with an administrator account managed
            by the developer.
          </p>

          <p>
            The administrator may review reported content and may remove posts,
            comments, or accounts where necessary to address violations of
            these terms, abuse, unlawful activity, security issues, or other
            problems affecting the service.
          </p>

          <p>
            The application currently does not provide a user-facing block
            feature.
          </p>
        </Section>

        <Section number="11" title="Reporting">
          <p>
            Users may report content or activity that they believe violates
            the application's rules.
          </p>

          <p>
            Reports may be reviewed by the administrator, and appropriate
            action may be taken based on the circumstances.
          </p>
        </Section>

        <Section number="12" title="Account deletion">
          <p>
            Users may delete their accounts through the application.
          </p>

          <p>
            When an account is deleted, associated application data and content
            are intended to be removed from the application's active systems,
            including associated media stored for that account.
          </p>

          <p>
            Certain technical records, backups, or information that must be
            retained for security or legal reasons may not disappear
            immediately.
          </p>
        </Section>

        <Section number="13" title="Service availability">
          <p>
            This is an independently developed project and may be modified,
            temporarily unavailable, interrupted, or discontinued at any time.
          </p>

          <p>
            No guarantee is made that every feature will always remain
            available or operate without errors.
          </p>
        </Section>

        <Section number="14" title="Security and misuse">
          <p>
            Attempts to bypass authentication, access another user's account,
            manipulate application data, interfere with the server, or
            compromise the security of the application are prohibited.
          </p>

          <p>
            Security vulnerabilities or accidental issues should be reported
            responsibly to the developer rather than exploited.
          </p>
        </Section>

        <Section number="15" title="Disclaimer">
          <p>
            The application is provided as an independent educational and
            personal project.
          </p>

          <p>
            The application is provided on an "as available" basis. To the
            extent permitted by applicable law, the developer does not
            guarantee that the service will always be uninterrupted, secure,
            accurate, or error-free.
          </p>
        </Section>

        <Section number="16" title="Limitation of responsibility">
          <p>
            Users are responsible for their own use of the application and for
            content they upload, share, or send.
          </p>

          <p>
            To the extent permitted by applicable law, the developer is not
            responsible for losses resulting from a user's misuse of the
            service, third-party services, user-generated content, service
            interruptions, or unauthorized activity outside the developer's
            reasonable control.
          </p>
        </Section>

        <Section number="17" title="Changes to these terms">
          <p>
            These Terms of Service may be updated when the application,
            features, or operating practices change.
          </p>

          <p>
            The latest version will be published on this page with an updated
            revision date.
          </p>
        </Section>

        <Section number="18" title="Contact">
          <p>
            Questions regarding these Terms of Service can be sent to the
            developer:
          </p>

          <a
            href="mailto:adarshpattanayak2004@gmail.com"
            className="inline-flex font-medium text-[var(--brand-blue)] hover:underline"
          >
            adarshpattanayak2004@gmail.com
          </a>
        </Section>
      </div>
    </LegalLayout>
  );
};

export default Terms;