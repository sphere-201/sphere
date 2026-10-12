"use strict";
const DISCORD_HANDLE = "sphere_201";
const POINT_COUNT = 720;
const SPIN_SPEED = 0.00006;
function prefersReducedMotion() {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    catch {
        return false;
    }
}
function buildSpherePoints(count) {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const pts = [];
    for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = goldenAngle * i;
        pts.push({
            x: Math.cos(theta) * r,
            y,
            z: Math.sin(theta) * r,
            hue: i % 23 === 0 ? "amber" : i % 7 === 0 ? "cyan" : "indigo",
        });
    }
    return pts;
}
function makeSprite(r, g, b) {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    if (!ctx)
        return null;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.2, `rgba(${r},${g},${b},0.6)`);
    grad.addColorStop(0.55, `rgba(${r},${g},${b},0.12)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return c;
}
function initHorizon() {
    const canvas = document.getElementById("orb");
    if (!(canvas instanceof HTMLCanvasElement))
        return;
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    const sprites = {
        indigo: makeSprite(139, 150, 255),
        cyan: makeSprite(119, 214, 255),
        amber: makeSprite(245, 190, 110),
    };
    if (!sprites.indigo || !sprites.cyan || !sprites.amber)
        return;
    const pts = buildSpherePoints(POINT_COUNT);
    const draw = (t, intro) => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        if (!cssW || !cssH)
            return;
        const W = Math.round(cssW * dpr);
        const H = Math.round(cssH * dpr);
        if (canvas.width !== W || canvas.height !== H) {
            canvas.width = W;
            canvas.height = H;
        }
        ctx.clearRect(0, 0, W, H);
        const R = Math.min(W * 0.42, 680 * dpr);
        const capH = Math.min(H * 0.8, R * 0.55);
        const cx = W / 2;
        const cy = H - capH + R;
        const ease = 1 - Math.pow(1 - intro, 3);
        const delta = Math.acos(Math.max(-1, Math.min(1, 1 - capH / R))) * ease;
        const a0 = -Math.PI / 2 - delta;
        const a1 = -Math.PI / 2 + delta;
        const grad = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
        grad.addColorStop(0, "rgba(123,135,255,0)");
        grad.addColorStop(0.3, "rgba(123,135,255,0.4)");
        grad.addColorStop(0.5, "rgba(173,182,255,0.85)");
        grad.addColorStop(0.7, "rgba(103,212,255,0.4)");
        grad.addColorStop(1, "rgba(103,212,255,0)");
        ctx.lineCap = "round";
        ctx.strokeStyle = grad;
        ctx.globalAlpha = 0.16 * ease;
        ctx.lineWidth = 7 * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0, a1);
        ctx.stroke();
        ctx.globalAlpha = ease;
        ctx.lineWidth = 1.4 * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0, a1);
        ctx.stroke();
        const spin = t * SPIN_SPEED;
        const ca = Math.cos(spin);
        const sa = Math.sin(spin);
        const sizeScale = Math.max(0.6, Math.min(1.1, R / (560 * dpr)));
        const cores = {
            indigo: "208,214,255",
            cyan: "205,240,255",
            amber: "255,228,185",
        };
        const prev = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        for (const p of pts) {
            const x = p.x * ca + p.z * sa;
            const z = -p.x * sa + p.z * ca;
            const sy = cy - p.y * R;
            if (sy > H + 30 * dpr)
                continue;
            const sx = cx + x * R;
            const depth = (z + 1) / 2;
            const alpha = (0.05 + 0.75 * Math.pow(depth, 1.8)) * ease;
            const s = (4 + 11 * depth) * sizeScale * dpr;
            ctx.globalAlpha = alpha;
            ctx.drawImage(sprites[p.hue], sx - s / 2, sy - s / 2, s, s);
            if (depth > 0.55) {
                ctx.globalAlpha = ((depth - 0.55) / 0.45) * 0.9 * ease;
                ctx.fillStyle = `rgba(${cores[p.hue]},1)`;
                ctx.beginPath();
                ctx.arc(sx, sy, (0.6 + 0.9 * depth) * sizeScale * dpr, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = prev;
    };
    if (prefersReducedMotion()) {
        draw(40000, 1);
        window.addEventListener("resize", () => draw(40000, 1));
    }
    else {
        let introStart = -1;
        const loop = (t) => {
            if (introStart < 0)
                introStart = t;
            draw(t, Math.min(1, (t - introStart) / 1400));
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}
function initReveals() {
    if (prefersReducedMotion())
        return;
    if (!("IntersectionObserver" in window))
        return;
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    if (els.length) {
        els.forEach((el) => el.classList.add("pre-reveal"));
        const io = new IntersectionObserver((entries) => {
            const hits = entries.filter((e) => e.isIntersecting);
            const fast = hits.length > 4;
            for (const entry of hits) {
                const el = entry.target;
                if (fast)
                    el.classList.add("reveal-fast");
                el.classList.add("revealed");
                io.unobserve(el);
            }
        }, { threshold: 0, rootMargin: "0px 0px -10% 0px" });
        els.forEach((el) => io.observe(el));
    }
    document.querySelectorAll("[data-reveal-stagger]").forEach((parent) => {
        const kids = Array.from(parent.children).filter((k) => k instanceof HTMLElement);
        if (!kids.length)
            return;
        kids.forEach((kid, i) => {
            kid.classList.add("pre-reveal", "reveal-fast");
            kid.style.transitionDelay = `${i * 60}ms`;
        });
        const pio = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    kids.forEach((kid) => kid.classList.add("revealed"));
                    pio.disconnect();
                }
            }
        }, { threshold: 0.1 });
        pio.observe(parent);
    });
}
function initVideos() {
    const videos = Array.from(document.querySelectorAll("video.video-el"));
    if (!videos.length)
        return;
    if (prefersReducedMotion() || !("IntersectionObserver" in window))
        return;
    const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(() => { });
            }
            else {
                video.pause();
            }
        }
    }, { threshold: 0.35 });
    videos.forEach((v) => io.observe(v));
}
function initKits() {
    const box = document.getElementById("combat-video");
    const video = box ? box.querySelector("video.video-el") : null;
    const sw = document.querySelector(".kit-switch");
    const buttons = Array.from(document.querySelectorAll(".kit-btn"));
    if (!video || !sw || !buttons.length)
        return;
    const ind = document.createElement("span");
    ind.className = "kit-ind";
    ind.setAttribute("aria-hidden", "true");
    sw.prepend(ind);
    sw.classList.add("has-ind");
    const place = (btn) => {
        ind.style.left = `${btn.offsetLeft}px`;
        ind.style.width = `${btn.offsetWidth}px`;
    };
    const initial = buttons.find((b) => b.classList.contains("is-active")) ?? buttons[0];
    place(initial);
    if (document.fonts?.ready) {
        document.fonts.ready
            .then(() => {
            const current = buttons.find((b) => b.classList.contains("is-active"));
            if (current)
                place(current);
        })
            .catch(() => { });
    }
    window.addEventListener("resize", () => {
        const current = buttons.find((b) => b.classList.contains("is-active"));
        if (current)
            place(current);
    });
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            place(btn);
            const src = btn.dataset.video;
            const thumb = btn.dataset.thumb;
            const kit = btn.dataset.kit ?? "";
            if (!src || !thumb)
                return;
            buttons.forEach((b) => {
                const active = b === btn;
                b.classList.toggle("is-active", active);
                b.setAttribute("aria-pressed", String(active));
            });
            const wasMuted = video.muted;
            video.pause();
            video.classList.add("is-swapping");
            let settled = false;
            const finish = () => {
                if (settled)
                    return;
                settled = true;
                video.classList.remove("is-swapping");
                if (!prefersReducedMotion()) {
                    video.play().catch(() => { });
                }
            };
            video.addEventListener("loadeddata", finish, { once: true });
            window.setTimeout(finish, 1500);
            video.poster = thumb;
            video.src = src;
            video.muted = wasMuted;
            video.setAttribute("aria-label", `Combat System — ${kit} kit showcase`);
            video.load();
        });
    });
}
function initParallax() {
    if (prefersReducedMotion())
        return;
    const horizon = document.querySelector(".horizon");
    if (!horizon)
        return;
    let ticking = false;
    const update = () => {
        ticking = false;
        const sc = window.scrollY;
        const y = Math.min(sc * 0.18, 70);
        horizon.style.transform = `translate3d(0, ${y}px, 0)`;
        horizon.style.opacity = String(Math.max(0, Math.min(1, 1 - sc / 560)));
    };
    window.addEventListener("scroll", () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }, { passive: true });
}
function initGallery() {
    const dialog = document.getElementById("lightbox");
    const img = document.getElementById("lb-img");
    const cap = document.getElementById("lb-cap");
    const tiles = Array.from(document.querySelectorAll(".g-tile"));
    if (!(dialog instanceof HTMLDialogElement) || !(img instanceof HTMLImageElement) || !cap || !tiles.length)
        return;
    let index = 0;
    const show = (i) => {
        index = (i + tiles.length) % tiles.length;
        const tile = tiles[index];
        const tileImg = tile.querySelector("img");
        img.src = tile.href;
        img.alt = tileImg ? tileImg.alt : "";
        cap.textContent = tile.dataset.cap ?? "";
    };
    tiles.forEach((tile, i) => {
        tile.addEventListener("click", (ev) => {
            ev.preventDefault();
            show(i);
            img.decode()
                .catch(() => { })
                .finally(() => {
                if (!dialog.open)
                    dialog.showModal();
            });
        });
    });
    dialog.addEventListener("click", (ev) => {
        if (ev.target === dialog)
            dialog.close();
    });
    const wire = (sel, fn) => {
        const b = dialog.querySelector(sel);
        if (b)
            b.addEventListener("click", fn);
    };
    wire(".lb-close", () => dialog.close());
    wire(".lb-prev", () => show(index - 1));
    wire(".lb-next", () => show(index + 1));
    dialog.addEventListener("keydown", (ev) => {
        if (ev.key === "ArrowLeft")
            show(index - 1);
        if (ev.key === "ArrowRight")
            show(index + 1);
    });
}
function initTrees() {
    document.querySelectorAll(".tree-root").forEach((root) => {
        root.addEventListener("click", () => {
            const open = root.getAttribute("aria-expanded") !== "false";
            root.setAttribute("aria-expanded", String(!open));
        });
    });
}
function initConsole() {
    const times = Array.from(document.querySelectorAll(".c-time"));
    if (!times.length)
        return;
    let stamp = "";
    try {
        stamp = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Bangkok",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }).format(new Date());
    }
    catch {
        stamp = "00:00:00";
    }
    let compact = false;
    try {
        compact = window.matchMedia("(max-width: 600px)").matches;
    }
    catch {
        compact = false;
    }
    const ms = ["041", "044", "051"];
    times.forEach((el, i) => {
        el.textContent = compact ? stamp : `${stamp}.${ms[i % ms.length]}`;
    });
}
function initClock() {
    const el = document.getElementById("localtime");
    if (!el)
        return;
    const tick = () => {
        try {
            el.textContent = new Intl.DateTimeFormat("en-GB", {
                timeZone: "Asia/Bangkok",
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date());
        }
        catch {
            el.textContent = "GMT+7";
        }
    };
    tick();
    window.setInterval(tick, 30000);
}
function initCopy() {
    const btn = document.getElementById("copybtn");
    const handle = document.getElementById("dchandle");
    if (!(btn instanceof HTMLButtonElement))
        return;
    const flash = (msg) => {
        btn.textContent = msg;
        window.setTimeout(() => {
            btn.textContent = "copy handle";
        }, 1600);
    };
    const selectFallback = () => {
        try {
            if (!handle)
                throw new Error("no handle node");
            const range = document.createRange();
            range.selectNodeContents(handle);
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
            flash("press ctrl+c");
        }
        catch {
            flash("select it manually");
        }
    };
    btn.addEventListener("click", () => {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(DISCORD_HANDLE).then(() => flash("copied!"), () => selectFallback());
        }
        else {
            selectFallback();
        }
    });
}
function boot() {
    initHorizon();
    initReveals();
    initVideos();
    initKits();
    initParallax();
    initGallery();
    initTrees();
    initConsole();
    initClock();
    initCopy();
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
}
else {
    boot();
}
