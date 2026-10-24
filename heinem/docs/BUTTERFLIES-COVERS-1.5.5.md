# HEINEM 1.5.5 · Brand, artworks e borboletas

## Escopo aprovado
- Logo H alinhada ao gutter esquerdo sem alterar sua geometria nem recentralizar o menu.
- Garantir que as seis caixas de CD tenham ilustração visual mesmo quando o SoundCloud não responder. As três capas oficiais anteriores continuam locais; os três títulos novos ganham **pôsteres abstratos locais criados para o site**, não apresentados como capas oficiais.
- Borboletas retomam como partículas decorativas flutuantes no hero e na seção Music, com tonalidade fria (azul-lilás suave), asas animadas e trajetórias assimétricas.

## Implementação
- `public/assets/heinem-mark.svg`: viewBox justo `79 14 354 484`; alinhamento do container controlado por `.site-header`, não por margem negativa que varia arbitrariamente com a largura.
- `index.html`: três capas JPG que tinham `loading=lazy` agora `eager` e `fetchpriority=low` para carregar antes de entrar no carrossel; nada do SoundCloud widget é requisitado antes da interação.
- `public/assets/covers/{fall,her,seven}.svg`: composições gráficas abstratas de uso local, pequenas, identificáveis pelas legendas HTML da própria caixa. CSS fornece background-color de segurança e pode receber substituição pela imagem oficial **somente após Image.onload e whitelist da CDN oficial** via `soundcloud-covers.ts`.
- `src/butterflies.css`: 14 borboletas distribuídas (8 hero, 6 music), reutilizando o sprite alpha `public/assets/layers/butterfly.webp`. Cada sprite tem flap 3D independente e percurso contínuo por `transform`; zero loops JS adicionais, eventos de ponteiro ou recursos WebGL. `body[data-scene-active]` e `body[data-music-active]` pausam conforme visibilidade. Low reduz contagem; mobile limita; `prefers-reduced-motion` e `body[data-reduced-motion]` desligam o efeito. `aria-hidden` e `pointer-events:none` evitam interferência.

## Critérios de regressão
- Layout 1760×960, 1178×610 e 390×844 com H visível e no canto esquerdo, sem overflow horizontal.
- Três JPG com dimensões naturais carregadas; três SVG locais respondem 200 e ficam visíveis sem nenhuma chamada ao provedor externo.
- Ambos os enxames presentes, controlos do CD clicáveis por trás, comportamento ornamental completamente desligado sob movimento reduzido.
- Build TS + testes no GitHub Actions; Vercel publicado **apenas** via integração Git e status READY do SHA exato.

## Limitação deliberada
SVGs para as últimas três músicas são capas temporárias próprias do site. As capas reais dependem da disponibilidade pública dos lançamentos no SoundCloud e de direitos de arte. Não foi atribuído visual inventado a um lançamento como oficial.
