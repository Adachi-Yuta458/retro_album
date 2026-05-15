class Photo < ApplicationRecord
  CORNER_KINDS = %w[kraft gold white black].freeze

  belongs_to :page
  has_one_attached :image

  validates :corner_kind, inclusion: { in: CORNER_KINDS }, allow_nil: true

  def image_url
    return nil unless image.attached?
    Rails.application.routes.url_helpers.rails_blob_url(
      image,
      host: Rails.application.config.x.public_host || "http://localhost:3000"
    )
  end
end
