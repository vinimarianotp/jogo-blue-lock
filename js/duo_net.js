// ============================================================================
// MODO DUPLA — CONEXÃO ONLINE (DuoNet)
// Quem cria a sala ganha um código de 5 letras; o amigo digita o código e os dois
// aparelhos se ligam direto (WebRTC, pela biblioteca PeerJS em js/vendor). O
// servidor público do PeerJS só apresenta um aparelho ao outro: a partida em si
// vai direto de um para o outro. Quem criou a sala ("host") roda a partida; quem
// entrou ("guest") manda os comandos e desenha o que chega.
// ============================================================================
(function () {
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const PREFIX = 'bl-egoist-duo-';
  // Servidores públicos que ajudam os dois aparelhos a se acharem pela internet
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];

  const DuoNet = {
    peer: null,
    conn: null,
    role: null, // 'host' | 'guest'
    code: null,
    handlers: {},
    pingMs: null,

    randomCode() {
      let s = '';
      for (let i = 0; i < 5; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
      return s;
    },
    cleanCode(text) {
      return String(text || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5);
    },

    on(type, fn) {
      this.handlers[type] = fn;
    },
    emit(type, ...args) {
      try {
        this.handlers[type]?.(...args);
      } catch (e) {
        console.error(e);
      }
    },

    available() {
      return typeof window.Peer === 'function';
    },

    makePeer(id) {
      return new window.Peer(id, { config: { iceServers: ICE }, debug: 0 });
    },

    // Cria a sala: tenta códigos até o servidor aceitar um livre
    host(tries = 0) {
      this.close();
      this.role = 'host';
      const code = this.randomCode();
      const peer = this.makePeer(PREFIX + code.toLowerCase());
      this.peer = peer;
      peer.on('open', () => {
        this.code = code;
        this.emit('status', 'waiting', code);
      });
      peer.on('connection', (conn) => {
        // Sala de dois: um terceiro é recusado
        if (this.conn && this.conn.open) {
          conn.on('open', () => {
            conn.send({ t: 'full' });
            setTimeout(() => conn.close(), 300);
          });
          return;
        }
        this.bind(conn);
      });
      peer.on('error', (err) => {
        if (err?.type === 'unavailable-id' && tries < 5) {
          this.host(tries + 1);
          return;
        }
        this.emit('error', this.describeError(err));
      });
      peer.on('disconnected', () => {
        // perdeu o servidor de apresentação: a partida continua, mas reconecta para aceitar o amigo
        if (!this.conn?.open && !peer.destroyed) peer.reconnect();
      });
    },

    // Entra na sala do amigo
    join(codeText) {
      const code = this.cleanCode(codeText);
      if (code.length !== 5) {
        this.emit('error', 'O código da sala tem 5 letras/números.');
        return;
      }
      this.close();
      this.role = 'guest';
      this.code = code;
      const peer = this.makePeer();
      this.peer = peer;
      peer.on('open', () => {
        this.emit('status', 'connecting', code);
        const conn = peer.connect(PREFIX + code.toLowerCase(), { reliable: true, serialization: 'json' });
        this.bind(conn);
        // Sem resposta em 15 s: provavelmente a sala não existe mais
        clearTimeout(this.joinTimer);
        this.joinTimer = setTimeout(() => {
          if (!this.conn?.open) this.emit('error', 'Não achei essa sala. Confira o código e se o seu amigo ainda está com ela aberta.');
        }, 15000);
      });
      peer.on('error', (err) => this.emit('error', this.describeError(err)));
    },

    bind(conn) {
      this.conn = conn;
      conn.on('open', () => {
        clearTimeout(this.joinTimer);
        this.emit('status', 'connected', this.code);
        this.startPing();
      });
      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.t === 'ping') {
          conn.send({ t: 'pong', at: msg.at });
          return;
        }
        if (msg.t === 'pong') {
          this.pingMs = Math.round(performance.now() - msg.at);
          this.lastPong = performance.now();
          this.emit('ping', this.pingMs);
          return;
        }
        if (msg.t === 'full') {
          this.emit('error', 'Essa sala já está cheia (só cabem 2).');
          return;
        }
        this.emit('message', msg);
      });
      conn.on('close', () => this.lost());
      conn.on('error', () => this.lost());
    },

    lost() {
      if (!this.conn) return;
      this.conn = null;
      clearInterval(this.pingTimer);
      this.emit('status', 'lost', this.code);
      // quem criou a sala continua esperando o amigo voltar
      if (this.role === 'host' && this.peer && !this.peer.destroyed) this.emit('status', 'waiting', this.code);
    },

    startPing() {
      clearInterval(this.pingTimer);
      this.lastPong = performance.now();
      this.pingTimer = setInterval(() => {
        if (!this.conn?.open) return;
        this.conn.send({ t: 'ping', at: performance.now() });
        // 8 s sem resposta: a conexão caiu (o celular bloqueou a tela, a internet caiu...)
        if (performance.now() - this.lastPong > 8000) {
          try {
            this.conn.close();
          } catch (e) {}
          this.lost();
        }
      }, 1000);
    },

    connected() {
      return !!this.conn?.open;
    },

    send(msg) {
      if (!this.conn?.open) return false;
      try {
        this.conn.send(msg);
        return true;
      } catch (e) {
        return false;
      }
    },

    close() {
      clearInterval(this.pingTimer);
      clearTimeout(this.joinTimer);
      const c = this.conn;
      this.conn = null;
      try {
        c?.close();
      } catch (e) {}
      try {
        this.peer?.destroy();
      } catch (e) {}
      this.peer = null;
      this.code = null;
      this.pingMs = null;
    },

    describeError(err) {
      const type = err?.type || '';
      if (type === 'peer-unavailable') return 'Não achei essa sala. Confira o código e se o seu amigo ainda está com ela aberta.';
      if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') return 'Sem conexão com o servidor de salas. Confira a internet e tente de novo.';
      if (type === 'browser-incompatible') return 'Este navegador não suporta o Modo Dupla online. Tente o Chrome atualizado.';
      if (type === 'webrtc') return 'Os dois aparelhos não conseguiram se ligar (algumas redes de celular bloqueiam). Tente os dois no Wi-Fi.';
      return 'A conexão falhou (' + (type || 'erro') + '). Tente de novo.';
    }
  };

  window.DuoNet = DuoNet;
})();
