# Project architecture rules

- Send customer authentication callbacks to `https://dropthatthing.com` so production recovery and confirmation never route through an editor preview domain.