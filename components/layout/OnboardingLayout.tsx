import { ReactNode } from "react";
import LudzoLogo from "./LudzoLogo";
import ArenaArtwork from "./ArenaArtwork";
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="onboarding-page"><aside className="onboarding-story"><div className="workspace-brand"><LudzoLogo size={36} /><span>ludzo.</span></div><div><h2>Good moves.<br />Great possibilities.</h2><p>Your place to play, earn rewards and track every little win. All inside Telegram.</p><ArenaArtwork /></div><small>PLAY WITH PURPOSE. MAKE IT YOURS.</small></aside><main className="onboarding-panel">{children}</main></div>;
}
