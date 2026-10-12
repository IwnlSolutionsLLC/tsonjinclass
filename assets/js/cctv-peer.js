/* Live WebRTC only: no recording, media storage, or camera permissions here. */
(function () {
  'use strict';
  function create(options) {
    options = options || {};
    var pc = new RTCPeerConnection({ iceServers: options.iceServers || [] });
    var closed = false, pendingIce = [], operations = Promise.resolve(), restartPending = false, nativeTrackEvents = 'ontrack' in pc;
    function enqueue(task) {
      var result = operations.then(function () { if (!closed) return task(); });
      operations = result.catch(function () {});
      return result;
    }
    function emit(type, data) {
      if (closed || !options.onSignal) return Promise.resolve();
      return Promise.resolve(options.onSignal(type, data));
    }
    function description(value, type) {
      if (!value || value.type !== type || typeof value.sdp !== 'string' || !value.sdp || value.sdp.length > 180000) {
        throw new Error('Дүрсний холболтын мэдээлэл буруу байна.');
      }
      return { type: type, sdp: value.sdp };
    }
    function preferVideoCodecs() {
      if (!Array.isArray(options.preferredVideoCodecs) || !options.preferredVideoCodecs.length || !pc.getTransceivers) return;
      try {
        var provider = window.RTCRtpReceiver || window.RTCRtpSender;
        var capabilities = provider && provider.getCapabilities && provider.getCapabilities('video');
        if (!capabilities || !Array.isArray(capabilities.codecs)) return;
        var preferred = options.preferredVideoCodecs.map(function (name) { return String(name).toLowerCase(); });
        function rank(codec) {
          var mime = String(codec.mimeType || '').toLowerCase(), index = preferred.indexOf(mime);
          if (index < 0) return preferred.length * 10;
          // Prefer the interoperable H.264 baseline profiles on older classroom displays.
          return index * 10 + (mime === 'video/h264' && !/profile-level-id=42/i.test(codec.sdpFmtpLine || '') ? 1 : 0);
        }
        var codecs = capabilities.codecs.map(function (codec, index) { return { codec: codec, index: index }; });
        codecs.sort(function (a, b) { return rank(a.codec) - rank(b.codec) || a.index - b.index; });
        pc.getTransceivers().forEach(function (transceiver) {
          var track = transceiver.receiver && transceiver.receiver.track || transceiver.sender && transceiver.sender.track;
          if (!track || track.kind !== 'video' || !transceiver.setCodecPreferences) return;
          try { transceiver.setCodecPreferences(codecs.map(function (item) { return item.codec; })); } catch (_) {}
        });
      } catch (_) {}
    }
    function tuneReceiver(receiver) {
      if (!options.lowLatency || !receiver) return;
      // These are hints; the browser still handles packet loss and A/V synchronization.
      try { if ('jitterBufferTarget' in receiver) receiver.jitterBufferTarget = 0; } catch (_) {}
      try { if ('playoutDelayHint' in receiver) receiver.playoutDelayHint = 0; } catch (_) {}
    }
    async function flushIce() {
      var queued = pendingIce.splice(0);
      for (var i = 0; i < queued.length; i++) {
        if (closed) return;
        await pc.addIceCandidate(queued[i]);
      }
    }
    pc.onicecandidate = function (event) {
      var value = event.candidate && (event.candidate.toJSON ? event.candidate.toJSON() : {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex
      });
      emit('candidate', value || null).catch(function (error) {
        if (!closed && options.onError) options.onError(error);
      });
    };
    pc.ontrack = function (event) { if (!closed) { tuneReceiver(event.receiver); if (options.onTrack) options.onTrack(event); } };
    if (!nativeTrackEvents && 'onaddstream' in pc) pc.onaddstream = function (event) {
      if (closed || !options.onTrack || !event.stream || !event.stream.getTracks) return;
      // Older board browsers can deliver a stream through the legacy event.
      event.stream.getTracks().forEach(function (track) { options.onTrack({ track: track, streams: [event.stream], receiver: null }); });
    };
    function stateChanged() {
      if (closed || !options.onState) return;
      var connection = pc.connectionState, ice = pc.iceConnectionState;
      var state = connection === 'failed' || ice === 'failed' ? 'failed' :
        connection === 'disconnected' || ice === 'disconnected' ? 'disconnected' :
        connection === 'connected' || ice === 'connected' || ice === 'completed' ? 'connected' : connection || ice;
      options.onState(state);
    }
    pc.onconnectionstatechange = stateChanged;
    pc.oniceconnectionstatechange = stateChanged;
    if (options.stream) options.stream.getTracks().forEach(function (track) { pc.addTrack(track, options.stream); });
    async function makeOffer(restart) {
      if (closed) return;
      if (pc.signalingState && pc.signalingState !== 'stable') { if (restart) restartPending = true; return; }
      preferVideoCodecs();
      var offer = await pc.createOffer(restart ? { iceRestart: true } : undefined);
      if (closed) return;
      await pc.setLocalDescription(offer);
      if (!closed) await emit('offer', { type: 'offer', sdp: pc.localDescription.sdp });
    }
    return {
      connection: pc,
      offer: function () {
        return enqueue(function () { return makeOffer(false); });
      },
      restartOffer: function () {
        return enqueue(function () { return makeOffer(true); });
      },
      acceptOffer: function (value) {
        return enqueue(async function () {
          await pc.setRemoteDescription(description(value, 'offer'));
          if (closed) return;
          preferVideoCodecs();
          await flushIce();
          var answer = await pc.createAnswer();
          if (closed) return;
          await pc.setLocalDescription(answer);
          if (!closed) await emit('answer', { type: 'answer', sdp: pc.localDescription.sdp });
        });
      },
      acceptAnswer: function (value) {
        return enqueue(async function () {
          await pc.setRemoteDescription(description(value, 'answer'));
          if (!closed) await flushIce();
          if (!closed && restartPending) { restartPending = false; await makeOffer(true); }
        });
      },
      addCandidate: function (value) {
        return enqueue(async function () {
          if (value !== null && (!value || typeof value.candidate !== 'string' || value.candidate.length > 5000)) {
            throw new Error('Дүрсний сүлжээний мэдээлэл буруу байна.');
          }
          if (!pc.remoteDescription) { pendingIce.push(value); return; }
          await pc.addIceCandidate(value);
        });
      },
      updateIceServers: function (iceServers) {
        if (!closed && Array.isArray(iceServers)) pc.setConfiguration({ iceServers: iceServers });
      },
      close: function () {
        if (closed) return;
        closed = true;
        restartPending = false;
        pendingIce.length = 0;
        pc.onicecandidate = pc.ontrack = pc.onconnectionstatechange = pc.oniceconnectionstatechange = null;
        if ('onaddstream' in pc) pc.onaddstream = null;
        pc.close();
      }
    };
  }
  window.C122CCTVPeer = { create: create };
})();
