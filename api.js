// 🌐 Endpoints base
const JIKAN_BASE = 'https://api.jikan.moe/v4';
const ANILIST_GRAPHQL = 'https://graphql.anilist.co';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = '7d779743f4eacd1de7ffc7882da6d63f'; // substitua pela sua chave válida da TMDB!

// 🔹 Buscar anime por nome (Jikan)
export async function buscarPorNome(nome) {
  const res = await fetch(
    `${JIKAN_BASE}/anime?q=${encodeURIComponent(nome)}&order_by=popularity`
  );
  const json = await res.json();
  return json.data || [];
}

// 🔹 Buscar anime por ID (primeiro Jikan, depois AniList como fallback)
export async function buscarPorId(id) {
  // Tenta Jikan
  try {
    const resJikan = await fetch(`${JIKAN_BASE}/anime/${id}`);
    if (resJikan.ok) {
      const jsonJikan = await resJikan.json();
      if (jsonJikan.data) {
        return jsonJikan.data;
      }
    }
  } catch (err) {
    console.warn('Jikan falhou, tentando AniList…', err);
  }

  // Fallback: AniList GraphQL
  try {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { romaji english native }
          bannerImage
          description(asHtml: false)
          episodes
          status
          coverImage { large }
          averageScore
        }
      }
    `;
    const resAni = await fetch(ANILIST_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { id: parseInt(id, 10) }
      })
    });
    const jsonAni = await resAni.json();
    const media = jsonAni.data?.Media;
    if (!media) return null;

    // Normalizar resposta para mesma estrutura do Jikan
    return {
      mal_id: media.id,
      title: {
        romaji: media.title.romaji,
        english: media.title.english,
        native: media.title.native
      },
      bannerImage: media.bannerImage,
      images: { jpg: { image_url: media.coverImage.large } },
      synopsis: media.description,
      episodes: media.episodes,
      status: media.status,
      averageScore: media.averageScore
    };
  } catch (err) {
    console.error('AniList fallback falhou:', err);
    return null;
  }
}

// 🔹 Buscar lista de gêneros (Jikan)
export async function buscarGeneros() {
  const res = await fetch(`${JIKAN_BASE}/genres/anime`);
  const json = await res.json();
  return json.data || [];
}

// 🔹 Buscar por nome de gênero (Jikan)
export async function buscarPorGenero(nomeGenero) {
  const generos = await buscarGeneros();
  const genero = generos.find(
    g => g.name.toLowerCase() === nomeGenero.toLowerCase()
  );
  if (!genero) return [];

  const res = await fetch(
    `${JIKAN_BASE}/anime?genres=${genero.mal_id}&limit=20`
  );
  const json = await res.json();
  return json.data || [];
}

// 🔹 Buscar animes mais populares (Jikan)
export async function buscarMaisVistos(limit = 11) {
  const res = await fetch(
    `${JIKAN_BASE}/top/anime?filter=bypopularity&limit=${limit}`
  );
  const json = await res.json();
  return json.data || [];
}

// 🔹 Buscar top avaliados (Jikan)
export async function buscarTopAvaliados(limit = 11) {
  const res = await fetch(
    `${JIKAN_BASE}/top/anime?limit=${limit}`
  );
  const json = await res.json();
  return json.data || [];
}

// 🔹 Buscar temporada atual (Jikan)
export async function buscarTemporadaAtual(limit = 11) {
  const res = await fetch(`${JIKAN_BASE}/seasons/now?limit=${limit}`);
  const json = await res.json();
  return json.data || [];
}


// 🔹 Buscar avatar aleatório (Jikan - personagens)
export async function buscarAvatarAleatorio() {
  try {
    const pagina = Math.floor(Math.random() * 30) + 1;
    const res = await fetch(`${JIKAN_BASE}/characters?page=${pagina}`);
    const json = await res.json();
    const lista = json.data || [];
    const personagem =
      lista[Math.floor(Math.random() * lista.length)];
    return personagem?.images?.jpg?.image_url || null;
  } catch (err) {
    console.error('Erro ao buscar avatar:', err);
    return null;
  }
}

// 🔸 Buscar sinopse em português (TMDB)
export async function buscarSinopsePT(tituloOriginal) {
  try {
    const res = await fetch(
      `${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}` +
      `&query=${encodeURIComponent(tituloOriginal)}` +
      `&language=pt-BR`
    );
    const json = await res.json();

    const serie = json.results?.find(s =>
      s.name?.toLowerCase().includes(tituloOriginal.toLowerCase()) ||
      s.original_name?.toLowerCase().includes(tituloOriginal.toLowerCase())
    ) || json.results?.[0];

    if (!serie) return null;

    const detalhes = await fetch(
      `${TMDB_BASE}/tv/${serie.id}?api_key=${TMDB_KEY}&language=pt-BR`
    );
    const jsonDetalhes = await detalhes.json();
    return jsonDetalhes.overview?.trim() || null;
  } catch (err) {
    console.error('Erro na sinopse PT:', err);
    return null;
  }
}

// 🔸 Buscar temporadas e episódios (TMDB)
export async function buscarDetalhesSerie(tituloOriginal) {
  try {
    const busca = await fetch(
      `${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}` +
      `&query=${encodeURIComponent(tituloOriginal)}` +
      `&language=pt-BR`
    );
    const jsonBusca = await busca.json();
    const serie = jsonBusca.results?.[0];
    if (!serie) return null;

    const detalhes = await fetch(
      `${TMDB_BASE}/tv/${serie.id}` +
      `?api_key=${TMDB_KEY}&language=pt-BR`
    );
    const jsonDetalhes = await detalhes.json();

    const temporadas = [];
    for (const temp of jsonDetalhes.seasons) {
      const urlEps =
        `${TMDB_BASE}/tv/${serie.id}/season/${temp.season_number}` +
        `?api_key=${TMDB_KEY}&language=pt-BR`;
      const resEps = await fetch(urlEps);
      const jsonEps = await resEps.json();

      temporadas.push({
        nome: temp.name,
        numero: temp.season_number,
        episodios: jsonEps.episodes.map(ep => ({
          numero: ep.episode_number,
          nome: ep.name,
          imagem: ep.still_path
            ? `https://image.tmdb.org/t/p/w185${ep.still_path}`
            : null
        }))
      });
    }

    return {
      temporadas,
      episodiosTotal: jsonDetalhes.number_of_episodes,
      nomeOriginal: jsonDetalhes.original_name,
      status: jsonDetalhes.status,
      primeiroEp: jsonDetalhes.first_air_date
    };
  } catch (err) {
    console.error('Erro nos detalhes da série:', err);
    return null;
  }
}
