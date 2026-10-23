# HEINEM 1.5.0 — composição aprovada por cliente (2026-10-23)

## Objetivo
O cliente forneceu uma imagem-modelo de 1809 × 586 dentro de uma folha de referência e identificou exatamente duas referências de asset: **CAMADA 1 — GRAMADO (FRENTE)** e **CAMADA 2 — FUNDO (ÁRVORE + CÉU)**. A solicitação foi replicar a cena com qualidade alta e **NÃO RECORTAR** o modelo: os arquivos de fundo e grama foram gerados independentemente.

## Entregas

| Asset | Origem | Dimensões nativas | Arquivo WebP | Papel |
| --- | --- | --- | --- | --- |
| `reference-background.webp` | Nova geração a partir de orientação visual do modelo, sem copiar pixels da referência | 1672 × 941 RGB | 327.752 bytes | Paisagem panorâmica com árvore à esquerda, nuvens e cidade distante |
| `reference-field.webp` | Nova geração da silhueta de grama com alpha; a parte **inferior** foi continuada apenas a partir da própria textura nova | 1672 × 2380 RGBA | 1.219.886 bytes | Gramado à frente do retrato e uma única cobertura física até os CDs |

A foto clara do artista (`artist-light.webp`) e as capas musicais continuam originais do estado anterior; foram reutilizadas, sem regenerar o rosto. Os assets antigos (`sky.webp`, `tree-left.webp`, `foliage-*.webp`, `field-detail-*`) permanecem como histórico no repositório, mas não são solicitados na renderização 1.5.

## Alinhamento
- Desktop hero: o retrato começa em x=21,2% e topo=5%; o material da bolha em x=42,7% e topo=14%, largura=37,6%, altura=76% do quadro. A tipografia mantém HTML semântico e atlas GPU quando disponível.
- O fundo panôramico e a grama são os dois planos de scenery na página, cada qual com `data-depth` diferente (`0.64`, `-0.14`). O artista (0.08) e bolha (0.10) continuam independentes. Nenhuma `opacity` nova dissolve os planos entre seções.
- O primeiro plano possui margem vertical física suficiente para o mesmo gramado aparecer sob o CD; a extensão não foi tirada da imagem-modelo nem de uma tira invertida de screenshot. Não há `field-detail` opcional em uso.
- Em 700 px ou menos o retrato, gramado e bolha têm geometria adaptada; toque continua vertical para rolar o documento.

## Performance e segurança
- Dois WebP nativos somam 1.547.638 bytes (~1.48 MiB). O shader usa um backdrop compartilhado em vez de quatro texturas de folhagem. As imagens têm correção de cor assada: **nenhum filtro CSS stack/feColorMatrix** aplica outro grade na página 1.5.
- O material retém bounding da renderização, redução de movimento, recuperação após perda de contexto, queda para HTML/CSS e pausa fora da tela. A trilha sonora continua via SoundCloud oficial iniciado sob interação, sem re-hospedagem.
- Biblioteca MIT cobre o software; os direitos autorais de retrato, identidade e faixas permanecem com os titulares. As novas ilustrações geradas aqui são ativos independentes, sem recorte do screenshot de referência.

## Validação
- Script local validou RGBA da grama no topo (0) e na parte inferior (255). TypeScript + 44 testes locais passaram.
- Capturas de composição local geradas em 1809×586, 1440×900, 390×844, 320×780 e 600×1600. Em todos: zero overflow lateral, zero erro JS e gramado alcançando o fim da seção musical. **Limite:** a captura local offline operou com fallback WebGL; a validação do shader real é responsabilidade do CI/browser público, não deve ser falsamente afirmada a partir da captura.
- O deploy ocorre exclusivamente via commit/push no GitHub ligado à Vercel. Confirmar `READY` e SHA antes de chamar a versão de publicada.

## Parâmetros de reconstrução
Background novo: 1672×941, WebP quality 93, gradação de sombras verde-azuladas aplicada em pixels. Foreground novo: 1672×941 RGBA, alpha restaurado de transparência gerada (sem alteração de silhueta), grade leve assado RGB [.825,.850,.901], WebP quality 92. Continuação de terreno (não da referência): fragmentos da própria base em faixas sobrepostas de 128 px com pequenas variações horizontais, transições cúbicas na área inferior. O original superior permanece sem alterar sua geometria.
