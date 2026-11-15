import { LegalSection, LegalShell } from "../components/layout/LegalShell";

export function PrivacyPage() {
  return (
    <LegalShell
      title="Data and privacy"
      intro="Collab is a student diploma project. This page says in short what data the service keeps, why, and how to delete it."
    >
      <LegalSection title="What we keep">
        <ul className="list-disc space-y-1 pl-5">
          <li>For an account: name, email and a password hash (the password itself is not stored).</li>
          <li>For a guest: only the name you enter. No email is needed.</li>
          <li>What you create: projects, files, their versions and chat messages.</li>
          <li>A GitHub token, if you enter one, is used for one request only and is not stored.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Why, and on what basis">
        <p>
          The data is needed for the service to work: to sign you in, to show members their names and cursors, and to
          keep projects. This is the performance of a contract with the user (GDPR, Art. 6(1)(b)). Protection against
          abuse, for example limiting sign-in attempts per IP address, is a legitimate interest (Art. 6(1)(f)).
        </p>
        <p>There is no analytics, no advertising and no sharing of data with third parties.</p>
      </LegalSection>

      <LegalSection title="Who sees your data">
        <p>
          Members of a project see your name, edits and messages in that project. The service does not show the email
          of other members.
        </p>
      </LegalSection>

      <LegalSection title="How long it is kept">
        <ul className="list-disc space-y-1 pl-5">
          <li>Account and projects: until you delete them.</li>
          <li>Deleted files: 30 days in the trash, then deleted forever.</li>
          <li>A guest account that is in no project: 30 days after the session ends, then it is deleted with its messages.</li>
          <li>Sign-in session: up to 30 days if you do not use it.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What is kept in your browser">
        <p>
          The sign-in session, settings, which chat messages you have read, and copies of open files so you can work
          offline. No tracking cookies are used.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          You can change your name and download the project files as an archive. You can delete your account in the
          profile menu: your messages and the projects you own are deleted with it. Copies of files in this browser are
          erased too.
        </p>
        <p>For questions, contact the owner of this site: usually the person who gave you the link.</p>
      </LegalSection>
    </LegalShell>
  );
}
