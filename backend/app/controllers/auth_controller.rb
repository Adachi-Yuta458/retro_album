class AuthController < ApplicationController
  before_action :authenticate!, only: %i[me logout]

  # POST /signup
  def signup
    user = User.new(signup_params)
    if user.save
      session = user.sessions.create!
      render json: { token: session.token, user: user_json(user) }, status: :created
    else
      render json: { error: "invalid", details: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # POST /login
  def login
    user = User.find_by(email: params[:email].to_s.downcase.strip)
    if user&.authenticate(params[:password])
      session = user.sessions.create!
      render json: { token: session.token, user: user_json(user) }
    else
      render json: { error: "invalid_credentials" }, status: :unauthorized
    end
  end

  # GET /me
  def me
    render json: { user: user_json(current_user) }
  end

  # DELETE /logout
  def logout
    header = request.headers["Authorization"].to_s
    token = header.sub(/^Bearer\s+/i, "")
    Session.where(token: token).destroy_all
    head :no_content
  end

  private

  def signup_params
    params.permit(:email, :password, :name)
  end

  def user_json(u)
    { id: u.id, email: u.email, name: u.name }
  end
end
