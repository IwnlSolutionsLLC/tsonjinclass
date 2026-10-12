/* Receives transferred, downsampled mono excerpts only; never fetches or decodes. */
'use strict';
importScripts('music-analysis.js');
self.onmessage = function (event) {
  var message = event.data || {};
  if (message.type !== 'analyze') return;
  var result = null;
  try { result = self.C122.MusicAnalysis.analyzeCompact(message.payload); }
  catch (error) { /* Analysis is optional: playback falls back to an equal-power fade. */ }
  self.postMessage({ id: message.id, result: result });
};
self.postMessage({ type: 'ready' });
