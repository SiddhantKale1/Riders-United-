// Free On-Device Spoken Voice Prompt Engine using Web Speech Synthesis API
// Works on Chrome, Safari, Android WebView, and iOS with $0 cloud cost.

class SpeechService {
  private isEnabled: boolean = true;
  private isSpeaking: boolean = false;
  private queue: string[] = [];
  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      // Load user preference
      const saved = localStorage.getItem('riders_spoken_prompts_enabled');
      if (saved !== null) {
        this.isEnabled = saved === 'true';
      }

      // Initialize voice selection
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
      this.loadVoices();
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer English (India) or English (UK/US) clear tactical voice
    const indVoice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India'));
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    this.selectedVoice = indVoice || enVoice || voices[0] || null;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('riders_spoken_prompts_enabled', String(enabled));
    if (!enabled && this.synth) {
      this.synth.cancel();
      this.queue = [];
      this.isSpeaking = false;
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public speak(text: string, priority: 'normal' | 'urgent' = 'normal') {
    if (!this.isEnabled || !this.synth || !text.trim()) return;

    if (priority === 'urgent') {
      // Urgent alerts (SOS, severe hazards) interrupt current speech immediately
      this.synth.cancel();
      this.queue = [text];
      this.processQueue();
      return;
    }

    // Don't flood queue
    if (this.queue.length > 3) {
      this.queue.shift();
    }
    this.queue.push(text);
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (!this.synth || this.queue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const nextText = this.queue.shift();
    if (!nextText) {
      this.isSpeaking = false;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(nextText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = 1.05; // Slightly brisk for riding prompt delivery
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      this.isSpeaking = false;
      // Slight pause between prompts
      setTimeout(() => this.processQueue(), 250);
    };

    utterance.onerror = (e) => {
      console.warn('Speech prompt error:', e);
      this.isSpeaking = false;
      this.processQueue();
    };

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Failed to speak prompt:', e);
      this.isSpeaking = false;
    }
  }

  // Pre-configured tactical voice prompts
  public announceHazard(type: string, callsign: string) {
    const readable = type === 'police' ? 'Police or Speed Trap' : type;
    this.speak(`Caution. ${readable} reported ahead by ${callsign}.`, 'normal');
  }

  public announceRegroup(spreadKm: number) {
    this.speak(`Convoy alert. Pack is stretched by ${spreadKm.toFixed(1)} kilometers. Regroup.`, 'normal');
  }

  public announceSos(callsign: string) {
    this.speak(`Emergency. Emergency SOS triggered by ${callsign}!`, 'urgent');
  }

  public announceFuel(callsign: string) {
    this.speak(`Fuel warning. ${callsign} needs a fuel stop soon.`, 'normal');
  }

  public announceTurn(instruction: string) {
    this.speak(instruction, 'normal');
  }
}

export const speechService = new SpeechService();
