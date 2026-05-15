class AlbumsController < ApplicationController
  before_action :authenticate!
  before_action :set_album, only: %i[show update destroy]

  # GET /albums
  def index
    albums = current_user.albums.order(updated_at: :desc)
    render json: { albums: albums.map { |a| AlbumSerializer.summary(a) } }
  end

  # POST /albums
  def create
    album = current_user.albums.new(album_params)
    album.save!
    render json: { album: AlbumSerializer.full(album) }, status: :created
  end

  # GET /albums/:id
  def show
    render json: { album: AlbumSerializer.full(@album) }
  end

  # PATCH /albums/:id
  def update
    @album.update!(album_params)
    render json: { album: AlbumSerializer.full(@album) }
  end

  # DELETE /albums/:id
  def destroy
    @album.destroy!
    head :no_content
  end

  private

  def set_album
    @album = current_user.albums.find(params[:id])
  end

  def album_params
    params.permit(:title, :subtitle, :year, :category, :theme,
      :spine_color, :spine_cloth_color, :spine_deco)
  end
end
