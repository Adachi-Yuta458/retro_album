require "securerandom"

class Session < ApplicationRecord
  belongs_to :user

  before_validation :generate_token, on: :create
  before_validation :set_expiry, on: :create

  validates :token, presence: true, uniqueness: true

  scope :active, -> { where("expires_at > ?", Time.current) }

  def self.find_active_by_token(token)
    return nil if token.blank?
    active.find_by(token: token)
  end

  private

  def generate_token
    self.token ||= SecureRandom.urlsafe_base64(32)
  end

  def set_expiry
    self.expires_at ||= 30.days.from_now
  end
end
