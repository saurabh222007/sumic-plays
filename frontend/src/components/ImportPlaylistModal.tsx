import { useState } from 'react';
import { API_URL } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Music2, ChevronDown, ChevronUp } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import type { Track } from '../store/usePlayerStore';

interface ImportResult {
  playlistName: string;
  provider: 'spotify' | 'youtube';
  totalFound: number;
  matched: Track[];
  notFound: string[];
}

type ImportStep = 'input' | 'importing' | 'success' | 'error';

interface ImportPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistCreated?: (playlistId: string) => void;
}

export function ImportPlaylistModal({ isOpen, onClose, onPlaylistCreated }: ImportPlaylistModalProps) {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<ImportStep>('input');
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showMissing, setShowMissing] = useState(false);
  const [createdPlaylistId, setCreatedPlaylistId] = useState<string | null>(null);

  const { createPlaylist } = useLibraryStore();

  const detectProviderLabel = (input: string): string | null => {
    if (/open\.spotify\.com\/playlist\//i.test(input)) return 'Spotify';
    if (/(youtube\.com|music\.youtube\.com)\/(playlist|watch)|youtu\.be\/.*list=/i.test(input) && /[?&]list=/i.test(input)) return 'YouTube';
    return null;
  };

  const providerLabel = detectProviderLabel(url);

  const handleImport = async () => {
    if (!url.trim()) return;

    setStep('importing');
    setProgress('Detecting playlist provider...');
    setErrorMsg('');
    setResult(null);

    try {
      setProgress('Fetching playlist tracks...');

      const response = await fetch(`${API_URL}/api/music/import-playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setProgress('Creating playlist...');
      const importResult = data as ImportResult;
      setResult(importResult);

      const newPlaylistId = createPlaylist(importResult.playlistName, importResult.matched);
      setCreatedPlaylistId(newPlaylistId);
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import playlist. Please try again.');
      setStep('error');
    }
  };

  const handleReset = () => {
    setUrl('');
    setStep('input');
    setProgress('');
    setResult(null);
    setErrorMsg('');
    setShowMissing(false);
    setCreatedPlaylistId(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleOpenPlaylist = () => {
    if (createdPlaylistId && onPlaylistCreated) {
      onPlaylistCreated(createdPlaylistId);
    }
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-lg bg-[#0F0F16] border border-glass-border rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Download size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-text-primary">Import Playlist</h2>
                    <p className="text-[11px] text-text-muted">Spotify &amp; YouTube supported</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5">
                <AnimatePresence mode="wait">
                  {/* ─── INPUT STEP ─── */}
                  {step === 'input' && (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <p className="text-sm text-text-secondary mb-4">
                        Paste a Spotify or YouTube playlist link below to import all tracks into Sumic.
                      </p>

                      {/* URL Input */}
                      <div className="relative mb-4">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://open.spotify.com/playlist/... or YouTube playlist URL"
                          className="w-full bg-surface-light border border-glass-border rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all field-focus pr-24"
                          onKeyDown={(e) => e.key === 'Enter' && url.trim() && handleImport()}
                          autoFocus
                        />
                        {providerLabel && (
                          <div className={`absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            providerLabel === 'Spotify'
                              ? 'bg-[#1DB954]/15 text-[#1DB954]'
                              : 'bg-red-500/15 text-red-400'
                          }`}>
                            {providerLabel}
                          </div>
                        )}
                      </div>

                      {/* Provider hints */}
                      <div className="flex gap-2 mb-5">
                        <div className="flex-1 p-3 rounded-xl bg-surface/50 border border-glass-border">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded-full bg-[#1DB954] flex items-center justify-center">
                              <Music2 size={9} className="text-black" />
                            </div>
                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Spotify</span>
                          </div>
                          <p className="text-[10px] text-text-muted leading-relaxed">Public playlists only. No login needed.</p>
                        </div>
                        <div className="flex-1 p-3 rounded-xl bg-surface/50 border border-glass-border">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                              <Music2 size={9} className="text-white" />
                            </div>
                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">YouTube</span>
                          </div>
                          <p className="text-[10px] text-text-muted leading-relaxed">Public playlists. Direct video import.</p>
                        </div>
                      </div>

                      {/* Import Button */}
                      <button
                        onClick={handleImport}
                        disabled={!url.trim() || !providerLabel}
                        className="w-full bg-primary hover:bg-primary-light disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all btn-interactive cursor-pointer text-sm"
                      >
                        <Download size={16} />
                        Import Playlist
                      </button>

                      {url.trim() && !providerLabel && (
                        <p className="text-[11px] text-red-400 mt-2 text-center">
                          Please enter a valid Spotify or YouTube playlist URL
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* ─── IMPORTING STEP ─── */}
                  {step === 'importing' && (
                    <motion.div
                      key="importing"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center py-8"
                    >
                      <div className="relative mb-6">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Loader2 size={28} className="text-primary animate-spin" />
                        </div>
                        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                      </div>
                      <p className="text-lg font-bold text-text-primary mb-2">Importing...</p>
                      <p className="text-xs text-text-muted animate-pulse">{progress}</p>
                    </motion.div>
                  )}

                  {/* ─── SUCCESS STEP ─── */}
                  {step === 'success' && result && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {/* Success icon */}
                      <div className="flex flex-col items-center mb-6">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                          className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mb-4"
                        >
                          <CheckCircle2 size={32} className="text-accent" />
                        </motion.div>
                        <h3 className="text-xl font-extrabold text-text-primary">Playlist Imported!</h3>
                        <p className="text-xs text-text-muted mt-1">{result.playlistName}</p>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-3 gap-2 mb-5">
                        <div className="bg-surface-light rounded-xl p-3 text-center border border-glass-border">
                          <p className="text-2xl font-black text-text-primary">{result.totalFound}</p>
                          <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5">Found</p>
                        </div>
                        <div className="bg-accent/10 rounded-xl p-3 text-center border border-accent/20">
                          <p className="text-2xl font-black text-accent">{result.matched.length}</p>
                          <p className="text-[9px] text-accent/70 font-bold uppercase tracking-wider mt-0.5">Added</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center border ${
                          result.notFound.length > 0
                            ? 'bg-red-500/10 border-red-500/20'
                            : 'bg-surface-light border-glass-border'
                        }`}>
                          <p className={`text-2xl font-black ${result.notFound.length > 0 ? 'text-red-400' : 'text-text-muted'}`}>
                            {result.notFound.length}
                          </p>
                          <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                            result.notFound.length > 0 ? 'text-red-400/70' : 'text-text-muted'
                          }`}>Not Found</p>
                        </div>
                      </div>

                      {/* Missing songs expandable */}
                      {result.notFound.length > 0 && (
                        <div className="mb-5">
                          <button
                            onClick={() => setShowMissing(!showMissing)}
                            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-light border border-glass-border text-sm cursor-pointer hover:bg-surface-hover transition-colors"
                          >
                            <span className="flex items-center gap-2 text-text-secondary">
                              <AlertTriangle size={14} className="text-amber-400" />
                              <span className="font-semibold">{result.notFound.length} songs could not be found</span>
                            </span>
                            {showMissing ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                          </button>

                          <AnimatePresence>
                            {showMissing && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-surface/50 border border-glass-border p-2">
                                  {result.notFound.map((name, idx) => (
                                    <div key={idx} className="px-3 py-1.5 text-xs text-text-muted truncate">
                                      {idx + 1}. {name}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleOpenPlaylist}
                          className="flex-1 bg-primary hover:bg-primary-light text-black font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 transition-all btn-interactive cursor-pointer text-sm"
                        >
                          <ExternalLink size={14} />
                          Open Playlist
                        </button>
                        <button
                          onClick={handleReset}
                          className="px-5 py-3 rounded-xl bg-surface-light border border-glass-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all font-bold text-sm cursor-pointer"
                        >
                          Import Another
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── ERROR STEP ─── */}
                  {step === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center py-6"
                    >
                      <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
                        <AlertTriangle size={24} className="text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-text-primary mb-2">Import Failed</h3>
                      <p className="text-xs text-text-muted text-center max-w-sm mb-5 leading-relaxed">{errorMsg}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReset}
                          className="px-6 py-2.5 bg-primary hover:bg-primary-light text-black font-bold rounded-xl transition-all cursor-pointer text-sm"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={handleClose}
                          className="px-6 py-2.5 bg-surface-light border border-glass-border text-text-secondary hover:text-text-primary rounded-xl transition-all font-bold cursor-pointer text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
