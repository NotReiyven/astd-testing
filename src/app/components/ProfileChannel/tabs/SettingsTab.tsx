// ================================================
// FILE: src/app/components/ProfileChannel/tabs/SettingsTab.tsx
// ================================================

import { PrivacySection } from "./settings/PrivacySection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { PreferencesSection } from "./settings/PreferencesSection";
import { ProfileChannelState } from "../hooks/useProfileChannelState";
import { ProfileChannelActions } from "../hooks/useProfileChannelActions";

export function SettingsTab({
  state,
  actions,
}: {
  state: ProfileChannelState;
  actions: ProfileChannelActions;
}) {
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <PrivacySection state={state} actions={actions} />
      <AppearanceSection state={state} actions={actions} />
      <PreferencesSection state={state} />
    </div>
  );
}