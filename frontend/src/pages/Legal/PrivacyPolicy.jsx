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

const PrivacyPolicy = () => {
  return (
    <LegalLayout
      type="privacy"
      title="Privacy Policy"
      subtitle="This Privacy Policy explains how the Instagram Clone collects, uses, stores, and manages information when you use the website."
      lastUpdated="September 20, 2026"
    >
      <div className="space-y-1">
        <Section number="1" title="About this project">
          <p>
            Instagram Clone is an independent educational and personal web
            development project created and maintained by Adarsh Pattanayak.
          </p>

          <p>
            The project is intended for learning, experimentation,
            demonstration, and portfolio purposes. It is not affiliated with,
            sponsored by, or endorsed by Instagram or Meta Platforms, Inc.
          </p>
        </Section>

        <Section number="2" title="Information we collect">
          <p>
            When you create and use an account, the application may collect and
            store information that you provide directly.
          </p>

          <p>This may include:</p>

          <ul className="list-disc space-y-2 pl-5">
            <li>Full name</li>
            <li>Username</li>
            <li>Email address or other account contact information</li>
            <li>Password and authentication-related information</li>
            <li>Profile picture</li>
            <li>Biography and profile information</li>
            <li>Posts, captions, comments, and other content you create</li>
            <li>Messages exchanged through direct messaging</li>
            <li>Information associated with follows, likes, saves, and other application activity</li>
          </ul>
        </Section>

        <Section number="3" title="Google Sign-In">
          <p>
            The application provides Google authentication for account
            registration and login.
          </p>

          <p>
            When you choose to use Google Sign-In, the application receives
            basic account information made available through Google's
            authentication system, including your name, email address, and
            profile picture.
          </p>

          <p>
            If you use your Google profile picture, the application stores a
            copy of that profile picture through its media-storage provider,
            Cloudinary, so that the image can be used as your profile picture
            within the application.
          </p>

          <p>
            The application does not request access to unrelated Google
            services such as Gmail, Google Drive, or Google Contacts.
          </p>
        </Section>

        <Section number="4" title="User-generated content">
          <p>
            The application allows users to create and upload content,
            including:
          </p>

          <ul className="list-disc space-y-2 pl-5">
            <li>Profile pictures</li>
            <li>Image posts</li>
            <li>Video posts and reels</li>
            <li>Stories</li>
            <li>Captions and biographies</li>
            <li>Comments</li>
            <li>Shared media</li>
            <li>GIFs</li>
            <li>Other content made available through the application's features</li>
          </ul>

          <p>
            You are responsible for ensuring that content you upload or share
            does not violate applicable law or the rights of another person.
          </p>
        </Section>

        <Section number="5" title="Media storage">
          <p>
            Images and videos uploaded to the application are stored and
            delivered using Cloudinary.
          </p>

          <p>
            This includes profile pictures, post images, reel videos, and
            images or other supported media shared through direct messages.
          </p>

          <p>
            Cloudinary is an external service provider used for media storage
            and delivery. Its own privacy practices may apply to information
            processed through its services.
          </p>
        </Section>

        <Section number="6" title="Direct messages">
          <p>
            The application provides one-to-one direct messaging. Group
            conversations are not currently supported.
          </p>

          <p>
            Messages are stored in the application's MongoDB database so that
            they can be delivered and displayed to the participants.
          </p>

          <p>
            Direct messages are currently not end-to-end encrypted. Users
            should therefore avoid sending highly sensitive or confidential
            information through the messaging feature.
          </p>
        </Section>

        <Section number="7" title="GIFs and music">
          <p>
            Users may search for and share GIF content through GIPHY-powered
            functionality. GIPHY is a third-party service and its own terms
            and privacy practices may apply to its services and content.
          </p>

          <p>
            The application also provides functionality for searching and
            selecting audio or songs through an external music service.
          </p>
        </Section>

        <Section number="8" title="AI-powered features">
          <p>
            The application includes optional AI-powered features such as an
            AI chatbot, caption suggestions, biography suggestions, comment
            suggestions, and suggested replies for direct messages.
          </p>

          <p>
            When you use an AI feature, the text or information necessary to
            generate the requested response may be processed by an external AI
            service used by the application.
          </p>

          <p>
            Users should avoid submitting highly sensitive personal,
            financial, authentication, or confidential information to AI
            features.
          </p>
        </Section>

        <Section number="9" title="Cookies and authentication">
          <p>
            The application uses cookies and related browser mechanisms for
            authentication, authorization, session management, and necessary
            application functionality.
          </p>

          <p>
            These mechanisms help the application recognize authenticated
            users and protect authenticated functionality.
          </p>
        </Section>

        <Section number="10" title="How information is used">
          <p>
            Information collected by the application is used to provide and
            operate its features, including:
          </p>

          <ul className="list-disc space-y-2 pl-5">
            <li>Creating and managing user accounts</li>
            <li>Authenticating users</li>
            <li>Displaying profiles and profile pictures</li>
            <li>Displaying posts, reels, and stories</li>
            <li>Enabling likes, comments, follows, and saves</li>
            <li>Providing direct messaging</li>
            <li>Providing notifications and real-time functionality</li>
            <li>Providing GIF, music, and AI functionality</li>
            <li>Maintaining application security and functionality</li>
            <li>Responding to reports and enforcing application rules</li>
          </ul>
        </Section>

        <Section number="11" title="Data sharing and third-party services">
          <p>
            The application uses third-party services to provide certain
            functionality. Depending on the feature you use, information or
            content may be processed by services such as:
          </p>

          <ul className="list-disc space-y-2 pl-5">
            <li>Google, for Google authentication</li>
            <li>Cloudinary, for media storage and delivery</li>
            <li>GIPHY, for GIF search and related functionality</li>
            <li>An external music service, for music/audio functionality</li>
            <li>An external AI service, for AI-powered features</li>
            <li>MongoDB/database infrastructure, for application data storage</li>
          </ul>

          <p>
            These third-party providers operate under their own policies and
            terms. Their processing may therefore be subject to policies
            separate from this Privacy Policy.
          </p>
        </Section>

        <Section number="12" title="Account deletion">
          <p>
            Users can delete their account through the application.
          </p>

          <p>
            When an account is deleted, the application is designed to remove
            the information and content associated with that account,
            including the account profile and associated application data and
            media.
          </p>

          <p>
            Deletion may not immediately remove information that a third-party
            provider is legally or technically required to retain for a
            limited period, or information contained in system backups or
            security logs.
          </p>
        </Section>

        <Section number="13" title="Content moderation and administration">
          <p>
            The application has an administrative account operated by the
            developer.
          </p>

          <p>
            The administrator may review reported content and may remove posts,
            comments, or accounts when necessary to enforce the application's
            rules, address abuse, or maintain the service.
          </p>

          <p>
            The application currently does not provide a user-facing block
            feature.
          </p>
        </Section>

        <Section number="14" title="Security">
          <p>
            Reasonable technical measures are used to protect application
            accounts and information against unauthorized access and misuse.
          </p>

          <p>
            However, no internet-based application or storage system can be
            guaranteed to be completely secure. Users should avoid submitting
            highly sensitive information through the application.
          </p>
        </Section>

        <Section number="15" title="Analytics and tracking">
          <p>
            The developer has not intentionally described or promised any
            advertising-based tracking system through this Privacy Policy.
          </p>

          <p>
            Third-party infrastructure providers may independently process
            technical information necessary to provide their services, subject
            to their own policies.
          </p>
        </Section>

        <Section number="16" title="Children's privacy">
          <p>
            The application is not specifically designed as a service for
            children. Users should only use the application where permitted by
            applicable age requirements and laws.
          </p>
        </Section>

        <Section number="17" title="Changes to this Privacy Policy">
          <p>
            This Privacy Policy may be updated when application features,
            third-party services, data practices, or applicable requirements
            change.
          </p>

          <p>
            The latest version will be made available on this page together
            with an updated revision date.
          </p>
        </Section>

        <Section number="18" title="Contact">
          <p>
            If you have questions about this Privacy Policy or how information
            is handled within the application, you can contact the developer:
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

export default PrivacyPolicy;