class User < ApplicationRecord
  has_secure_password

  has_many :sessions, dependent: :destroy
  has_many :albums, dependent: :destroy

  validates :email, presence: true, uniqueness: { case_sensitive: false },
    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true

  before_save { self.email = email.downcase.strip if email }
end
