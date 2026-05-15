class CreatePages < ActiveRecord::Migration[8.0]
  def change
    create_table :pages do |t|
      t.references :album, null: false, foreign_key: true
      t.integer :position, null: false, default: 1
      t.string :paper_kind, default: "cream"
      t.string :title

      t.timestamps
    end
    add_index :pages, [ :album_id, :position ]
  end
end
