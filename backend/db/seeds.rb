# デモユーザー＋デザインに登場する6冊のアルバムをシードする
demo = User.find_or_initialize_by(email: "demo@example.com")
demo.assign_attributes(name: "光子", password: "password", password_confirmation: "password")
demo.save!

ALBUMS = [
  { title: "家族のきろく", subtitle: "春夏秋冬", year: "1984", category: "family", theme: "A",
    spine_color: "#f0a890", spine_cloth_color: "#d88670", spine_deco: "gold" },
  { title: "夏のおもいで", subtitle: "海と祭り", year: "1983", category: "travel", theme: "A",
    spine_color: "#7ac8e0", spine_cloth_color: "#4ea4c0", spine_deco: "silver" },
  { title: "入学のころ",   subtitle: "春・桜",   year: "1982", category: "event", theme: "C",
    spine_color: "#b8d49a", spine_cloth_color: "#90b070", spine_deco: "gold" },
  { title: "お正月",       subtitle: "おせち・凧", year: "1985", category: "event", theme: "B",
    spine_color: "#f5c0d0", spine_cloth_color: "#e090ac", spine_deco: "gold" },
  { title: "七五三",       subtitle: "神社にて", year: "1983", category: "event", theme: "B",
    spine_color: "#f5dc7e", spine_cloth_color: "#d8b840", spine_deco: "silver" },
  { title: "結婚記念",     subtitle: "父母のいち日", year: "1960", category: "family", theme: "C",
    spine_color: "#bee4d2", spine_cloth_color: "#84c8a8", spine_deco: "gold" }
]

PAPER_BY_THEME = { "A" => "kraft", "B" => "pink", "C" => "mint" }.freeze

def seed_photos_for(page, theme, page_number)
  case theme
  when "A" then seed_theme_a(page, page_number)
  when "B" then seed_theme_b(page, page_number)
  when "C" then seed_theme_c(page, page_number)
  end
end

def seed_theme_a(page, n)
  case n
  when 1
    page.photos.create!(caption: "海はきれいで、光子はじめての海水浴。",
      scene: "beach", x: 0.18, y: 0.16, w: 0.55, h: 0.20, rotation: -1.5,
      corner_kind: "kraft", washi_tape_color: "#7ac8e0", sticker_kind: "sun", sticker_color: "#f4c834")
    page.photos.create!(caption: "花さんぽ",
      scene: "park", x: 0.12, y: 0.46, w: 0.30, h: 0.18, rotation: -2.0,
      corner_kind: "kraft")
    page.photos.create!(caption: "夕やけ",
      scene: "sunset", x: 0.50, y: 0.48, w: 0.30, h: 0.18, rotation: 2.2,
      corner_kind: "kraft")
  when 2
    page.photos.create!(caption: "夏まつり、ヨーヨーつり",
      scene: "festival", x: 0.10, y: 0.10, w: 0.42, h: 0.30, rotation: 1.4,
      corner_kind: "kraft", washi_tape_color: "#f4c834")
    page.photos.create!(caption: "アイスがとけそうで",
      scene: "ice", x: 0.55, y: 0.20, w: 0.35, h: 0.22, rotation: -2.5,
      corner_kind: "kraft")
    page.photos.create!(caption: "むしとり名人",
      scene: "park", x: 0.20, y: 0.55, w: 0.50, h: 0.28, rotation: 0.8,
      corner_kind: "kraft", sticker_kind: "flower", sticker_color: "#7ac8a4")
  when 3
    page.photos.create!(caption: "ひまわり畑",
      scene: "park", x: 0.12, y: 0.14, w: 0.74, h: 0.32, rotation: 0,
      corner_kind: "kraft", washi_tape_color: "#7ac8e0")
    page.photos.create!(caption: "夕飯のすいか",
      scene: "family", x: 0.15, y: 0.55, w: 0.34, h: 0.28, rotation: -1.8,
      corner_kind: "kraft")
    page.photos.create!(caption: "花火、しゅるしゅる",
      scene: "festival", x: 0.55, y: 0.58, w: 0.32, h: 0.26, rotation: 2.5,
      corner_kind: "kraft")
  when 4
    page.photos.create!(caption: "うみの家、おばあちゃんと",
      scene: "beach", x: 0.18, y: 0.18, w: 0.65, h: 0.35, rotation: -1.0,
      corner_kind: "kraft", sticker_kind: "sun", sticker_color: "#f4c834")
    page.photos.create!(caption: "おみやげの貝がら",
      scene: "beach", x: 0.20, y: 0.58, w: 0.55, h: 0.25, rotation: 1.5,
      corner_kind: "kraft", washi_tape_color: "#f4c834")
  end
end

def seed_theme_b(page, n)
  case n
  when 1
    page.photos.create!(caption: "ちあき三才。きものはおばあちゃんのてづくり。",
      scene: "kimono", x: 0.08, y: 0.14, w: 0.42, h: 0.30, rotation: -2.0,
      corner_kind: "white", washi_tape_color: "#7ac8a4", sticker_kind: "flower", sticker_color: "#f4a04c")
    page.photos.create!(caption: "おじいちゃんとはつもうで",
      scene: "newyear", x: 0.45, y: 0.55, w: 0.42, h: 0.22, rotation: 3.0,
      corner_kind: "gold", washi_tape_color: "#f4c834", sticker_kind: "heart", sticker_color: "#f0648a")
  when 2
    page.photos.create!(caption: "おせち・かまぼこは光子のすきな色",
      scene: "newyear", x: 0.15, y: 0.12, w: 0.70, h: 0.30, rotation: 0,
      corner_kind: "gold", washi_tape_color: "#f4c834")
    page.photos.create!(caption: "凧あげ、風がよわくて",
      scene: "newyear", x: 0.18, y: 0.55, w: 0.62, h: 0.28, rotation: -1.5,
      corner_kind: "white", sticker_kind: "heart", sticker_color: "#f0648a")
  when 3
    page.photos.create!(caption: "ひな祭り、おさげ髪",
      scene: "kimono", x: 0.12, y: 0.10, w: 0.50, h: 0.40, rotation: 1.2,
      corner_kind: "white", washi_tape_color: "#7ac8a4")
    page.photos.create!(caption: "お雛さま",
      scene: "kimono", x: 0.55, y: 0.55, w: 0.35, h: 0.28, rotation: -2.0,
      corner_kind: "gold", sticker_kind: "flower", sticker_color: "#f4a04c")
  when 4
    page.photos.create!(caption: "七五三、千歳飴",
      scene: "kimono", x: 0.18, y: 0.18, w: 0.64, h: 0.40, rotation: 0.5,
      corner_kind: "gold", washi_tape_color: "#f4c834", sticker_kind: "heart", sticker_color: "#f0648a")
    page.photos.create!(caption: "神社の階段",
      scene: "kimono", x: 0.22, y: 0.62, w: 0.56, h: 0.25, rotation: 2.0,
      corner_kind: "white")
  end
end

def seed_theme_c(page, n)
  case n
  when 1
    page.photos.create!(caption: "桜井 弘 ・ 静江\n神田明神にて",
      scene: "kimono", x: 0.22, y: 0.12, w: 0.56, h: 0.40, rotation: 0,
      corner_kind: "white", sticker_kind: "flower", sticker_color: "#f4a04c")
    page.photos.create!(caption: nil, scene: "family",
      x: 0.12, y: 0.62, w: 0.32, h: 0.20, rotation: 0, corner_kind: "white")
    page.photos.create!(caption: nil, scene: "park",
      x: 0.52, y: 0.62, w: 0.32, h: 0.20, rotation: 0, corner_kind: "white")
  when 2
    page.photos.create!(caption: "祖父の家、縁側にて",
      scene: "family", x: 0.15, y: 0.15, w: 0.70, h: 0.35, rotation: 0,
      corner_kind: "white", washi_tape_color: "#bee4d2")
    page.photos.create!(caption: "庭の梅",
      scene: "park", x: 0.18, y: 0.60, w: 0.62, h: 0.25, rotation: -1.5,
      corner_kind: "white")
  when 3
    page.photos.create!(caption: "結婚式当日、玄関にて",
      scene: "kimono", x: 0.20, y: 0.12, w: 0.60, h: 0.42, rotation: 1.0,
      corner_kind: "gold", washi_tape_color: "#f4c834")
    page.photos.create!(caption: "親族集合写真",
      scene: "family", x: 0.10, y: 0.60, w: 0.80, h: 0.26, rotation: 0,
      corner_kind: "white")
  when 4
    page.photos.create!(caption: "新婚旅行、汽車のなかで",
      scene: "family", x: 0.15, y: 0.16, w: 0.66, h: 0.30, rotation: -1.2,
      corner_kind: "white")
    page.photos.create!(caption: "宿のまえで",
      scene: "park", x: 0.18, y: 0.58, w: 0.60, h: 0.28, rotation: 1.8,
      corner_kind: "white", sticker_kind: "flower", sticker_color: "#f4a04c")
  end
end

ALBUMS.each do |attrs|
  album = demo.albums.find_or_initialize_by(title: attrs[:title])
  album.assign_attributes(attrs)
  album.save!

  paper_kind = PAPER_BY_THEME[album.theme] || "cream"
  (1..4).each do |n|
    page = album.pages.find_or_initialize_by(position: n)
    page.paper_kind = paper_kind
    page.save!
    next if page.photos.any?
    seed_photos_for(page, album.theme, n)
  end
end

puts "✅ Seeded #{User.count} user, #{Album.count} albums, #{Page.count} pages, #{Photo.count} photos"
