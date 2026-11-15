import { LegalSection, LegalShell } from "../components/layout/LegalShell";

export function TermsPage() {
  return (
    <LegalShell
      title="Terms of use"
      intro="Collab is a student diploma project. By creating an account or joining by a link as a guest, you accept these terms."
    >
      <LegalSection title="What this service is">
        <p>
          A shared place to work on a project: code, documents, boards and chat. The service is free and is provided
          “as is”: it may be unavailable, and data may be lost. Download anything important as an archive from the
          project menu.
        </p>
      </LegalSection>

      <LegalSection title="Accounts and joining by link">
        <ul className="list-disc space-y-1 pl-5">
          <li>A guest only needs a name. Other members of the project see this name.</li>
          <li>Do not share your password. Give the invite link only to people you invite to the project.</li>
          <li>You can delete your account in the profile menu at any time.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your content">
        <ul className="list-disc space-y-1 pl-5">
          <li>Files and messages stay yours. You are responsible for what you post.</li>
          <li>Everything in a project is visible to all its members.</li>
          <li>Do not post passwords, access keys, other people's personal data, or anything you have no rights to.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Running code">
        <p>You can run study code and the code of your project. A program runs in a closed sandbox without network, for at most 10 seconds.</p>
        <p>You must not:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>try to escape the sandbox or get access to the server;</li>
          <li>attack other systems or send spam;</li>
          <li>mine cryptocurrency;</li>
          <li>run programs that stop others from working.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What the site owner can do">
        <p>
          If the terms are broken, the site owner can stop a program, delete content, block access to an account, or
          turn off running code for everyone.
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>Contact the owner of this site: usually the person who gave you the link.</p>
      </LegalSection>
    </LegalShell>
  );
}
