document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const genero = params.get("genero");
  const busca = params.get("busca");

  const titulo = document.getElementById("titulo-resultado");
  const lista = document.getElementById("resultado-list");

  const TMDB_API_KEY = "7d779743f4eacd1de7ffc7882da6d63f";

  const mapaGeneros = {
    "Ação": 1, "Aventura": 2, "Comédia": 4, "Drama": 8,
    "Fantasia": 10, "Horror": 14, "Mecha": 18, "Música": 19,
    "Mistério": 7, "Romance": 22, "Ficção Científica": 24,
    "Slice of Life": 36, "Esportes": 30, "Sobrenatural": 37,
    "Suspense": 41
  };

  let watchlist = [];
  const usuario = JSON.parse(sessionStorage.getItem("usuarioLogado"));
  if (usuario) {
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    watchlist = users[usuario.username]?.watchlist || [];
  }

  if (genero) {
    titulo.textContent = `🎭 Gênero: ${genero}`;
    buscarPorGenero(genero);
  } else if (busca) {
    titulo.textContent = `🔍 Busca: ${busca}`;
    iniciarBuscaComDebounce(busca);
  }

  function iniciarBuscaComDebounce(busca) {
    let timer;
    clearTimeout(timer);
    timer = setTimeout(() => {
      buscarPorNomeTMDB(busca);
    }, 400);
  }

  async function obterSinopseTMDB(titulos) {
    for (const nome of titulos) {
      const resBusca = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(nome)}&language=pt-BR`);
      const json = await resBusca.json();
      const serie = json.results?.[0];
      if (serie) {
        const detalhes = await fetch(`https://api.themoviedb.org/3/tv/${serie.id}?api_key=${TMDB_API_KEY}&language=pt-BR`).then(r => r.json());
        if (detalhes.overview?.trim()) {
          return detalhes.overview;
        }
      }
    }
    return null;
  }

  async function buscarPorNomeTMDB(nome) {
    lista.innerHTML = "<p>🔄 Buscando animes...</p>";

    const urlBusca = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(nome)}&language=pt-BR`;

    try {
      const resBusca = await fetch(urlBusca);
      const jsonBusca = await resBusca.json();
      const resultados = jsonBusca.results;

      if (!resultados || resultados.length === 0) {
        lista.innerHTML = "<p>Nenhum resultado encontrado na TMDB.</p>";
        return;
      }

      lista.innerHTML = "";

      for (const item of resultados) {
        const tmdbId = item.id;
        const urlDetalhes = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;

        try {
          const detalhesRes = await fetch(urlDetalhes);
          const detalhes = await detalhesRes.json();

          const nomeAnime = detalhes.name || item.name;
          const sinopse = detalhes.overview || "Sinopse não disponível.";
          const sinopseCurta = sinopse.length > 140 ? sinopse.substring(0, 137) + "..." : sinopse;
          const nota = detalhes.vote_average ?? "N/A";
          const imagem = detalhes.poster_path ? `https://image.tmdb.org/t/p/w500${detalhes.poster_path}` : "default.jpg";
          const jaSalvo = watchlist.includes(tmdbId);

          const card = document.createElement("div");
          card.classList.add("anime-card");
          card.innerHTML = `
            <img src="${imagem}" alt="${nomeAnime}">
            <h3>${nomeAnime}</h3>
            <p>${sinopseCurta}</p>
            <p>⭐ Nota: ${nota}</p>
            <button class="btn-watchlist-icon ${jaSalvo ? 'ativo' : ''}" data-id="${tmdbId}" data-title="${nomeAnime}">
              ${jaSalvo ? "✅" : "➕"}
            </button>
          `;

          const btn = card.querySelector(".btn-watchlist-icon");
          btn.addEventListener("click", e => {
            e.preventDefault();
            const usuario = JSON.parse(sessionStorage.getItem("usuarioLogado"));
            if (usuario) {
              const users = JSON.parse(localStorage.getItem("users") || "{}");
              const dados = users[usuario.username] || { watchlist: [] };

              if (!dados.watchlist.includes(tmdbId)) {
                dados.watchlist.push(tmdbId);
                users[usuario.username] = dados;
                localStorage.setItem("users", JSON.stringify(users));
              }

              btn.classList.add("ativo");
              btn.textContent = "✅";
            }
          });

          lista.appendChild(card);
        } catch {
          console.warn(`❌ Erro ao buscar detalhes do ID ${tmdbId}`);
        }
      }
    } catch (error) {
      lista.innerHTML = "<p>❌ Erro ao buscar dados na TMDB.</p>";
      console.error(error);
    }
  }

  async function buscarPorGenero(nomeGeneroPT) {
    const idGenero = mapaGeneros[nomeGeneroPT];
    if (!idGenero) {
      lista.innerHTML = `<p>❌ Gênero "${nomeGeneroPT}" não reconhecido.</p>`;
      return;
    }

    const url = `https://api.jikan.moe/v4/anime?genres=${idGenero}&limit=20`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      mostrarResultadosJikan(json.data);
    } catch {
      lista.innerHTML = "<p>❌ Erro ao buscar dados na Jikan API.</p>";
    }
  }

  async function mostrarResultadosJikan(animes) {
    lista.innerHTML = "";

    if (!animes || animes.length === 0) {
      lista.innerHTML = "<p>Nenhum resultado encontrado na Jikan.</p>";
      return;
    }

    animes.forEach(anime => {
      const idAnime = anime.mal_id;
      const imagem = anime.images?.jpg?.image_url || "default.jpg";
      const nota = anime.score ?? "N/A";
      const jaSalvo = watchlist.includes(idAnime);
      const titulo = anime.title;

      const card = document.createElement("div");
      card.classList.add("anime-card");
      card.setAttribute("data-id", idAnime);
      card.innerHTML = `
      <a href="anime.html?id=${idAnime}" class="anime-link">
        <img src="${imagem}" alt="${titulo}">
        <h3>${titulo}</h3>
        <p class="sinopse">🔄 Carregando sinopse...</p>
        <p>⭐ Nota: ${nota}</p>
      </a>
      <button class="btn-watchlist-icon ${jaSalvo ? 'ativo' : ''}" data-id="${idAnime}" data-title="${titulo}">
        ${jaSalvo ? "✅" : "➕"}
      </button>
    `;

      const btn = card.querySelector(".btn-watchlist-icon");
      btn.addEventListener("click", e => {
        e.preventDefault();
        const usuario = JSON.parse(sessionStorage.getItem("usuarioLogado"));
        if (usuario) {
          const users = JSON.parse(localStorage.getItem("users") || "{}");
          const dados = users[usuario.username] || { watchlist: [] };

          if (!dados.watchlist.includes(idAnime)) {
            dados.watchlist.push(idAnime);
            users[usuario.username] = dados;
            localStorage.setItem("users", JSON.stringify(users));
          }

          btn.classList.add("ativo");
          btn.textContent = "✅";
        }
      });

      lista.appendChild(card);
      const sinopseEl = card.querySelector(".sinopse");
      obterSinopseTMDB([titulo]).then(sinopse => {
        sinopseEl.textContent = sinopse?.length > 140
          ? sinopse.substring(0, 137) + "..."
          : sinopse || "Sinopse não disponível.";
      });
    });
  }
});
