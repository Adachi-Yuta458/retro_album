class AlbumSerializer
  def self.summary(album)
    {
      id: album.id,
      title: album.title,
      subtitle: album.subtitle,
      year: album.year,
      category: album.category,
      theme: album.theme,
      spine_color: album.spine_color,
      spine_cloth_color: album.spine_cloth_color,
      spine_deco: album.spine_deco,
      page_count: album.pages.size,
      updated_at: album.updated_at
    }
  end

  def self.full(album)
    summary(album).merge(
      pages: album.pages.map { |p| PageSerializer.full(p) }
    )
  end
end

class PageSerializer
  def self.summary(page)
    {
      id: page.id,
      position: page.position,
      paper_kind: page.paper_kind,
      title: page.title
    }
  end

  def self.full(page)
    summary(page).merge(
      photos: page.photos.map { |ph| PhotoSerializer.full(ph) }
    )
  end
end

class PhotoSerializer
  def self.full(photo)
    {
      id: photo.id,
      caption: photo.caption,
      scene: photo.scene,
      x: photo.x,
      y: photo.y,
      w: photo.w,
      h: photo.h,
      rotation: photo.rotation,
      corner_kind: photo.corner_kind,
      washi_tape_color: photo.washi_tape_color,
      sticker_kind: photo.sticker_kind,
      sticker_color: photo.sticker_color,
      image_url: photo.image_url
    }
  end
end
