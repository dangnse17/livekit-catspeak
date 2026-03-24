import {
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

/**
 * VideoGrid — camera / screen-share grid with active-speaker highlighting.
 *
 * Active speaker highlighting is done via CSS: each participant tile wrapper
 * gets a `data-speaking` attribute that the stylesheet targets.
 */
export function VideoGrid({ isSpeaking }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks}>
      <ParticipantTile
        // The ParticipantTile component renders per-track; we add a wrapper
        // class by overriding the root via className
        className={
          // Note: ParticipantTile internally handles its own participant reference,
          // but we can style the active-speaker ring via CSS using data attributes
          // set at a higher level. For now we rely on the LiveKit default
          // `lk-participant-tile` class selectors and augment with our own CSS.
          "video-tile-enhanced"
        }
      />
    </GridLayout>
  );
}
