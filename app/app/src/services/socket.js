const WS_URL = "ws://localhost:8000/ws/status";

class SocketService {
  constructor() {
    this.socket = null;
    this.callbacks = [];
  }

  connect() {
    if (this.socket) return; // prevent duplicate connections
    this.socket = new WebSocket(WS_URL);

    this.socket.onmessage = (event) => {
     const data = JSON.parse(event.data);
     console.log("WS DATA:", data); // temporary log
     this.callbacks.forEach((cb) => cb(data));
};

    this.socket.onerror = (err) => console.error("WebSocket error:", err);

    this.socket.onclose = () => {
      console.log("WebSocket closed, reconnecting...");
      this.socket = null; // reset so reconnect works
      setTimeout(() => this.connect(), 2000);
    };
  }

  subscribe(callback) {
    this.callbacks.push(callback);
  }

  // NEW
  unsubscribe(callback) {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }
}

export const socketService = new SocketService();