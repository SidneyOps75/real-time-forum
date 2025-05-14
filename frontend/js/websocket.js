const socket = new WebSocket('ws://localhost:8080/ws');

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Handle incoming WebSocket messages
};

export function sendMessage(message) {
    socket.send(JSON.stringify(message));
}