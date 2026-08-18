import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

type SRecognition = any;
type SSynth = any;

const SRecognitionCtor: (new () => SRecognition) | null =
  (typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

function pickMandarin(): string {
  if (!('speechSynthesis' in window)) return 'zh-CN';
  const all = window.speechSynthesis.getVoices?.() || [];
  const zh = all.find((v) => v.lang?.toLowerCase().startsWith('zh'));
  return zh?.lang || 'zh-CN';
}

export function useSpeech() {
  const recogRef = useRef<SRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const partialRef = useRef<string>('');
  const finalCbRef = useRef<((t: string) => void) | null>(null);
  const onChangeRef = useRef<((t: string, isFinal: boolean) => void) | null>(null);

  useEffect(() => {
    setSupported(!!SRecognitionCtor);
  }, []);

  function start(opts?: {
    onFinal?: (text: string) => void;
    onChange?: (t: string, isFinal: boolean) => void;
  }) {
    if (!SRecognitionCtor) return;
    stop();
    finalCbRef.current = opts?.onFinal || null;
    onChangeRef.current = opts?.onChange || null;
    partialRef.current = '';
    const r = new SRecognitionCtor();
    r.lang = 'zh-CN';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      let part = '';
      let finalT = '';
      for (let i = 0; i < e.results.length; i++) {
        const rr = e.results[i];
        const t = rr?.[0]?.transcript || '';
        if (rr.isFinal) finalT += t;
        else part += t;
      }
      if (finalT) {
        partialRef.current = finalT;
        onChangeRef.current?.(finalT, true);
        finalCbRef.current?.(finalT);
      } else {
        partialRef.current = part;
        onChangeRef.current?.(part, false);
      }
    };
    r.onend = () => {
      setListening(false);
      const t = partialRef.current;
      if (t) {
        finalCbRef.current?.(t);
      }
      recogRef.current = null;
    };
    r.onerror = () => {
      setListening(false);
      recogRef.current = null;
    };
    try {
      r.start();
      recogRef.current = r;
      setListening(true);
    } catch {
      /* noop */
    }
  }

  function stop() {
    if (recogRef.current) {
      try { recogRef.current.stop(); } catch {}
      recogRef.current = null;
    }
    setListening(false);
  }

  function speak(text: string) {
    if (!synth || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = pickMandarin();
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }

  function stopSpeak() {
    synth?.cancel();
    setSpeaking(false);
  }

  return { supported, listening, speaking, start, stop, speak, stopSpeak };
}

export default useSpeech;
