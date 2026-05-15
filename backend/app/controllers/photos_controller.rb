class PhotosController < ApplicationController
  before_action :authenticate!
  before_action :set_page, only: :create
  before_action :set_photo, only: %i[update destroy]

  # POST /pages/:page_id/photos
  def create
    photo = @page.photos.new(photo_params.except(:image))
    photo.image.attach(params[:image]) if params[:image].present?
    photo.save!
    render json: { photo: PhotoSerializer.full(photo) }, status: :created
  end

  # PATCH /photos/:id
  def update
    @photo.update!(photo_params.except(:image))
    @photo.image.attach(params[:image]) if params[:image].present?
    render json: { photo: PhotoSerializer.full(@photo) }
  end

  # DELETE /photos/:id
  def destroy
    @photo.destroy!
    head :no_content
  end

  private

  def set_page
    @page = Page.joins(:album).where(albums: { user_id: current_user.id }).find(params[:page_id])
  end

  def set_photo
    @photo = Photo.joins(page: :album).where(albums: { user_id: current_user.id }).find(params[:id])
  end

  def photo_params
    params.permit(:caption, :scene, :x, :y, :w, :h, :rotation,
      :corner_kind, :washi_tape_color, :sticker_kind, :sticker_color, :image)
  end
end
