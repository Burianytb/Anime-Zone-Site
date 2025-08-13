import { buscarPorId } from './api.js';


document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("watchlist-list");

  // 🎭 Dados do perfil
  const avatarPerfil = document.getElementById("perfil-avatar");
  const nomePerfil = document.getElementById("perfil-nome");
  const emailPerfil = document.getElementById("perfil-email");
  const totalPerfil = document.getElementById("perfil-total");
  const desdePerfil = document.getElementById("perfil-desde");

  // 🔐 Dados do usuário logado
  const usuarioLogado = JSON.parse(sessionStorage.getItem("usuarioLogado"));
  if (!usuarioLogado) return;

  avatarPerfil.src = usuarioLogado.avatar || "default-avatar.png";
  avatarPerfil.alt = usuarioLogado.username;
  nomePerfil.textContent = usuarioLogado.username;
  emailPerfil.textContent = usuarioLogado.email || "não informado";

  if (usuarioLogado.dataRegistro) {
    const data = new Date(usuarioLogado.dataRegistro);
    const dia = data.getDate().toString().padStart(2, "0");
    const mes = data.toLocaleString("pt-BR", { month: "long" });
    const ano = data.getFullYear();
    const dataFormatada = `${dia} de ${mes} de ${ano}`;

    const hoje = new Date();
    const diffMs = hoje - data;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMeses = Math.floor(diffDias / 30);
    const diffAnos = Math.floor(diffMeses / 12);

    let tempoStr = `há ${diffDias} dias`;
    if (diffMeses >= 1) {
      const mesesRestantes = diffMeses % 12;
      tempoStr = `há ${diffAnos} ano${diffAnos !== 1 ? "s" : ""}`;
      if (mesesRestantes > 0) {
        tempoStr += ` e ${mesesRestantes} mês${mesesRestantes !== 1 ? "es" : ""}`;
      }
    }

    desdePerfil.textContent = `Membro desde ${dataFormatada} (${tempoStr})`;
  } else {
    desdePerfil.textContent = "Data de registro indisponível";
  }

  const users = JSON.parse(localStorage.getItem("users") || "{}");
  let watchlist = users[usuarioLogado.username]?.watchlist || [];

  if (watchlist.length === 0) {
    container.innerHTML = "<p>Sua watchlist está vazia.</p>";
    totalPerfil.textContent = "0";
    return;
  }

  totalPerfil.textContent = watchlist.length;

  for (const id of watchlist) {
    const anime = await buscarPorId(id);
    if (!anime) continue;

    const card = document.createElement("div");
    card.classList.add("anime-card");
    card.innerHTML = `
      <a href="anime.html?id=${anime.mal_id}">
        <img src="${anime.images.jpg.image_url}" alt="${anime.title}">
        <h3>${anime.title}</h3>
      </a>
      <button class="remove-btn">Remover</button>
    `;

    const removeBtn = card.querySelector(".remove-btn");
    removeBtn.addEventListener("click", () => {
      card.remove();

      const index = watchlist.indexOf(anime.mal_id);
      if (index !== -1) {
        watchlist.splice(index, 1);

        // Atualiza em localStorage
        users[usuarioLogado.username].watchlist = watchlist;
        localStorage.setItem("users", JSON.stringify(users));

        totalPerfil.textContent = watchlist.length;

        if (watchlist.length === 0) {
          container.innerHTML = "<p>Sua watchlist está vazia.</p>";
        }
      }
    });

    container.appendChild(card);
  }
});
