import React from "react";
import IconSidebar from "../components/IconSidebar";
import MobileFooter from "../components/MobileFooter";

const AboutPage = () => {
  return (
    <div className="aboutPage w-[100vw] h-[100vh] bg-[var(--bg-app)] flex text-[var(--text-primary)] overflow-x-hidden">
      <IconSidebar />

      <div className="aboutSection no-scrollbar w-full md:w-[80%] min-h-full flex justify-center overflow-y-auto">
        <div className="aboutContainer w-full sm:w-[85%] lg:w-[65%] xl:w-[55%] min-h-full flex flex-col items-start py-10 px-4 sm:px-0">

          {/* ---------- Page heading ---------- */}
          <header className="w-full mb-14">
            <p className="text-[13px] font-medium text-[var(--brand-blue)] mb-2">
              Behind the build
            </p>

            <h1 className="text-[32px] sm:text-[38px] font-semibold leading-tight text-[var(--text-primary)] max-w-[620px]">
              About this project, and the person who built it
            </h1>
          </header>

          {/* ---------- About the website ---------- */}
          <section className="w-full mb-16">
            <h2 className="text-[20px] font-semibold text-[var(--text-primary)] mb-1">
              An independent, Instagram-inspired project
            </h2>

            <p className="text-[14px] text-[var(--text-muted)] mb-6">
              What this site is, and what it isn't
            </p>

            <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-[680px]">
              <p>
                This website is an independent educational and portfolio
                project, built to demonstrate web development skills,
                full-stack application development, and modern software
                engineering practices.
              </p>

              <p>
                It's inspired by the core concepts and user experience of
                Instagram and has been developed independently from scratch
                for learning and demonstration purposes. It is not
                affiliated with, endorsed by, sponsored by, or officially
                connected with Instagram or Meta Platforms, Inc. Instagram
                and Meta are trademarks and/or registered trademarks of
                their respective owners — no ownership or trademark rights
                over Instagram, Meta, their logos, branding, or other
                proprietary assets are claimed through this project.
              </p>

              <p>
                It exists solely to demonstrate the developer's ability to
                design and build a social-media-style web application using
                modern technologies.
              </p>
            </div>

            {/* Copyright */}
            <div className="mt-8 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-soft)] max-w-[680px]">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">
                Copyright &amp; code ownership
              </h3>

              <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                <p>© 2026 Adarsh Pattanayak. All rights reserved.</p>

                <p>
                  The original source code, implementation, custom
                  components, application logic, database structure,
                  documentation, and other original materials created
                  specifically for this project are the intellectual
                  property of the developer — except for third-party
                  software, libraries, frameworks, assets, trademarks, or
                  other materials that remain the property of their
                  respective owners.
                </p>

                <p>
                  Unless explicitly stated otherwise, the source code may
                  not be copied, reproduced, republished, redistributed,
                  sold, relicensed, or reused in another project without
                  prior written permission from the developer. Viewing or
                  accessing the publicly deployed website does not grant
                  permission to copy or redistribute its underlying source
                  code or original implementation.
                </p>

                <p>
                  If you'd like to use, adapt, or redistribute substantial
                  portions of this project's original code, please contact
                  the developer first. Unauthorized use may result in
                  appropriate action under applicable intellectual-property
                  and copyright laws.
                </p>
              </div>
            </div>

            {/* Third party + disclaimer */}
            <div className="mt-6 flex flex-col gap-6 max-w-[680px]">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">
                  Third-party technologies
                </h3>

                <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
                  This project may use open-source libraries, frameworks,
                  APIs, services, icons, fonts, or other third-party
                  resources. Such materials remain subject to their
                  respective licenses and terms. Nothing on this page is
                  intended to transfer ownership of third-party
                  intellectual property to the developer.
                </p>
              </div>

              <div>
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">
                  Disclaimer
                </h3>

                <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
                  This project is provided for educational, demonstration,
                  and portfolio purposes. It is not intended to represent
                  the official Instagram platform or reproduce proprietary
                  backend systems, services, or infrastructure operated by
                  Meta. If any third-party material is identified as being
                  used inappropriately, please contact the developer so the
                  matter can be reviewed and addressed.
                </p>
              </div>
            </div>
          </section>

          <div className="w-full h-[1px] bg-[var(--border-soft)] mb-16" />

          {/* ---------- About the developer ---------- */}
          <section className="w-full mb-10">
            <h2 className="text-[20px] font-semibold text-[var(--text-primary)] mb-1">
              About the developer
            </h2>

            <p className="text-[14px] text-[var(--text-muted)] mb-8">
              Who built this, and why
            </p>

            <div className="flex flex-col sm:flex-row gap-8 sm:gap-10 items-start">


            <div className="relative shrink-0 w-[168px] h-[168px] mx-auto sm:mx-0">

            {/* ambient glow behind the frame */}
            <div
                className="absolute -inset-4 rounded-[36px] opacity-60 blur-2xl"
                style={{
                background:
                    "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                }}
            />

            {/* gradient ring */}
            <div
                className="relative w-full h-full rounded-[28px] p-[3px]"
                style={{
                background:
                    "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                }}
            >
                <div className="w-full h-full rounded-[25px] overflow-hidden bg-[var(--bg-elevated)] flex items-center justify-center">

                {/* Replace src with your photo, e.g. /images/adarsh.jpg */}
                <img
                    src="/images/Developer-Pic.JPG"
                    alt="Adarsh Pattanayak"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling.style.display = "flex";
                    }}
                />

                {/* Fallback shown until you add the real photo */}
                <div
                    className="hidden w-full h-full items-center justify-center text-[36px] font-semibold text-[var(--text-primary)]"
                    style={{ display: "none" }}
                >
                    AP
                </div>

                </div>
            </div>
            </div>

              {/* ---- Intro text ---- */}
              <div className="flex-1">
                <h3 className="text-[19px] font-semibold text-[var(--text-primary)] mb-3">
                  Hi, I'm Adarsh Pattanayak 👋
                </h3>

                <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-[600px]">
                  <p>
                    I'm a Computer Science student and full-stack web
                    developer, currently pursuing my Master of Computer
                    Applications (MCA) at Utkal University, Bhubaneswar.
                  </p>

                  <p>
                    I enjoy building web applications from the ground up and
                    understanding how different parts of a modern
                    application work together — from designing the frontend
                    and building REST APIs to authentication, databases,
                    media handling, and deployment.
                  </p>

                  <p>
                    This project is one of my attempts to recreate the
                    experience of a modern social-media platform, while
                    challenging myself to implement its major features
                    independently.
                  </p>
                </div>
              </div>
            </div>

            {/* ---- Technical interests ---- */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[680px]">
              {[
                {
                  title: "Web development",
                  body: "HTML, CSS, JavaScript, React, Tailwind CSS, Node.js, Express.js, REST APIs",
                },
                {
                  title: "Database & backend",
                  body: "MongoDB, authentication, API development, database design, media management",
                },
                {
                  title: "Data science",
                  body: "Python, NumPy, Pandas, Matplotlib, Seaborn, Jupyter, data analysis, web scraping, scikit-learn",
                },
                {
                  title: "Tools & services",
                  body: "Git, GitHub, Cloudinary, and other modern development tools",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-soft)]"
                >
                  <h4 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">
                    {item.title}
                  </h4>

                  <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-[14px] leading-relaxed text-[var(--text-secondary)] max-w-[680px]">
              My primary focus is full-stack web development, while data
              science and machine learning are areas I'm actively learning
              and exploring. I enjoy working on practical projects that
              combine programming, problem-solving, data, and real-world
              applications — particularly ones where the frontend, backend,
              database, authentication, and other services all work
              together as one complete system.
            </p>
          </section>

          <div className="w-full h-[1px] bg-[var(--border-soft)] mb-10" />

          {/* ---------- Connect ---------- */}
          <section className="w-full mb-16">
            <h2 className="text-[20px] font-semibold text-[var(--text-primary)] mb-1">
              Connect with me
            </h2>

            <p className="text-[14px] text-[var(--text-muted)] mb-6">
              If you'd like to talk about this project, collaborate, or
              just connect
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-[680px]">

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/adarshpattanayak"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-soft)] hover:bg-[var(--bg-row-hover)] transition-colors duration-200"
              >
                <span className="text-[14px] font-medium text-[var(--text-primary)]">
                  LinkedIn
                </span>

                <span className="text-[13px] text-[var(--link-muted)]">
                  Adarsh Pattanayak
                </span>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/Adarsh-cpp"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-soft)] hover:bg-[var(--bg-row-hover)] transition-colors duration-200"
              >
                <span className="text-[14px] font-medium text-[var(--text-primary)]">
                  GitHub
                </span>

                <span className="text-[13px] text-[var(--link-muted)]">
                  Adarsh-cpp
                </span>
              </a>

              {/* Email */}
              <a
                href="mailto:adarshpattanayak2004@gmail.com"
                className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-soft)] hover:bg-[var(--bg-row-hover)] transition-colors duration-200"
              >
                <span className="text-[14px] font-medium text-[var(--text-primary)]">
                  Email
                </span>

                <span className="text-[13px] text-[var(--link-muted)]">
                  Get in touch
                </span>
              </a>

            </div>

            <p className="mt-8 text-[13px] text-[var(--text-muted)]">
              Built with curiosity, code, and a lot of debugging. ❤️
            </p>
          </section>

        </div>
      </div>

      <MobileFooter />
    </div>
  );
};

export default AboutPage;