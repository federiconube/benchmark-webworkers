onmessage = (e) => {
    if (e.data.command == "PING") {
        postMessage({
            command: "PONG",
            frame: e.data.frame
        });
    }
}