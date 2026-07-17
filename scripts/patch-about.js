const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "data", "content.json");
const c = JSON.parse(fs.readFileSync(file, "utf8"));

c.home.showVideosSection = true;

c.pages.about = {
  id: "about",
  enabled: true,
  greeting: {
    zh: "你好",
    en: "Bonjour",
    fr: "Bonjour",
  },
  title: {
    zh: "关于我们",
    en: "About Us",
    fr: "À propos",
  },
  content: {
    zh:
      "MONO STUDIO是来自巴黎的专业摄影工作室。从2012年成立至今，我们见证了上千对恋人的浪漫爱情故事。我们团队由一群热爱艺术、富有激情、敢于创新的巴黎华人青年组成。\n\n倾听你们的爱情故事，记录专属于你们的爱情记忆，打造只属于你们的婚纱个性影像。我们致力于用专业独特的视觉角度记录你们最美好的回忆。",
    en:
      "We are Mono Studio from Paris. Since 2012, we have witnessed the romantic love stories of thousands of lovers.\n\nOur team is composed of a group of young Chinese who love art, are passionate and innovative.\n\nWe listen to your love stories, record your love memories, and create your personalized images. We are committed to recording your best memories with a professional and unique visual perspective.",
    fr:
      "Nous sommes Mono Studio à Paris. Depuis 2012, nous avons été témoins des histoires d'amour de milliers de couples.\n\nNotre équipe est composée de jeunes Chinois passionnés d'art, créatifs et innovants.\n\nNous écoutons vos histoires, immortalisons vos souvenirs et créons des images qui vous ressemblent, avec un regard professionnel et unique.",
  },
  heroImage: "/images/about/about-hero.jpg",
  whyTitle: {
    zh: "选择我们的理由",
    en: "WHY CHOOSE US",
    fr: "POURQUOI NOUS CHOISIR",
  },
  reasons: [
    {
      id: "r1",
      order: 1,
      title: {
        zh: "专业性",
        en: "Professionalism",
        fr: "Professionnalisme",
      },
      content: {
        zh: "从化妆、造型、拍摄场地到拍摄计划，我们提供一整套完整的专业服务与建议。使您的拍摄之旅完美无缺。",
        en: "From makeup, styling, shooting plans to photography, we offer a complete set of professional services and advice to make your shooting trip perfect.",
        fr: "Du maquillage au styling, des lieux aux plans de shooting, nous offrons un accompagnement professionnel complet pour un voyage photo parfait.",
      },
    },
    {
      id: "r2",
      order: 2,
      title: {
        zh: "高质量",
        en: "High Quality",
        fr: "Haute qualité",
      },
      content: {
        zh: "无论是作品质量还是服务品质，我们永远走在行业前列。客户的信任来自于我们始终如一的高质量服务。",
        en: "Our team is made of a group of professionals who are willing to go the extra mile to deliver the best possible images. We gain the trust of customers through the quality of service and images.",
        fr: "Notre équipe de professionnels va toujours plus loin pour livrer les meilleures images. La confiance de nos clients vient de la qualité constante de nos services et de nos photos.",
      },
    },
    {
      id: "r3",
      order: 3,
      title: {
        zh: "个性化",
        en: "Tailor-made Service",
        fr: "Service sur mesure",
      },
      content: {
        zh: "通过深入的沟通，并结合您的需求，我们为您提前量身定制个性化造型与拍摄计划。",
        en: "Through in-depth communication, and taking into account your needs, we tailor your personalized styling and shooting plan in advance.",
        fr: "Grâce à une communication approfondie et en tenant compte de vos besoins, nous préparons à l'avance un styling et un plan de shooting personnalisés.",
      },
    },
  ],
  joinTitle: {
    zh: "诚招贤士",
    en: "Let's Work Together",
    fr: "Rejoignez-nous",
  },
  joinContent: {
    zh: "我们欢迎年轻、热情、富有创造力的你加入我们的团队！无论是富有经验的专业人才还是满怀激情的年轻学徒，我们都期待与你一同工作与成长。",
    en: "We welcome young, enthusiastic and creative people to join our team! Whether you are an experienced professional or a passionate young apprentice, we are looking forward to working and growing with you.",
    fr: "Nous accueillons des jeunes passionnés et créatifs ! Que vous soyez un professionnel expérimenté ou un apprenti motivé, nous avons hâte de grandir avec vous.",
  },
  joinPositions: {
    zh: "所需岗位：摄影师、摄像师、修图师、剪辑师、助理、客服等。",
    en: "Positions needed: photographer, videographer, retoucher, editor, assistant, customer service, etc.",
    fr: "Postes recherchés : photographe, vidéaste, retoucheur, monteur, assistant, service client, etc.",
  },
  joinEmail: "monostudiophoto.paris@gmail.com",
  media: [],
};

fs.writeFileSync(file, JSON.stringify(c, null, 2), "utf8");
console.log("about patched ok");
