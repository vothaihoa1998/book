import { type Chapter, type Manga, makeScopedId } from "./types";

const now = new Date().toISOString();

export const sampleManga: Manga[] = [
  {
    id: makeScopedId("mangadex", "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0"),
    source: "mangadex",
    sourceId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
    slug: "solo-leveling",
    title: "Solo Leveling",
    altTitles: ["Na Honjaman Level-Up", "I Level Up Alone"],
    cover:
      "https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg.512.jpg",
    author: "Chugong",
    status: "completed",
    genres: ["Action", "Fantasy", "Adventure"],
    description:
      "Một thợ săn yếu nhất dần bước vào thế giới hầm ngục khắc nghiệt, nơi mỗi trận chiến đều mở ra một nấc tiến hóa mới.",
    lastChapter: "179",
    updatedAt: now,
    rating: 9.1,
  },
  {
    id: makeScopedId("mangadex", "aa6c76f7-5f5f-46b6-a800-911145f81b9b"),
    source: "mangadex",
    sourceId: "aa6c76f7-5f5f-46b6-a800-911145f81b9b",
    slug: "my-dress-up-darling",
    title: "My Dress-Up Darling",
    altTitles: ["Sono Bisque Doll wa Koi o Suru"],
    cover:
      "https://uploads.mangadex.org/covers/aa6c76f7-5f5f-46b6-a800-911145f81b9b/d3e909b9-c667-48a5-beec-ac96f23fa228.jpg.512.jpg",
    author: "Shinichi Fukuda",
    status: "ongoing",
    genres: ["Romance", "Comedy", "Slice of Life"],
    description:
      "Một câu chuyện dịu, sáng và nhiều chi tiết thủ công về cosplay, cảm xúc tuổi trẻ và cách hai người học nhìn thấy nhau rõ hơn.",
    lastChapter: "112",
    updatedAt: now,
    rating: 8.6,
  },
  {
    id: makeScopedId("mangadex", "77bee52c-d2d6-44ad-a33a-1734c1fe696a"),
    source: "mangadex",
    sourceId: "77bee52c-d2d6-44ad-a33a-1734c1fe696a",
    slug: "eminence-in-shadow",
    title: "The Eminence in Shadow",
    altTitles: ["Kage no Jitsuryokusha ni Naritakute!"],
    cover:
      "https://uploads.mangadex.org/covers/77bee52c-d2d6-44ad-a33a-1734c1fe696a/6079dd31-838b-4d61-87c4-121f3ad19158.jpg.512.jpg",
    author: "Daisuke Aizawa",
    status: "ongoing",
    genres: ["Action", "Comedy", "Isekai"],
    description:
      "Một fantasy châm biếm có nhịp nhanh, nơi trò chơi nhập vai của nhân vật chính cứ liên tục va vào những âm mưu thật.",
    lastChapter: "69",
    updatedAt: now,
    rating: 8.3,
  },
  {
    id: makeScopedId("sample", "blue-period"),
    source: "sample",
    sourceId: "blue-period",
    slug: "blue-period",
    title: "Blue Period",
    altTitles: ["Khoảng Xanh"],
    cover:
      "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=900&q=80",
    author: "Tsubasa Yamaguchi",
    status: "ongoing",
    genres: ["Drama", "Art", "Seinen"],
    description:
      "Một nhịp đọc chậm hơn về nghệ thuật, áp lực thi cử và cảm giác lần đầu tìm được thứ khiến mình muốn nghiêm túc sống.",
    lastChapter: "71",
    updatedAt: now,
    rating: 8.8,
  },
  {
    id: makeScopedId("sample", "witch-hat-atelier"),
    source: "sample",
    sourceId: "witch-hat-atelier",
    slug: "witch-hat-atelier",
    title: "Witch Hat Atelier",
    altTitles: ["Atelier Chiếc Mũ Phù Thuỷ"],
    cover:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80",
    author: "Kamome Shirahama",
    status: "ongoing",
    genres: ["Fantasy", "Adventure", "Magic"],
    description:
      "Một thế giới phép thuật được vẽ bằng đường nét tinh tế, nơi sự tò mò của một cô bé mở ra cả vẻ đẹp lẫn trách nhiệm.",
    lastChapter: "83",
    updatedAt: now,
    rating: 9.0,
  },
  {
    id: makeScopedId("sample", "inkrail-demo"),
    source: "sample",
    sourceId: "inkrail-demo",
    slug: "inkrail-demo",
    title: "Bản xem thử InkRail",
    altTitles: [],
    cover: "/sample-pages/page-1.svg",
    author: null,
    status: "completed",
    genres: [],
    description: "Thử lật trang, đổi bố cục và lưu vị trí với các trang minh họa mẫu.",
    lastChapter: "1",
    updatedAt: now,
    rating: null,
    format: "manga",
    languages: ["vi"],
  },
];

export const sampleChapters: Chapter[] = [
  {
    id: makeScopedId("sample", "solo-leveling-001"),
    mangaId: makeScopedId("sample", "inkrail-demo"),
    source: "sample",
    sourceId: "solo-leveling-001",
    number: "1",
    title: "Cánh cổng mở ra",
    language: "vi",
    updatedAt: now,
    pages: Array.from({ length: 6 }, (_, index) => ({
      index,
      url: `/sample-pages/page-${index + 1}.svg`,
      width: 900,
      height: 1280,
    })),
  },
];
