class Album < ApplicationRecord
  THEMES = %w[A B C].freeze
  CATEGORIES = %w[family travel event old all].freeze
  SPINE_DECOS = %w[gold silver].freeze

  belongs_to :user
  has_many :pages, -> { order(:position) }, dependent: :destroy

  validates :title, presence: true
  validates :theme, inclusion: { in: THEMES }, allow_nil: true
  validates :spine_deco, inclusion: { in: SPINE_DECOS }, allow_nil: true

  after_create :seed_first_page

  def cover_photo
    pages.joins(:photos).order(:position).first&.photos&.first
  end

  private

  def seed_first_page
    pages.create!(
      position: 1,
      paper_kind: default_paper_kind_for_theme
    )
  end

  def default_paper_kind_for_theme
    case theme
    when "A" then "kraft"
    when "B" then "pink"
    when "C" then "mint"
    else "cream"
    end
  end
end
