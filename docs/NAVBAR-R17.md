# DXT | Navbar das páginas internas (R17)

Base: `55cd70d5a9257072218b10d907182213bbd3502f`.

## Problema identificado
O cabeçalho da experiência 3D foi projetado para flutuar, com `top: max(3.25vh, env(safe-area-inset-top))` e, no mobile, `top: max(21px, ...)`. Essa regra também afetava as páginas internas, deixando uma faixa vazia acima da navbar.

Além disso, o controle da marca tinha sido transformado integralmente em link de retorno, desativando a rotação 3D previamente aprovada.

## Correções
- Apenas nas páginas internas, `#header` preenche o topo de ponta a ponta, sem deslocamento vertical. Usa 76px de altura no desktop e 66px no mobile, com iluminação discreta e backdrop blur. O layout do showroom mantém a navbar flutuante original.
- A seta esquerda é um link de retorno independente. O logo DXT continua sendo o botão `data-spin-logo`, preservando o modelo 3D persistente e a rotação.
- Durante a animação de retorno, a navbar permanece no topo, evitando o salto de posicionamento ao iniciar o voo de volta.
- Navegação nativa, foco, teclado, efeitos 3D, galeria do Berserk e links permaneceram inalterados.

## Verificação
- Testes de regressão escritos primeiro e observados falhando antes da correção.
- 270 testes de código e build da Vercel executados.
- 31 verificações direcionadas no Chromium real com WebGL2: navbar alinhada em 1440, 1024, 390 e 320 pixels, sem overflow; logo girando sem navegar e seta iniciando retorno.
- 58 verificações integradas no Chromium: galeria, destinos, Play, mobile, retorno animado, rotação no showroom e fallback sem WebGL.
- Os testes usam ANGLE SwiftShader para WebGL2 e mobile emulado; não são garantia de performance em GPU física.

O pacote altera somente `src/ui/room-visitor-shell.js` e `src/styles-sections.css` em produção, além de testes, versão de build e este registro. `src/render/showroom.bundle.js` não é modificado no commit.

