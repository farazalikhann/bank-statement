import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { WhyOnDevice } from './WhyOnDevice';
import { WhoUsesThis } from './WhoUsesThis';
import { Faq } from './Faq';

// Rendered below the dropzone on the no-file landing state only — someone
// who already knows what they want never has to scroll past this to reach
// the tool. Exists mainly so this isn't a bare single-purpose tool page;
// AdSense review rejects those.
export function LandingContent() {
  return (
    <div className="flex flex-col gap-8">
      <Hero />
      <HowItWorks />
      <WhyOnDevice />
      <WhoUsesThis />
      <Faq />
    </div>
  );
}
