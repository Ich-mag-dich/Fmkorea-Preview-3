import { BASE_URL } from "../constants";

const DEFAULT_VIDEO_VOLUME = 0.5;
const VIDEO_VOLUME_STORAGE_KEY = "fmk_preview_video_volume";

let cachedVideoVolume = DEFAULT_VIDEO_VOLUME;

const normalizeVideoVolume = (value: unknown) =>
  typeof value === "number" && value >= 0 && value <= 1
    ? value
    : DEFAULT_VIDEO_VOLUME;

const getStoredVideoVolume = () => {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return Promise.resolve(cachedVideoVolume);
  }

  return new Promise<number>((resolve) => {
    chrome.storage.local.get(VIDEO_VOLUME_STORAGE_KEY, (result) => {
      cachedVideoVolume = normalizeVideoVolume(
        result[VIDEO_VOLUME_STORAGE_KEY],
      );
      resolve(cachedVideoVolume);
    });
  });
};

const saveVideoVolume = (volume: number) => {
  cachedVideoVolume = normalizeVideoVolume(volume);
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  chrome.storage.local.set({ [VIDEO_VOLUME_STORAGE_KEY]: cachedVideoVolume });
};

export const applyDefaultVideoVolume = (video: HTMLVideoElement) => {
  video.volume = cachedVideoVolume;
};

export const initializePreviewVideoVolume = (root: Element) => {
  const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("video"));
  let applyingStoredVolume = true;

  const cleanupHandlers = videos.map((video) => {
    const handleVolumeChange = () => {
      if (applyingStoredVolume) return;
      saveVideoVolume(video.volume);
    };
    video.addEventListener("volumechange", handleVolumeChange);
    return () => video.removeEventListener("volumechange", handleVolumeChange);
  });

  getStoredVideoVolume().then((volume) => {
    videos.forEach((video) => {
      video.volume = volume;
    });
    window.setTimeout(() => {
      applyingStoredVolume = false;
    }, 0);
  });

  return () => cleanupHandlers.forEach((cleanup) => cleanup());
};

export const fixAttr = (el: Element, attr: string) => {
  const val = el.getAttribute(attr);
  if (val?.startsWith("//")) el.setAttribute(attr, `https:${val}`);
  else if (val?.startsWith("/")) el.setAttribute(attr, `${BASE_URL}${val}`);
};

export const absolutizeMedia = (root: Element) => {
  root.querySelectorAll("img").forEach((img) => {
    const orig =
      img.getAttribute("data-original") ?? img.getAttribute("data-src");
    if (orig) img.setAttribute("src", orig);
    fixAttr(img, "src");
  });
  root.querySelectorAll("source").forEach((s) => fixAttr(s, "src"));
};

const cleanVideoWrappers = (root: Element) => {
  root.querySelectorAll(".height_keep").forEach((wrapper) => {
    const video = wrapper.querySelector("video");
    const source = video?.querySelector("source");
    if (!video) return;

    const newVid = document.createElement("video");
    newVid.src = source?.getAttribute("src") ?? video.getAttribute("src") ?? "";
    fixAttr(newVid, "src");
    newVid.controls = true;
    newVid.preload = "metadata";
    newVid.style.cssText =
      "max-width:100%;max-height:480px;width:auto;border-radius:6px;margin:8px 0;display:block";

    const poster = video.getAttribute("poster");
    if (poster) {
      newVid.poster = poster.startsWith("//") ? `https:${poster}` : poster;
    }

    if (video.classList.contains("video-without-sound")) {
      newVid.autoplay = true;
      newVid.loop = true;
      newVid.muted = true;
    }

    applyDefaultVideoVolume(newVid);

    wrapper.replaceWith(newVid);
  });
};

const YT_RE =
  /(?:youtube\.com\/(?:watch\?[^&\s]*?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const TW_RE = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
const IG_RE = /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/;
const CHZZK_RE = /chzzk\.naver\.com\/clips\/([A-Za-z0-9_-]+)/;
const SOOP_RE = /vod\.sooplive\.com\/player\/(\d+)/;

const makeVideoWrap = (iframe: HTMLIFrameElement): HTMLElement => {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "width:100%;aspect-ratio:16/9;margin:8px 0;border-radius:8px;overflow:hidden";
  iframe.style.cssText = "width:100%;height:100%;border:0";
  wrap.appendChild(iframe);
  return wrap;
};

const makeEmbed = (url: string): HTMLElement | null => {
  const yt = url.match(YT_RE);
  if (yt) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${yt[1]}`;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.setAttribute("allowfullscreen", "");
    return makeVideoWrap(iframe);
  }

  const chzzk = url.match(CHZZK_RE);
  if (chzzk) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://chzzk.naver.com/embed/clip/${chzzk[1]}`;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.setAttribute("allowfullscreen", "");
    return makeVideoWrap(iframe);
  }

  const soop = url.match(SOOP_RE);
  if (soop) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://vod.sooplive.com/player/${soop[1]}/embed`;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.setAttribute("allowfullscreen", "");
    return makeVideoWrap(iframe);
  }

  const tw = url.match(TW_RE);
  if (tw) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://platform.twitter.com/embed/Tweet.html?id=${tw[1]}`;
    iframe.style.cssText =
      "width:100%;max-width:550px;border:0;border-radius:12px;margin:8px 0;display:block;min-height:280px";
    return iframe;
  }

  const ig = url.match(IG_RE);
  if (ig) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.instagram.com/p/${ig[1]}/embed/`;
    iframe.style.cssText =
      "width:100%;max-width:400px;border:0;border-radius:8px;margin:8px 0;display:block;min-height:480px";
    return iframe;
  }

  return null;
};

const embedKey = (url: string): string | null => {
  const yt = url.match(YT_RE);
  if (yt) return `yt:${yt[1]}`;
  const chzzk = url.match(CHZZK_RE);
  if (chzzk) return `chzzk:${chzzk[1]}`;
  const soop = url.match(SOOP_RE);
  if (soop) return `soop:${soop[1]}`;
  const tw = url.match(TW_RE);
  if (tw) return `tw:${tw[1]}`;
  const ig = url.match(IG_RE);
  if (ig) return `ig:${ig[1]}`;
  return null;
};

const collectTextNodes = (el: Element): Text[] => {
  const out: Text[] = [];
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3) out.push(child as Text);
    else if (
      child.nodeType === 1 &&
      !["IFRAME", "SCRIPT", "STYLE"].includes((child as Element).tagName)
    ) {
      out.push(...collectTextNodes(child as Element));
    }
  }
  return out;
};

const embedMedia = (root: Element) => {
  const seen = new Set<string>();
  const bareUrlRe = /https?:\/\/[^\s<>"]+/g;

  const tryEmbed = (url: string): HTMLElement | null => {
    const key = embedKey(url);
    if (!key || seen.has(key)) return null;
    const embed = makeEmbed(url);
    if (embed) seen.add(key);
    return embed;
  };

  Array.from(root.querySelectorAll("a[href]")).forEach((a) => {
    const embed = tryEmbed(a.getAttribute("href") ?? "");
    if (embed) a.replaceWith(embed);
  });

  for (const textNode of collectTextNodes(root)) {
    const text = textNode.textContent ?? "";
    const matches = [...text.matchAll(bareUrlRe)];
    if (!matches.length) continue;

    const hits: { start: number; end: number; el: HTMLElement }[] = [];
    for (const m of matches) {
      const embed = tryEmbed(m[0]);
      if (embed) {
        hits.push({ start: m.index!, end: m.index! + m[0].length, el: embed });
      } else {
        const a = document.createElement("a");
        a.href = m[0];
        a.textContent = m[0];
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        hits.push({ start: m.index!, end: m.index! + m[0].length, el: a });
      }
    }

    const parent = textNode.parentNode!;
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const { start, end, el } of hits) {
      if (start > last)
        frag.appendChild(document.createTextNode(text.slice(last, start)));
      frag.appendChild(el);
      last = end;
    }
    if (last < text.length)
      frag.appendChild(document.createTextNode(text.slice(last)));
    parent.replaceChild(frag, textNode);
  }
};

export const cleanContent = (root: Element) => {
  root.querySelectorAll(".beforeLoad").forEach((el) => {
    el.className = el.className.replace("beforeLoad", "").trim();
  });
  root.querySelectorAll<HTMLElement>(".auto_media_wrapper").forEach((el) => {
    el.style.opacity = "1";
    el.style.width = "100%";
    el.style.maxWidth = "100%";
    const vid = el.querySelector<HTMLVideoElement>("video");
    if (vid) {
      vid.style.maxWidth = "100%";
      vid.style.maxHeight = "480px";
      vid.style.width = "auto";
      applyDefaultVideoVolume(vid);
    }
  });
  absolutizeMedia(root);
  cleanVideoWrappers(root);
  root.innerHTML = root.innerHTML.replace(/<!--[\s\S]*?-->/g, "");
  embedMedia(root);
};
