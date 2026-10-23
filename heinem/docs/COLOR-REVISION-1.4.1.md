# HEINEM 1.4.1 — cena verde-azulada com cores naturais

## Referência e escopo
A imagem enviada no pedido de 23/10/2026 mostra um campo de grama de verde médio, sombras verde-azuladas, céu azul ligeiramente acinzentado, nuvens claras e saturação moderada. O pedido é adaptar a **cor**, sem refazer composição, parallax, enquadramento, bubble jelly, retrato ou CD.

## Implementação
- Retirado link para Twitter/X da barra social e seu SVG não utilizado.
- `scenery.css`: `--garden-sky-grade`, `--garden-foliage-grade`, `--garden-foreground-grade`; modificações leves de `saturate`, `hue-rotate`, `brightness`, `contrast`, mantendo alpha e parallax originais.
- A cor de fundo do mundo foi de `#41662c` para `#41604d` e o fallback geral de `#5b7433` para `#456b5c`.
- O cenário principal, inclusive detalhe opcional, recebe **um único filtro de pós-composição**, sem segundo gramado nem imagens extras. Os planos de céu e vegetação são independentes, preservando suas velocidades.
- `bubble.ts`: a refração que amostra essas fotografias aplica um ajuste linear muito discreto na mesma passagem para acompanhar visualmente a paisagem filtrada, sem alterar curvatura, bounces ou glitter aprovado.
- Retrato, capas, UI, texto, borboletas e conteúdo original são preservados sem filtro global. Isso também evita alterar a aparência do rosto e das artes musicais.

## QA e limites
- Testar que os quatro links sociais continuam visíveis e X não existe no HTML.
- Testar que os filtros atuam em céu, vegetação e gramado, que o retrato permanece com filtro `none`, que há **um** campo contínuo e que a refração continua montada.
- O grade GLSL aproxima a cor CSS para evitar uma cópia não corrigida dentro da bolha; não promete equivalência colorimétrica perfeita. Ajuste estético futuro deve usar comparação de capturas reais, especialmente em cores calibradas e equipamentos físicos.
- O resultado só deve ser chamado de publicado quando a Vercel confirmar READY e o SHA do commit pela integração GitHub.
