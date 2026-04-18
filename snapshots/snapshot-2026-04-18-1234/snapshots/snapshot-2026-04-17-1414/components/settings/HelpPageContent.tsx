import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const body = "text-[12px] leading-relaxed text-tx-secondary md:text-[13px]";
const h2 =
  "text-[12px] font-semibold tracking-wide text-white md:text-[13px]";
const h3 = "text-[12px] font-medium text-white md:text-[13px]";
const list = cn(
  body,
  "mt-2 list-disc space-y-1.5 pl-4 marker:text-tx-muted",
);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className={h2}>{title}</h2>
      {children}
    </section>
  );
}

function FeatureBlock({
  name,
  intro,
  bullets,
}: {
  name: string;
  intro: string;
  bullets: string[];
}) {
  return (
    <div className="space-y-2">
      <h3 className={h3}>{name}</h3>
      <p className={body}>{intro}</p>
      <ul className={list}>
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function HelpPageContent() {
  return (
    <div
      className={cn(
        "space-y-8 text-left",
        "[&_p+p]:mt-3",
      )}
    >
      <Section title="Welcome to Solved">
        <p className={body}>
          Solved is an all-in-one AI workspace designed to help you create, edit,
          and manage content faster and more efficiently.
        </p>
        <p className={body}>
          From generating images and videos to organizing your assets, everything
          is built to feel simple, powerful, and seamless.
        </p>
      </Section>

      <section className="space-y-6" aria-labelledby="help-core-features">
        <h2 id="help-core-features" className={h2}>
          Core Features
        </h2>
        <div className="space-y-6">
          <FeatureBlock
            name="Chat"
            intro="Use Chat to generate ideas, write content, and solve problems instantly."
            bullets={[
              "Ask questions, generate copy, or brainstorm concepts",
              "Refine outputs through conversation",
              "Use it as your creative assistant across any task",
            ]}
          />
          <FeatureBlock
            name="Create Image"
            intro="Generate high-quality images in seconds."
            bullets={[
              "Enter a prompt to describe what you want",
              "Choose settings like aspect ratio and resolution",
              "Use templates to speed up your workflow",
            ]}
          />
          <FeatureBlock
            name="Edit Image"
            intro="Make precise adjustments to any image."
            bullets={[
              "Use editor tools to modify or enhance visuals",
              "Apply changes quickly with real-time feedback",
              "Fine-tune details without leaving the workspace",
            ]}
          />
          <FeatureBlock
            name="Create Video"
            intro="Turn ideas into video content."
            bullets={[
              "Generate short videos from prompts",
              "Adjust format, resolution, and duration",
              "Iterate quickly to refine results",
            ]}
          />
          <FeatureBlock
            name="Files"
            intro="Manage all of your content in one place."
            bullets={[
              "View, organize, and rename your assets",
              "Switch between grid and list views",
              "Access everything instantly",
            ]}
          />
          <FeatureBlock
            name="History"
            intro="Track everything you’ve created."
            bullets={[
              "View previously generated images and content",
              "Revisit past work at any time",
              "Rename items directly from the History list",
            ]}
          />
          <FeatureBlock
            name="Liked"
            intro="Save and organize your best work."
            bullets={[
              "Mark items you want to keep or revisit",
              "Quickly access your favorite content",
              "Rename and manage saved items easily",
            ]}
          />
        </div>
      </section>

      <Section title="Tips for Best Results">
        <ul className={list}>
          <li>Be specific with prompts — clearer input produces better output</li>
          <li>Use templates to speed up common tasks</li>
          <li>Iterate — small changes can dramatically improve results</li>
          <li>Keep your files organized to stay efficient</li>
        </ul>
      </Section>

      <Section title="Common Actions">
        <ul className={list}>
          <li>
            Rename a file: Click the file name, edit, then press Return or click
            outside
          </li>
          <li>
            Switch views: Use the list or grid buttons in the Files page
          </li>
          <li>Select tools: Click any tool in the editor to activate it</li>
          <li>Adjust settings: Use the controls above the prompt bar</li>
          <li>
            Save favorites: Use the like/heart icon to add items to Liked
          </li>
        </ul>
      </Section>

      <Section title="Need Help">
        <p className={body}>
          If something isn’t working as expected, try refreshing your session or
          adjusting your inputs.
        </p>
        <p className={body}>
          For additional support or feedback, contact your team or system
          administrator.
        </p>
      </Section>
    </div>
  );
}
