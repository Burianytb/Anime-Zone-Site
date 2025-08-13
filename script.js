import {
  buscarTopAvaliados,
  buscarMaisVistos,
  buscarTemporadaAtual,
  buscarPorNome,
  buscarPorGenero,
  buscarSinopsePT
} from './api.js';

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("overlay-loading");
  const paginaAtual = window.location.pathname.split("/").pop();
  const paginasPublicas = ["", "resultado.html", "index.html", "login.html", "registro.html", "anime.html"];
  const paginasComLoading = ["index.html", "resultado.html", "anime.html"];

  if (paginasComLoading.includes(paginaAtual)) {
    overlay?.classList.remove("hidden");
  }

  const usuarioLogado = JSON.parse(sessionStorage.getItem("usuarioLogado"));
  const users = JSON.parse(localStorage.getItem("users") || "{}");
  let listaWatchlist = usuarioLogado ? users[usuarioLogado.username]?.watchlist || [] : [];

  if (!usuarioLogado && !paginasPublicas.includes(paginaAtual)) {
    window.location.href = "login.html";
    return;
  }

  if (usuarioLogado && ["login.html", "registro.html"].includes(paginaAtual)) {
    window.location.href = "index.html";
    return;
  }

  const loginBtn = document.querySelector(".login-btn");
  const registerBtn = document.querySelector(".register-btn");

  if (usuarioLogado && loginBtn && registerBtn) {
    loginBtn.textContent = `${usuarioLogado.username}`;
    loginBtn.href = "watchlist.html";
    registerBtn.textContent = "Sair";
    registerBtn.href = "#";
    registerBtn.addEventListener("click", e => {
      e.preventDefault();
      sessionStorage.removeItem("usuarioLogado");
      window.location.reload();
    });
  }
  const submenuGeneros = document.querySelector(".dropdown .submenu-generos");
  const mapaGeneros = {
    "Ação": 1, "Aventura": 2, "Comédia": 4, "Drama": 8,
    "Fantasia": 10, "Horror": 14, "Mecha": 18, "Música": 19,
    "Mistério": 7, "Romance": 22, "Ficção Científica": 24,
    "Slice of Life": 36, "Esportes": 30, "Sobrenatural": 37,
    "Suspense": 41
  };

  if (submenuGeneros) {
    Object.keys(mapaGeneros).forEach(gen => {
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = gen;
      link.addEventListener("click", e => {
        e.preventDefault();
        window.location.href = `resultado.html?genero=${encodeURIComponent(gen)}`;
      });

      const li = document.createElement("li");
      li.append(link);
      submenuGeneros.append(li);
    });
  }

  const searchInput = document.getElementById("search");
  const searchResults = document.getElementById("search-results");

  if (searchInput) {
    let debounceTimer;

    // Evita autocomplete na página resultado.html
    if (paginaAtual === "resultado.html") {
      searchInput.value = ""; // limpa o campo
      searchResults.style.display = "none";
      return;
    }

    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const q = searchInput.value.trim();
      if (q.length < 2) {
        searchResults.style.display = "none";
        return;
      }

      debounceTimer = setTimeout(async () => {
        const resultados = (await buscarPorNome(q)).slice(0, 4); // mostra só os 4 primeiros
        searchResults.innerHTML = "";

        if (resultados.length > 0) {
          const sinopses = await Promise.all(resultados.map(async anime => {
            const titulo = anime.title_pt || anime.title || anime.title_english;
            const sinopsePT = await buscarSinopsePT(titulo);
            return sinopsePT?.length > 140 ? sinopsePT.substring(0, 137) + "..." : sinopsePT || "Sinopse não disponível";
          }));

          resultados.forEach((anime, i) => {
            const titulo = anime.title_pt || anime.title || anime.title_english;
            const sinopse = sinopses[i];
            const jaSalvo = listaWatchlist.includes(anime.mal_id);
            const textoBtn = jaSalvo ? "✔️ Salvo" : "➕ Adicionar";

            const a = document.createElement("a");
            a.className = "search-item";
            a.href = `anime.html?id=${anime.mal_id}`;
            a.innerHTML = `
            <img src="${anime.images.jpg?.image_url}" alt="${titulo}" />
            <div>
              <strong>${titulo}</strong>
              <span class="rating">Score: ${anime.score || "N/A"}</span>
              <p class="sinopse">${sinopse}</p>
            </div>
          `;

            const botao = document.createElement("button");
            botao.className = "btn-watchlist";
            botao.textContent = textoBtn;
            botao.addEventListener("click", e => {
              e.preventDefault();
              if (usuarioLogado) {
                const dados = users[usuarioLogado.username] || { watchlist: [] };
                if (!dados.watchlist.includes(anime.mal_id)) {
                  dados.watchlist.push(anime.mal_id);
                  users[usuarioLogado.username] = dados;
                  localStorage.setItem("users", JSON.stringify(users));
                  botao.textContent = "✔️ Salvo";
                  listaWatchlist = dados.watchlist;
                }
              }
            });

            a.appendChild(botao);
            searchResults.appendChild(a);
          });

          const verMais = document.createElement("a");
          verMais.className = "search-item ver-mais";
          verMais.href = `resultado.html?busca=${encodeURIComponent(q)}`;
          verMais.textContent = `🔍 Ver todos os resultados para "${q}"`;
          searchResults.appendChild(verMais);

          searchResults.style.display = "block";
        } else {
          searchResults.style.display = "none";
        }
      }, 300);
    });

    searchInput.addEventListener("keypress", e => {
      if (e.key === "Enter") {
        const q = searchInput.value.trim();
        if (q) {
          searchResults.style.display = "none"; // oculta dropdown antes de redirecionar
          window.location.href = `resultado.html?busca=${encodeURIComponent(q)}`;
        }
      }
    });

    document.addEventListener("click", e => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = "none";
      }
    });
  }

  const params = new URLSearchParams(window.location.search);
  const generoQuery = params.get("genero");
  const buscaQuery = params.get("busca");

  if (paginaAtual === "watchlist.html") {
    carregarWatchlist().finally(() => overlay?.classList.add("hidden"));
  } else if (generoQuery) {
    buscarPorGenero(generoQuery).then(animes => {
      preencherLista("resultado-genero", animes);
    }).finally(() => overlay?.classList.add("hidden"));
  } else if (buscaQuery) {
    buscarPorNome(buscaQuery).then(animes => {
      preencherLista("resultado-busca", animes);
    }).finally(() => overlay?.classList.add("hidden"));
  } else {
    carregarListas().finally(() => overlay?.classList.add("hidden"));
  }

  async function carregarListas() {
    await preencherLista("mais-vistos-list", await buscarMaisVistos());
    await preencherLista("top-avaliados-list", await buscarTopAvaliados(), true);
    await preencherLista("temporada-atual-list", await buscarTemporadaAtual());
  }

  async function preencherLista(id, animes, mostrarNota = false) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = "";

    for (const anime of animes) {
      const titulo = anime.title_pt || anime.title || anime.title_english;
      const jaSalvo = listaWatchlist.includes(anime.mal_id);
      const mostrarBotaoSinopse = paginaAtual === "index.html";

      const li = document.createElement("li");
      li.classList.add("splide__slide");

      const card = document.createElement("div");
      card.classList.add("card-anime");

      const link = document.createElement("a");
      link.href = `anime.html?id=${anime.mal_id}`;
      link.innerHTML = `
      <img src="${anime.images.jpg?.image_url}" alt="${titulo}" />
      <h3>${titulo}</h3>
      ${mostrarNota ? `<p class="rating">Nota: ${anime.score}/10</p>` : ""}
      <p class="descricao" style="display:none;"></p>
    `;

      card.appendChild(link);

      // Botão de sinopse
      if (mostrarBotaoSinopse) {
        const btnSinopse = document.createElement("button");
        btnSinopse.className = "btn-sinopse-pt";
        btnSinopse.textContent = "🇧🇷 Ver sinopse";
        btnSinopse.setAttribute("draggable", "false");

        btnSinopse.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          btnSinopse.textContent = "🔄 Carregando...";
          const cacheKey = `sinopse_${titulo}`;
          const cached = localStorage.getItem(cacheKey);

          let texto;
          if (cached) {
            texto = cached;
          } else {
            const sinopsePT = await buscarSinopsePT(titulo);
            texto = sinopsePT?.length > 120
              ? sinopsePT.substring(0, 117) + "..."
              : sinopsePT || "Sinopse não disponível.";
            localStorage.setItem(cacheKey, texto);
          }

          const sinopseEl = link.querySelector(".descricao");
          sinopseEl.textContent = texto;
          sinopseEl.style.display = "block";
          btnSinopse.remove();
        });

        card.appendChild(btnSinopse);
      }

      // Botão de watchlist
      const btnWatchlist = document.createElement("button");
      btnWatchlist.className = `btn-watchlist-icon ${jaSalvo ? "ativo" : ""}`;
      btnWatchlist.textContent = jaSalvo ? "✅" : "➕";
      btnWatchlist.setAttribute("data-id", anime.mal_id);

      btnWatchlist.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!usuarioLogado) return;

        const dados = users[usuarioLogado.username] || { watchlist: [] };
        const animeId = Number(btnWatchlist.getAttribute("data-id"));

        if (!dados.watchlist.includes(animeId)) {
          dados.watchlist.push(animeId);
          users[usuarioLogado.username] = dados;
          localStorage.setItem("users", JSON.stringify(users));
          btnWatchlist.classList.add("ativo");
          btnWatchlist.textContent = "✅";
          listaWatchlist = dados.watchlist;
        }
      });

      card.appendChild(btnWatchlist);
      li.appendChild(card);
      container.appendChild(li);
    }

    // Inicializa carrossel normalmente com loop
    if (!id.includes("resultado")) {
      new Splide(`#${id.replace("-list", "")}`, {
        type: 'loop',
        perPage: 5,
        gap: '0.5rem',
        perMove: 1,
        autoplay: window.innerWidth > 768,
        drag: false,
        trimSpace: false,
        breakpoints: {
          1200: { perPage: 4 },
          1024: { perPage: 3 },
          768: { perPage: 2.4 },
          480: { perPage: 2.1 },
          360: { perPage: 1.5 }
        }
      }).mount();
    }
  }
});
