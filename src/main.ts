// chart.js is manually included in index.html
declare class Chart {
    constructor(a: any, b: any);
    destroy(): void;
}

function addToConsole(txt: string) {
    const ta = document.getElementById("console") as HTMLTextAreaElement;
    if (!ta) return;
    ta.value += txt + "\n";
    ta.scrollTop = ta.scrollHeight;
}

async function waitSeconds(seconds: number) {
    return new Promise(r => setTimeout(r, seconds * 1000));
}

interface LatencyResult {
    average: number;
    messages: number;
}


async function runLatencyTest(numberOfWorkers: number, iterations: number): Promise<LatencyResult> {

    return new Promise(resolve => {

        //addToConsole("RUNNING LATENCY TESTS WITH " + numberOfWorkers + " WORKER(S)")

        const workers: Worker[] = [];

        for (let i = 0; i < numberOfWorkers; i++) {
            const worker = new Worker("dist/workers/latency.js");

            workers.push(worker);

            worker.onmessage = (e) => {
                if (e.data == "PONG") {
                    worker.postMessage("PING");
                    totalMessages++;
                }
            }

            worker.postMessage("PING");
        }

        var time = performance.now();

        const latencies: number[] = [];
        var totalMessages = 0;

        const reportTimer = setInterval(async () => {
            var deltaTime = (performance.now() - time) / 1000;
            time = performance.now();

            const total = totalMessages;
            const totalPerSecond = Math.round(total / deltaTime);
            const totalPerSecondPerWorker = Math.round(totalPerSecond / workers.length);
            const latency = 1 / totalPerSecondPerWorker * 1000;

            latencies.push(latency);

            totalMessages = 0;

            if (latencies.length == iterations + 1) {
                clearInterval(reportTimer);
                latencies.splice(0, 1); // ignore first latency
                const averageLatency = latencies.reduce((p, c) => p + c, 0) / latencies.length;
                addToConsole(`Average latency with ${numberOfWorkers} workers is ${averageLatency}ms, total messages per worker is: ${totalPerSecondPerWorker}`)
                for (var i = 0; i < workers.length; i++) {
                    workers[i]?.terminate();
                }
                await waitSeconds(0.5);
                resolve({ average: averageLatency, messages: totalPerSecondPerWorker });
            }
        }, 1000);
    });
}

interface SameFrameResult {
    messagesInSameFrame: number;
    messagesNotInSameFrame: number;
}

async function runSameFrameCommunicationTest(numberOfWorkers: number, iterations: number): Promise<SameFrameResult> {

    return new Promise(resolve => {

        const workers: Worker[] = [];

        var currentFrame = 0;
        var running = true;
        var totalFrames = 1;
        var frameRate = 0;

        function onNewFrame() {
            if (!running) return;
            currentFrame++;
            frameRate++;
            totalFrames++;
            requestAnimationFrame(onNewFrame);
        }

        requestAnimationFrame(onNewFrame);

        var messagesInSameFrame = 0;
        var messagesNotInSameFrame = 0;

        for (let i = 0; i < numberOfWorkers; i++) {
            const worker = new Worker("dist/workers/same-frame.js");

            workers.push(worker);

            worker.onmessage = (e) => {

                if (e.data.command == "PONG") {
                    if (e.data.frame === currentFrame) {
                        messagesInSameFrame++;
                    } else {
                        messagesNotInSameFrame++;
                    }
                    worker.postMessage({
                        command: "PING",
                        frame: currentFrame,
                    });
                }
            }

            worker.postMessage({
                command: "PING",
                frame: currentFrame
            });
        }

        var time = performance.now();

        var measuresments = 0;
        var frameRates: number[] = [];


        const reportTimer = setInterval(async () => {
            var deltaTime = (performance.now() - time) / 1000;
            time = performance.now();

            measuresments++;

            frameRates.push(frameRate / deltaTime);
            frameRate = 0;

            if (measuresments == iterations + 1) {
                running = false;
                clearInterval(reportTimer);
                frameRates.splice(0, 1);

                messagesInSameFrame = Math.floor(messagesInSameFrame / numberOfWorkers / totalFrames);
                messagesNotInSameFrame = Math.ceil(messagesNotInSameFrame / numberOfWorkers / totalFrames);
                const frameRate = Math.round(frameRates.reduce((p, c) => p + c, 0) / frameRates.length);

                addToConsole(`Average messages in same frame per worker with ${numberOfWorkers} workers is ${messagesInSameFrame}, not in same frame: ${messagesNotInSameFrame}, frame rate: ${frameRate}fps`)
                for (var i = 0; i < workers.length; i++) {
                    workers[i]?.terminate();
                }
                await waitSeconds(0.5);
                resolve({ messagesInSameFrame, messagesNotInSameFrame });
            }
        }, 1000);
    });
}

var chart: Chart | null = null;

async function start() {

    const fromWorkers = Number.parseInt((document.getElementById("fromWorkers") as HTMLInputElement).value);
    const toWorkers = Number.parseInt((document.getElementById("toWorkers") as HTMLInputElement).value);
    const step = Number.parseInt((document.getElementById("stepWorkers") as HTMLInputElement).value);

    addToConsole(`RUNNING TESTS FROM ${fromWorkers} to ${toWorkers} with a step of ${step} [BE PATIENT]`)

    const latencies: LatencyResult[] = [];
    const sameFrameMessages: SameFrameResult[] = [];
    const numberOfWorkers: number[] = [];

    if (!chart)
        chart = drawGraph(numberOfWorkers, latencies, sameFrameMessages);

    for (var i = fromWorkers; i <= toWorkers; i += step) {
        numberOfWorkers.push(i);

        const latency = await runLatencyTest(i, 4);
        latencies.push(latency);

        const sameFrame = await runSameFrameCommunicationTest(i, 4);
        sameFrameMessages.push(sameFrame);

        if (chart) chart.destroy();

        chart = drawGraph(numberOfWorkers, latencies, sameFrameMessages);

        await waitSeconds(0.5);
    }
}

function drawGraph(numberOfWorkers: number[], latencies: LatencyResult[], sameFrameMessages: SameFrameResult[]) {

    const ctx = document.getElementById('myChart') as HTMLCanvasElement;

    const labels = numberOfWorkers;

    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Latency',
                data: latencies.map(x => x.average),
                yAxisID: 'y'
            },
            {
                label: 'Same Frame Messages',
                data: sameFrameMessages.map(x => x.messagesInSameFrame),
                yAxisID: 'y1'
            },
            {
                label: 'Not Same Frame Messages',
                data: sameFrameMessages.map(x => x.messagesNotInSameFrame),
                yAxisID: 'y1'
            }
        ]
    };

    const chartConfiguration = {
        type: 'line',
        data: data,
        options: {
            animation: false,
            responsive: true,
            aspectRatio: window.innerHeight > window.innerWidth ? 1 : 3,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Webworkers communication latency in milliseconds vs number of web workers'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',

                    // grid line settings
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                    },
                },
            }
        },
    };


    return new Chart(ctx, chartConfiguration);
}

(document.getElementById("start") as HTMLButtonElement).addEventListener("click", () => start());

(document.getElementById("device") as HTMLTextAreaElement).value = navigator.userAgent;
