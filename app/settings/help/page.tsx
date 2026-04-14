import { HelpPageContent } from "@/components/settings/HelpPageContent";
import { SettingsRouteClient } from "@/components/settings/SettingsRouteClient";

export default function SettingsHelpPage() {
  return (
    <SettingsRouteClient title="Help">
      <HelpPageContent />
    </SettingsRouteClient>
  );
}
