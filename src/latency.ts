onmessage = (e) => {
    if (e.data === "PING") {
        postMessage("PONG");
    }
}