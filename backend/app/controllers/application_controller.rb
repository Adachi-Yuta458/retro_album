class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_invalid

  private

  def current_user
    @current_user ||= begin
      header = request.headers["Authorization"].to_s
      token = header.sub(/^Bearer\s+/i, "").presence
      Session.find_active_by_token(token)&.user
    end
  end

  def authenticate!
    return if current_user
    render json: { error: "unauthorized" }, status: :unauthorized
  end

  def render_not_found(_e = nil)
    render json: { error: "not_found" }, status: :not_found
  end

  def render_invalid(e)
    render json: { error: "invalid", details: e.record&.errors&.full_messages }, status: :unprocessable_entity
  end
end
