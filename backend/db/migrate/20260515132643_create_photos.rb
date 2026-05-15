class CreatePhotos < ActiveRecord::Migration[8.0]
  def change
    create_table :photos do |t|
      t.references :page, null: false, foreign_key: true
      t.string :caption
      t.string :scene
      t.float :x, default: 0.5
      t.float :y, default: 0.4
      t.float :w, default: 0.55
      t.float :h, default: 0.45
      t.float :rotation, default: 0.0
      t.string :corner_kind, default: "kraft"
      t.string :washi_tape_color
      t.string :sticker_kind
      t.string :sticker_color

      t.timestamps
    end
  end
end
