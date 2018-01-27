/* global Highcharts, archive_start */

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
Highcharts.setOptions({
    colors: ["rgb(54, 136, 218)", "rgb(236, 54, 71)", "rgb(241, 217, 59)", "rgb(50, 183, 171)"],
    chart: {
        backgroundColor: "transparent",
        spacingBottom: 0,
        spacingTop: 0,
        spacingLeft: 0,
        spacingRight: 0,
        style: {
            fontFamily: '"Open Sans", Helvetica, sans-serif'
        },
    },
    credits: {
        enabled: false
    },
    legend: {
        enabled: false
    }
});

const roll = function roll(array, roller, end) {
    let index = 0;
    const next = () => {
        index++;
        if (index < array.length) {
            roller(array[index], index, () => next());
        } else {
            if (end) end();
        }
    };
    if (array.length === 0) return end();
    roller(array[index], index, next);
};

// const cdn = "https://cdn.skildust.com/abt/public";
const cdn = "/cdn";

class CSV {
    /**
     * Encode an array table of data into CVS format
     * @param {{ [key: string]: number | string }[]} data 
     */
    static encode(data) {
        const keys = [];
        data.forEach(row => {
            Object.keys(row).forEach(key => {
                if (!keys.includes(key))
                    keys.push(key);
            });
        });

        let csv = "";
        // add keys
        csv += keys.map(key => `"${key}"`).join(",") + "\n";
        // add values
        let d = new Array(keys.length);
        data.forEach((row, index) => {
            d = d.fill("-");

            Object.keys(row).forEach(key => {
                d[keys.indexOf(key)] = row[key];
            });

            csv += d.map(key => {
                return `"${key}"`;
            }).join(",") + "\n";
        });

        return csv;
    }

    /**
     * Decode a string of CSV encoded data
     * @param {string} text 
     */
    static decode(text) {
        const keys = [];
        const data = [];
        let row = {};
        let inString = false;
        let firstRow = true;
        let value = "";
        let index = 0;

        let char = "";
        for (let i = 0; i < text.length; i++) {
            char = text.charAt(i);
            switch (char) {
            case "\"":
                // if in string    
                inString = !inString;
                break;
            case ",":
            case "\n":
                if (!inString) {
                    // first row should always be string
                    if (!firstRow) {
                        const initial = value;
                        // checking if only includes numbers
                        // also checking if number not too big. If too big, important unique identifiers like numberic IDs 
                        // will be crushed, which we don't want
                        // a number with 10 digits can already be a int64 number, so I'm limiting to 9 digits max for a int32 number
                        if (!/[^0-9.]/g.test(value) && value.replace(/\ /g, "").length < 10) {
                            try {
                                if (value.indexOf(".") > -1) {
                                    value = parseFloat(value);
                                } else {
                                    value = parseInt(value);
                                }
                            } catch (err) {
                                value = initial;
                            }
                            if (Number.isNaN(value)) value = initial;
                        }
                    }

                    if (firstRow) {
                        keys.push(value);
                    } else {
                        row[keys[index]] = value;
                    }

                    value = "";
                    if (char === "\n") {
                        index = 0;
                        if (!firstRow) {
                            data.push(row);
                            row = {};
                        } else firstRow = false;
                    } else if (char === ",") {
                        index++;
                    }
                }
                break;
            default:
                value += char;
                break;
            }
        }

        return data;
    }
}

class Downloader {
    /**
     * @param {string} url 
     * @param {function} progress 
     * @param {function} done 
     * @param {function} error 
     */
    static loadFrag(url, progress, done, error) {
        const req = new XMLHttpRequest();
        req.onprogress = progress;
        req.open("GET", url, true);
        req.onreadystatechange = function (event) {
            if (req.readyState == 4) {
                if (req.status >= 200 && req.status < 400) done(req.responseText);
                // if 404 no data was recorded for that date, just continue    
                else if (req.status === 404 || req.status === 403) done();
                else error(req.status);
            }
        };
        req.send();
    }

    /**
     * @param {Date[]} dates 
     * @param {"full"|"small"} type 
     */
    static load(array, type) {
        const promise = new Promise((resolve, reject) => {
            let data = [];
            let dates = [];
            let monthstmp = [];
            let months = [];
            let years = [];

            let inMonth;
            for (let date of array) {
                if (`${date.getFullYear()}-${date.getMonth()}` !== inMonth || date.getDate() === 1) {
                    inMonth = `${date.getFullYear()}-${date.getMonth()}`;
                } else if (`${date.getFullYear()}-${date.getMonth()}` === inMonth) {
                    inMonth = `${date.getFullYear()}-${date.getMonth()}`;
                } else {
                    inMonth = null;
                }
                if (inMonth && date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) {
                    monthstmp.push(inMonth);
                }
            }

            for (let date of array) {
                if (!monthstmp.includes(`${date.getFullYear()}-${date.getMonth()}`)) {
                    dates.push(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
                }
            }

            monthstmp = monthstmp.map(a => {
                const s = a.split("-");
                return s.map(b => parseInt(b));
            });

            let inYear;
            for (let month of monthstmp) {
                if (month[0] !== inYear || month[1] === 0) {
                    inYear = month[0];
                } else if (month[0] === inYear) {
                    inYear = month[0];
                } else {
                    inYear = null;
                }
                if (inYear && month[1] === 11) {
                    years.push(inYear);
                }
            }

            for (let month of monthstmp) {
                if (!years.includes(month[0])) {
                    months.push(`${month[0]}-${month[1] + 1}`);
                }
            }
            
            let i = 0;
            roll(dates, (date, index, next) => {
                this.loadFrag(`${cdn}/${type}/date/${date}.csv`,
                    progress => {
                        if (promise.onprogress && progress.lengthComputable)
                            promise.onprogress((i / array.length) + ((progress.loaded / progress.total) / array.length));
                    },
                    text => {
                        if (!text) text = `Timestamp,Value\n${date},0`;
                        data = data.concat(CSV.decode(text));
                        i++;
                        next();
                    },
                    err => reject(err));
            }, () => {
                roll(months, (month, index, next) => {
                    this.loadFrag(`${cdn}/${type}/month/${month}.csv`,
                        progress => {
                            if (promise.onprogress && progress.lengthComputable)
                                promise.onprogress((i / array.length) + ((progress.loaded / progress.total) / (array.length / 30)));
                        },
                        text => {
                            if (text) data = data.concat(CSV.decode(text));
                            i+= 30;
                            next();
                        },
                        err => reject(err));
                }, () => {
                    roll(years, (year, index, next) => {
                        this.loadFrag(`${cdn}/${type}/year/${year}.csv`,
                            progress => {
                                if (promise.onprogress && progress.lengthComputable)
                                    promise.onprogress((i / array.length) + ((progress.loaded / progress.total) / (array.length / 365)));
                            },
                            text => {
                                if (text) data = data.concat(CSV.decode(text));
                                i+=365;
                                next();
                            },
                            err => reject(err));
                    }, () => {
                        data = data.sort((a, b) => {
                            return new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime();
                        });
                        resolve(data);
                    });
                });
            });
        });
        return promise;
    }

    /**
     * Download data as CSV
     * @param {{ [key: string]: string|number}[]} data 
     * @param {string} start 
     * @param {string} end 
     */
    static download(data, start, end) {
        const csv = CSV.encode(data);

        // download
        const filename = `altbronyrt_${start}_${end}.csv`;

        const element = Downloader.element;
        const blob = new Blob([csv], { type: "text/plain;charset=utf-8" });
        const url = window.URL.createObjectURL(blob, { oneTimeOnly: true });
        element.setAttribute("href", url);
        element.setAttribute("download", filename);

        element.click();

        // window.URL.revokeObjectURL(url);
    }
}
Downloader.element = document.createElement("a");
Downloader.element.style.display = "none";
document.body.appendChild(Downloader.element);

const offset = new Date().getTimezoneOffset() * 60 * 1000;

class Graph {
    /**
     * Graph
     * @param {string|HTMLElement} element 
     * @param {{start: number|string, end: number|string}} range
     * @param {string} title
     */
    constructor(element, range) {
        if (typeof element === "string") {
            element = document.querySelector(element);
        }
        if (!element) throw new Error("Not found Element");
        this.element = element;
        this.data = [];

        this.chart = Highcharts.chart(element, {
            chart: {
                // marginLeft: 40, // Keep all charts left aligned
                // spacingTop: 20,
                // spacingBottom: 20
                spacingTop: 0,
                spacingBottom: 20
            },
            tooltip: {
                pointFormat: "<b>{point.y:,.0f} Tweets</b>",
                backgroundColor: "rgb(239, 243, 247)",
                shadow: false
            },
            title: {
                text: "",
                align: "left",
                style: {
                    display: "none",
                    fontSize: "30pt",
                    fontWeight: "bold"
                },
                x: 0,
                y: 30
            },
            xAxis: {
                categories: [],
                crosshair: true
            },
            yAxis: {
                title: {
                    text: null
                },
                labels: {
                    x: -10,
                    y: 0
                },
                crosshair: true,
                // visible: false
            },
            series: [{
                type: "column",
                name: "Tweets",
                data: [],
                pointPadding: 0,
                groupPadding: 0,
                borderWidth: 1,
                borderRadius: 3,
                shadow: false
            }]
        });

        const progress = document.createElement("div");
        progress.className = "progress-inner";
        const progressOuter = document.createElement("div");
        progressOuter.className = "progress-outer";
        progressOuter.appendChild(progress);
        element.appendChild(progressOuter);

        this.progress = progress;
        this.progressOuter = progressOuter;

        this.range(range);
    }

    /**
     * @param {{start: number|string|Date, end: number|string|Date}} range A representation of days in milliseconds
     */
    range(range) {
        this.empty();

        const day = 1000 * 60 * 60 * 24;
        const now = new Date();

        const startIsDate = range.start instanceof Date;
        // Range.end means "now" when infinite or "now"
        range.start = new Date(range.start);
        if (range.end !== "now") range.end = new Date(range.end);
        if (range.end === "now" || range.end.getTime() > new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime()) {
            range.end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        }
        if (range.end.getTime() < range.start.getTime()) throw new Error("Range Start has to be before Range End");

        // this is really ..... unnice. But it kinda fixes a bug, so I don't care
        if (startIsDate) {
            range.start.setUTCHours(24);
        } else {
            range.start.setUTCHours(0);
        }
        range.start.setUTCMinutes(0);
        range.start.setUTCSeconds(0);
        range.start.setUTCMilliseconds(0);

        range.end.setUTCHours(24);
        range.end.setUTCMinutes(0);
        range.end.setUTCSeconds(0);
        range.end.setUTCMilliseconds(0);

        // making day numbers out of it
        range.start = Math.floor(range.start.getTime() / day);
        range.end = Math.floor(range.end.getTime() / day);
        for (let i = range.start; i <= range.end; i++) {
            this.dates.push(new Date(i * day));
        }

        const start = this.dates[0];
        const end = this.dates[this.dates.length - 1];
        this.start = `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
        this.end = `${end.getFullYear()}-${end.getMonth() + 1}-${end.getDate()}`;

        this.load();
    }

    load() {
        this.progressOuter.style.display = "block";
        this.progress.style.width = "0";

        const promise = Downloader.load(this.dates, "small");
        promise.onprogress = this.onprogress.bind(this);
        promise.then(data => {
            this.progressOuter.style.display = "none";
            this.data = data;
            this.render();
        }).catch(err => {
            this.error(err);
        });
    }

    onprogress(progress) {
        this.progress.style.width = (progress * 100).toFixed(3) + "%";
    }

    render() {
        this.chart.update({
            xAxis: {
                categories: this.data.map(data => data["Timestamp"])
            },
            series: [{
                data: this.data.map(data => data["Value"])
            }]
        }, true);
    }

    error(err) {
        // show error
    }

    empty() {
        this.dates = [];
        this.data = [];

        this.chart.update({
            xAxis: {
                categories: []
            },
            series: [{
                data: []
            }]
        }, true);
    }

    /**
     * Make a download request of the represented data
     * @param {"full"|"small"} type The type of data to be downloaded. If it is full then download superdimensional data, if small then 2d data of graph
     */
    requestDownload(type, progress) {
        return new Promise((resolve, reject) => {
            if (type === "full") {
                // download full blown information
                const promise = Downloader.load(this.dates, "full");
                promise.onprogress = progress;
                promise.then(data => {
                    Downloader.download(data, this.start, this.end);
                    resolve();
                }).catch(reject);
            } else if (type === "small") {
                Downloader.download(this.data, this.start, this.end);
                resolve();
            }
        });
    }
}

class GraphElement extends Graph {
    /**
     * Graph Element
     * @param {Element} element 
     */
    constructor(element) {
        super(element, { start: element.getAttribute("data-start"), end: element.getAttribute("data-end") });
    }
}

Array.from(document.getElementsByTagName("app-graph")).map(g => new GraphElement(g));

const graph = new GraphElement(document.getElementById("alltime"));

const export_button = document.getElementById("export_button");
export_button.addEventListener("click", () => {
    if (export_button.disabled) return;

    const inner = export_button.querySelector(".inner");
    inner.style.width = "0";

    export_button.disabled = true;
    graph.requestDownload("full", value => {
        inner.style.width = `${value * 100}%`;
    }).then(() => {
        export_button.disabled = false;
        inner.style.width = "0";
    }).catch(() => {
        export_button.disabled = false;
        inner.style.width = "0";
    });
});

const range_button = document.getElementById("range_button");
const range_overlay = document.getElementById("range_overlay");
range_button.addEventListener("mousedown", () => {
    range_overlay.classList.toggle("open");
    range_button.classList.toggle("active");
});

Date.prototype.monthDays = function () {
    return new Date(this.getFullYear(), this.getMonth() + 1, 0).getDate();
};

class Calendar {
    /**
     * @param {HTMLElement} elem 
     */
    constructor(elem) {
        this.elem = elem;
        elem.innerHTML =
            `<div class="top">
                <div class="buttons">
                    <div class="button left">
                        <i class="icon-left"></i>
                    </div>
                    <div class="text"></div>
                    <div class="button right">
                        <i class="icon-right"></i>
                    </div>
                </div>
            </div>
            <div class="dates clear"></div>`;
        this.title = elem.querySelector(".top > .buttons > .text");
        this.button_prev = elem.querySelector(".top > .buttons > .button.left");
        this.button_prev.onclick = () => this.prev();
        this.button_next = elem.querySelector(".top > .buttons > .button.right");
        this.button_next.onclick = () => this.next();
        const cont = elem.querySelector(".dates");
        this.cells = [];
        for (let i = 0; i < 6 * 7; i++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cont.appendChild(cell);
            this.cells.push(cell);
        }
    }

    render(date) {
        const now = new Date();
        now.setUTCHours(-24);
        now.setUTCMinutes(0);
        now.setUTCSeconds(0);
        now.setUTCMilliseconds(0);
        
        // date
        let d = new Date();
        if (date) d = new Date(date);
        else d = this.date;
        // month name
        this.title.innerHTML = `${months[d.getMonth()]} ${d.getFullYear()}`;
        // day of week
        d.setDate(1);
        const day = d.getDay();
        // days of last month
        const days_last_month = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
        const days_month = d.monthDays();

        const start = (this.start.getTime() - d.getTime()) / (1000 * 3600 * 24);
        const end = (this.end.getTime() - d.getTime()) / (1000 * 3600 * 24);

        for (let i = 0; i < this.cells.length; i++) {
            if (i < day) {
                this.cells[i].innerHTML = (days_last_month - (day - i) + 1).toString();
                this.cells[i].className = "cell last_month";
            } else if (i - day < days_month) {
                this.cells[i].innerHTML = (i - day + 1).toString();
                this.cells[i].className = "cell";
            } else {
                this.cells[i].innerHTML = (i - day - days_month + 1).toString();
                this.cells[i].className = "cell next_month";
            }
            if (start + day <= i && i <= end + day) {
                this.cells[i].classList.add("active");
            }

            const date = new Date(d.getFullYear(), d.getMonth(), i - day + 1);

            if (date.getTime() < now.getTime() && date.getTime() >= archive_start.getTime()) {
                this.cells[i].onclick = () => {
                    if (this.onclick) this.onclick(date);
                };
            } else {
                this.cells[i].classList.add("disabled");                
            }
        }

        // check if next month is available
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);

        if (next.getTime() <= now.getTime()) {
            this.button_next.style.visibility = "visible";
        } else {
            this.button_next.style.visibility = "hidden";
        }

        // check if previous month is available
        const prev = new Date(d.getFullYear(), d.getMonth(), 1);

        if (prev.getTime() >= archive_start.getTime()) {
            this.button_prev.style.visibility = "visible";
        } else {
            this.button_prev.style.visibility = "hidden";
        }

        this.date = d;
    }

    set(start, end, redraw) {
        this.start = new Date(start);
        this.end = new Date(end);

        if (redraw) this.render();

        if (this.onchange) this.onchange();
    }

    prev() {
        this.render(new Date(this.date.getFullYear(), this.date.getMonth() - 1, 1));
    }

    next() {
        this.render(new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1));
    }
}

const begin_time = document.getElementById("begin_time");
const end_time = document.getElementById("end_time");

const range_display = document.getElementById("range_display");

const calendar_start = new Calendar(document.getElementById("begin"));
const calendar_end = new Calendar(document.getElementById("end"));

calendar_start.onchange = () => {
    begin_time.innerHTML = `${calendar_start.start.getFullYear()}-${calendar_start.start.getMonth()}-${calendar_start.start.getDate()}`;
};
calendar_end.onchange = () => {
    end_time.innerHTML = `${calendar_end.end.getFullYear()}-${calendar_end.end.getMonth()}-${calendar_end.end.getDate()}`;
};

calendar_start.set(graph.start, graph.end);
calendar_end.set(graph.start, graph.end);

calendar_start.render(graph.start);
calendar_end.render(graph.end);

calendar_start.onclick = date => {
    calendar_start.set(date, calendar_end.end, true);
    calendar_end.set(date, calendar_end.end, true);
};
calendar_end.onclick = date => {
    calendar_start.set(calendar_start.start, date, true);
    calendar_end.set(calendar_start.start, date, true);
};

function writeOut(number) {
    let string = number.toString();
    switch (string.charAt(string.length - 1)) {
    case "1": string += "st"; break;
    case "2": string += "nd"; break;
    case "3": string += "rd"; break;  
    default: string += "th"; break;        
    }
    if (number === 11 || number === 12 || number === 13) {
        return number.toString();
    } else {
        return string;
    }
}

const update_button = document.getElementById("update");
update_button.addEventListener("click", () => {
    range_overlay.classList.toggle("open");
    range_button.classList.toggle("active");

    graph.range({ start: calendar_start.start, end: calendar_end.end });

    calendar_start.render(graph.start);
    calendar_end.render(graph.end);

    if (calendar_start.start.getFullYear() === calendar_end.end.getFullYear()) {
        range_display.innerHTML = `Alltime Data | ${calendar_start.start.getFullYear()}, ${months[calendar_start.start.getMonth()]} ${writeOut(calendar_start.start.getDate())} - ${months[calendar_end.end.getMonth()]} ${writeOut(calendar_end.end.getDate())}`;
    } else {
        range_display.innerHTML = `Alltime Data | ${calendar_start.start.getFullYear()}, ${months[calendar_start.start.getMonth()]} ${writeOut(calendar_start.start.getDate())} - ${calendar_end.end.getFullYear()}, ${months[calendar_end.end.getMonth()]} ${writeOut(calendar_end.end.getDate())}`;        
    }
});
const cancel_button = document.getElementById("cancel");
cancel_button.addEventListener("click", () => {
    range_overlay.classList.toggle("open");
    range_button.classList.toggle("active");

    calendar_start.set(graph.start, graph.end);
    calendar_end.set(graph.start, graph.end);

    calendar_start.render(graph.start);
    calendar_end.render(graph.end);
});
