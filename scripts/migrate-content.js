const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "..", "data", "content.json");
const old = JSON.parse(fs.readFileSync(p, "utf8"));

const parisImages = JSON.parse(
  fs.readFileSync(path.join(__dirname, "paris-gallery.json"), "utf8")
);

const empty = { zh: "", en: "", fr: "" };

const next = {
  brand: old.brand,
  logo: old.logo,
  tagline: old.tagline,
  meta: old.meta,
  nav: old.nav,
  ui: {
    explore: old.sections.explore,
    discover: old.sections.discover,
  },
  home: {
    heroMode: "image",
    heroSlides: [
      {
        id: "hero-1",
        type: "image",
        src: old.heroImage || "/images/hero.jpg",
        order: 1,
      },
    ],
    portfolioTitle: old.sections.photosTitle,
    portfolioContent: old.sections.photosDesc,
    servicesTitle: old.sections.servicesTitle,
    servicesContent: old.sections.servicesDesc,
    videosTitle: old.sections.videosTitle,
    videosContent: old.sections.videosDesc,
    publicityTitle: old.sections.publicityTitle,
    publicityContent: old.sections.servicesDesc,
  },
  pages: {
    photos: {
      id: "photos",
      enabled: true,
      title: old.sections.photosTitle,
      content: old.sections.photosDesc,
      media: [],
    },
    videos: {
      id: "videos",
      enabled: true,
      title: old.sections.videosTitle,
      content: old.sections.videosDesc,
      media: [],
    },
    services: {
      id: "services",
      enabled: true,
      title: old.sections.servicesTitle,
      content: old.sections.servicesDesc,
      media: [],
    },
    about: {
      id: "about",
      enabled: true,
      title: old.sections.aboutTitle,
      content: old.sections.aboutBody,
      media: [],
    },
    contact: {
      id: "contact",
      enabled: true,
      title: old.sections.contactTitle,
      content: old.contact.note,
      media: [],
    },
  },
  gallery: (old.gallery || []).map((g) => ({
    ...g,
    href:
      g.id === "g1"
        ? "/gallery/studio"
        : g.id === "g2"
          ? "/gallery/paris"
          : g.id === "g3"
            ? "/gallery/chateau"
            : "/gallery/paris",
  })),
  videos: old.videos,
  services: old.services,
  publicity: old.publicity,
  albums: [
    {
      id: "album-paris",
      slug: "paris",
      enabled: true,
      title: {
        zh: "巴黎外景作品展示",
        en: "Gallery of Photos — Pre-wedding in Paris",
        fr: "Galerie — Pré-mariage à Paris",
      },
      subtitle: {
        zh: "巴黎街景婚纱旅拍图库",
        en: "Per-wedding in Paris",
        fr: "Pré-mariage à Paris",
      },
      images: parisImages,
    },
    {
      id: "album-studio",
      slug: "studio",
      enabled: true,
      title: {
        zh: "影棚作品展示",
        en: "Studio Gallery",
        fr: "Galerie Studio",
      },
      subtitle: {
        zh: "影棚婚纱作品",
        en: "Pre-wedding in Studio",
        fr: "Pré-mariage en studio",
      },
      images: [
        "/images/photo-studio.jpg",
        "/images/service-prewedding.jpg",
        "/images/publicity-1.webp",
        "/images/publicity-2.webp",
      ],
    },
    {
      id: "album-chateau",
      slug: "chateau",
      enabled: true,
      title: {
        zh: "城堡作品展示",
        en: "Château Gallery",
        fr: "Galerie Château",
      },
      subtitle: {
        zh: "城堡婚纱旅拍",
        en: "Pre-wedding at the Castle",
        fr: "Pré-mariage au château",
      },
      images: [
        "/images/photo-chateau.jpg",
        "/images/service-wedding.jpg",
        "/images/publicity-3.webp",
        "/images/publicity-4.webp",
      ],
    },
  ],
  contact: old.contact,
  footer: old.footer,
};

fs.writeFileSync(p, JSON.stringify(next, null, 2), "utf8");
console.log("已迁移 content.json");
