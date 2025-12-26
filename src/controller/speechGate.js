export class speechGate {
  constructor(speaker, emitFn) {
    this.speaker = speaker;
    this.emit = emitFn;

    this.state = "IDLE";
    this.segmentStart = 0;
    this.lastTs = 0;
    this.silenceMs = 0;
  }

  handleFrame(frame) {
    const ts = frame.timestampMs;
    const frameDuration = ts - this.lastTs || 20;
    this.lastTs = ts;

    if (frame.speech && this.state === "IDLE") {
      this.state = "IN_SPEECH";
      this.segmentStart = ts;
      this.silenceMs = 0;

      this.emit({
        type: "segment_start",
        speaker: this.speaker,
        timestamp: ts,
      });
    }

    if (this.state === "IN_SPEECH") {
      this.emit({
        type: "audio",
        speaker: this.speaker,
        audio: frame.audio,
        sampleRate: frame.sampleRate,
      });

      if (!frame.speech) {
        this.silenceMs += frameDuration;
      } else {
        this.silenceMs = 0;
      }

      // End conditions
      if (
        this.silenceMs > 800 ||        // silence-based end
        ts - this.segmentStart > 5000  // hard cap
      ) {
        this.emit({
          type: "segment_end",
          speaker: this.speaker,
          timestamp: ts,
        });

        this.state = "IDLE";
      }
    }
  }
}
