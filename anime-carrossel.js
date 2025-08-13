document.addEventListener("DOMContentLoaded", () => {
  const estaNaIndex =
    location.pathname.endsWith("index.html") ||
    location.pathname === "/" ||
    location.pathname === "/index.html";

  if (!estaNaIndex) return;

  const splideTrack = document.querySelector('.banner-carousel .splide__list');

  async function consultarAniList(query, variables = {}) {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      return await res.json();
    } catch (err) {
      console.error("Erro na consulta:", err);
      return null;
    }
  }

  async function buscarDestaques() {
    const query = `
      query {
        Page(perPage: 15) {
          media(type: ANIME, sort: SCORE_DESC, averageScore_greater: 85) {
            id
            title { romaji english }
            bannerImage
            averageScore
          }
        }
      }
    `;
    const json = await consultarAniList(query);
    return json?.data?.Page?.media || [];
  }

  function renderizarCarrossel(animes) {
    if (!splideTrack || !animes.length) return;

    splideTrack.innerHTML = "";

    animes.forEach(anime => {
      const slide = document.createElement("li");
      slide.className = "splide__slide";
      slide.innerHTML = `
        <div class="banner-slide" style="background-image: url('${anime.bannerImage}')">
          <div class="banner-overlay">
            <h2>${anime.title.romaji || anime.title.english}</h2>
            <p>Nota: ⭐ ${anime.averageScore || "N/A"}</p>
            <a href="anime.html?id=${anime.id}" class="banner-btn">Assistir Agora</a>
          </div>
        </div>
      `;
      splideTrack.appendChild(slide);
    });

    new Splide('.banner-carousel', {
      type: 'fade',
      autoplay: true,
      interval: 5000,
      pauseOnHover: true,
      rewind: true,
      pagination: true
    }).mount();
  }

  buscarDestaques().then(renderizarCarrossel);
});
