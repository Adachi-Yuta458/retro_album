Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  post   "/signup", to: "auth#signup"
  post   "/login",  to: "auth#login"
  delete "/logout", to: "auth#logout"
  get    "/me",     to: "auth#me"

  resources :albums do
    resources :pages, only: %i[create]
  end
  resources :pages, only: %i[update destroy] do
    resources :photos, only: %i[create]
  end
  resources :photos, only: %i[update destroy]
end
