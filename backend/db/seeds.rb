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

ALBUMS.each do |attrs|
  album = demo.albums.find_or_initialize_by(title: attrs[:title])
  album.assign_attributes(attrs)
  album.save!

  page = album.pages.first
  next if page.photos.any?

  case album.theme
  when "A"
    page.photos.create!(
      caption: "海はきれいで、光子はじめての海水浴。",
      scene: "beach", x: 0.18, y: 0.16, w: 0.55, h: 0.20, rotation: -1.5,
      corner_kind: "kraft", washi_tape_color: "#7ac8e0", sticker_kind: "sun", sticker_color: "#f4c834"
    )
    page.photos.create!(
      caption: "花さんぽ",
      scene: "park", x: 0.12, y: 0.46, w: 0.30, h: 0.18, rotation: -2.0,
      corner_kind: "kraft"
    )
    page.photos.create!(
      caption: "夕やけ",
      scene: "sunset", x: 0.50, y: 0.48, w: 0.30, h: 0.18, rotation: 2.2,
      corner_kind: "kraft"
    )
  when "B"
    page.photos.create!(
      caption: "ちあき三才。きものはおばあちゃんのてづくり。",
      scene: "kimono", x: 0.08, y: 0.14, w: 0.42, h: 0.30, rotation: -2.0,
      corner_kind: "white", washi_tape_color: "#7ac8a4", sticker_kind: "flower", sticker_color: "#f4a04c"
    )
    page.photos.create!(
      caption: "おじいちゃんとはつもうで",
      scene: "newyear", x: 0.45, y: 0.55, w: 0.42, h: 0.22, rotation: 3.0,
      corner_kind: "gold", washi_tape_color: "#f4c834", sticker_kind: "heart", sticker_color: "#f0648a"
    )
  when "C"
    page.photos.create!(
      caption: "桜井 弘 ・ 静江\n神田明神にて",
      scene: "kimono", x: 0.22, y: 0.12, w: 0.56, h: 0.40, rotation: 0,
      corner_kind: "white", sticker_kind: "flower", sticker_color: "#f4a04c"
    )
    page.photos.create!(
      caption: nil, scene: "family", x: 0.12, y: 0.62, w: 0.32, h: 0.20, rotation: 0,
      corner_kind: "white"
    )
    page.photos.create!(
      caption: nil, scene: "park", x: 0.52, y: 0.62, w: 0.32, h: 0.20, rotation: 0,
      corner_kind: "white"
    )
  end
end

puts "✅ Seeded #{User.count} user, #{Album.count} albums, #{Page.count} pages, #{Photo.count} photos"
