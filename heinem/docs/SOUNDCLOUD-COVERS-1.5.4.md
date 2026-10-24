# HEINEM 1.5.4: capas oficiais do SoundCloud

## Escopo
O artista pediu as capas ausentes da seção de seis CDs. Três capas originais já são locais em `public/assets/` e não foram alteradas: `memories-of-you.jpg`, `mha-50k-drop.jpg`, `show-me-love.jpg`. As três novas faixas tinham apenas sleeves ilustrativos aguardando o primeiro play.

## Fontes
O SoundCloud mantém [oEmbed com JSON e CORS](https://developers.soundcloud.com/docs/oembed). A API retorna `thumbnail_url` quando há imagem disponível. Os links são os permalinks cadastrados em `src/lib/player.ts`. Não usar arte de outra pessoa como se fosse um remix de HEINEM.

- `her` (JVKE feat. Annika Wells, HEINEM FLIP): a página real do artista foi localizada em `https://soundcloud.com/heinemstrange/jvke-her-feat-annika-wells`; o URL da capa foi extraído do link de imagem dessa página, `https://i1.sndcdn.com/artworks-I7OK8OL2hvltDXaT-IKangQ-t1080x1080.png`.
- `Don't Let Me Fall` e `Seven Lions × Brieanna Grace`: as URLs cadastradas pelo projeto não puderam ser verificadas como faixas públicas nas buscas. O cliente tenta exclusivamente os metadados oficiais desses permalinks; se responderem 404, bloquearem CORS ou não tiverem imagem, mantém a arte estilizada local, sem inventar capa.

## Implementação
`src/lib/soundcloud-covers.ts` observa a seção Music com `IntersectionObserver` e consulta apenas os três releases sem capa local quando a seção se aproxima da tela, sem player, áudio, SDK ou login. Só aceita resposta `provider_name=SoundCloud` com `thumbnail_url` seguro em `https://i1.sndcdn.com/(artworks|avatars)-...`, verifica carregamento real com `new Image()` e então atualiza o sleeve. Caso o SoundCloud publique uma nova arte, uma nova visita usa o novo metadado; não há cache permanente entre sessões. Durante reprodução, a API oficial do widget também pode fornecer uma capa verificada.

O CSP permite **apenas** `https://soundcloud.com` em `connect-src` para o oEmbed; `img-src` já permitia o CDN `i1.sndcdn.com`. Os três JPGs preexistentes continuam locais e rápidos. Todas as consultas usam `credentials: omit`; interrupção de navegação cancela fetch por `AbortSignal`, e callbacks tardios não podem mudar a página destruída.

## Testes
Playwright intercepta oEmbed/CDN com respostas controladas. Registra três metadados, atualização de três capas, ausência de iframe antes do clique e permanência dos JPGs locais. Também cobre HTTP 404 do oEmbed e CDN, preservando o sleeve desenhado e evitando erros de página. O teste de composição autoriza exclusivamente chamadas de artwork oficiais após o scroll, **não** pedidos de streaming antes do play. Estes testes não certificam disponibilidade pública futura das faixas.

## Publicação
Commit na `main` do GitHub e deploy automático da Vercel. Confirmar READY, SHA e domínio antes de anunciar publicação.
