

function addToConsole(txt) {
    const ta = document.getElementById("console");
    ta.value += txt + "\n";
    ta.scrollTop = ta.scrollHeight;
}

async function waitSeconds(seconds) {
    return new Promise(r => setTimeout(r, seconds * 1000));
}

async function runLatencyTest(numberOfWorkers, iterations) {

    return new Promise(resolve => {

        //addToConsole("RUNNING LATENCY TESTS WITH " + numberOfWorkers + " WORKER(S)")

        const workers = [];

        for (let i = 0; i < numberOfWorkers; i++) {
            const worker = new Worker("latency.js");

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

        const latencies = [];
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
                    workers[i].terminate();
                }
                await waitSeconds(0.5);
                resolve({ average: averageLatency, messages: totalPerSecondPerWorker} );
            }
        }, 1000);
    });
}

async function start() {

    const fromWorkers = Number.parseInt(document.getElementById("fromWorkers").value);
    const toWorkers = Number.parseInt(document.getElementById("toWorkers").value);
    const step = Number.parseInt(document.getElementById("stepWorkers").value);

    addToConsole(`RUNNING TESTS FROM ${fromWorkers} to ${toWorkers} with a step of ${step} [BE PATIENT]`)

    const latencies = [];
    const numberOfWorkers = [];
    var chart = drawGraph(latencies, numberOfWorkers);

    for (var i = fromWorkers; i <= toWorkers; i += step) {
        const average = await runLatencyTest(i, 4);

        numberOfWorkers.push(i);
        latencies.push(average);

        if (chart) chart.destroy();

        chart = drawGraph(latencies, numberOfWorkers);

        await waitSeconds(0.5);
    }
}

function drawGraph(latencies, numberOfWorkers) {

    const ctx = document.getElementById('myChart');

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
                label: 'Single Worker Messages',
                data: latencies.map(x => x.messages),
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
            stacked: false,
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

document.getElementById("start").addEventListener("click", () => start());
