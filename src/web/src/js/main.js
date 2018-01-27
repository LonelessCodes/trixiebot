/* global locationHashChanged, highlight */

let timeout;

document.querySelectorAll("a").forEach(a => {
    const href = a.href.replace(location.href, "");

    if (href.charAt(0) === "#") {
        a.addEventListener("click", e => {
            e.preventDefault();
            
            const o = window.scrollY;
            const n = document.querySelector(href).getBoundingClientRect().top + window.scrollY - 59; // 59 because header

            let dur = 800.0;
            let index = 0.0;
            cancelAnimationFrame(timeout);
            function animate() {
                index += 1000.0 / 60;

                window.scrollTo(0, Math.round(ease(index, o, n - o, dur)));

                if (index < dur) {
                    timeout = requestAnimationFrame(animate);
                }
            }
            animate();
            
            if (window.highlight) locationHashChanged(href);
        });
    }
});

function ease(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
}

function closeMenu() {
    document.body.classList.remove("menu");
}
function openMenu() {
    document.body.classList.add("menu");
}

document.querySelectorAll("#menu a").forEach(a => {
    a.addEventListener("click", () => closeMenu());
});

document.querySelectorAll("app-color").forEach(a => {
    a.style.backgroundColor = "#" + a.getAttribute("hex");
});