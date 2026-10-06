# Deimox Roblox · WebGL portfolio

Galeria 3D com dois painéis de vidro fosco, núcleo Roblox, piso refletivo e iluminação azul. O rodapé fica sobre a continuação real do piso, sem faixa opaca. O brilho do hover é limitado independentemente da deformação da malha.

## Desenvolvimento

Node.js 22 ou superior:

```sh
npm install
npm test
npm run build
npm start
```

Abra `http://localhost:4173`. O build gera `dist/index.html` para hospedagem e `dist/Deimox-Portfolio.html` para abrir como arquivo local. Three.js 0.180.0 e esbuild 0.25.10 são fixados no package.json; não há dependência de CDN em tempo de execução.

## Vercel

Projeto: `deimoxrbx`. Repositório: `ItsDeimox/checkpoint-portfolio`. Root Directory: `deimoxrbx`. Build: `npm run build`. Output: `dist`. A produção acompanha a branch `main`.

## Mídias e conteúdo

As seis miniaturas vieram da gravação de navegação fornecida pelo autor. Os clipes originais não estão incluídos: `src` é `null` em `src/projects.js`. Para publicá-los, coloque cada MP4/WebM em `assets/videos` e preencha o `src` relativo correspondente. O botão de carregar vídeo local funciona apenas no navegador de quem selecionou o arquivo; ele não envia nem salva vídeos no servidor.

## Interação

Scroll ou setas troca o par de projetos e gira o núcleo 90 graus. Clique em um painel para aproximar a câmera; ESC retorna. Os vídeos podem ser reproduzidos na própria malha. O hover injeta energia na malha subdividida, com propagação e dissipação. Movimento reduzido e modo gráfico leve são suportados.

## Estrutura

- `src/core`: estados de navegação, campo de energia por vértice e enquadramento.
- `src/scene`: ambiente, núcleo, vidro GLSL, reflexão planar e pós-processamento HDR.
- `src/ui`: interface semântica e rodapé flutuante.
- `tools`: compilação e runtime Three.js fixado.
- `tests`: testes unitários e verificações reais em Chromium.

Para as verificações de navegador, instale Python/Playwright, configure `CHROMIUM` quando necessário e execute `python tests/browser.py`. Em Linux sem GPU pode ser necessário um display Xvfb e `DISPLAY=:99`. `QA_VIDEO` pode apontar para um MP4 de teste, que não é publicado como trabalho do portfólio.

## Licenças

Three.js é distribuído sob MIT; o build copia sua licença para `vendor/THREE-LICENSE.txt`. Código, identidade e miniaturas pertencem ao projeto Deimox. Nenhuma imagem de concept art substitui o ambiente: a cena é renderizada em 3D.
