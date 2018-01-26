const header = document.getElementById("header");
let showing = false;

const banner = document.getElementById("banner");
if (banner) {
    let banner_height = document.getElementById("banner").getBoundingClientRect().height;
    window.addEventListener("resize", () => banner_height = document.getElementById("banner").getBoundingClientRect().height);

    window.addEventListener("scroll", () => {
        if (!showing && window.scrollY >= banner_height - 60) {
            header.classList.remove("alt");
            showing = true;
        } else if (showing && window.scrollY < banner_height - 60) {
            header.classList.add("alt");
            showing = false;
        }
    });
}

window.addEventListener("load", () => {
    // nice animations
    document.querySelectorAll("#about .animate").forEach(el => {
        el.style.transform = "translate3d(0, 0, 0)";
        el.style.opacity = "1";
    });
    document.querySelectorAll("#banner .animate").forEach(el => {
        el.style.opacity = "1";
    });

    const changelog = document.querySelector("#changelog");
    const top = changelog.getBoundingClientRect().top + window.scrollY - window.innerHeight + 100;
    const scroll = () => {
        if (window.scrollY > top) {
            setTimeout(() => {
                document.querySelectorAll("#changelog .animate").forEach((elem, i) => {
                    setTimeout(() => {
                        elem.style.transform = "translate3d(0, 0, 0)";
                        elem.style.opacity = "1";
                    }, i * 50);
                });
            }, 200);
            window.removeEventListener("scroll", scroll, false);
        }
    };
    window.addEventListener("scroll", scroll, false);
    scroll();
});