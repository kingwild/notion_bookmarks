'use client';
import { useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { OwnerCapture } from './OwnerTools';

export default function CaptureDialog({ aiReady, onSaved, openSignal }: { aiReady: boolean; onSaved: () => void; openSignal: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (openSignal > 0) dialog.current?.showModal(); }, [openSignal]);
  return <><button className="ws-capture-fab" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog"><Sparkles size={19} /><span>随手记</span></button><dialog ref={dialog} className="ws-dialog ws-capture-dialog" aria-label="我的随手记"><button className="ws-dialog-close" aria-label="关闭随手记" onClick={() => dialog.current?.close()}><X size={18} /></button><OwnerCapture aiReady={aiReady} onSaved={onSaved} /></dialog></>;
}
