import {
  buscarPorId,
  buscarSinopsePT,
  buscarDetalhesSerie
} from './api.js';

// Verifica se usuário está logado
const usuarioLogado = JSON.parse(sessionStorage.getItem("usuarioLogado"));
const nomeUsuario = usuarioLogado?.username || "Usuário";
const avatarUsuario = usuarioLogado?.avatar ? usuarioLogado.avatar : gerarAvatarAleatorio();


// Gera avatar aleatório para visitantes
function gerarAvatarAleatorio() {
  const id = Math.floor(Math.random() * 12) + 1; // Supondo que tenha avatar-1.png até avatar-12.png
  return `avatares/avatar-${id}.png`;
}

function getComentarios() {
  return JSON.parse(localStorage.getItem("comentariosPorAnime") || "{}");
}

function salvarComentarios(comentarios) {
  localStorage.setItem("comentariosPorAnime", JSON.stringify(comentarios));
}

document.addEventListener("DOMContentLoaded", async () => {
  const id = parseInt(new URLSearchParams(window.location.search).get("id"));
  if (!id) return;

  const anime = await buscarPorId(id);
  if (!anime) return;

  document.getElementById("anime-img").src =
    anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url ||
    anime.bannerImage ||
    "";

  document.getElementById("anime-title").textContent =
    anime.title?.romaji || anime.title?.english || anime.title || "Sem título";


  const tituloOriginal =
    typeof anime.title === "string"
      ? anime.title
      : anime.title?.english || anime.title?.romaji || anime.title?.native || "Título desconhecido";

  const sinopsePT = await buscarSinopsePT(tituloOriginal);

  document.getElementById("anime-sinopse").textContent = sinopsePT || anime.synopsis || "Sinopse não encontrada.";

  const listaEps = document.getElementById("lista-episodios");
  const detalhes = await buscarDetalhesSerie(tituloOriginal);

  if (detalhes?.temporadas) {
    detalhes.temporadas.forEach(temporada => {
      const titulo = document.createElement("h4");
      titulo.textContent = `📅 ${temporada.nome}`;
      titulo.classList.add("temporada-toggle");
      const lista = document.createElement("ul");
      lista.style.display = "none";

      titulo.addEventListener("click", () => {
        lista.style.display = lista.style.display === "none" ? "block" : "none";
      });

      temporada.episodios.forEach(ep => {
        const li = document.createElement("li");
        if (ep.imagem) {
          const thumb = document.createElement("img");
          thumb.src = ep.imagem;
          thumb.style.width = "100px";
          li.appendChild(thumb);
        }
        const nome = document.createElement("span");
        nome.textContent = `Ep ${ep.numero} — ${ep.nome}`;
        li.appendChild(nome);
        lista.appendChild(li);
      });

      const blocoTemporada = document.createElement("div");
      blocoTemporada.classList.add("temporada");

      blocoTemporada.appendChild(titulo);
      blocoTemporada.appendChild(lista);
      listaEps.appendChild(blocoTemporada);
    });
  }

  const msgInput = document.getElementById("mensagem");
  const listaComentarios = document.getElementById("lista-comentarios");
  const avatarForm = document.getElementById("comentario-avatar");

  // Configura avatar exibido no campo
  if (avatarForm) {
    avatarForm.src = avatarUsuario;
    avatarForm.alt = nomeUsuario;
  }

  // Desativa campo se não estiver logado
  if (!usuarioLogado && msgInput) {
    msgInput.disabled = true;
    msgInput.placeholder = "🔒 Faça login para comentar";
  }

  function renderizarComentarios() {
    listaComentarios.innerHTML = "";
    const comentarios = getComentarios()[id] || [];

    comentarios.forEach((c, i) => {
      const div = document.createElement("div");
      div.classList.add("comentario");

      const avatar = document.createElement("img");
      avatar.src = c.avatar;
      avatar.alt = c.username;
      div.appendChild(avatar);

      const textoDiv = document.createElement("div");
      textoDiv.classList.add("texto");
      textoDiv.innerHTML = `
        <strong>${c.username}</strong>
        <p>${c.texto}</p>
        <div class="comentario-acoes">
          ${usuarioLogado ? `
            <button class="btn-curtir">${c.curtido ? "Curtido 💚" : "Curtir ❤️"}</button>
            <button class="btn-responder">Responder 💬</button>
            ${c.username === nomeUsuario ? '<button class="btn-excluir">Excluir 🗑️</button>' : ''}
          ` : ''}
        </div>
      `;
      div.appendChild(textoDiv);

      // Curtir
      if (usuarioLogado) {
        textoDiv.querySelector(".btn-curtir").addEventListener("click", () => {
          c.curtido = !c.curtido;
          const all = getComentarios();
          all[id][i] = c;
          salvarComentarios(all);
          renderizarComentarios();
        });
      }

      // Excluir
      if (usuarioLogado && c.username === nomeUsuario) {
        textoDiv.querySelector(".btn-excluir").addEventListener("click", () => {
          const all = getComentarios();
          all[id].splice(i, 1);
          salvarComentarios(all);
          renderizarComentarios();
        });
      }

      // Responder
      if (usuarioLogado) {
        textoDiv.querySelector(".btn-responder").addEventListener("click", () => {
          if (textoDiv.querySelector(".resposta-area")) return;

          const respostaDiv = document.createElement("div");
          respostaDiv.classList.add("resposta-area");
          respostaDiv.innerHTML = `<textarea placeholder="Responder..." class="campo-resposta"></textarea>`;
          textoDiv.appendChild(respostaDiv);

          const respostaInput = respostaDiv.querySelector(".campo-resposta");
          respostaInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const respostaTexto = respostaInput.value.trim();
              if (!respostaTexto) return;

              const novaResposta = {
                username: nomeUsuario,
                avatar: avatarUsuario,
                texto: respostaTexto
              };

              const todos = getComentarios();
              todos[id][i].respostas = todos[id][i].respostas || [];
              todos[id][i].respostas.push(novaResposta);
              salvarComentarios(todos);
              renderizarComentarios();
            }
          });
        });
      }

      // Respostas
      if (c.respostas) {
        c.respostas.forEach(r => {
          const respostaEl = document.createElement("div");
          respostaEl.classList.add("comentario-resposta");
          respostaEl.innerHTML = `
            <img src="${r.avatar}" alt="${r.username}" />
            <div>
              <strong>${r.username} respondeu:</strong>
              <p>${r.texto}</p>
            </div>
          `;
          textoDiv.appendChild(respostaEl);
        });
      }

      listaComentarios.appendChild(div);
    });
  }

  function enviarComentario(mensagem) {
    if (!mensagem || !usuarioLogado) return;

    const novo = {
      username: nomeUsuario,
      avatar: avatarUsuario,
      texto: mensagem,
      curtido: false,
      respostas: []
    };

    const todos = getComentarios();
    todos[id] = todos[id] || [];
    todos[id].push(novo);
    salvarComentarios(todos);
    renderizarComentarios();
  }

  if (usuarioLogado) {
    msgInput.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarComentario(msgInput.value.trim());
        msgInput.value = "";
      }
    });
  }

  renderizarComentarios();
});
