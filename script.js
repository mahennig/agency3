gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const videos = {
  paint: document.querySelector(".story-video--paint"),
  threads: document.querySelector(".story-video--threads"),
  cable: document.querySelector(".story-video--cable"),
  screen: document.querySelector(".story-video--screen"),
  keychain: document.querySelector(".story-video--keychain"),
};

const messages = {
  paint: document.querySelector(".story-message--paint"),
  threads: document.querySelector(".story-message--threads"),
  cable: document.querySelector(".story-message--cable"),
  screen: document.querySelector(".story-message--screen"),
};

const chapterCurrent = document.querySelector(".chapter-counter__current");
const loadingScreen = document.querySelector(".loading-screen");
const servicesExplorer = document.querySelector(".services-explorer");
const serviceTitle = document.querySelector(".service-details__title");
const serviceDescription = document.querySelector(
  ".service-details__description"
);
const serviceIndex = document.querySelector(".service-details__index");
const serviceLink = document.querySelector(".service-details__link");
const serviceThumb = document.querySelector(".service-details__thumb");
const serviceDots = [...document.querySelectorAll(".service-dot")];

const serviceData = [
  {
    title: "Film Production",
    description: "Commercials, brand films and visual stories made to move.",
    href: "/services/film-production",
    image: "./public/images/service-film.webp",
  },
  {
    title: "Brand Identity",
    description:
      "Distinctive visual systems that turn strategy into recognition.",
    href: "/services/brand-identity",
    image: "./public/images/service-branding.webp",
  },
  {
    title: "Social Media",
    description:
      "Creative content systems built to connect, evolve and perform.",
    href: "/services/social-media",
    image: "./public/images/service-social.webp",
  },
  {
    title: "Creative Strategy",
    description: "Clear direction for brands navigating complexity and change.",
    href: "/services/creative-strategy",
    image: "./public/images/service-strategy.webp",
  },
];

let activeService = 0;

// Tracks the video currently sitting on top of the stack so the previous one
// can be kept as an opaque underlay during a crossfade — this guarantees a
// video is always covering the background (never an empty frame between them).
let previousTopVideo = null;
let videoStackOrder = 10;

function waitForVideo(video) {
  return new Promise((resolve) => {
    if (video.readyState >= 2 && Number.isFinite(video.duration)) {
      resolve();
      return;
    }
    const handleReady = () => {
      video.removeEventListener("loadedmetadata", handleReady);
      resolve();
    };
    video.addEventListener("loadedmetadata", handleReady);
  });
}

// Smooth scrubbing: scroll updates only set a *target* time per video; a
// requestAnimationFrame loop eases each video's currentTime toward its target.
// This decouples the seek from the discrete scroll events and, combined with
// the all-intra (every-frame-a-keyframe) encoding, removes the jumps.
const videoTargetTimes = new WeakMap();
let scrubRafId = null;
const SCRUB_SMOOTHING = 0.2;

function queueVideoTime(video, progress) {
  if (!video || !Number.isFinite(video.duration)) return;
  const safeProgress = gsap.utils.clamp(0, 1, progress);
  const targetTime = safeProgress * Math.max(video.duration - 0.04, 0);
  videoTargetTimes.set(video, targetTime);
}

function startSmoothScrub() {
  if (scrubRafId !== null) return;

  const tick = () => {
    Object.values(videos).forEach((video) => {
      if (!videoTargetTimes.has(video)) return;
      if (!Number.isFinite(video.duration)) return;
      const target = videoTargetTimes.get(video);
      const current = video.currentTime;
      const diff = target - current;
      const distance = Math.abs(diff);
      // Snap when close enough and stop nudging to avoid pointless micro-seeks.
      if (distance < 0.0015) {
        if (distance > 0.0005) video.currentTime = target;
        return;
      }
      video.currentTime = current + diff * SCRUB_SMOOTHING;
    });
    scrubRafId = requestAnimationFrame(tick);
  };

  scrubRafId = requestAnimationFrame(tick);
}


function showMessage(message) {
  Object.values(messages).forEach((item) => {
    gsap.set(item, {
      autoAlpha: 0,
      y: 28,
    });
    gsap.set(item.querySelectorAll(".line"), {
      autoAlpha: 0,
      y: 24,
    });
  });
  if (!message) return;

  // The caption block fades/rises in, then its lines stagger — animating
  // separately from the scroll-driven video underneath.
  gsap.to(message, {
    autoAlpha: 1,
    y: 0,
    duration: 0.6,
    ease: "power3.out",
  });
  gsap.to(message.querySelectorAll(".line"), {
    autoAlpha: 1,
    y: 0,
    duration: 0.7,
    stagger: 0.08,
    ease: "power3.out",
  });
}

function activateVideo(activeVideo) {
  if (activeVideo === previousTopVideo) return;

  // Raise the incoming video above everything else so it can dissolve in on
  // top of the current one.
  videoStackOrder += 1;
  activeVideo.style.zIndex = String(videoStackOrder);
  activeVideo.classList.add("is-active");

  Object.values(videos).forEach((video) => {
    if (video === activeVideo) return;
    if (video === previousTopVideo) {
      // Keep the outgoing video fully opaque underneath while the incoming
      // one fades in over it — the crossfade never reveals the background.
      video.classList.add("is-active");
      gsap.set(video, { autoAlpha: 1 });
    } else {
      video.classList.remove("is-active");
      gsap.set(video, { autoAlpha: 0 });
    }
  });

  previousTopVideo = activeVideo;
}

function createVideoScene({
  trigger,
  video,
  message,
  chapter,
  fadeBackgroundTo,
  start = "top bottom",
  end = "bottom top",
}) {
  ScrollTrigger.create({
    trigger,
    start,
    end,
    onEnter: () => {
      activateVideo(video);
      showMessage(message);
      chapterCurrent.textContent = chapter;
    },
    onEnterBack: () => {
      activateVideo(video);
      showMessage(message);
      chapterCurrent.textContent = chapter;
    },
    onUpdate: (self) => {
      queueVideoTime(video, self.progress);
    },
  });

  // Crossfade in with a subtle scale settle and a soft focus pull.
  gsap.fromTo(
    video,
    {
      autoAlpha: 0,
      scale: 1.035,
      filter: "contrast(1.02) saturate(0.96) blur(5px)",
    },
    {
      autoAlpha: 1,
      scale: 1,
      filter: "contrast(1.02) saturate(0.96) blur(0px)",
      ease: "none",
      scrollTrigger: {
        trigger,
        start: "top 75%",
        end: "top 40%",
        scrub: true,
      },
    }
  );

  // Slow parallax push as the scene leaves (scale only — the filter is left
  // untouched here so it doesn't fight the focus-pull tween above).
  gsap.to(video, {
    scale: 1.05,
    ease: "none",
    scrollTrigger: {
      trigger,
      start: "55% top",
      end: "bottom top",
      scrub: true,
    },
  });

  if (fadeBackgroundTo) {
    gsap.to(".background-transition", {
      backgroundColor: fadeBackgroundTo,
      ease: "none",
      scrollTrigger: {
        trigger,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  }
}

function updateService(index, animate = true) {
  activeService = gsap.utils.wrap(0, serviceData.length, index);
  const service = serviceData[activeService];

  const updateContent = () => {
    serviceIndex.textContent =
      `${String(activeService + 1).padStart(2, "0")} / ` +
      `${String(serviceData.length).padStart(2, "0")}`;
    serviceTitle.textContent = service.title;
    serviceDescription.textContent = service.description;
    serviceLink.href = service.href;
    if (serviceThumb) {
      serviceThumb.src = service.image;
    }
    serviceDots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeService);
    });
  };

  if (!animate) {
    updateContent();
    return;
  }

  const block = [
    serviceThumb,
    serviceIndex,
    serviceTitle,
    serviceDescription,
    serviceLink,
  ].filter(Boolean);

  gsap.to(block, {
    autoAlpha: 0,
    y: 16,
    duration: 0.22,
    ease: "power2.in",
    onComplete: () => {
      updateContent();
      gsap.fromTo(
        block,
        {
          autoAlpha: 0,
          y: 18,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.045,
          ease: "power3.out",
        }
      );
    },
  });
}

function createServicesScene() {
  const trigger = document.querySelector('[data-scene="keychain"]');

  ScrollTrigger.create({
    trigger,
    start: "top 72%",
    end: "bottom top",
    onEnter: () => {
      activateVideo(videos.keychain);
      showMessage(null);
      chapterCurrent.textContent = "05";
      servicesExplorer.classList.add("is-interactive");
    },
    onEnterBack: () => {
      activateVideo(videos.keychain);
      showMessage(null);
      chapterCurrent.textContent = "05";
      servicesExplorer.classList.add("is-interactive");
    },
    onLeaveBack: () => {
      servicesExplorer.classList.remove("is-interactive");
    },
    onUpdate: (self) => {
      queueVideoTime(videos.keychain, self.progress);
      const serviceProgress = gsap.utils.clamp(0, 0.999, self.progress);
      const nextService = Math.floor(serviceProgress * serviceData.length);
      if (nextService !== activeService) {
        updateService(nextService);
      }
    },
  });

  gsap.fromTo(
    videos.keychain,
    {
      autoAlpha: 0,
      scale: 1.08,
    },
    {
      autoAlpha: 1,
      scale: 1,
      ease: "none",
      scrollTrigger: {
        trigger,
        start: "top 75%",
        end: "top 15%",
        scrub: true,
      },
    }
  );

  gsap.fromTo(
    servicesExplorer,
    {
      autoAlpha: 0,
    },
    {
      autoAlpha: 1,
      ease: "none",
      scrollTrigger: {
        trigger,
        start: "top 45%",
        end: "top 5%",
        scrub: true,
      },
    }
  );

  /*
   * Simulates the camera moving closer to each object.
   * For perfect sync the keychain video should be authored so that:
   *
   *   0–25%   Film Production
   *   25–50%  Brand Identity
   *   50–75%  Social Media
   *   75–100% Creative Strategy
   */
  gsap.to(videos.keychain, {
    scale: 1.16,
    ease: "none",
    scrollTrigger: {
      trigger,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
    },
  });
}

function createFinalAnimation() {
  gsap.from(".network-lines path", {
    strokeDasharray: 1200,
    strokeDashoffset: 1200,
    stagger: 0.15,
    ease: "none",
    scrollTrigger: {
      trigger: ".final-section",
      start: "top 70%",
      end: "center center",
      scrub: true,
    },
  });

  gsap.from(".network-point", {
    scale: 0,
    autoAlpha: 0,
    stagger: 0.08,
    ease: "back.out(1.8)",
    scrollTrigger: {
      trigger: ".final-section",
      start: "top 65%",
      end: "center center",
      scrub: true,
    },
  });

  gsap.from(".final-section__content", {
    y: 70,
    autoAlpha: 0,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".final-section",
      start: "top 45%",
      end: "center center",
      scrub: true,
    },
  });
}

function createProgressIndicator() {
  gsap.to(".scroll-indicator__progress", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: {
      trigger: ".experience",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
    },
  });
}

function createDotInteractions() {
  serviceDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = Number(dot.dataset.service);
      updateService(index);

      // Move the scroll position into the matching segment of the
      // keychain scene so the camera lands on the chosen object.
      const trigger = document.querySelector('[data-scene="keychain"]');
      const triggerTop = window.scrollY + trigger.getBoundingClientRect().top;
      const availableScroll = trigger.offsetHeight - window.innerHeight;
      const targetProgress = (index + 0.5) / serviceData.length;
      window.scrollTo({
        top: triggerTop + availableScroll * targetProgress,
        behavior: "smooth",
      });
    });
  });
}

async function initialiseExperience() {
  const allVideos = Object.values(videos);

  /*
   * On iOS, setting currentTime is more reliable after an initial
   * play/pause priming pass.
   */
  await Promise.all(allVideos.map(waitForVideo));

  for (const video of allVideos) {
    video.pause();
    try {
      await video.play();
      video.pause();
      video.currentTime = 0;
    } catch (error) {
      console.info("Video autoplay preparation was blocked:", error);
    }
  }

  loadingScreen.classList.add("is-hidden");

  if (prefersReducedMotion) {
    activateVideo(videos.keychain);
    servicesExplorer.classList.add("is-interactive");
    updateService(0, false);
    return;
  }

  const paintScene = document.querySelector('[data-scene="paint"]');
  const threadsScene = document.querySelector('[data-scene="threads"]');
  const cableScene = document.querySelector('[data-scene="cable"]');
  const screenScene = document.querySelector('[data-scene="screen"]');

  // The paint video is the initial top layer; register it so the first
  // crossfade keeps it as the opaque underlay (no background flash).
  videos.paint.style.zIndex = String(videoStackOrder);
  previousTopVideo = videos.paint;

  createVideoScene({
    trigger: paintScene,
    video: videos.paint,
    message: messages.paint,
    chapter: "01",
    fadeBackgroundTo: "#d8d8d2",
  });
  createVideoScene({
    trigger: threadsScene,
    video: videos.threads,
    message: messages.threads,
    chapter: "02",
    fadeBackgroundTo: "#858581",
  });
  createVideoScene({
    trigger: cableScene,
    video: videos.cable,
    message: messages.cable,
    chapter: "03",
    fadeBackgroundTo: "#2a2a28",
  });
  createVideoScene({
    trigger: screenScene,
    video: videos.screen,
    message: messages.screen,
    chapter: "04",
    fadeBackgroundTo: "#050505",
  });

  createServicesScene();
  createProgressIndicator();
  createDotInteractions();
  createFinalAnimation();

  updateService(0, false);
  ScrollTrigger.refresh();

  // Prime the first scene and start the eased video-scrubbing loop.
  queueVideoTime(videos.paint, 0);
  startSmoothScrub();
}

window.addEventListener("load", initialiseExperience);
window.addEventListener("resize", () => {
  ScrollTrigger.refresh();
});
