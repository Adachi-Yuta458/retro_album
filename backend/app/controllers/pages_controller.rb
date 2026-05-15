class PagesController < ApplicationController
  before_action :authenticate!
  before_action :set_album, only: :create
  before_action :set_page, only: %i[update destroy]

  # POST /albums/:album_id/pages
  def create
    page = @album.pages.new(page_params)
    page.position ||= (@album.pages.maximum(:position) || 0) + 1
    page.save!
    render json: { page: PageSerializer.full(page) }, status: :created
  end

  # PATCH /pages/:id
  def update
    @page.update!(page_params)
    render json: { page: PageSerializer.full(@page) }
  end

  # DELETE /pages/:id
  def destroy
    @page.destroy!
    head :no_content
  end

  private

  def set_album
    @album = current_user.albums.find(params[:album_id])
  end

  def set_page
    @page = Page.joins(:album).where(albums: { user_id: current_user.id }).find(params[:id])
  end

  def page_params
    params.permit(:position, :paper_kind, :title)
  end
end
