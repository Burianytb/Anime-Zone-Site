import { buscarAvatarAleatorio } from './api.js';

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const comentarioForm = document.getElementById("comentario-form");
  const listaComentarios = document.getElementById("lista-comentarios");

  const getUsers = () => JSON.parse(localStorage.getItem("users") || "{}");
  const saveUsers = (users) => localStorage.setItem("users", JSON.stringify(users));

  const getUsuarioLogado = () => JSON.parse(sessionStorage.getItem("usuarioLogado"));

  // Registro
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("reg-username").value.trim();
      const password = document.getElementById("reg-password").value.trim();
      const email = document.getElementById("reg-email")?.value.trim();

      if (!username || !password || !email) return;

      const users = getUsers();
      if (users[username]) {
        alert("Usuário já existe.");
        return;
      }

      const avatar = await buscarAvatarAleatorio();
      const dataRegistro = new Date().toISOString();

      users[username] = {
        password,
        email,
        avatar,
        dataRegistro,
        watchlist: []
      };

      saveUsers(users);
      alert("Conta criada com sucesso!");
      window.location.href = "login.html";
    });
  }

  // Login
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value.trim();

      const users = getUsers();
      if (users[username]?.password === password) {
        const usuario = users[username];

        sessionStorage.setItem("usuarioLogado", JSON.stringify({
          username,
          avatar: usuario.avatar || null,
          email: usuario.email || null,
          dataRegistro: usuario.dataRegistro || null
        }));

        sessionStorage.setItem("watchlist", JSON.stringify(usuario.watchlist || []));

        window.location.href = "index.html";
      } else {
        alert("Usuário ou senha inválidos.");
      }
    });
  }

  // Comentários
  if (comentarioForm && listaComentarios) {
    const usuario = getUsuarioLogado();
    const mensagemInput = document.getElementById("mensagem");

    comentarioForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const texto = mensagemInput.value.trim();
      if (!texto || !usuario) return;

      const comentarioEl = document.createElement("div");
      comentarioEl.classList.add("comentario");
      comentarioEl.innerHTML = `
        <img src="${usuario.avatar}" alt="${usuario.username}">
        <div>
          <strong>${usuario.username}</strong>
          <p>${texto}</p>
        </div>
        <button class="btn-responder">Responder</button>
      `;

      listaComentarios.appendChild(comentarioEl);
      mensagemInput.value = "";

      const btnResponder = comentarioEl.querySelector(".btn-responder");
      btnResponder.addEventListener("click", () => {
        if (comentarioEl.querySelector(".resposta-area")) return;

        const respostaDiv = document.createElement("div");
        respostaDiv.classList.add("resposta-area");
        respostaDiv.innerHTML = `<textarea placeholder="Responder..." class="campo-resposta"></textarea>`;

        const respostaInput = respostaDiv.querySelector(".campo-resposta");
        respostaInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const respostaTexto = respostaInput.value.trim();
            if (!respostaTexto) return;

            const respostaEl = document.createElement("div");
            respostaEl.classList.add("comentario-resposta");
            respostaEl.innerHTML = `
              <img src="${usuario.avatar}" alt="${usuario.username}">
              <div>
                <strong>${usuario.username} respondeu:</strong>
                <p>${respostaTexto}</p>
              </div>
            `;

            respostaDiv.replaceWith(respostaEl);
          }
        });

        comentarioEl.appendChild(respostaDiv);
      });
    });
  }
});
