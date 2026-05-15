class Page < ApplicationRecord
  PAPER_KINDS = %w[kraft cream pink mint blue yellow].freeze

  belongs_to :album
  has_many :photos, -> { order(:created_at) }, dependent: :destroy

  validates :position, presence: true,
    numericality: { only_integer: true, greater_than_or_equal_to: 1 }
  validates :paper_kind, inclusion: { in: PAPER_KINDS }, allow_nil: true
end
