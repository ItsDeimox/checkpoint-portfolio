# DXT / Berserk Drift X

Site pessoal de DXT, produzido a partir da direção visual aprovada: destaque automotivo na parte superior, cards na parte inferior, preto/vermelho na entrada e preto/branco/laranja na biografia.

## Executar

Requer Node.js 22. Não há dependências de produção.

```sh
npm run dev
# http://localhost:5186
npm test
npm run build
```

Na Vercel: raiz do projeto `dxrkths`, comando `npm run build`, saída `dist`. `api/roblox.js` é uma função Node de mesma origem; não coloque credenciais do Roblox no frontend.

## Páginas

- `/`: Berserk Drift X e visão geral.
- `/groups`: RevLine Entertainment’s e Frost Mammoth Games, com jogos públicos vindos da API.
- `/projects`: categorias dos projetos futuros. Nenhum projeto, data ou resultado foi inventado.
- `/about`: apresentação breve, avatar do perfil fornecido e logo DXT em 3D real.
- `/contact`: Discord da comunidade Berserk, Instagram, YouTube e perfil Roblox.

O alias `/berserk` abre a página do projeto principal. Os links e textos podem ser editados em `src/content.js` e `src/pages/templates.js`.

## Renderização

O hero utiliza a arte de corrida enviada pelo usuário, um mapa de profundidade separado e uma câmera de relevo 2.5D. Os shaders adicionam gradação noturna, resposta à posição do cursor, fumaça, reflexos de luz e bloom. O arraste tem alcance limitado para não expor áreas que não existem na imagem. **Não é um modelo de carro com rotação 360 graus.**

A logo na página About usa o arquivo original `DXTlogoPrinted.glb`, com malha real de 3.104 triângulos, iluminação, material metálico, profundidade, rotação por mouse e teclado. O recurso de pausa desativa a animação automática, sem impedir a navegação.

Os renderizadores usam WebGL2 nativo, framebuffer HDR quando disponível e composição de bloom. Qualidade Auto/Low/High limita o custo em pixels. Reduced Motion, aba oculta, descarte de recursos ao navegar e fallback para imagens permitem usar o site sem depender dos efeitos.

Os textos e controles ficam no DOM, não são recortes da concept. Os hovers dos painéis são luzes radiais com interpolação e CSS; a renderização WebGL é reservada ao hero e à logo. O build não contém a screenshot da concept como interface.

## Avatar e jogos

A função consulta apenas o usuário `1980621685` e os grupos `35542723` e `379822883`. Cache de 15 minutos, timeout de rede e uma cópia local do avatar público protegem a apresentação contra indisponibilidade da plataforma. Os nomes dos jogos são inseridos com `textContent`; não há proxy para URL arbitrária nem uso de cookies privados.

## Materiais e conteúdo

As logos, artes, ícones de jogo e padrões são os fornecidos no briefing. As versões WebP são independentes, em `assets/`. Margens vazias das logos foram aparadas para encaixe e o mapa de profundidade foi preparado para a arte existente. `docs/asset-provenance.json` registra a procedência.

Não foram incluídos estatísticas fictícias, email não fornecido, link de trailer inexistente ou biografia inventada com datas e conquistas. O botão de vídeo abre o canal real do YouTube. A biografia usa somente a relação entre o criador e os projetos informados.

## Testes

`npm test` executa os testes de navegação, movimento, qualidade, geometria GLB, avatar/API, URLs e proporções dos componentes. O build executa a mesma suíte antes de gerar o site.

Para a suíte de navegador: instale Playwright separadamente, execute o servidor e rode `node tests/browser.cjs` com `NODE_PATH` apontando para o diretório do Playwright. `DXT_BASE_URL` e `DXT_TEST_OUT` permitem mudar o destino e o diretório dos relatórios. Os resultados de software WebGL e viewport emulado não substituem um teste em aparelho físico.
