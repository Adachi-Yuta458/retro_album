class CreateAlbums < ActiveRecord::Migration[8.0]
  def change
    create_table :albums do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false
      t.string :subtitle
      t.string :year
      t.string :category
      t.string :theme, default: "A"
      t.string :spine_color, default: "#f0a890"
      t.string :spine_cloth_color, default: "#d88670"
      t.string :spine_deco, default: "gold"

      t.timestamps
    end
  end
end
